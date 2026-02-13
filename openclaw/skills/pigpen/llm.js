const Anthropic = require('@anthropic-ai/sdk');

/**
 * LLM Execution Layer for Pig Pen
 * 
 * Wraps the Anthropic Claude API and handles:
 *  - Single operator execution
 *  - Sequential workflows (chained calls, each seeing prior outputs)
 *  - Parallel workflows (concurrent calls + synthesis)
 *  - Token budgets and safety limits
 */

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;

class LLMClient {
  /**
   * @param {object} config
   * @param {string} config.apiKey    - Anthropic API key (or reads ANTHROPIC_API_KEY env)
   * @param {string} [config.model]   - Model identifier
   * @param {number} [config.maxTokens] - Default max tokens per response
   */
  constructor(config = {}) {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Anthropic API key is required. Set ANTHROPIC_API_KEY in your environment or pass config.apiKey.'
      );
    }

    this.client = new Anthropic({ apiKey });
    this.model = config.model || DEFAULT_MODEL;
    this.maxTokens = config.maxTokens || DEFAULT_MAX_TOKENS;
  }

  // ─── Single Operator Execution ──────────────────────────────────────

  /**
   * Execute a single operator call against Claude.
   *
   * @param {object} params
   * @param {string} params.systemPrompt   - Fully-built system prompt (from response.js)
   * @param {string} params.userMessage    - The original user message
   * @param {string} params.operatorId     - Which operator is responding
   * @param {number} [params.maxTokens]    - Override default max tokens
   * @returns {Promise<object>} { operatorId, content, usage, model }
   */
  async executeOperator({ systemPrompt, userMessage, operatorId, maxTokens }) {
    const startTime = Date.now();

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens || this.maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });

    return {
      operatorId,
      content: response.content[0].text,
      usage: response.usage,
      model: response.model,
      stopReason: response.stop_reason,
      duration: Date.now() - startTime
    };
  }

  // ─── Sequential Workflow Execution ──────────────────────────────────

  /**
   * Execute a sequential workflow — each operator runs in order and
   * subsequent operators receive the outputs of all prior operators
   * injected into their context.
   *
   * @param {object} params
   * @param {object} params.workflow         - Workflow from orchestrator.buildSequentialWorkflow()
   * @param {string} params.userMessage      - Original user message
   * @param {Function} params.buildPrompt    - (operator, context, task) => systemPrompt
   * @param {object} params.operatorRegistry - The loaded operator registry
   * @returns {Promise<object>} { results[], synthesized }
   */
  async executeSequential({ workflow, userMessage, buildPrompt, operatorRegistry }) {
    const results = [];

    for (const step of workflow.steps) {
      const operator = operatorRegistry.operators[step.operator];
      if (!operator) {
        results.push({
          operatorId: step.operator,
          error: `Operator ${step.operator} not found in registry`,
          stepNumber: step.stepNumber
        });
        continue;
      }

      // Inject previous outputs into the step context
      const stepContext = {
        ...step.context,
        previousOperatorOutputs: results
          .filter(r => !r.error)
          .map(r => ({
            operator: r.operatorId,
            output: r.content,
            key_insights: r.content ? r.content.substring(0, 300) : ''
          }))
      };

      const systemPrompt = buildPrompt(operator, stepContext, step.task);

      const result = await this.executeOperator({
        systemPrompt,
        userMessage: step.task,
        operatorId: step.operator
      });

      results.push({ ...result, stepNumber: step.stepNumber });
    }

    // Synthesize: ask the last operator to produce a unified summary
    const lastResult = results[results.length - 1];
    const synthesisPrompt = buildSynthesisPrompt(results, userMessage);

    const synthesis = await this.executeOperator({
      systemPrompt: synthesisPrompt,
      userMessage: `Synthesize the following operator analyses into a unified response for the user's original request: "${userMessage}"`,
      operatorId: lastResult ? lastResult.operatorId : 'system'
    });

    return {
      type: 'sequential',
      results,
      synthesis: synthesis.content,
      totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0) + synthesis.duration,
      totalUsage: aggregateUsage([...results, synthesis])
    };
  }

  // ─── Parallel Workflow Execution ────────────────────────────────────

  /**
   * Execute a parallel workflow — all operators run concurrently,
   * then a synthesis step merges their outputs.
   *
   * @param {object} params
   * @param {object} params.workflow         - Workflow from orchestrator.buildParallelWorkflow()
   * @param {string} params.userMessage      - Original user message
   * @param {Function} params.buildPrompt    - (operator, context, task) => systemPrompt
   * @param {object} params.operatorRegistry - The loaded operator registry
   * @returns {Promise<object>} { results[], synthesized }
   */
  async executeParallel({ workflow, userMessage, buildPrompt, operatorRegistry }) {
    // Fire all branches concurrently
    const branchPromises = workflow.branches.map(async (branch) => {
      const operator = operatorRegistry.operators[branch.operator];
      if (!operator) {
        return {
          operatorId: branch.operator,
          error: `Operator ${branch.operator} not found in registry`
        };
      }

      const systemPrompt = buildPrompt(operator, branch.context, branch.task);

      return this.executeOperator({
        systemPrompt,
        userMessage: branch.task,
        operatorId: branch.operator
      });
    });

    const results = await Promise.all(branchPromises);

    // Synthesis step: combine parallel outputs
    const synthesisPrompt = buildSynthesisPrompt(results, userMessage);

    const synthesis = await this.executeOperator({
      systemPrompt: synthesisPrompt,
      userMessage: `Synthesize these parallel operator perspectives into a unified response for: "${userMessage}"`,
      operatorId: 'synthesizer'
    });

    return {
      type: 'parallel',
      results,
      synthesis: synthesis.content,
      totalDuration: Math.max(...results.map(r => r.duration || 0)) + synthesis.duration,
      totalUsage: aggregateUsage([...results, synthesis])
    };
  }

  // ─── Unified Execute ────────────────────────────────────────────────

  /**
   * Execute any workflow type returned by the router.
   *
   * @param {object} routingResult  - The full result from PigPenRouter.route()
   * @param {string} userMessage    - Original user message
   * @param {Function} buildPrompt  - Prompt builder function
   * @param {object} operatorRegistry - The loaded operator registry
   * @returns {Promise<object>} Execution result
   */
  async execute(routingResult, userMessage, buildPrompt, operatorRegistry) {
    const { orchestration, workflow } = routingResult;

    switch (orchestration.type) {
      case 'sequential':
        return this.executeSequential({ workflow, userMessage, buildPrompt, operatorRegistry });

      case 'parallel':
        return this.executeParallel({ workflow, userMessage, buildPrompt, operatorRegistry });

      case 'single':
      default: {
        const operator = operatorRegistry.operators[orchestration.operators[0].operatorId];
        const context = workflow.context || {};
        const systemPrompt = buildPrompt(operator, context, userMessage);

        const result = await this.executeOperator({
          systemPrompt,
          userMessage,
          operatorId: orchestration.operators[0].operatorId
        });

        return {
          type: 'single',
          results: [result],
          synthesis: result.content,
          totalDuration: result.duration,
          totalUsage: result.usage
        };
      }
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function buildSynthesisPrompt(operatorResults, originalRequest) {
  const resultSummaries = operatorResults
    .filter(r => !r.error)
    .map(r => `--- ${r.operatorId} ---\n${r.content}`)
    .join('\n\n');

  return `You are a synthesis engine for Pearl & Pig's Pig Pen AI workforce.

Your job is to take the individual operator analyses below and produce a single, 
coherent response that:
1. Preserves the unique insights from each operator
2. Resolves any contradictions with clear reasoning
3. Presents a unified, actionable answer to the user
4. Credits operators by name when referencing their specific contributions

ORIGINAL USER REQUEST:
${originalRequest}

OPERATOR ANALYSES:
${resultSummaries}

Produce a clear, well-structured synthesis that serves the user's original intent.`;
}

function aggregateUsage(results) {
  return results.reduce(
    (totals, r) => {
      if (r.usage) {
        totals.input_tokens += r.usage.input_tokens || 0;
        totals.output_tokens += r.usage.output_tokens || 0;
      }
      return totals;
    },
    { input_tokens: 0, output_tokens: 0 }
  );
}

module.exports = {
  LLMClient,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS
};
