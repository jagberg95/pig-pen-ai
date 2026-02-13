const { OrchestrationPlanner, buildSequentialWorkflow, buildParallelWorkflow } = require('./orchestrator');

class RequestAnalyzer {
  analyze(userRequest, conversationContext) {
    return {
      raw: userRequest,
      normalized: this.normalize(userRequest),
      tokens: this.tokenize(userRequest),
      intent: this.classifyIntent(userRequest),
      domains: this.detectDomains(userRequest),
      complexity: this.assessComplexity(userRequest),
      explicitOperators: this.detectExplicitOperators(userRequest),
      orchestrationHints: this.detectOrchestrationHints(userRequest)
    };
  }

  normalize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  tokenize(text) {
    const normalized = this.normalize(text);
    const tokens = normalized.split(' ');
    const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were']);
    return tokens.filter(token => !stopWords.has(token));
  }

  classifyIntent(request) {
    const intentPatterns = {
      consultation: {
        patterns: [/what.*think/i, /help.*with/i, /advice.*on/i, /perspective.*on/i, /recommend/i],
        confidence: 0.9
      },
      analysis: {
        patterns: [/analyze/i, /evaluate/i, /assess/i, /review/i, /examine/i],
        confidence: 0.95
      },
      design: {
        patterns: [/design/i, /create/i, /build/i, /develop/i, /make/i],
        confidence: 0.9
      },
      planning: {
        patterns: [/plan/i, /strategy/i, /roadmap/i, /schedule/i, /timeline/i],
        confidence: 0.9
      },
      execution: {
        patterns: [/execute/i, /implement/i, /do/i, /start/i, /begin/i],
        confidence: 0.85
      }
    };

    const matches = [];
    for (const [intent, config] of Object.entries(intentPatterns)) {
      for (const pattern of config.patterns) {
        if (pattern.test(request)) {
          matches.push({
            intent,
            confidence: config.confidence,
            pattern: pattern.toString()
          });
        }
      }
    }

    return matches.length > 0
      ? matches.sort((a, b) => b.confidence - a.confidence)[0]
      : { intent: 'consultation', confidence: 0.5 };
  }

  detectDomains(request) {
    const domainSignatures = {
      business: {
        keywords: [
          'revenue', 'pricing', 'deal', 'partnership', 'business model',
          'monetization', 'margin', 'roi', 'investor', 'valuation',
          'cost', 'profit', 'sales', 'market', 'strategy'
        ],
        weight: 1.0
      },
      creative: {
        keywords: [
          'brand', 'design', 'story', 'narrative', 'creative',
          'visual', 'identity', 'tone', 'feel', 'emotion',
          'symbolism', 'meaning', 'aesthetic', 'art', 'imagery'
        ],
        weight: 1.0
      },
      operations: {
        keywords: [
          'workflow', 'process', 'execute', 'implementation', 'operations',
          'organize', 'structure', 'plan', 'steps', 'how to',
          'build', 'deliver', 'operational', 'logistics'
        ],
        weight: 1.0
      },
      technical: {
        keywords: [
          'platform', 'system', 'technical', 'architecture', 'infrastructure',
          'api', 'integration', 'software', 'tool', 'code',
          'database', 'server', 'scalability', 'performance'
        ],
        weight: 1.0
      },
      risk: {
        keywords: [
          'risk', 'threat', 'vulnerability', 'security', 'failure',
          'what if', 'worst case', 'protect', 'safeguard',
          'liability', 'danger', 'compliance'
        ],
        weight: 0.9
      },
      growth: {
        keywords: [
          'marketing', 'sales', 'growth', 'customer', 'client',
          'audience', 'reach', 'visibility', 'demand', 'acquisition',
          'retention', 'partnership', 'channel'
        ],
        weight: 0.9
      },
      legal: {
        keywords: [
          'legal', 'contract', 'rights', 'ip', 'trademark',
          'copyright', 'liability', 'compliance', 'terms',
          'agreement', 'law', 'regulation'
        ],
        weight: 0.95
      },
      narrative: {
        keywords: [
          'story', 'narrative', 'character', 'plot', 'script',
          'dialogue', 'scene', 'arc', 'theme', 'voice',
          'structure', 'beats', 'outline'
        ],
        weight: 1.0
      }
    };

    const normalized = this.normalize(request);
    const tokens = new Set(this.tokenize(request));
    const domainScores = {};

    for (const [domain, config] of Object.entries(domainSignatures)) {
      let score = 0;
      const matchedKeywords = [];

      for (const keyword of config.keywords) {
        if (normalized.includes(keyword)) {
          score += config.weight;
          matchedKeywords.push(keyword);
        }

        const keywordTokens = keyword.split(' ');
        if (keywordTokens.every(kt => tokens.has(kt))) {
          score += config.weight * 0.8;
          matchedKeywords.push(keyword);
        }
      }

      if (score > 0) {
        domainScores[domain] = {
          score,
          matches: matchedKeywords,
          confidence: Math.min(score / config.keywords.length, 1.0)
        };
      }
    }

    return Object.entries(domainScores)
      .sort(([, a], [, b]) => b.score - a.score)
      .map(([domain, data]) => ({ domain, ...data }));
  }

