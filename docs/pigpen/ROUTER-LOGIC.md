# Pig Pen Router Logic Specification
Version: 1.0.0
Authority: Pearl & Pig - Founder & Architect
Effective Date: 02/11/2026
Status: Canonical Router Design

## Table of Contents
1. Router Architecture Overview
2. Request Analysis Pipeline
3. Operator Selection Algorithms
4. Orchestration Logic
5. Confidence Scoring
6. Collision Resolution
7. Context Management
8. Implementation Code
9. Test Cases
10. Performance Optimization

## I. Router Architecture Overview
### Core Responsibilities
The Pig Pen Router serves as the intelligent gateway between user requests and the 35-operator workforce. Its primary responsibilities:
1. Request Analysis: Parse user intent, domain, complexity
2. Operator Selection: Match request to appropriate operator(s)
3. Orchestration Decision: Single, sequential, or parallel execution
4. Context Loading: Inject relevant project/conversation memory
5. Response Synthesis: Format multi-operator responses coherently

### Router Components
```
INCOMING REQUEST
  |
  v
REQUEST ANALYZER
- Natural language parsing
- Intent classification
- Domain detection
- Complexity assessment
  |
  v
OPERATOR MATCHER
- Trigger word matching
- Domain alignment
- Context requirement check
- Confidence scoring
  |
  v
ORCHESTRATION PLANNER
- Single vs. multi-operator decision
- Sequential vs. parallel determination
- Workflow graph construction
  |
  v
CONTEXT INJECTOR
- Project memory loading
- Operator-specific memory
- User preferences
- Collaboration history
  |
  v
EXECUTION ENGINE
- Single operator invocation
- Sequential workflow execution
- Parallel operator coordination
- Response collection
  |
  v
RESPONSE SYNTHESIZER
- Format single responses
- Synthesize multi-operator outputs
- Apply response templates
- Final formatting
  |
  v
OUTGOING RESPONSE
```

## II. Request Analysis Pipeline
### Phase 1: Natural Language Parsing
```
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
}
```

### Phase 2: Intent Classification
```
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

function classifyIntent(request) {
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
```

### Phase 3: Domain Detection
```
const domainSignatures = {
  business: {
    keywords: [
      'revenue', 'pricing', 'deal', 'partnership', 'business model',
      'monetization', 'margin', 'ROI', 'investor', 'valuation',
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
      'API', 'integration', 'software', 'tool', 'code',
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
      'legal', 'contract', 'rights', 'IP', 'trademark',
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
```

### Phase 4: Complexity Assessment
```
function assessComplexity(request) {
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
```

### Phase 5: Explicit Operator Detection
```
function detectExplicitOperators(request) {
  const operatorNames = {
    'jon': 'jon_hartman',
    'jon hartman': 'jon_hartman',
    'trey': 'trey_mills',
    'trey mills': 'trey_mills',
    'marty': 'marty_hillsdale',
    'marty hillsdale': 'marty_hillsdale',
    'naomi': 'naomi_top',
    'naomi top': 'naomi_top'
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
```

### Phase 6: Orchestration Hint Detection
```
function detectOrchestrationHints(request) {
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

  for (const [hintType, config] of Object.entries(hints)) {
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
```

## III. Operator Selection Algorithms
### Algorithm 1: Trigger Word Matching
```
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
```

### Algorithm 2: Domain Alignment Scoring
```
function scoreDomainAlignment(operator, detectedDomains) {
  const operatorDomain = operator.domain;
  const match = detectedDomains.find(d => d.domain === operatorDomain);

  if (!match) {
    return 0;
  }

  const rank = detectedDomains.indexOf(match);
  const rankWeight = 1.0 / (rank + 1);

  return match.confidence * rankWeight;
}
```

### Algorithm 3: Context Requirement Validation
```
function checkContextRequirements(operator, conversationContext) {
  const requirements = operator.invocation_conditions.context_requirements;

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
```

### Algorithm 4: Confidence Scoring
```
function calculateOperatorConfidence(operator, request, domains, context) {
  const weights = {
    triggerMatch: 0.40,
    domainAlignment: 0.30,
    contextRequirements: 0.20,
    collaboration: 0.10
  };

  const triggerScore = operator.triggerScore || 0;
  const domainScore = this.scoreDomainAlignment(operator, domains);
  const contextScore = this.checkContextRequirements(operator, context);
  const collaborationScore = this.getCollaborationScore(
    operator.operatorId,
    context.recentOperators
  );

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
```

