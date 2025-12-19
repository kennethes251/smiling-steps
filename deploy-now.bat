@echo off
echo 🚀 Deploying Smiling Steps Application...
echo.

echo 📦 Adding all changes to git...
git add .

echo 📝 Committing changes...
git commit -m "Deploy email verification system and latest features"

echo 🌐 Pushing to GitHub (triggers Render deployment)...
git push origin main

echo.
echo ✅ Deployment initiated!
echo.
echo 📊 Monitor your deployment:
echo Backend: https://dashboard.render.com
echo.
echo 🌐 Your live URLs (after ~10-15 minutes):
echo Frontend: https://smiling-steps-frontend.onrender.com
echo Backend: https://smiling-steps-backend.onrender.com
echo.
echo ⏱️ Deployment typically takes 10-15 minutes
echo 👀 Watch the Render dashboard for progress
echo.
pause