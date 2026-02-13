function buildSystemPrompt(operator, context, task) {
  const basePrompt = operator.system_prompt_template;
  let enhancedPrompt = basePrompt.replace('{TASK}', task);

  if (context.project) {
    enhancedPrompt += `\n\nPROJECT CONTEXT:\n${formatProjectContext(context.project)}`;
  }

  if (context.operatorMemory && context.operatorMemory.previousConsultations.length > 0) {
    enhancedPrompt += `\n\nYOUR PREVIOUS CONSULTATIONS:\n${formatOperatorMemory(context.operatorMemory)}`;
  }

  if (context.collaborations && context.collaborations.length > 0) {
    enhancedPrompt += `\n\nCOLLABORATION PATTERNS:\n${formatCollaborations(context.collaborations)}`;
  }

  if (context.userPreferences) {
    enhancedPrompt += `\n\nUSER PREFERENCES:\n${formatUserPreferences(context.userPreferences)}`;
  }

  if (context.previousOperatorOutputs) {
    enhancedPrompt += `\n\nPREVIOUS OPERATOR ANALYSES:\n${formatPreviousOutputs(context.previousOperatorOutputs)}`;
  }

  return enhancedPrompt;
}

function formatProjectContext(project) {
  return JSON.stringify(project, null, 2);
}

function formatOperatorMemory(memory) {
  return JSON.stringify(memory, null, 2);
}

function formatCollaborations(collaborations) {
  return JSON.stringify(collaborations, null, 2);
}

function formatUserPreferences(preferences) {
  return JSON.stringify(preferences, null, 2);
}

function formatPreviousOutputs(outputs) {
  return JSON.stringify(outputs, null, 2);
}

module.exports = {
  buildSystemPrompt
};
