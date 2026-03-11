@echo off
echo ========================================
echo Starting Abhishek Dairy API Server...
echo ========================================
echo.
echo This will start the Node.js server on port 5000
echo The API endpoint will be available at http://localhost:5000/api/products
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"

npm start

pause
