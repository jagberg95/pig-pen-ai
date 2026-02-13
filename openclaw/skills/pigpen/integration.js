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
  if (!message || typeof message !== 'string') {
    return false;
  }

  const normalized = message.toLowerCase();
  const commandTriggers = ['#invoke', '/approve', '/approvals', '/clear'];
  if (commandTriggers.some(trigger => normalized.includes(trigger))) {
    return true;
  }

  const operatorNames = Object.values(operatorRegistry.operators).map(op => op.name.toLowerCase());
  return operatorNames.some(name => normalized.includes(name));
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
  if (!routing.success) {
    return {
      handled: true,
      error: routing.error,
      trace: routing.trace
    };
  }

  const primaryOperator = routing.selectedOperators[0];
  const enrichedContext = await contextManager.loadContextForOperator(
    primaryOperator.operatorId,
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
      operatorId: primaryOperator.operatorId
    };
  }

  // ── Execute against Claude ──────────────────────────────────────────
  try {
    const client = getLLMClient(llmConfig);
    const execution = await client.execute(
      routing,
      message,
      buildSystemPrompt,
      operatorRegistry
    );

    // Store the interaction in memory for future context
    contextManager.memory.addMessage(userId, {
      role: 'user',
      content: message,
      operator: primaryOperator.operatorId,
      timestamp: Date.now()
    });
    contextManager.memory.addMessage(userId, {
      role: 'assistant',
      content: execution.synthesis,
      operator: primaryOperator.operatorId,
      timestamp: Date.now()
    });

    return {
      handled: true,
      routing,
      execution,
      operatorId: primaryOperator.operatorId,
      response: execution.synthesis
    };
  } catch (llmError) {
    return {
      handled: true,
      routing,
      systemPrompt,
      operatorId: primaryOperator.operatorId,
      error: `LLM execution failed: ${llmError.message}`,
      fallback: true
    };
  }
}

module.exports = {
  handleIncomingMessage,
  shouldHandleMessage
};
