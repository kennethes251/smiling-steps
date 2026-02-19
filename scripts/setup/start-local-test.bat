@echo off
echo 🚀 Starting Local MongoDB System Test
echo.

echo 📋 Step 1: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 📋 Step 2: Starting the server...
echo Press Ctrl+C to stop the server when testing is complete
echo.

start "Teletherapy Server" cmd /k "npm start"

echo.
echo ⏳ Waiting 10 seconds for server to start...
timeout /t 10 /nobreak > nul

echo.
echo 📋 Step 3: Running comprehensive tests...
node test-local-mongodb.js

echo.
echo 🎊 Testing complete! Check the results above.
echo 📄 Detailed report saved to: local-test-report.json
echo.
pause