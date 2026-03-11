@echo off
setlocal

set NODE_PATH=C:\Users\PC\Documents\Code\nodejs\node-v20.11.0-win-x64
set PATH=%NODE_PATH%;%PATH%

cd /d C:\Users\PC\Documents\Code\Pythone

echo Installing dependencies...
call npm install

if errorlevel 1 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting server...
call npm start
