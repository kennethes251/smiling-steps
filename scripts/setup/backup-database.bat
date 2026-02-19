@echo off
echo ========================================
echo   DATABASE BACKUP SCRIPT
echo ========================================
echo.

REM Check if pg_dump is available
where pg_dump >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo PostgreSQL tools found! Using pg_dump...
    echo.
    node backup-database.js
) else (
    echo PostgreSQL tools not found. Using Node.js backup...
    echo.
    node backup-database-node.js
)

echo.
echo ========================================
echo   BACKUP COMPLETE
echo ========================================
pause
