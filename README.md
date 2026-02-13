# pig-pen-ai
Jons AI STACK

## Installation

Run the installer — it handles dependencies, API key setup, and verification in one step:

**Windows:**
```
setup.bat
```

**Mac / Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

The installer will:
1. Check that Node.js and npm are installed
2. Install all dependencies
3. Let you choose a free or paid LLM provider and save config to `.env`
4. Verify the module loads and routing works

### LLM Providers

| Provider | Cost | API Key? | Notes |
|----------|------|----------|-------|
| **Groq** | Free | Yes (free) | Cloud-based, Llama 3.3 70B. Get a key at [console.groq.com](https://console.groq.com) |
| **Ollama** | Free | No | Runs locally on your machine. Install from [ollama.com](https://ollama.com) |
| **Anthropic** | Paid | Yes | Claude models. Key from [console.anthropic.com](https://console.anthropic.com) |

---

## Manual Setup

If you prefer to set things up yourself:

### 1. Install dependencies

```bash
cd openclaw/skills/pigpen
npm install
```

### 2. Configure your LLM provider

Copy the example env file:

```bash
cp .env.example .env
```

Then set your provider in `.env`:

**Groq (free cloud):**
```
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your-free-key-here
```

**Ollama (free local, no key):**
```
LLM_PROVIDER=ollama
```

**Anthropic (paid):**
```
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

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
| `executeLLM` | boolean | `true` | `true` = call LLM, `false` = return routing + prompt only (no tokens spent) |
| `llmConfig` | object | `{}` | Override `provider`, `apiKey`, `model`, or `maxTokens` |

### Execution Modes

| Mode | When | What happens |
|------|------|--------------|
| **Single** | One operator matched | One LLM call with that operator's system prompt |
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

### Terminal Chat

Chat with your operators directly from the terminal:

```bash
node chat.js
```

Inside the chat:
- Address operators by name: `Jon, what's the vision for Q3?`
- `/operators` — list all available operators
- `/status` — show provider and model info
- `/help` — show all commands
- `/exit` — quit
