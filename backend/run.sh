#!/bin/bash
# run.sh - Linux/macOS run script for AINetUI Backend

echo "============================================"
echo "AINetUI Backend Launcher"
echo "============================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.11 or higher"
    exit 1
fi

# Change to backend directory
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo ""
fi

# Activate virtual environment
source venv/bin/activate

# Check if requirements are installed
if ! pip show fastapi &> /dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
    echo ""
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "Please edit .env file if needed, then run this script again."
    exit 0
fi

# Check if Ollama is running
echo "Checking Ollama connection..."
if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo ""
    echo "WARNING: Ollama is not running"
    echo "AI features will be disabled until Ollama is started"
    echo ""
    echo "To install Ollama: https://ollama.ai"
    echo "To start Ollama: ollama serve"
    echo ""
    sleep 3
fi

echo "Starting AINetUI Backend..."
echo ""
echo "Server will be available at: http://localhost:8000"
echo "WebSocket endpoint: ws://localhost:8000/ws/updates"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Run the application
python3 main.py

# Deactivate virtual environment
deactivate
