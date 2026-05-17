@echo off
echo.
echo ========================================
echo   IBM Bob Repository Analyzer Setup
echo ========================================
echo.

echo [1/3] Setting up Backend...
cd backend
if not exist .venv (
    python -m venv .venv
)
call .venv\Scripts\activate
pip install -r requirements.txt
start "Bob Backend" cmd /k "python main.py"
cd ..

echo.
echo [2/3] Setting up Frontend...
cd frontend
call npm install
start "Bob Frontend" cmd /k "npm run dev"
cd ..

echo.
echo [3/3] Launching...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo All components are starting. Please wait a few seconds for the dev servers to initialize.
echo.
pause
