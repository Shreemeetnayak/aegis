@echo off
echo.
echo ==========================================
echo   AEGIS - One-Click Install & Run
echo ==========================================
echo.
echo This script will:
echo 1. Check if Node.js is installed
echo 2. Install all dependencies automatically
echo 3. Set up the environment file
echo 4. Start the application
echo.
echo Press any key to continue, or Ctrl+C to cancel...
pause >nul

echo.
echo [1/3] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ==========================================
    echo Node.js NOT FOUND - Installing automatically...
    echo ==========================================
    echo.
    echo Downloading Node.js LTS installer...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -OutFile 'node-installer.msi'"
    echo Installing Node.js (this may take a few minutes)...
    msiexec /i node-installer.msi /quiet /norestart
    if %errorlevel% neq 0 (
        echo.
        echo AUTOMATIC INSTALL FAILED
        echo Please manually install Node.js from: https://nodejs.org/
        echo Then run this script again.
        del node-installer.msi 2>nul
        pause
        exit /b 1
    )
    del node-installer.msi 2>nul
    echo Node.js installed successfully!
    echo.
    echo IMPORTANT: Please CLOSE THIS WINDOW and open a NEW Command Prompt
    echo Then run this script again.
    pause
    exit /b 0
)

echo Node.js found: 
node --version

echo.
echo [2/3] Installing Aegis dependencies...
npm run install-all
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [3/3] Setting up environment...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo.
    echo ==========================================
    echo ACTION REQUIRED: Add your GitHub Token
    echo ==========================================
    echo.
    echo A file 'backend\.env' has been created.
    echo You need to add your GitHub Personal Access Token.
    echo.
    echo 1. Opening the file in Notepad...
    echo 2. Get your token at: https://github.com/settings/tokens
    echo 3. Paste it next to GITHUB_TOKEN=
    echo 4. Save and close Notepad
    echo.
    timeout /t 3 /nobreak >nul
    notepad backend\.env
)

echo.
echo ==========================================
echo STARTING AEGIS...
echo ==========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Opening browser in 5 seconds...
echo Press Ctrl+C in this window to stop the servers
echo.

timeout /t 5 /nobreak >nul
start http://localhost:5173

npm run dev
