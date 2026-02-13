const path = require('path');
const { loadOperatorRegistry } = require('./operators/loader');
const { PigPenRouter } = require('./router');
const { ContextManager } = require('./context_manager');
const { buildSystemPrompt } = require('./response');
const { LLMClient } = require('./llm');

const registryPath = path.join(__dirname, 'operators', 'profiles.json');
const operatorRegistry = loadOperatorRegistry(registryPath);
const contextManager = new ContextManager();
const router = new PigPenRouter({
  operatorRegistry,
  contextManager
});

// LLM client — initialised lazily so the module loads even without an API key
let llmClient = null;

function getLLMClient(config = {}) {
  if (!llmClient) {
    llmClient = new LLMClient(config);
  }
  return llmClient;
}

function shouldHandleMessage(message) {
  // Always returns true — general messages go to the default operator (Jon)
  if (!message || typeof message !== 'string') {
    return false;
  }
  return true;
}

function detectTargetOperator(message) {
  const normalized = message.toLowerCase();

  // Check command triggers
  const commandTriggers = ['#invoke', '/approve', '/approvals', '/clear'];
  if (commandTriggers.some(trigger => normalized.includes(trigger))) {
    return null; // let the router figure it out
  }

  // Check full names
  const operatorNames = Object.values(operatorRegistry.operators).map(op => op.name.toLowerCase());
  if (operatorNames.some(name => normalized.includes(name))) {
    return null; // router will match
  }

  // Check first names
  const operatorFirstNames = operatorNames.map(name => name.split(' ')[0]);
  if (operatorFirstNames.some(name => normalized.includes(name))) {
    return null; // router will match
  }

  // No operator detected — use default
  return 'jon_hartman';
}

async function handleIncomingMessage({
  message,
  userId,
  conversationContext = {},
  projectContext = {},
  llmConfig = {},
  executeLLM = true
}) {
  if (!shouldHandleMessage(message)) {
    return { handled: false };
  }

  const context = {
    ...conversationContext,
    userId
  };

  const routing = await router.route(message, context, projectContext);

  // Determine the operator — from routing or fallback to default
  const defaultOperatorId = detectTargetOperator(message);
  let primaryOperatorId;
  let primaryOperator;

  if (routing.success && routing.selectedOperators && routing.selectedOperators.length > 0) {
    primaryOperatorId = routing.selectedOperators[0].operatorId;
    primaryOperator = operatorRegistry.operators[primaryOperatorId];
  }

  // If routing didn't find anyone, fall back to default
  if (!primaryOperator && defaultOperatorId) {
    primaryOperatorId = defaultOperatorId;
    primaryOperator = operatorRegistry.operators[primaryOperatorId];
  }

  if (!primaryOperator) {
    return {
      handled: true,
      error: 'No operator could be matched for this request.',
      trace: routing.trace
    };
  }

  const enrichedContext = await contextManager.loadContextForOperator(
    primaryOperatorId,
    context,
    projectContext
  );

  const systemPrompt = buildSystemPrompt(primaryOperator, enrichedContext, message);

  // If executeLLM is false, return the routing + prompt without calling the API
  // (useful for testing, dry-runs, or when the caller handles execution)
  if (!executeLLM) {
    return {
      handled: true,
      routing,
      systemPrompt,
      operatorId: primaryOperatorId
    };
  }

  // ── Execute against LLM ─────────────────────────────────────────────
  try {
    const client = getLLMClient(llmConfig);

    // If routing failed (fallback operator), do a direct single-operator call
    const executionRouting = (routing.success && routing.selectedOperators && routing.selectedOperators.length > 0)
      ? routing
      : {
          orchestration: { type: 'single', operators: [{ operatorId: primaryOperatorId }] },
          workflow: { type: 'single', operators: [{ operatorId: primaryOperatorId }], context: {} }
        };

    const execution = await client.execute(
      executionRouting,
      message,
      buildSystemPrompt,
      operatorRegistry
    );

    // Store the interaction in memory for future context
    contextManager.memory.addMessage(userId, {
      role: 'user',
      content: message,
      operator: primaryOperatorId,
      timestamp: Date.now()
    });
    contextManager.memory.addMessage(userId, {
      role: 'assistant',
      content: execution.synthesis,
      operator: primaryOperatorId,
      timestamp: Date.now()
    });

    return {
      handled: true,
      routing,
      execution,
      operatorId: primaryOperatorId,
      response: execution.synthesis
    };
  } catch (llmError) {
    return {
      handled: true,
      routing,
      systemPrompt,
      operatorId: primaryOperatorId,
      error: `LLM execution failed: ${llmError.message}`,
      fallback: true
    };
  }
}

module.exports = {
  handleIncomingMessage,
  shouldHandleMessage
};
