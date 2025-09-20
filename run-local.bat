@echo off
echo ========================================
echo   Starting Local Scraper Server
echo ========================================
echo.

if not exist .env (
    echo [WARNING] No .env file found!
    echo Please create .env file from .env.example
    echo.
    pause
    exit /b 1
)

if not exist node_modules\puppeteer (
    echo Installing Puppeteer...
    npm install puppeteer
)

echo.
echo Starting server on port 3002...
echo Press Ctrl+C to stop
echo.

node local-scraper-server.js

echo.
echo Server stopped.
pause