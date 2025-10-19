#!/bin/bash

echo "🚀 Deploying Blog Features to Render..."
echo ""

# Add all blog-related files
echo "📦 Adding files to git..."
git add client/src/pages/BlogListPage.js
git add client/src/pages/BlogPostPage.js
git add client/src/components/BlogCard.js
git add client/src/components/SocialShare.js
git add client/src/App.js
git add client/src/components/Header.js
git add client/src/pages/MarketingPage.js
git add server/routes/blogs.js
git add server/routes/public.js

# Add documentation
git add DEPLOY_BLOG_FEATURES.md
git add PUBLIC_BLOG_MVP_COMPLETE.md
git add BLOG_MVP_QUICK_START.md
git add BLOG_MVP_VERIFICATION.md
git add BLOG_SYSTEM_ARCHITECTURE.md
git add "🎉_BLOG_MVP_COMPLETE_README.md"

echo "✅ Files added!"
echo ""

# Commit
echo "💾 Committing changes..."
git commit -m "Add public blog system MVP - listing, posts, social sharing, navigation"
echo "✅ Changes committed!"
echo ""

# Push
echo "🚀 Pushing to GitHub (this will trigger Render deployment)..."
git push origin main
echo "✅ Pushed to GitHub!"
echo ""

echo "🎉 Deployment initiated!"
echo ""
echo "📊 Next steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Monitor your deployment progress"
echo "3. Wait ~10-15 minutes for deployment to complete"
echo "4. Visit https://smiling-steps-frontend.onrender.com/blog"
echo ""
echo "✨ Your blog features will be LIVE soon!"
