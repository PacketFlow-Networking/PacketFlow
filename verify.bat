@echo off
REM AINetUI Pre-Launch Verification Script
echo ================================================================================
echo AINetUI Pre-Launch Verification
echo ================================================================================
echo.

REM Check Python
echo [1/8] Checking Python...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    FAIL - Python not found
    goto :error
) else (
    python --version
    echo    PASS
)
echo.

REM Check Node
echo [2/8] Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    FAIL - Node.js not found
    goto :error
) else (
    node --version
    echo    PASS
)
echo.

REM Check TShark
echo [3/8] Checking TShark...
tshark --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    FAIL - TShark not found
    echo    Install Wireshark or add TShark to PATH
    goto :error
) else (
    tshark --version | findstr "TShark"
    echo    PASS
)
echo.

REM Check Backend Files
echo [4/8] Checking Backend Files...
if not exist "backend\main.py" (
    echo    FAIL - backend\main.py not found
    goto :error
)
if not exist "backend\config.py" (
    echo    FAIL - backend\config.py not found
    goto :error
)
if not exist "backend\.env" (
    echo    FAIL - backend\.env not found
    goto :error
)
echo    main.py - OK
echo    config.py - OK
echo    .env - OK
echo    PASS
echo.

REM Check Frontend Files
echo [5/8] Checking Frontend Files...
if not exist "frontend\package.json" (
    echo    FAIL - frontend\package.json not found
    goto :error
)
if not exist "frontend\src\main.tsx" (
    echo    FAIL - frontend\src\main.tsx not found
    goto :error
)
if not exist "frontend\src\App.tsx" (
    echo    FAIL - frontend\src\App.tsx not found
    goto :error
)
echo    package.json - OK
echo    main.tsx - OK
echo    App.tsx - OK
echo    PASS
echo.

REM Check Python Dependencies
echo [6/8] Checking Python Dependencies...
cd backend
call ..\venv\Scripts\activate.bat
pip show fastapi >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    FAIL - fastapi not installed
    echo    Run: pip install -r requirements.txt
    cd ..
    goto :error
)
pip show uvicorn >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    FAIL - uvicorn not installed
    echo    Run: pip install -r requirements.txt
    cd ..
    goto :error
)
echo    fastapi - OK
echo    uvicorn - OK
echo    PASS
cd ..
echo.

REM Check Node Modules
echo [7/8] Checking Node Dependencies...
if not exist "frontend\node_modules" (
    echo    FAIL - node_modules not found
    echo    Run: cd frontend ^&^& npm install
    goto :error
)
echo    node_modules - OK
echo    PASS
echo.

REM Check Port Availability
echo [8/8] Checking Port Availability...
netstat -ano | findstr :8000 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    WARNING - Port 8000 is in use
    echo    You may need to kill the process using port 8000
    echo    Run: netstat -ano ^| findstr :8000
) else (
    echo    Port 8000 - Available
)
netstat -ano | findstr :3000 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    WARNING - Port 3000 is in use
    echo    You may need to kill the process using port 3000
    echo    Run: netstat -ano ^| findstr :3000
) else (
    echo    Port 3000 - Available
)
echo    PASS
echo.

echo ================================================================================
echo  ALL CHECKS PASSED!
echo ================================================================================
echo.
echo You are ready to launch AINetUI:
echo.
echo 1. Terminal 1 (as Administrator):
echo    cd backend
echo    ..\venv\Scripts\activate
echo    python main.py
echo.
echo 2. Terminal 2:
echo    cd frontend
echo    npm run dev
echo.
echo 3. Open browser:
echo    http://localhost:3000
echo.
pause
exit /b 0

:error
echo.
echo ================================================================================
echo  PRE-LAUNCH CHECK FAILED
echo ================================================================================
echo.
echo Please fix the errors above before launching.
echo.
pause
exit /b 1