  assessComplexity(request) {
    const factors = {
      length: {
        score: Math.min(request.split(' ').length / 50, 1.0),
        weight: 0.3
      },
      domains: {
        score: Math.min(this.detectDomains(request).length / 3, 1.0),
        weight: 0.4
      },
      sequential: {
        score: /then|after|followed by|next/i.test(request) ? 0.8 : 0,
        weight: 0.3
      },
      conditional: {
        score: /if|unless|when|whether/i.test(request) ? 0.6 : 0,
        weight: 0.2
      },
      multiQuestion: {
        score: (request.match(/\?/g) || []).length > 1 ? 0.7 : 0,
        weight: 0.2
      }
    };

    const weightedScore = Object.values(factors).reduce(
      (sum, factor) => sum + (factor.score * factor.weight),
      0
    );

    return {
      score: weightedScore,
      level: weightedScore < 0.3 ? 'simple' :
        weightedScore < 0.6 ? 'moderate' : 'complex',
      factors
    };
  }

  detectExplicitOperators(request) {
    const operatorNames = {
      'jon': 'jon_hartman',
      'jon hartman': 'jon_hartman',
      'trey': 'trey_mills',
      'trey mills': 'trey_mills',
      'marty': 'marty_hillsdale',
      'marty hillsdale': 'marty_hillsdale',
      'naomi': 'naomi_top',
      'naomi top': 'naomi_top',
      'levi': 'levi_foster',
      'levi foster': 'levi_foster'
    };

    const normalized = this.normalize(request);
    const detected = [];

    for (const [name, operatorId] of Object.entries(operatorNames)) {
      if (normalized.includes(name)) {
        detected.push({
          operatorId,
          name,
          position: normalized.indexOf(name),
          confidence: 1.0
        });
      }
    }

    return detected.sort((a, b) => a.position - b.position);
  }

  detectOrchestrationHints(request) {
    const hints = {
      sequential: {
        patterns: [/first.*then/i, /analyze.*then.*design/i, /evaluate.*followed by/i, /start.*next.*finally/i, /phase 1.*phase 2/i],
        type: 'sequential'
      },
      parallel: {
        patterns: [/both.*and/i, /multiple perspectives/i, /from.*and.*viewpoints/i, /business and creative/i, /all at once/i],
        type: 'parallel'
      },
      comparison: {
        patterns: [/compare/i, /contrast/i, /versus/i, /vs\./i, /which is better/i],
        type: 'parallel'
      }
    };

    for (const [, config] of Object.entries(hints)) {
      for (const pattern of config.patterns) {
        if (pattern.test(request)) {
          return {
            detected: true,
            type: config.type,
            pattern: pattern.toString(),
            confidence: 0.95
          };
        }
      }
    }

    return { detected: false, type: null };
  }
}

class OperatorMatcher {
  constructor(operatorRegistry) {
    this.registry = operatorRegistry;
    this.buildTriggerIndex();
  }

