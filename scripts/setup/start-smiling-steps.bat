@echo off
title Smiling Steps - Full Stack Launcher
color 0A

echo ============================================
echo    Smiling Steps - Starting Application
echo ============================================
echo.

:: Get the directory where this script is located
cd /d "%~dp0"

echo [1/2] Starting Backend Server (Port 5000)...
start "Smiling Steps Backend" cmd /k "cd /d %~dp0 && npm run dev"

:: Wait for backend to fully initialize
echo    Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo [2/2] Starting Frontend Server (Port 3000)...
start "Smiling Steps Frontend" cmd /k "cd /d %~dp0\client && npm start"

echo.
echo ============================================
echo    Both servers are starting!
echo ============================================
echo.
echo    Backend:  http://localhost:5000
echo    Frontend: http://localhost:3000
echo.
echo    Close this window when done.
echo    To stop servers, close the other windows.
echo ============================================

:: Wait for frontend to compile then open browser
echo    Waiting for frontend to compile...
timeout /t 15 /nobreak > nul
echo    Opening browser...
start http://localhost:3000

pause
