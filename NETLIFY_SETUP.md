# Netlify Environment Variables Setup

## Required Environment Variables for Netlify

Go to your Netlify Dashboard:
1. **Site Settings** → **Environment Variables**
2. **Add the following variables:**

### Production API Configuration
```
REACT_APP_API_URL = https://smiling-steps-production.up.railway.app
REACT_APP_ENVIRONMENT = production
```

### Optional (if you have Agora video calling)
```
REACT_APP_AGORA_APP_ID = your-agora-app-id
```

## How to Find Your Railway URL:
1. Go to [railway.app](https://railway.app)
2. Open your deployed backend project
3. Go to **Settings** → **Domains**
4. Copy the generated domain (e.g., `https://smiling-steps-backend.railway.app`)

## After Adding Variables:
1. **Redeploy** your Netlify site (it will automatically redeploy when you push to GitHub)
2. Your frontend will now connect to your live backend
3. Images and data should load properly

## Test Your Setup:
- Visit your Netlify site
- Check browser console for any API errors
- Try registering/logging in to test backend connection