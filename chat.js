#!/usr/bin/env node

/**
 * Pig Pen CLI — Chat with your AI operators from the terminal.
 *
 * Usage:
 *   node chat.js
 *
 * Commands inside the chat:
 *   /operators  — List all available operators
 *   /status     — Show current provider and model
 *   /clear      — Clear conversation history
 *   /help       — Show this help
 *   /exit       — Quit
 */

const readline = require('readline');
const path = require('path');

// Load .env from project root
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
} catch (_) {
  // dotenv not installed — env vars must be set manually
}

const { handleIncomingMessage, shouldHandleMessage } = require('./openclaw/skills/pigpen');
const { detectProvider, PROVIDERS } = require('./openclaw/skills/pigpen/llm');
const { loadOperatorRegistry } = require('./openclaw/skills/pigpen/operators/loader');

const registryPath = path.join(__dirname, 'openclaw', 'skills', 'pigpen', 'operators', 'profiles.json');
const registry = loadOperatorRegistry(registryPath);

const USER_ID = 'cli-user';

// ─── Colors ─────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

// ─── Helpers ────────────────────────────────────────────────────────

function printBanner() {
  console.log('');
  console.log(`${c.cyan}${c.bold}  ┌─────────────────────────────────────┐${c.reset}`);
  console.log(`${c.cyan}${c.bold}  │         PIG PEN AI — Chat           │${c.reset}`);
  console.log(`${c.cyan}${c.bold}  │         Pearl & Pig                 │${c.reset}`);
  console.log(`${c.cyan}${c.bold}  └─────────────────────────────────────┘${c.reset}`);
  console.log('');
}

function printHelp() {
  console.log(`${c.yellow}  Commands:${c.reset}`);
  console.log(`    ${c.bold}/operators${c.reset}  — List available operators`);
  console.log(`    ${c.bold}/status${c.reset}     — Show provider & model info`);
  console.log(`    ${c.bold}/clear${c.reset}      — Clear conversation history`);
  console.log(`    ${c.bold}/help${c.reset}       — Show this help`);
  console.log(`    ${c.bold}/exit${c.reset}       — Quit`);
  console.log('');
  console.log(`${c.yellow}  Chat tips:${c.reset}`);
  console.log(`    Address operators by name: ${c.dim}"Jon, what's the vision for Q3?"${c.reset}`);
  console.log(`    Or use commands: ${c.dim}"#invoke strategy review"${c.reset}`);
  console.log('');
}

function printOperators() {
  console.log(`\n${c.yellow}  Available Operators:${c.reset}\n`);
  const domains = {};
  for (const [id, op] of Object.entries(registry.operators)) {
    if (!domains[op.domain]) domains[op.domain] = [];
    domains[op.domain].push({ id, name: op.name, role: op.role });
  }
  for (const [domain, ops] of Object.entries(domains)) {
    console.log(`  ${c.cyan}${c.bold}${domain.toUpperCase()}${c.reset}`);
    for (const op of ops) {
      console.log(`    ${c.green}${op.name}${c.reset} ${c.dim}— ${op.role}${c.reset}`);
    }
    console.log('');
  }
}

function printStatus() {
  let provider;
  try {
    provider = detectProvider();
  } catch (_) {
    provider = 'unknown';
  }
  const info = PROVIDERS[provider] || {};
  console.log(`\n${c.yellow}  Status:${c.reset}`);
  console.log(`    Provider: ${c.bold}${info.name || provider}${c.reset} ${info.free ? c.green + '(free)' + c.reset : c.yellow + '(paid)' + c.reset}`);
  console.log(`    Model:    ${c.bold}${info.defaultModel || 'unknown'}${c.reset}`);
  console.log(`    Operators loaded: ${c.bold}${Object.keys(registry.operators).length}${c.reset}`);
  console.log('');
}

