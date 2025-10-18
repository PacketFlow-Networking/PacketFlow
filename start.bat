@echo off
REM AINetUI Complete Startup Script
REM Run this as Administrator

echo ========================================
echo   AINetUI - Starting Application
echo ========================================
echo.

REM Check if in correct directory
if not exist "backend\main.py" (
    echo Error: Please run this script from the AINetUI root directory
    pause
    exit /b 1
)

REM Start Backend
echo [1/2] Starting Backend...
start "AINetUI Backend" cmd /k "cd backend && ..\venv\Scripts\activate && python main.py"

REM Wait for backend to initialize
timeout /t 5 /nobreak

REM Start Frontend
echo [2/2] Starting Frontend...
start "AINetUI Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Services Started!
echo ========================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo.
echo Press any key to exit this window (services will keep running)
pause
