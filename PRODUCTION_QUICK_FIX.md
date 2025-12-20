# 🚨 Production Quick Fix

## Issues Detected:
- 500 error on /api/public/psychologists
- 400 error on /api/users/login

## Likely Causes:
1. Database not populated with test data
2. Missing environment variables
3. Route configuration issues

## Quick Fixes:

### 1. Check Render Logs
Go to Render dashboard → Your service → Logs tab

### 2. Verify Environment Variables
In Render dashboard → Environment tab, ensure:
```
MONGODB_URI=mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-production-secret
NODE_ENV=production
```

### 3. Create Test Users
Run this in Render console or redeploy with:
```bash
node create-production-users.js
```

### 4. Test Endpoints
- Health: https://smiling-steps.onrender.com/
- Users: https://smiling-steps.onrender.com/api/users/login
- Psychologists: https://smiling-steps.onrender.com/api/public/psychologists

### 5. Test Credentials
Try logging in with:
- **Admin**: admin@smilingsteps.com / admin123
- **Psychologist**: psychologist@smilingsteps.com / psych123
- **Client**: client@smilingsteps.com / client123

## If Still Not Working:
1. Check Render build logs
2. Verify MongoDB Atlas connection
3. Check if all routes are properly loaded
4. Ensure models are correctly imported

## Emergency Rollback:
If needed, redeploy from GitHub with latest commit.