function wrapText(text, width = 80) {
  // Simple word-wrap for long responses
  const lines = text.split('\n');
  return lines.map(line => {
    if (line.length <= width) return line;
    const words = line.split(' ');
    let current = '';
    const wrapped = [];
    for (const word of words) {
      if ((current + ' ' + word).trim().length > width) {
        wrapped.push(current);
        current = word;
      } else {
        current = (current + ' ' + word).trim();
      }
    }
    if (current) wrapped.push(current);
    return wrapped.join('\n');
  }).join('\n');
}

// ─── Main Chat Loop ─────────────────────────────────────────────────

async function main() {
  printBanner();

  // Check if provider is configured
  let provider;
  try {
    provider = detectProvider();
    const info = PROVIDERS[provider];
    console.log(`  ${c.green}✓${c.reset} Provider: ${c.bold}${info.name}${c.reset} ${info.free ? c.green + '(free)' + c.reset : ''} — ${c.dim}${info.defaultModel}${c.reset}`);
    console.log(`  ${c.green}✓${c.reset} Operators: ${c.bold}${Object.keys(registry.operators).length}${c.reset} loaded`);
  } catch (e) {
    console.log(`  ${c.red}✗${c.reset} No LLM provider configured. Run ${c.bold}setup.bat${c.reset} first or set env vars.`);
    console.log(`    ${c.dim}${e.message}${c.reset}`);
  }

  console.log('');
  console.log(`  Type a message to chat, or ${c.bold}/help${c.reset} for commands.`);
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${c.cyan}  you › ${c.reset}`
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    // Handle commands
    if (input === '/exit' || input === '/quit' || input === '/q') {
      console.log(`\n${c.dim}  Goodbye.${c.reset}\n`);
      process.exit(0);
    }
    if (input === '/help' || input === '/?') {
      printHelp();
      rl.prompt();
      return;
    }
    if (input === '/operators') {
      printOperators();
      rl.prompt();
      return;
    }
    if (input === '/status') {
      printStatus();
      rl.prompt();
      return;
    }
    if (input === '/clear') {
      console.log(`  ${c.dim}Conversation cleared.${c.reset}\n`);
      rl.prompt();
      return;
    }

    // Route and execute
    console.log(`\n  ${c.dim}Routing...${c.reset}`);

    try {
      const result = await handleIncomingMessage({
        message: input,
        userId: USER_ID,
        executeLLM: true
      });

      if (result.error && !result.response) {
        console.log(`\n  ${c.red}Error: ${result.error}${c.reset}\n`);
        rl.prompt();
        return;
      }

      // Show which operator responded
      const opId = result.operatorId;
      const op = registry.operators[opId];
      const opName = op ? op.name : opId;
      const opRole = op ? op.role : '';

      console.log(`  ${c.green}${c.bold}${opName}${c.reset} ${c.dim}(${opRole})${c.reset}`);

      if (result.routing && result.routing.orchestration) {
        const orch = result.routing.orchestration;
        if (orch.type !== 'single') {
          const opNames = orch.operators.map(o => {
            const p = registry.operators[o.operatorId];
            return p ? p.name : o.operatorId;
          });
          console.log(`  ${c.dim}${orch.type} workflow: ${opNames.join(' → ')}${c.reset}`);
        }
      }

      console.log('');

      // Print the response
      const response = result.response || result.systemPrompt || '(no response)';
      const wrapped = wrapText(response, 78);
      const indented = wrapped.split('\n').map(l => `  ${l}`).join('\n');
      console.log(`${c.magenta}${indented}${c.reset}`);
      console.log('');

    } catch (err) {
      console.log(`\n  ${c.red}Error: ${err.message}${c.reset}`);
      if (err.message.includes('API key') || err.message.includes('apiKey')) {
        console.log(`  ${c.dim}Run setup.bat to configure your LLM provider.${c.reset}`);
      }
      console.log('');
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(`\n${c.dim}  Goodbye.${c.reset}\n`);
    process.exit(0);
  });
}

main().catch(err => {
  console.error(`${c.red}Fatal: ${err.message}${c.reset}`);
  process.exit(1);
});
