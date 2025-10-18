@echo off
echo.
echo ================================================================
echo   AINetUI Backend - Cleanup Enhanced/Improved Files
echo ================================================================
echo.
echo This will delete the old enhanced and improved versions.
echo The features have been merged into the main files.
echo.
pause

echo.
echo Deleting enhanced/improved files...

del "ai_agent_improved.py" 2>nul
if exist "ai_agent_improved.py" (
    echo [FAILED] ai_agent_improved.py
) else (
    echo [OK] ai_agent_improved.py deleted
)

del "main_enhanced.py" 2>nul
if exist "main_enhanced.py" (
    echo [FAILED] main_enhanced.py
) else (
    echo [OK] main_enhanced.py deleted
)

del "websocket_server_enhanced.py" 2>nul
if exist "websocket_server_enhanced.py" (
    echo [FAILED] websocket_server_enhanced.py
) else (
    echo [OK] websocket_server_enhanced.py deleted
)

del "websocket_server_improved.py" 2>nul
if exist "websocket_server_improved.py" (
    echo [FAILED] websocket_server_improved.py
) else (
    echo [OK] websocket_server_improved.py deleted
)

echo.
echo ================================================================
echo   Cleanup Complete!
echo ================================================================
echo.
echo All enhanced features are now in the main files:
echo   - ai_agent.py
echo   - main.py
echo   - websocket_server.py
echo.
echo See MERGE_COMPLETE.md for details on what was merged.
echo.
pause