### Algorithm 5: Collision Resolution
```
function resolveOperatorCollisions(candidates, threshold = 0.75) {
  const highConfidence = candidates.filter(c => c.confidence.overall >= threshold);

  if (highConfidence.length === 0) {
    return candidates.slice(0, 3);
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

  for (const [domain, leads] of Object.entries(hierarchy)) {
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
    .slice(0, 3);
}
```

## IV. Orchestration Logic
### Decision Tree: Single vs. Multi-Operator
```
class OrchestrationPlanner {
  decide(analysis, selectedOperators, context) {
    const factors = {
      explicitOrchestration: analysis.orchestrationHints.detected,
      multiDomain: analysis.domains.length > 1,
      complexityLevel: analysis.complexity.level,
      multipleOperators: selectedOperators.length > 1,
      explicitOperatorNames: analysis.explicitOperators.length > 1
    };

    if (factors.explicitOrchestration) {
      return {
        type: analysis.orchestrationHints.type,
        operators: selectedOperators,
        reason: 'Explicit orchestration pattern detected'
      };
    }

    if (factors.explicitOperatorNames) {
      return {
        type: this.inferOrchestrationFromNaming(analysis.explicitOperators),
        operators: analysis.explicitOperators.map(e =>
          selectedOperators.find(o => o.operatorId === e.operatorId)
        ),
        reason: 'Multiple operators explicitly named'
      };
    }

    if (factors.multiDomain && factors.complexityLevel === 'complex') {
      return {
        type: 'sequential',
        operators: this.orderOperatorsByDomain(selectedOperators, analysis.domains),
        reason: 'Complex cross-domain task requiring sequential execution'
      };
    }

    if (factors.multipleOperators && factors.multiDomain) {
      return {
        type: 'parallel',
        operators: selectedOperators.slice(0, 2),
        reason: 'Multiple domain perspectives needed'
      };
    }

    return {
      type: 'single',
      operators: [selectedOperators[0]],
      reason: 'Single-domain consultation'
    };
  }
}
```

### Sequential Workflow Builder
```
function buildSequentialWorkflow(operators, request, context) {
  const workflow = {
    type: 'sequential',
    steps: [],
    totalEstimatedTime: 0
  };

  for (let i = 0; i < operators.length; i++) {
    const operator = operators[i];
    const isFirst = i === 0;
    const isLast = i === operators.length - 1;

    const step = {
      stepNumber: i + 1,
      operator: operator.operatorId,
      task: this.generateStepTask(operator, request, isFirst, isLast),
      context: this.buildStepContext(operator, context, workflow.steps),
      estimatedTime: this.estimateOperatorTime(operator),
      dependencies: isFirst ? [] : [i]
    };

    workflow.steps.push(step);
    workflow.totalEstimatedTime += step.estimatedTime;
  }

  return workflow;
}
```

### Parallel Workflow Builder
```
function buildParallelWorkflow(operators, request, context) {
  const workflow = {
    type: 'parallel',
    branches: [],
    totalEstimatedTime: 0
  };

  for (const operator of operators) {
    const branch = {
      operator: operator.operatorId,
      task: request,
      context: this.buildOperatorContext(operator, context),
      estimatedTime: this.estimateOperatorTime(operator),
      dependencies: []
    };

    workflow.branches.push(branch);
    workflow.totalEstimatedTime = Math.max(
      workflow.totalEstimatedTime,
      branch.estimatedTime
    );
  }

  workflow.synthesis = {
    type: 'parallel_synthesis',
    operators: operators.map(o => o.operatorId),
    estimatedTime: 2000
  };

  workflow.totalEstimatedTime += workflow.synthesis.estimatedTime;
  return workflow;
}
```

## V. Context Management
Context loading strategy covers:
- Project-level context
- Operator-specific memory
- Recent conversation history
- Collaboration history
- User preferences
- Related artifacts

## VI. Execution and Response Synthesis
Execution supports:
- Single operator
- Sequential workflows
- Parallel workflows

Response synthesis supports:
- Sequential narrative flow
- Parallel perspectives
- Integrated recommendations

## VII. Complete Router Implementation
Reference implementation in this document.

## VIII. Test Cases
- Single operator - explicit business
- Sequential multi-operator - explicit
- Parallel multi-operator - implicit
- Cross-domain auto-orchestration
- Risk assessment
- Legal consultation
- Common sense check

END OF ROUTER LOGIC SPECIFICATION v1.0.0
