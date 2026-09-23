#!/bin/bash

echo ""
echo "=========================================="
echo "   AEGIS - One-Click Install & Run"
echo "=========================================="
echo ""
echo "This script will:"
echo "1. Check if Node.js is installed (install if missing)"
echo "2. Install all dependencies automatically"
echo "3. Set up the environment file"
echo "4. Start the application"
echo ""
read -p "Press Enter to continue, or Ctrl+C to cancel..."

echo ""
echo "[1/3] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo ""
    echo "=========================================="
    echo "Node.js NOT FOUND - Installing automatically..."
    echo "=========================================="
    echo ""
    
    # Detect OS and install Node.js
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux - try different package managers
        if command -v apt-get &> /dev/null; then
            echo "Installing Node.js via apt..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v dnf &> /dev/null; then
            echo "Installing Node.js via dnf..."
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo dnf install -y nodejs
        elif command -v pacman &> /dev/null; then
            echo "Installing Node.js via pacman..."
            sudo pacman -S nodejs npm
        else
            echo "Could not detect package manager."
            echo "Please install Node.js manually from: https://nodejs.org/"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "Installing Node.js via Homebrew..."
            brew install node
        else
            echo "Homebrew not found. Please install Node.js manually from: https://nodejs.org/"
            exit 1
        fi
    else
        echo "Unsupported OS. Please install Node.js manually from: https://nodejs.org/"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo ""
        echo "AUTOMATIC INSTALL FAILED"
        echo "Please manually install Node.js from: https://nodejs.org/"
        echo "Then run this script again."
        exit 1
    fi
    echo "Node.js installed successfully!"
    echo ""
    echo "IMPORTANT: Please CLOSE THIS TERMINAL and open a NEW ONE"
    echo "Then run this script again."
    exit 0
fi

echo "Node.js found: $(node --version)"

echo ""
echo "[2/3] Installing Aegis dependencies..."
npm run install-all
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo ""
echo "[3/3] Setting up environment..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo ""
    echo "=========================================="
    echo "ACTION REQUIRED: Add your GitHub Token"
    echo "=========================================="
    echo ""
    echo "A file 'backend/.env' has been created."
    echo "You need to add your GitHub Personal Access Token."
    echo ""
    echo "1. Opening the file in your default editor..."
    echo "2. Get your token at: https://github.com/settings/tokens"
    echo "3. Paste it next to GITHUB_TOKEN="
    echo "4. Save and close the editor"
    echo ""
    sleep 3
    
    # Try to open with default editor
    if command -v code &> /dev/null; then
        code backend/.env
    elif command -v vim &> /dev/null; then
        vim backend/.env
    elif command -v nano &> /dev/null; then
        nano backend/.env
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        open -e backend/.env
    else
        echo "Please edit backend/.env manually and add your GITHUB_TOKEN"
        echo "Press Enter when done..."
        read
    fi
fi

echo ""
echo "=========================================="
echo "STARTING AEGIS..."
echo "=========================================="
echo ""
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Opening browser in 5 seconds..."
echo "Press Ctrl+C in this window to stop the servers"
echo ""

sleep 5

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:5173
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:5173 2>/dev/null || echo "Could not open browser automatically. Please visit http://localhost:5173"
fi

npm run dev
