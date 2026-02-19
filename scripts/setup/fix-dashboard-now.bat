@echo off
echo ========================================
echo FIXING DASHBOARD - CLEARING CACHE
echo ========================================
echo.

echo Step 1: Checking if servers are running...
netstat -ano | findstr :5000 >nul
if %errorlevel% equ 0 (
    echo [OK] Backend server is running on port 5000
) else (
    echo [ERROR] Backend server is NOT running!
    echo Please start it with: cd server ^&^& npm start
    pause
    exit /b 1
)

netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo [OK] Frontend server is running on port 3000
) else (
    echo [ERROR] Frontend server is NOT running!
    echo Please start it with: cd client ^&^& npm start
    pause
    exit /b 1
)

echo.
echo Step 2: Clearing React build cache...
cd client
if exist "node_modules\.cache" (
    echo Deleting node_modules\.cache...
    rmdir /s /q "node_modules\.cache"
    echo [OK] Cache deleted
) else (
    echo [INFO] No cache folder found
)

echo.
echo Step 3: Checking API configuration...
type "src\config\api.js" | findstr "localhost:5000" >nul
if %errorlevel% equ 0 (
    echo [OK] API config includes localhost:5000
) else (
    echo [WARNING] API config might not be correct
)

echo.
echo ========================================
echo NEXT STEPS:
echo ========================================
echo 1. Go to your browser
echo 2. Press Ctrl + Shift + R (hard refresh)
echo 3. Or press F12, right-click refresh, select "Empty Cache and Hard Reload"
echo 4. Check console for: API_BASE_URL: 'http://localhost:5000'
echo.
echo If still not working:
echo 1. Stop React server (Ctrl+C in terminal)
echo 2. Run: npm start
echo 3. Hard refresh browser again
echo.
pause
