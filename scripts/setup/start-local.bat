@echo off
echo 🚀 Starting Smiling Steps Local Development
echo.

echo 📂 Starting Backend Server...
start "Backend Server" cmd /k "cd server && npm run dev"

timeout /t 3 /nobreak > nul

echo 🌐 Starting Frontend...
start "Frontend" cmd /k "cd client && npm start"

echo.
echo ✅ Both servers starting...
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:5000
echo 🧪 Auth Test: http://localhost:3000/auth-test
echo.
echo Press any key to close this window...
pause > nul