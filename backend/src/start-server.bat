@echo off
REM Abhishek Dairy Store - Server Startup Script

setlocal enabledelayedexpansion

echo ================================================
echo   Abhishek Dairy ^& General Store - API Server
echo ================================================
echo.

REM Check if node modules exist
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    REM Use local npm if in nodejs folder
    if exist "..\..\nodejs\node-v20.11.0-win-x64\npm.cmd" (
        call "..\..\nodejs\node-v20.11.0-win-x64\npm.cmd" install
    ) else (
        echo [ERROR] npm not found. Please ensure Node.js is installed.
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Starting server...
echo.

REM Try to run node with full path
if exist "..\..\nodejs\node-v20.11.0-win-x64\node.exe" (
    call "..\..\nodejs\node-v20.11.0-win-x64\node.exe" server.js
) else (
    REM Fallback to PATH
    node server.js
)

pause
