/**
 * LLM Execution Layer for Pig Pen — Multi-Provider
 *
 * Supported providers:
 *   groq     — Free cloud API (Llama 3.3 70B). Get a key at https://console.groq.com
 *   ollama   — Free local inference, no API key needed. Install from https://ollama.com
 *   anthropic — Paid (Claude). Key from https://console.anthropic.com
 *
 * Handles:
 *  - Single operator execution
 *  - Sequential workflows (chained calls, each seeing prior outputs)
 *  - Parallel workflows (concurrent calls + synthesis)
 *  - Token budgets and safety limits
 */

const PROVIDERS = {
  groq: {
    name: 'Groq',
    defaultModel: 'llama-3.3-70b-versatile',
    envKey: 'GROQ_API_KEY',
    free: true
  },
  ollama: {
    name: 'Ollama',
    defaultModel: 'llama3.1',
    envKey: null, // no key needed
    free: true
  },
  anthropic: {
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    envKey: 'ANTHROPIC_API_KEY',
    free: false
  }
};

const DEFAULT_MAX_TOKENS = 4096;

// ─── Provider-specific API adapters ─────────────────────────────────

/**
 * Each adapter takes (config) and returns an object with:
 *   chat({ system, userMessage, model, maxTokens }) => { content, usage, model, stopReason }
 */

function createGroqAdapter(config) {
  const Groq = require('groq-sdk');
  const apiKey = config.apiKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key required. Get a FREE key at https://console.groq.com and set GROQ_API_KEY.');
  }
  const client = new Groq({ apiKey });

  return {
    provider: 'groq',
    async chat({ system, userMessage, model, maxTokens }) {
      const response = await client.chat.completions.create({
        model: model || PROVIDERS.groq.defaultModel,
        max_tokens: maxTokens || DEFAULT_MAX_TOKENS,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage }
        ]
      });
      const choice = response.choices[0];
      return {
        content: choice.message.content,
        usage: response.usage
          ? { input_tokens: response.usage.prompt_tokens, output_tokens: response.usage.completion_tokens }
          : { input_tokens: 0, output_tokens: 0 },
        model: response.model,
        stopReason: choice.finish_reason
      };
    }
  };
}

function createOllamaAdapter(config) {
  const baseUrl = config.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';

  return {
    provider: 'ollama',
    async chat({ system, userMessage, model, maxTokens }) {
      // Ollama exposes a simple HTTP API — no SDK needed
      const url = `${baseUrl}/api/chat`;
      const body = {
        model: model || PROVIDERS.ollama.defaultModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage }
        ],
        stream: false,
        options: {
          num_predict: maxTokens || DEFAULT_MAX_TOKENS
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ollama error (${response.status}): ${text}`);
      }

      const data = await response.json();
      return {
        content: data.message.content,
        usage: {
          input_tokens: data.prompt_eval_count || 0,
          output_tokens: data.eval_count || 0
        },
        model: data.model,
        stopReason: data.done ? 'end_turn' : 'unknown'
      };
    }
  };
}

function createAnthropicAdapter(config) {
  const Anthropic = require('@anthropic-ai/sdk');
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API key required. Set ANTHROPIC_API_KEY or pass config.apiKey.');
  }
  const client = new Anthropic({ apiKey });

  return {
    provider: 'anthropic',
    async chat({ system, userMessage, model, maxTokens }) {
      const response = await client.messages.create({
        model: model || PROVIDERS.anthropic.defaultModel,
        max_tokens: maxTokens || DEFAULT_MAX_TOKENS,
        system,
        messages: [
          { role: 'user', content: userMessage }
        ]
      });
      return {
        content: response.content[0].text,
        usage: response.usage,
        model: response.model,
        stopReason: response.stop_reason
      };
    }
  };
}

function createAdapter(provider, config) {
  switch (provider) {
    case 'groq': return createGroqAdapter(config);
    case 'ollama': return createOllamaAdapter(config);
    case 'anthropic': return createAnthropicAdapter(config);
    default: throw new Error(`Unknown provider "${provider}". Use: groq, ollama, or anthropic.`);
  }
}

// ─── Auto-detect best available provider ────────────────────────────

function detectProvider() {
  if (process.env.LLM_PROVIDER) return process.env.LLM_PROVIDER;
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  // Fall back to Ollama (local, no key needed)
  return 'ollama';
}

class LLMClient {
  /**
   * @param {object} config
   * @param {string} [config.provider]   - 'groq' (free), 'ollama' (free local), or 'anthropic' (paid)
   * @param {string} [config.apiKey]     - API key (not needed for ollama)
   * @param {string} [config.model]      - Model override
   * @param {number} [config.maxTokens]  - Default max tokens per response
   * @param {string} [config.ollamaUrl]  - Ollama base URL (default: http://localhost:11434)
   */
  constructor(config = {}) {
    const provider = config.provider || detectProvider();
    this.adapter = createAdapter(provider, config);
    this.model = config.model || PROVIDERS[provider].defaultModel;
    this.maxTokens = config.maxTokens || DEFAULT_MAX_TOKENS;
    this.providerName = PROVIDERS[provider].name;
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

    const response = await this.adapter.chat({
      system: systemPrompt,
      userMessage,
      model: this.model,
      maxTokens: maxTokens || this.maxTokens
    });

    return {
      operatorId,
      content: response.content,
      usage: response.usage,
      model: response.model,
      stopReason: response.stopReason,
      provider: this.adapter.provider,
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
  PROVIDERS,
  DEFAULT_MAX_TOKENS,
  detectProvider,
  createAdapter
};