  buildTriggerIndex() {
    this.triggerIndex = {};

    for (const [operatorId, profile] of Object.entries(this.registry.operators)) {
      for (const trigger of profile.invocation_conditions.triggers) {
        if (!this.triggerIndex[trigger]) {
          this.triggerIndex[trigger] = [];
        }
        this.triggerIndex[trigger].push({
          operatorId,
          domain: profile.domain,
          tags: profile.tags
        });
      }
    }
  }

  matchTriggers(request, domains) {
    const normalized = request.toLowerCase();
    const candidates = new Map();

    for (const [trigger, operators] of Object.entries(this.triggerIndex)) {
      if (normalized.includes(trigger)) {
        for (const op of operators) {
          if (!candidates.has(op.operatorId)) {
            candidates.set(op.operatorId, {
              operatorId: op.operatorId,
              domain: op.domain,
              tags: op.tags,
              triggerMatches: [],
              score: 0
            });
          }

          const candidate = candidates.get(op.operatorId);
          candidate.triggerMatches.push(trigger);

          const triggerWeight = Math.log(trigger.length + 1);
          const domainBonus = domains.some(d => d.domain === op.domain) ? 1.5 : 1.0;

          candidate.score += triggerWeight * domainBonus;
        }
      }
    }

    return Array.from(candidates.values())
      .sort((a, b) => b.score - a.score);
  }
}

class PigPenRouter {
  constructor({ operatorRegistry, contextManager, confidenceThreshold = 0.75, maxOperatorsPerRequest = 3 }) {
    this.registry = operatorRegistry;
    this.analyzer = new RequestAnalyzer();
    this.matcher = new OperatorMatcher(this.registry);
    this.planner = new OrchestrationPlanner();
    this.contextManager = contextManager;
    this.confidenceThreshold = confidenceThreshold;
    this.maxOperatorsPerRequest = maxOperatorsPerRequest;
  }

  async route(userRequest, conversationContext = {}, projectContext = {}) {
    const routingTrace = { steps: [], startTime: Date.now() };

    try {
      routingTrace.steps.push({ step: 'analyze', start: Date.now() });
      const analysis = this.analyzer.analyze(userRequest, conversationContext);
      routingTrace.steps[0].duration = Date.now() - routingTrace.steps[0].start;
      routingTrace.analysis = analysis;

      routingTrace.steps.push({ step: 'match', start: Date.now() });
      let candidates = this.matcher.matchTriggers(userRequest, analysis.domains);
      candidates = candidates.map(candidate => ({
        ...candidate,
        confidence: this.calculateOperatorConfidence(candidate, userRequest, analysis.domains, conversationContext)
      }));
      routingTrace.steps[1].duration = Date.now() - routingTrace.steps[1].start;

      const selectedOperators = this.resolveOperatorCollisions(candidates, this.confidenceThreshold);
      routingTrace.candidates = candidates.slice(0, 10);
      routingTrace.selectedOperators = selectedOperators;

      routingTrace.steps.push({ step: 'plan', start: Date.now() });
      const orchestration = this.planner.decide(analysis, selectedOperators, conversationContext);
      routingTrace.steps[2].duration = Date.now() - routingTrace.steps[2].start;
      routingTrace.orchestration = orchestration;

      const context = await this.contextManager.loadContextForOperator(
        orchestration.operators[0].operatorId,
        conversationContext,
        projectContext
      );
      routingTrace.contextLoaded = true;

      let workflow = {
        type: 'single',
        operators: orchestration.operators,
        task: userRequest
      };

      if (orchestration.type === 'sequential') {
        workflow = buildSequentialWorkflow(orchestration.operators, userRequest, context);
      } else if (orchestration.type === 'parallel') {
        workflow = buildParallelWorkflow(orchestration.operators, userRequest, context);
      }

      routingTrace.workflow = workflow;
      routingTrace.totalDuration = Date.now() - routingTrace.startTime;

      return {
        success: true,
        selectedOperators,
        orchestration,
        workflow,
        trace: routingTrace
      };
    } catch (error) {
      routingTrace.error = error.message;
      routingTrace.totalDuration = Date.now() - routingTrace.startTime;

      return {
        success: false,
        error: error.message,
        trace: routingTrace
      };
    }
  }

