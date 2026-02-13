const { MemoryStore } = require('./memory');

class ContextManager {
  constructor() {
    this.memory = new MemoryStore();
  }

  async loadContextForOperator(operatorId, conversationContext = {}, projectContext = {}) {
    const projectId = projectContext.projectId || conversationContext.projectId || null;

    return {
      project: projectContext || conversationContext.project || null,
      operatorMemory: this.memory.getOperatorMemory(operatorId, projectId),
      recentMessages: this.memory.getRecentMessages(conversationContext.userId, 10),
      collaborations: [],
      userPreferences: conversationContext.userPreferences || null,
      artifacts: []
    };
  }
}

module.exports = {
  ContextManager
};
