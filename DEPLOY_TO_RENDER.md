# Deploy to Render - Complete Guide

## Current Status
✅ Mobile hamburger menu implemented and committed
✅ API configuration updated to point to Render backend
✅ render.yaml configured for both frontend and backend

## The Issue
Your frontend on Render is trying to connect to Railway backend, causing CORS errors. We need to deploy the backend to Render.

## Solution: Deploy Both Services to Render

### Step 1: Push Your Code to GitHub
```bash
git push origin main
```

### Step 2: Connect to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file
5. Click "Apply" to create both services

### Step 3: Add Environment Secrets

After the services are created, you need to add the secret environment variables:

#### For Backend Service (smiling-steps-backend):

1. Go to the backend service in Render dashboard
2. Click "Environment" tab
3. Add these secrets:

**Required Secrets:**
- `MONGODB_URI` - Your MongoDB connection string
- `EMAIL_USER` - Your email address (e.g., hr@smilingsteps.com)
- `EMAIL_PASSWORD` - Your email app password
- `MPESA_CONSUMER_KEY` - Your M-Pesa consumer key
- `MPESA_CONSUMER_SECRET` - Your M-Pesa consumer secret
- `MPESA_PASSKEY` - Your M-Pesa passkey

4. Click "Save Changes"

### Step 4: Trigger Deployment

After adding secrets:
1. The backend will automatically redeploy
2. The frontend will automatically redeploy
3. Wait for both to finish (check the "Events" tab)

### Step 5: Test Your Deployment

1. Visit: `https://smiling-steps-frontend.onrender.com`
2. Try to login to admin dashboard
3. Check browser console - CORS errors should be gone

## Expected URLs

- **Frontend**: `https://smiling-steps-frontend.onrender.com`
- **Backend**: `https://smiling-steps-backend.onrender.com`
- **Backend API**: `https://smiling-steps-backend.onrender.com/api/*`

## Troubleshooting

### If you still see CORS errors:

1. Check backend logs in Render dashboard
2. Verify `ALLOWED_ORIGINS` includes your frontend URL
3. Make sure all secrets are added correctly

### If backend won't start:

1. Check that `MONGODB_URI` is valid
2. Check backend logs for specific errors
3. Verify all required secrets are present

## What Changed

1. ✅ Updated `client/src/config/api.js` to point to `https://smiling-steps-backend.onrender.com`
2. ✅ `render.yaml` already configured correctly
3. ✅ Mobile hamburger menu already implemented

## Next Steps

1. Push code to GitHub: `git push origin main`
2. Deploy via Render Blueprint
3. Add environment secrets
4. Test the deployed application

---

**Note**: The free tier on Render may take 30-60 seconds to wake up if the service has been idle.
