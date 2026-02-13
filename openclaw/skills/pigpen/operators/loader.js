const fs = require('fs');

function loadOperatorRegistry(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const registry = JSON.parse(raw);

  validateRegistry(registry);
  return registry;
}

function validateRegistry(registry) {
  if (!registry || typeof registry !== 'object') {
    throw new Error('Operator registry is missing or invalid');
  }

  if (!registry.version || !registry.operator_count) {
    throw new Error('Operator registry missing version or operator_count');
  }

  if (!registry.domains || !registry.operators) {
    throw new Error('Operator registry missing domains or operators');
  }

  const operatorIds = Object.keys(registry.operators);
  if (operatorIds.length !== registry.operator_count) {
    throw new Error('operator_count does not match operators length');
  }

  for (const operatorId of operatorIds) {
    validateOperator(operatorId, registry.operators[operatorId]);
  }
}

function validateOperator(operatorId, operator) {
  const requiredFields = ['id', 'name', 'role', 'domain', 'tags', 'core_attributes', 'invocation_conditions', 'response_framework', 'system_prompt_template'];
  for (const field of requiredFields) {
    if (!operator[field]) {
      throw new Error(`Operator ${operatorId} missing required field: ${field}`);
    }
  }

  if (!Array.isArray(operator.invocation_conditions.triggers)) {
    throw new Error(`Operator ${operatorId} missing triggers array`);
  }
}

module.exports = {
  loadOperatorRegistry
};
