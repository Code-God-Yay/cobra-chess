#!/bin/bash

# Cobra Chess - Unified Setup & Launch Script
# This script sets up and runs the complete Cobra Chess platform

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║            🐍 COBRA CHESS - UNIFIED PLATFORM               ║"
echo "║                    v2.0 Setup Script                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Python
echo -e "${BLUE}→${NC} Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗${NC} Python 3 not found"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓${NC} Python found: $PYTHON_VERSION"
echo ""

# Check pip
echo -e "${BLUE}→${NC} Checking pip..."
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}✗${NC} pip3 not found"
    exit 1
fi
echo -e "${GREEN}✓${NC} pip3 ready"
echo ""

# Setup virtual environment if needed
if [ ! -d "venv.venv" ]; then
    echo -e "${BLUE}→${NC} Creating virtual environment..."
    python3 -m venv venv.venv
    echo -e "${GREEN}✓${NC} Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo -e "${BLUE}→${NC} Activating virtual environment..."
source venv.venv/bin/activate
echo -e "${GREEN}✓${NC} Virtual environment activated"
echo ""

# Install/upgrade dependencies
echo -e "${BLUE}→${NC} Installing Python dependencies..."
pip install -r requirements.txt --quiet
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Check for Stockfish
echo -e "${BLUE}→${NC} Checking for Stockfish..."
if command -v stockfish &> /dev/null; then
    STOCKFISH_PATH=$(which stockfish)
    echo -e "${GREEN}✓${NC} Stockfish found: $STOCKFISH_PATH"
else
    echo -e "${YELLOW}⚠${NC}  Stockfish not found in PATH"
    echo -e "${YELLOW}   The app will still work with transformer model"
    echo -e "${YELLOW}   Install Stockfish for better performance:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "${YELLOW}   → brew install stockfish"
    else
        echo -e "${YELLOW}   → sudo apt-get install stockfish"
    fi
fi
echo ""

# Create models directory
if [ ! -d "models" ]; then
    mkdir -p models
    echo -e "${GREEN}✓${NC} Models directory created"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Instructions for running
echo -e "${BLUE}NEXT STEPS:${NC}"
echo ""
echo "1. Start the Flask backend:"
echo -e "   ${GREEN}python3 app_unified.py${NC}"
echo ""
echo "2. In another terminal, start a local web server:"
echo -e "   ${GREEN}python3 -m http.server 8000${NC}"
echo ""
echo "3. Open your browser and visit:"
echo -e "   ${BLUE}http://localhost:8000${NC}"
echo ""
echo "4. The game will automatically detect the backend at:"
echo -e "   ${BLUE}http://localhost:5000/api${NC}"
echo ""
echo -e "${YELLOW}NOTES:${NC}"
echo "- Make sure the backend is running before starting the game"
echo "- The bot section allows difficulty 1-10"
echo "- You can toggle between Stockfish and Transformer engines"
echo "- Real-time evaluation updates automatically"
echo ""
echo -e "${GREEN}Enjoy playing against Cobra!${NC} 🐍♟️"
echo ""
