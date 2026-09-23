@echo off
echo.
echo ==========================================
echo   AEGIS - AI-Powered GitHub Intelligence
echo ==========================================
echo.

echo [1/5] Checking prerequisites...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install from: https://nodejs.org/
    echo (Choose the LTS version - v18 or higher)
    pause
    exit /b 1
)

echo Node.js found: 
node --version

echo.
echo [2/5] Installing dependencies (this may take a minute)...
npm run install-all
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [3/5] Setting up environment...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo.
    echo IMPORTANT: Created backend\.env from example
    echo You MUST edit backend\.env and add your GitHub Personal Access Token
    echo Get one at: https://github.com/settings/tokens
    echo.
    notepad backend\.env
)

echo.
echo [4/5] Starting Aegis...
echo Backend will run on: http://localhost:5000
echo Frontend will run on: http://localhost:5173
echo.
echo Press Ctrl+C to stop both servers
echo.

npm run dev
