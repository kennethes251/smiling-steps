#!/bin/bash

echo "🚀 DEPLOYING SMILING STEPS TO PRODUCTION"
echo "========================================"

echo ""
echo "📋 Step 1: Adding all changes to Git..."
git add .

echo ""
echo "📝 Step 2: Committing changes..."
git commit -m "Deploy comprehensive teletherapy platform with video calls, booking system, and MongoDB integration"

echo ""
echo "🚀 Step 3: Pushing to GitHub (this will trigger Render deployment)..."
git push origin main

echo ""
echo "✅ DEPLOYMENT INITIATED!"
echo ""
echo "📊 Monitor your deployment:"
echo "  Backend:  https://dashboard.render.com"
echo "  Frontend: https://dashboard.render.com"
echo ""
echo "🌐 Your live URLs (available in ~10-15 minutes):"
echo "  Frontend: https://smiling-steps-frontend.onrender.com"
echo "  Backend:  https://smiling-steps-backend.onrender.com"
echo ""
echo "⏱️  Deployment typically takes 10-15 minutes"
echo "👀 Watch the Render dashboard for progress"
echo ""