@echo off
title CSPM Misconfiguration Detection

echo ==========================================
echo Installing Required Python Packages...
echo ==========================================

python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ==========================================
echo Starting FastAPI Server...
echo ==========================================

uvicorn app:app --host 0.0.0.0 --port 8000 --reload

pause