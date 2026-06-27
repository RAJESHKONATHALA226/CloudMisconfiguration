#!/bin/bash

echo "=========================================="
echo "Installing Required Python Packages..."
echo "=========================================="

python3 -m pip install --upgrade pip
pip3 install -r requirements.txt

echo ""
echo "=========================================="
echo "Starting FastAPI Server..."
echo "=========================================="

uvicorn app:app --host 0.0.0.0 --port 8000 --reload