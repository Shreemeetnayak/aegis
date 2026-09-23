#!/bin/bash

echo ""
echo "=========================================="
echo "   AEGIS - AI-Powered GitHub Intelligence"
echo "=========================================="
echo ""

echo "[1/5] Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please download and install from: https://nodejs.org/"
    echo "(Choose the LTS version - v18 or higher)"
    exit 1
fi

echo "Node.js found: $(node --version)"

echo ""
echo "[2/5] Installing dependencies (this may take a minute)..."
npm run install-all
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo ""
echo "[3/5] Setting up environment..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo ""
    echo "IMPORTANT: Created backend/.env from example"
    echo "You MUST edit backend/.env and add your GitHub Personal Access Token"
    echo "Get one at: https://github.com/settings/tokens"
    echo ""
    
    # Try to open with default editor
    if command -v code &> /dev/null; then
        code backend/.env
    elif command -v vim &> /dev/null; then
        vim backend/.env
    elif command -v nano &> /dev/null; then
        nano backend/.env
    else
        echo "Please edit backend/.env manually and add your GITHUB_TOKEN"
        echo "Press Enter when done..."
        read
    fi
fi

echo ""
echo "[4/5] Starting Aegis..."
echo "Backend will run on: http://localhost:5000"
echo "Frontend will run on: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

npm run dev
