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
    echo.
    echo  Choose your LLM provider:
    echo.
    echo    [1] Groq  - FREE cloud, Llama 3.3 70B
    echo        Get a free key at https://console.groq.com
    echo.
    echo    [2] Ollama - FREE local, no API key needed
    echo        Install from https://ollama.com
    echo.
    echo    [3] Anthropic - PAID, Claude
    echo        Key from https://console.anthropic.com
    echo.
    set /p PROVIDER_CHOICE="  Choice [1/2/3]: "

    if "!PROVIDER_CHOICE!"=="2" goto :ollama
    if "!PROVIDER_CHOICE!"=="3" goto :anthropic
    goto :groq
)
goto :env_done

:groq
echo.
set /p API_KEY="  Groq API Key (free from console.groq.com): "
if "!API_KEY!"=="" (
    echo  No key entered. You can add it later in .env
    (
        echo # Pig Pen Environment Variables
        echo LLM_PROVIDER=groq
        echo # Get a free key at https://console.groq.com
        echo GROQ_API_KEY=
    ) > ".env"
) else (
    (
        echo # Pig Pen Environment Variables
        echo LLM_PROVIDER=groq
        echo GROQ_API_KEY=!API_KEY!
    ) > ".env"
    echo       API key saved to .env
)
goto :env_done

:ollama
(
    echo # Pig Pen Environment Variables
    echo LLM_PROVIDER=ollama
    echo OLLAMA_URL=http://localhost:11434
) > ".env"

:: Check if Ollama is already installed
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    echo       Ollama is already installed.
    goto :ollama_pull
)

:: Download and install Ollama
echo.
echo       Downloading Ollama installer...
cd /d "%~dp0"
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile 'OllamaSetup.exe' -UseBasicParsing }"
if not exist "OllamaSetup.exe" (
    echo.
    echo  ERROR: Failed to download Ollama.
    echo  Download manually from https://ollama.com
    echo.
    pause
    exit /b 1
)
echo       Installing Ollama (this may take a minute)...
start /wait OllamaSetup.exe /VERYSILENT /NORESTART
del /f OllamaSetup.exe >nul 2>nul

:: Verify it installed
where ollama >nul 2>nul
if %errorlevel% neq 0 (
    :: Try adding the default install path
    set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Ollama"
    where ollama >nul 2>nul
    if %errorlevel% neq 0 (
        echo.
        echo  ERROR: Ollama installation may have failed.
        echo  Try installing manually from https://ollama.com
        echo  Then run setup.bat again.
        echo.
        pause
        exit /b 1
    )
)
echo       Ollama installed successfully.

:ollama_pull
:: Start Ollama service if not already running
echo.
echo       Starting Ollama service...
powershell -Command "& { try { Invoke-WebRequest -Uri 'http://localhost:11434/api/tags' -UseBasicParsing -TimeoutSec 2 | Out-Null; Write-Host '       Ollama is already running.' } catch { Start-Process 'ollama' -ArgumentList 'serve' -WindowStyle Hidden; Start-Sleep -Seconds 3; Write-Host '       Ollama service started.' } }"

:: Pull the model
echo       Pulling llama3.1 model (this may take several minutes on first run)...
ollama pull llama3.1
if %errorlevel% neq 0 (
    echo.
    echo  WARNING: Model pull failed. You can try manually:
    echo    ollama pull llama3.1
    echo.
)
echo       Ollama is ready.
goto :env_done

:anthropic
echo.
set /p API_KEY="  Anthropic API Key: "
if "!API_KEY!"=="" (
    echo  No key entered. You can add it later in .env
    (
        echo # Pig Pen Environment Variables
        echo LLM_PROVIDER=anthropic
        echo # Get a key at https://console.anthropic.com
        echo ANTHROPIC_API_KEY=
    ) > ".env"
) else (
    (
        echo # Pig Pen Environment Variables
        echo LLM_PROVIDER=anthropic
        echo ANTHROPIC_API_KEY=!API_KEY!
    ) > ".env"
    echo       API key saved to .env
)
goto :env_done

:env_done

:: ── Verify installation ──────────────────────────────────────────
echo.
echo [4/4] Verifying installation...
cd /d "%~dp0"
node verify.js
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
echo  Launching Pig Pen chat...
echo.
cd /d "%~dp0"
node chat.js
