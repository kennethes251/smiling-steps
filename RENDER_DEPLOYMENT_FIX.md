# 🚀 Render Deployment Fix Guide

## Issues Identified:
1. ❌ PostgreSQL connection failed (database not accessible)
2. ⚠️ ENCRYPTION_KEY not set (security warning)
3. ❌ M-Pesa configuration missing (payment system error)

## Quick Fix Steps:

### 1. Set Environment Variables on Render

Go to your Render dashboard → Your service → Environment tab and add these variables:

```bash
# Database (Use your MongoDB instead of PostgreSQL)
MONGODB_URI=mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0

# Security
ENCRYPTION_KEY=your_32_character_encryption_key_here_2024
JWT_SECRET=your_jwt_secret_key_here

# Node Environment
NODE_ENV=production

# M-Pesa Configuration (Sandbox)
MPESA_CONSUMER_KEY=HgkrKo6yLdRcXsTOnaDXTAqZAGPRpArcd96OsoiUQrAb7jVd
MPESA_CONSUMER_SECRET=QcgGt7P0i6rvXKanPzAdGmDQvUX2wz4Mb4BynF9yMXrcoXenFSqV31qOilAeFsLE
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=https://your-render-app-name.onrender.com/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox

# Email (Optional - for notifications)
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=YOUR_MAILTRAP_USER
MAILTRAP_PASS=YOUR_MAILTRAP_PASS
```

### 2. Switch to MongoDB (Recommended)

Your app is configured for both PostgreSQL and MongoDB. Since MongoDB is working locally, let's use it in production too.

### 3. Update Callback URL

Replace `your-render-app-name` with your actual Render app URL in the MPESA_CALLBACK_URL.

## Alternative: Quick Database Switch

If you want to use MongoDB instead of PostgreSQL (recommended since it's already working):

1. Update your `server/index.js` to use MongoDB connection
2. Or create a production-specific configuration

## Next Steps:

1. ✅ Add all environment variables to Render
2. ✅ Update MPESA_CALLBACK_URL with your actual Render URL
3. ✅ Generate a proper ENCRYPTION_KEY (32 characters)
4. ✅ Redeploy your service

## Generate Encryption Key:

```javascript
// Run this in Node.js to generate a secure key:
require('crypto').randomBytes(32).toString('hex')
```

## Test After Deployment:

```bash
curl https://your-app.onrender.com/
curl https://your-app.onrender.com/api/test
```

Your app should start successfully after these changes!