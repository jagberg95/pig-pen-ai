@echo off
setlocal enabledelayedexpansion

echo.
echo  ============================================
echo   Pig Pen AI - Installer
echo   Pearl ^& Pig
echo  ============================================
echo.

:: ── Check Node.js ─────────────────────────────────────────────────
echo [1/4] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Node.js is not installed.
    echo  Download it from https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo       Found Node.js %NODE_VER%

:: ── Check npm ─────────────────────────────────────────────────────
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: npm is not installed.
    echo  It should come with Node.js - try reinstalling Node.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo       Found npm v%NPM_VER%

:: ── Install dependencies ──────────────────────────────────────────
echo.
echo [2/4] Installing dependencies...
cd /d "%~dp0openclaw\skills\pigpen"
call npm install
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: npm install failed. Check the output above.
    echo.
    pause
    exit /b 1
)
echo       Dependencies installed successfully.

:: ── Setup .env ────────────────────────────────────────────────────
cd /d "%~dp0"
echo.
echo [3/4] Configuring environment...

if exist ".env" (
    echo       .env file already exists - skipping.
    echo       To reconfigure, delete .env and run setup again.
) else (
    copy ".env.example" ".env" >nul 2>nul

    echo.
    echo  Choose your LLM provider:
    echo.
    echo    [1] Groq  (FREE cloud - Llama 3.3 70B)
    echo        Get a free key at https://console.groq.com
    echo.
    echo    [2] Ollama (FREE local - no API key needed)
    echo        Install from https://ollama.com
    echo.
    echo    [3] Anthropic (PAID - Claude)
    echo        Key from https://console.anthropic.com
    echo.
    set /p PROVIDER_CHOICE="  Choice [1/2/3]: "

    if "!PROVIDER_CHOICE!"=="2" (
        :: Ollama — no key needed
        (
            echo # Pig Pen Environment Variables
            echo LLM_PROVIDER=ollama
            echo OLLAMA_URL=http://localhost:11434
        ) > ".env"
        echo.
        echo       Ollama selected. Make sure Ollama is running:
        echo         ollama pull llama3.1
        echo         ollama serve
    ) else if "!PROVIDER_CHOICE!"=="3" (
        :: Anthropic
        echo.
        set /p API_KEY="  Anthropic API Key: "
        if "!API_KEY!"=="" (
            echo  No key entered. Add it later in .env
        ) else (
            (
                echo # Pig Pen Environment Variables
                echo LLM_PROVIDER=anthropic
                echo ANTHROPIC_API_KEY=!API_KEY!
            ) > ".env"
            echo       API key saved to .env
        )
    ) else (
        :: Groq (default / choice 1)
        echo.
        set /p API_KEY="  Groq API Key (free from console.groq.com): "
        if "!API_KEY!"=="" (
            echo  No key entered. Add it later in .env
        ) else (
            (
                echo # Pig Pen Environment Variables
                echo LLM_PROVIDER=groq
                echo GROQ_API_KEY=!API_KEY!
            ) > ".env"
            echo       API key saved to .env
        )
    )
)

:: ── Verify installation ──────────────────────────────────────────
echo.
echo [4/4] Verifying installation...
cd /d "%~dp0"
node -e "try { const { shouldHandleMessage } = require('./openclaw/skills/pigpen'); console.log('       Pig Pen module loaded successfully.'); const ok = shouldHandleMessage('Hey Jon, need your help'); console.log('       Router test: ' + (ok ? 'PASS' : 'FAIL')); } catch(e) { console.log('  ERROR: ' + e.message); process.exit(1); }"
if %errorlevel% neq 0 (
    echo.
    echo  WARNING: Verification failed. Check the errors above.
    echo.
    pause
    exit /b 1
)

:: ── Done ──────────────────────────────────────────────────────────
echo.
echo  ============================================
echo   Setup complete!
echo  ============================================
echo.
echo  Next steps:
echo    1. Make sure your API key is in .env
echo    2. Run your app or test with:
echo       node -e "const pp = require('./openclaw/skills/pigpen')"
echo.
pause
