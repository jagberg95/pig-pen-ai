# pig-pen-ai
Jons AI STACK

## Quick Start

### 1. Install dependencies

```bash
cd openclaw/skills/pigpen
npm install
```

### 2. Configure your API key

Copy the example env file and add your Anthropic key:

```bash
cp .env.example .env
```

Then open `.env` and replace the placeholder with your real key:

```
ANTHROPIC_API_KEY=sk-ant-your-real-key-here
```

Get a key at [console.anthropic.com](https://console.anthropic.com).

### 3. Usage

```js
const { handleIncomingMessage } = require('./openclaw/skills/pigpen');

const result = await handleIncomingMessage({
  message: "Trey, what's the Q3 marketing strategy?",
  userId: 'jon',
  executeLLM: true  // true = call Claude, false = routing-only dry run
});

console.log(result.response); // Trey's full response in his voice
```

### Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `message` | string | *required* | The user's message |
| `userId` | string | *required* | Who is sending the message |
| `conversationContext` | object | `{}` | Prior conversation state |
| `projectContext` | object | `{}` | Project-specific data |
| `executeLLM` | boolean | `true` | `true` = call Claude, `false` = return routing + prompt only (no tokens spent) |
| `llmConfig` | object | `{}` | Override `apiKey`, `model`, or `maxTokens` |

### Execution Modes

| Mode | When | What happens |
|------|------|--------------|
| **Single** | One operator matched | One Claude call with that operator's system prompt |
| **Sequential** | Complex cross-domain task | Operators run in order, each sees prior outputs, then a synthesis pass merges everything |
| **Parallel** | Multiple independent perspectives | All operators fire concurrently, then a synthesis pass unifies the results |

### Dry Run (no tokens spent)

Set `executeLLM: false` to test routing without calling the API:

```js
const result = await handleIncomingMessage({
  message: "Naomi, what brand direction should we take?",
  userId: 'jon',
  executeLLM: false
});

console.log(result.systemPrompt);  // The prompt that would be sent
console.log(result.operatorId);    // "naomi_top"
```
