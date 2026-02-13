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

            # Check if Ollama is already installed
            if command -v ollama &> /dev/null; then
                echo "      Ollama is already installed."
            else
                echo ""
                echo "      Downloading and installing Ollama..."
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    # macOS
                    curl -fsSL https://ollama.com/download/Ollama-darwin.zip -o /tmp/Ollama.zip
                    unzip -o /tmp/Ollama.zip -d /Applications > /dev/null 2>&1
                    rm /tmp/Ollama.zip
                else
                    # Linux
                    curl -fsSL https://ollama.com/install.sh | sh
                fi

                if ! command -v ollama &> /dev/null; then
                    echo ""
                    echo " ERROR: Ollama installation may have failed."
                    echo " Install manually from https://ollama.com"
                    echo " Then run setup.sh again."
                    exit 1
                fi
                echo "      Ollama installed successfully."
            fi

            # Start Ollama service if not running
            echo ""
            echo "      Starting Ollama service..."
            if curl -s --connect-timeout 2 http://localhost:11434/api/tags > /dev/null 2>&1; then
                echo "      Ollama is already running."
            else
                ollama serve > /dev/null 2>&1 &
                sleep 3
                echo "      Ollama service started."
            fi

            # Pull the model
            echo "      Pulling llama3.1 model (this may take several minutes on first run)..."
            ollama pull llama3.1
            echo "      Ollama is ready."
            ;;
        3)
            # Anthropic
            echo ""
            echo "      Checking for Anthropic SDK..."
            if npm list @anthropic-ai/sdk > /dev/null 2>&1; then
                echo "      @anthropic-ai/sdk already installed."
            else
                echo "      Installing @anthropic-ai/sdk..."
                npm install @anthropic-ai/sdk --save > /dev/null 2>&1
                echo "      @anthropic-ai/sdk installed."
            fi
            echo ""
            echo "      Opening Anthropic console to get your API key..."
            if [[ "$OSTYPE" == "darwin"* ]]; then
                open "https://console.anthropic.com/settings/keys"
            else
                xdg-open "https://console.anthropic.com/settings/keys" 2>/dev/null || echo "      Visit: https://console.anthropic.com/settings/keys"
            fi
            echo ""
            read -p "  Paste your Anthropic API Key: " API_KEY
            if [ -z "$API_KEY" ]; then
                echo " No key entered. You can add it later in .env"
                cat > .env << EOF
# Pig Pen Environment Variables
LLM_PROVIDER=anthropic
# Get a key at https://console.anthropic.com
ANTHROPIC_API_KEY=
EOF
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
            echo "      Checking for Groq SDK..."
            if npm list groq-sdk > /dev/null 2>&1; then
                echo "      groq-sdk already installed."
            else
                echo "      Installing groq-sdk..."
                npm install groq-sdk --save > /dev/null 2>&1
                echo "      groq-sdk installed."
            fi
            echo ""
            echo "      Opening Groq console to get your free API key..."
            if [[ "$OSTYPE" == "darwin"* ]]; then
                open "https://console.groq.com/keys"
            else
                xdg-open "https://console.groq.com/keys" 2>/dev/null || echo "      Visit: https://console.groq.com/keys"
            fi
            echo ""
            read -p "  Paste your Groq API Key: " API_KEY
            if [ -z "$API_KEY" ]; then
                echo " No key entered. You can add it later in .env"
                cat > .env << EOF
# Pig Pen Environment Variables
LLM_PROVIDER=groq
# Get a free key at https://console.groq.com
GROQ_API_KEY=
EOF
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
node verify.js

# ── Done ──────────────────────────────────────────────────────────
echo ""
echo " ============================================"
echo "  Setup complete!"
echo " ============================================"
echo ""
echo " Launching Pig Pen chat..."
echo ""
cd "$SCRIPT_DIR"
node chat.js
