#!/bin/bash

# Cobra Chess - Quick Start Script
# This script helps you get started quickly with Cobra Chess

echo "🐍 Cobra Chess - Quick Start Setup"
echo "===================================="
echo ""

# Check Python installation
echo "Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✓ Python found: $PYTHON_VERSION"
else
    echo "✗ Python 3 not found. Please install Python 3.8 or higher."
    exit 1
fi

# Check pip
echo "Checking pip..."
if command -v pip3 &> /dev/null; then
    echo "✓ pip3 found"
else
    echo "✗ pip3 not found. Please install pip."
    exit 1
fi

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
pip3 install -r requirements.txt --break-system-packages 2>/dev/null || pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "✗ Failed to install dependencies"
    exit 1
fi

# Check for Stockfish
echo ""
echo "Checking for Stockfish..."
if command -v stockfish &> /dev/null; then
    STOCKFISH_PATH=$(which stockfish)
    echo "✓ Stockfish found at: $STOCKFISH_PATH"
    
    # Update backend.py with correct path
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|STOCKFISH_PATH = .*|STOCKFISH_PATH = \"$STOCKFISH_PATH\"|" backend.py
    else
        sed -i "s|STOCKFISH_PATH = .*|STOCKFISH_PATH = \"$STOCKFISH_PATH\"|" backend.py
    fi
else
    echo "⚠ Stockfish not found. Installing..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install stockfish
        else
            echo "Please install Homebrew first: https://brew.sh"
            echo "Then run: brew install stockfish"
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y stockfish
        elif command -v yum &> /dev/null; then
            sudo yum install -y stockfish
        else
            echo "Please install Stockfish manually for your distribution"
        fi
    else
        echo "Please install Stockfish manually: https://stockfishchess.org/download/"
    fi
fi

echo ""
echo "===================================="
echo "Setup Complete! 🎉"
echo "===================================="
echo ""
echo "To start Cobra Chess:"
echo ""
echo "1. Start the backend server:"
echo "   python3 backend.py"
echo ""
echo "2. In another terminal, start a web server:"
echo "   python3 -m http.server 8000"
echo ""
echo "3. Open your browser to:"
echo "   http://localhost:8000"
echo ""
echo "Enjoy playing against Cobra! 🐍♟️"
