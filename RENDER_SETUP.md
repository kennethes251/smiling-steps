# Render Deployment Setup

## 🚀 **Step 1: Create Render Account**

1. Go to [render.com](https://render.com)
2. Click "Get Started for Free"
3. Sign up with GitHub account
4. Authorize Render to access your repositories

## 🔗 **Step 2: Connect Repository**

1. In Render Dashboard, click "New +"
2. Select "Web Service"
3. Click "Connect account" if needed
4. Find and select your repository: `kennethes251/smiling-steps`
5. Click "Connect"

## ⚙️ **Step 3: Configure Service**

**Basic Settings:**
- **Name**: `smiling-steps-backend`
- **Environment**: `Node`
- **Region**: `Oregon (US West)` or closest to you
- **Branch**: `main`
- **Root Directory**: Leave empty (uses root)

**Build & Deploy:**
- **Build Command**: `npm install`
- **Start Command**: `node server/index.js`

**Plan:**
- Select **"Free"** plan

## 🔐 **Step 4: Add Environment Variables**

Click "Advanced" → "Add Environment Variable" for each:

```
MONGODB_URI = mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0

JWT_SECRET = smiling_steps_jwt_secret_2024_production_key

NODE_ENV = production

PORT = 10000
```

## 🎯 **Step 5: Deploy**

1. Click "Create Web Service"
2. Wait for deployment (3-5 minutes)
3. Your service will be available at: `https://smiling-steps-backend.onrender.com`

## ✅ **Step 6: Test Deployment**

Visit: `https://smiling-steps-backend.onrender.com`

Should show:
```json
{
  "message": "Smiling Steps API is running!",
  "timestamp": "2025-01-04T...",
  "status": "Render deployment active"
}
```

## 🌐 **Step 7: Update Netlify**

The API configuration is already updated to use Render. After Render deployment:

1. Netlify will automatically use the new Render URL
2. Test your Netlify site - therapist data should load
3. Layout issues should be resolved

## 🔧 **Troubleshooting**

If deployment fails:
- Check build logs in Render dashboard
- Verify environment variables are set correctly
- Ensure MongoDB URI is accessible from Render's IP ranges

## 📊 **Expected Timeline**

- **Account setup**: 2 minutes
- **Service configuration**: 3 minutes  
- **First deployment**: 5 minutes
- **Total time**: ~10 minutes

**Render is much more reliable than Railway for Node.js applications!**