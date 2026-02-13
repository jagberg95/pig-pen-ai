class OrchestrationPlanner {
  decide(analysis, selectedOperators) {
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
        type: inferOrchestrationFromNaming(analysis.explicitOperators),
        operators: analysis.explicitOperators.map(e =>
          selectedOperators.find(o => o.operatorId === e.operatorId)
        ).filter(Boolean),
        reason: 'Multiple operators explicitly named'
      };
    }

    if (factors.multiDomain && factors.complexityLevel === 'complex') {
      return {
        type: 'sequential',
        operators: orderOperatorsByDomain(selectedOperators, analysis.domains),
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

function inferOrchestrationFromNaming(explicitOperators) {
  return explicitOperators.length > 1 &&
    explicitOperators[1].position - explicitOperators[0].position > 10
    ? 'sequential'
    : 'parallel';
}

function orderOperatorsByDomain(operators, domains) {
  const domainOrder = {
    executive: 1,
    business: 1,
    creative: 2,
    systems: 3,
    operations: 3,
    growth: 4,
    legal: 5
  };

  return operators.slice().sort((a, b) => {
    const orderA = domainOrder[a.domain] || 99;
    const orderB = domainOrder[b.domain] || 99;
    return orderA - orderB;
  });
}

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
      task: generateStepTask(operator, request, isFirst, isLast),
      context: buildStepContext(context, workflow.steps),
      estimatedTime: estimateOperatorTime(operator),
      dependencies: isFirst ? [] : [i]
    };

    workflow.steps.push(step);
    workflow.totalEstimatedTime += step.estimatedTime;
  }

  return workflow;
}

function generateStepTask(_operator, originalRequest, isFirst) {
  if (isFirst) {
    return originalRequest;
  }

  return `Building on the previous analysis, ${originalRequest}`;
}

function buildStepContext(globalContext, previousSteps) {
  const context = { ...globalContext };

  if (previousSteps.length > 0) {
    context.previousOperatorOutputs = previousSteps.map(step => ({
      operator: step.operator,
      output: step.output,
      key_insights: step.keyInsights
    }));
  }

  return context;
}

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
      context: { ...context },
      estimatedTime: estimateOperatorTime(operator),
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

function estimateOperatorTime(_operator) {
  return 2000;
}

module.exports = {
  OrchestrationPlanner,
  buildSequentialWorkflow,
  buildParallelWorkflow
};
