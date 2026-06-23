@echo off
echo ========================================
echo AI-Powered Cloud Misconfiguration Detection
echo CSPM Simulator Starting...
echo ========================================
echo.

REM Check if virtual environment exists, if not create one
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install requirements
echo Installing dependencies...
pip install -q -r requirements.txt

echo.
echo Starting Flask application...
echo Open your browser and navigate to: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

python app.py

pause

