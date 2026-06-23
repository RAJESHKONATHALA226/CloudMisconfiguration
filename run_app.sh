#!/bin/bash

echo "========================================"
echo "AI-Powered Cloud Misconfiguration Detection"
echo "CSPM Simulator Starting..."
echo "========================================"
echo ""

# Check if virtual environment exists, if not create one
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
echo "Installing dependencies..."
pip install -q -r requirements.txt

echo ""
echo "Starting Flask application..."
echo "Open your browser and navigate to: http://localhost:5000"
echo "Press Ctrl+C to stop the server"
echo ""

python app.py

