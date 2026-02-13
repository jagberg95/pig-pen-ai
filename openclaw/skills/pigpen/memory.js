class MemoryStore {
  constructor() {
    this.messagesByUser = new Map();
    this.operatorMemory = new Map();
  }

  recordMessage(userId, message) {
    if (!userId) {
      return;
    }

    const history = this.messagesByUser.get(userId) || [];
    history.push({ message, timestamp: Date.now() });
    this.messagesByUser.set(userId, history.slice(-50));
  }

  getRecentMessages(userId, limit = 10) {
    if (!userId) {
      return [];
    }

    const history = this.messagesByUser.get(userId) || [];
    return history.slice(-limit);
  }

  getOperatorMemory(operatorId, projectId) {
    const key = `${operatorId || 'unknown'}:${projectId || 'global'}`;
    return this.operatorMemory.get(key) || {
      previousConsultations: [],
      keyRecommendations: [],
      userFeedback: []
    };
  }
}

module.exports = {
  MemoryStore
};
