@echo off
REM AINetUI Backend Launcher
REM Runs system checks then starts the backend

echo.
echo 
echo            AINetUI Backend Launcher v2.0                  
echo 
echo.

cd /d "%~dp0"

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.11+
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Run system checks first
echo Running system readiness checks...
echo.
python check_system.py
if errorlevel 1 (
    echo.
    echo [ERROR] System check failed. Please fix issues above.
    echo See TROUBLESHOOTING.md for help.
    pause
    exit /b 1
)

echo.
echo.
echo 
echo               Starting Backend Server...                  
echo 
echo.
echo Press CTRL+C to stop the server.
echo.

REM Run the backend
python main.py 2>&1

echo.
echo.
echo 
echo               Backend Stopped                             
echo 
echo.
pause
