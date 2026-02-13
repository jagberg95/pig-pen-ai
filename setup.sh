#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo " ============================================"
echo "  Pig Pen AI - Installer"
echo "  Pearl & Pig"
echo " ============================================"
echo ""

# ── Check Node.js ─────────────────────────────────────────────────
echo "[1/4] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo ""
    echo " ERROR: Node.js is not installed."
    echo " Install it from https://nodejs.org or via your package manager."
    echo ""
    exit 1
fi
NODE_VER=$(node -v)
echo "      Found Node.js $NODE_VER"

# ── Check npm ─────────────────────────────────────────────────────
if ! command -v npm &> /dev/null; then
    echo ""
    echo " ERROR: npm is not installed."
    echo " It should come with Node.js - try reinstalling Node."
    echo ""
    exit 1
fi
NPM_VER=$(npm -v)
echo "      Found npm v$NPM_VER"

# ── Install dependencies ──────────────────────────────────────────
echo ""
echo "[2/4] Installing dependencies..."
cd "$SCRIPT_DIR/openclaw/skills/pigpen"
npm install
echo "      Dependencies installed successfully."

# ── Setup .env ────────────────────────────────────────────────────
cd "$SCRIPT_DIR"
echo ""
echo "[3/4] Configuring environment..."

if [ -f ".env" ]; then
    echo "      .env file already exists - skipping."
    echo "      To reconfigure, delete .env and run setup again."
else
    cp .env.example .env

    echo ""
    echo " Choose your LLM provider:"
    echo ""
    echo "   [1] Groq  (FREE cloud - Llama 3.3 70B)"
    echo "       Get a free key at https://console.groq.com"
    echo ""
    echo "   [2] Ollama (FREE local - no API key needed)"
    echo "       Install from https://ollama.com"
    echo ""
    echo "   [3] Anthropic (PAID - Claude)"
    echo "       Key from https://console.anthropic.com"
    echo ""
    read -p "  Choice [1/2/3]: " PROVIDER_CHOICE

    case "$PROVIDER_CHOICE" in
        2)
            # Ollama — no key needed
            cat > .env << EOF
# Pig Pen Environment Variables
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
EOF
            echo ""
            echo "      Ollama selected. Make sure Ollama is running:"
            echo "        ollama pull llama3.1"
            echo "        ollama serve"
            ;;
        3)
            # Anthropic
            echo ""
            read -p "  Anthropic API Key: " API_KEY
            if [ -z "$API_KEY" ]; then
                echo " No key entered. Add it later in .env"
            else
                cat > .env << EOF
# Pig Pen Environment Variables
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=$API_KEY
EOF
                echo "      API key saved to .env"
            fi
            ;;
        *)
            # Groq (default / choice 1)
            echo ""
            read -p "  Groq API Key (free from console.groq.com): " API_KEY
            if [ -z "$API_KEY" ]; then
                echo " No key entered. Add it later in .env"
            else
                cat > .env << EOF
# Pig Pen Environment Variables
LLM_PROVIDER=groq
GROQ_API_KEY=$API_KEY
EOF
                echo "      API key saved to .env"
            fi
            ;;
    esac
fi

# ── Verify installation ──────────────────────────────────────────
echo ""
echo "[4/4] Verifying installation..."
cd "$SCRIPT_DIR"
node -e "
try {
  const { shouldHandleMessage } = require('./openclaw/skills/pigpen');
  console.log('      Pig Pen module loaded successfully.');
  const ok = shouldHandleMessage('Hey Jon, need your help');
  console.log('      Router test: ' + (ok ? 'PASS' : 'FAIL'));
} catch(e) {
  console.log('  ERROR: ' + e.message);
  process.exit(1);
}
"

# ── Done ──────────────────────────────────────────────────────────
echo ""
echo " ============================================"
echo "  Setup complete!"
echo " ============================================"
echo ""
echo " Next steps:"
echo "   1. Make sure your API key is in .env"
echo "   2. Run your app or test with:"
echo "      node -e \"const pp = require('./openclaw/skills/pigpen')\""
echo ""
