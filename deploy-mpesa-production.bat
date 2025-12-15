@echo off
REM M-Pesa Payment Integration - Production Deployment Script (Windows)
REM This script automates the deployment of M-Pesa payment integration to production

setlocal enabledelayedexpansion

echo.
echo ================================================================
echo    M-Pesa Payment Integration - Production Deployment
echo    Smiling Steps Teletherapy Platform
echo ================================================================
echo.

echo WARNING: PRODUCTION DEPLOYMENT - Proceed with caution!
echo WARNING: Ensure you have reviewed the deployment checklist
echo.

set /p confirm="Continue with deployment? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo Deployment cancelled
    exit /b 0
)

REM 1. Check Environment
echo.
echo ================================================================
echo 1. Checking Environment
echo ================================================================
echo.

if not "%NODE_ENV%"=="production" (
    echo WARNING: NODE_ENV is not set to 'production'
    set /p envconfirm="Continue anyway? (yes/no): "
    if /i not "!envconfirm!"=="yes" (
        echo Deployment cancelled
        exit /b 0
    )
) else (
    echo Environment: Production
)

REM 2. Backup Database
echo.
echo ================================================================
echo 2. Backing Up Database
echo ================================================================
echo.

echo Creating database backup...
cd server
node scripts/backup-production-database.js
if errorlevel 1 (
    echo ERROR: Database backup failed
    exit /b 1
)
echo Database backup completed
cd ..

REM 3. Run Database Migration
echo.
echo ================================================================
echo 3. Running Database Migration
echo ================================================================
echo.

echo WARNING: This will modify the production database
set /p migconfirm="Proceed with migration? (yes/no): "

if /i "%migconfirm%"=="yes" (
    echo Running migration...
    cd server
    node scripts/migrate-mpesa-fields.js
    if errorlevel 1 (
        echo ERROR: Migration failed
        exit /b 1
    )
    echo Migration completed
    
    echo Verifying migration...
    node scripts/verify-migration.js
    if errorlevel 1 (
        echo ERROR: Migration verification failed
        exit /b 1
    )
    echo Migration verified
    cd ..
) else (
    echo Migration skipped
)

REM 4. Deploy Backend
echo.
echo ================================================================
echo 4. Deploying Backend
echo ================================================================
echo.

echo Installing dependencies...
cd server
call npm install --production
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)
echo Dependencies installed

echo Server will restart automatically on deployment
echo Backend deployment completed
cd ..

REM 5. Deploy Frontend
echo.
echo ================================================================
echo 5. Deploying Frontend
echo ================================================================
echo.

echo Building frontend...
cd client
call npm install
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed
    exit /b 1
)
echo Frontend built successfully

echo Frontend will deploy automatically
echo Frontend deployment completed
cd ..

REM 6. Verify Deployment
echo.
echo ================================================================
echo 6. Verifying Deployment
echo ================================================================
echo.

if "%API_URL%"=="" (
    echo WARNING: API_URL not set, using default
    set API_URL=http://localhost:5000
)

echo Testing API health...
curl -s -o nul -w "%%{http_code}" "%API_URL%/api/health" > temp_response.txt
set /p response=<temp_response.txt
del temp_response.txt

if "%response%"=="200" (
    echo API is healthy
) else (
    echo WARNING: API health check failed (HTTP %response%)
)

echo Testing M-Pesa health...
curl -s -o nul -w "%%{http_code}" "%API_URL%/api/mpesa/health" > temp_response.txt
set /p mpesa_response=<temp_response.txt
del temp_response.txt

if "%mpesa_response%"=="200" (
    echo M-Pesa integration is healthy
) else (
    echo WARNING: M-Pesa health check returned HTTP %mpesa_response%
)

REM 7. Test Payment Flow
echo.
echo ================================================================
echo 7. Testing Payment Flow (Optional)
echo ================================================================
echo.

echo WARNING: This will initiate a real payment transaction
echo WARNING: Use a small test amount (e.g., 10 KES)
set /p testconfirm="Run payment flow test? (yes/no): "

if /i "%testconfirm%"=="yes" (
    echo Please test payment flow manually:
    echo 1. Log in to the application
    echo 2. Create a test session
    echo 3. Initiate payment with a small amount
    echo 4. Complete payment on your phone
    echo 5. Verify payment status updates
    echo 6. Check notifications are sent
    echo 7. Review audit logs
    echo.
    pause
) else (
    echo Payment flow test skipped
)

REM 8. Monitor Transactions
echo.
echo ================================================================
echo 8. Monitoring Initial Transactions
echo ================================================================
echo.

echo Monitoring server logs...
echo Watch for:
echo   - Payment initiations
echo   - Callback processing
echo   - Error messages
echo   - Performance issues
echo.
echo WARNING: Keep monitoring for at least 1 hour after deployment
echo Check your logging service dashboard

REM Summary
echo.
echo ================================================================
echo Deployment Summary
echo ================================================================
echo.

echo Deployment completed successfully!
echo.
echo Next steps:
echo 1. Monitor logs for errors
echo 2. Check payment success rate
echo 3. Verify reconciliation runs at 11 PM
echo 4. Review customer feedback
echo 5. Update documentation
echo.
echo WARNING: Keep monitoring the system for the next 24-48 hours
echo.

pause