  calculateOperatorConfidence(operator, request, domains, context) {
    const weights = {
      triggerMatch: 0.40,
      domainAlignment: 0.30,
      contextRequirements: 0.20,
      collaboration: 0.10
    };

    const triggerScore = this.normalizeTriggerScore(operator.score || 0);
    const domainScore = this.scoreDomainAlignment(operator, domains);
    const contextScore = this.checkContextRequirements(operator, context);
    const collaborationScore = this.getCollaborationScore(operator.operatorId, context.recentOperators);

    const confidence =
      (triggerScore * weights.triggerMatch) +
      (domainScore * weights.domainAlignment) +
      (contextScore * weights.contextRequirements) +
      (collaborationScore * weights.collaboration);

    return {
      overall: confidence,
      breakdown: {
        triggerMatch: triggerScore,
        domainAlignment: domainScore,
        contextRequirements: contextScore,
        collaboration: collaborationScore
      }
    };
  }

  normalizeTriggerScore(score) {
    if (score <= 0) {
      return 0;
    }
    return Math.min(score / 5, 1);
  }

  scoreDomainAlignment(operator, detectedDomains) {
    const operatorDomain = operator.domain;
    const match = detectedDomains.find(d => d.domain === operatorDomain);

    if (!match) {
      return 0;
    }

    const rank = detectedDomains.indexOf(match);
    const rankWeight = 1.0 / (rank + 1);

    return match.confidence * rankWeight;
  }

  checkContextRequirements(operator, conversationContext) {
    const requirements = this.registry.operators[operator.operatorId].invocation_conditions.context_requirements;
    const availableContext = {
      hasProject: !!conversationContext.project,
      hasFinancials: !!conversationContext.financialData,
      hasCreativeAssets: !!conversationContext.creativeAssets,
      hasStakeholders: !!conversationContext.stakeholders,
      hasTechnicalSpecs: !!conversationContext.technicalSpecs
    };

    const requirementMap = {
      'Business context': 'hasProject',
      'Financial parameters': 'hasFinancials',
      'Brand/project context': 'hasCreativeAssets',
      'Stakeholder landscape': 'hasStakeholders',
      'Technical requirements': 'hasTechnicalSpecs'
    };

    let satisfiedCount = 0;
    let totalCount = requirements.length;

    for (const req of requirements) {
      const contextKey = requirementMap[req];
      if (contextKey && availableContext[contextKey]) {
        satisfiedCount++;
      }
    }

    return totalCount > 0 ? satisfiedCount / totalCount : 1.0;
  }

  getCollaborationScore(operatorId, recentOperators = []) {
    if (!Array.isArray(recentOperators) || recentOperators.length === 0) {
      return 0.1;
    }

    return recentOperators.includes(operatorId) ? 0.25 : 0.1;
  }

  resolveOperatorCollisions(candidates, threshold = 0.75) {
    const enriched = candidates.map(candidate => ({
      ...candidate,
      confidence: candidate.confidence || { overall: 0 }
    }));

    const highConfidence = enriched.filter(c => c.confidence.overall >= threshold);

    if (highConfidence.length === 0) {
      return enriched.slice(0, this.maxOperatorsPerRequest);
    }

    if (highConfidence.length === 1) {
      return highConfidence;
    }

    const hierarchy = {
      executive: ['jon_hartman', 'trey_mills', 'marty_hillsdale'],
      creative: ['naomi_top'],
      systems: ['miles_okada', 'marty_hillsdale'],
      growth: ['harper_lane'],
      legal: ['carmen_wade'],
      writers: ['the_architect']
    };

    for (const [, leads] of Object.entries(hierarchy)) {
      const domainCandidates = highConfidence.filter(c => leads.includes(c.operatorId));
      if (domainCandidates.length > 0) {
        return [
          domainCandidates[0],
          ...highConfidence.filter(c => !leads.includes(c.operatorId)).slice(0, 2)
        ];
      }
    }

    return highConfidence
      .sort((a, b) => b.confidence.overall - a.confidence.overall)
      .slice(0, this.maxOperatorsPerRequest);
  }
}

module.exports = {
  RequestAnalyzer,
  OperatorMatcher,
  PigPenRouter
};
