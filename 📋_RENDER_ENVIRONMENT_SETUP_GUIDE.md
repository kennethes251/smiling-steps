# 📋 How to Add Environment Variables to Render Dashboard

## Step-by-Step Visual Guide

### 1. 🌐 Go to Render Dashboard
- Open your browser and go to: https://render.com
- Log in to your account
- You should see your services listed

### 2. 🎯 Select Your Service
- Find your service (probably named something like "smiling-steps" or "smiling-steps-api")
- Click on the service name to open it

### 3. ⚙️ Navigate to Environment Tab
- In your service dashboard, look for tabs at the top
- Click on **"Environment"** tab
- This is where you'll add all the environment variables

### 4. 📝 Add Environment Variables One by One

For each variable below, click **"Add Environment Variable"** and enter:

#### Variable 1: Database Connection
- **Key:** `MONGODB_URI`
- **Value:** `mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0`

#### Variable 2: Encryption Key
- **Key:** `ENCRYPTION_KEY`
- **Value:** `52e5f1f3d922ab883aacebc97ee1a07ccab8f5de4e168254fc11dddfed9a5799`

#### Variable 3: JWT Secret
- **Key:** `JWT_SECRET`
- **Value:** `58bbceb63bcd101d169af54285646becaf3875dc1c6321099a3bdd53f85f2641fecafc9a6f7107386d5035247c81c13ce1ec00c6a35966ba182305fc2f371d70`

#### Variable 4: Node Environment
- **Key:** `NODE_ENV`
- **Value:** `production`

#### Variable 5: M-Pesa Consumer Key
- **Key:** `MPESA_CONSUMER_KEY`
- **Value:** `HgkrKo6yLdRcXsTOnaDXTAqZAGPRpArcd96OsoiUQrAb7jVd`

#### Variable 6: M-Pesa Consumer Secret
- **Key:** `MPESA_CONSUMER_SECRET`
- **Value:** `QcgGt7P0i6rvXKanPzAdGmDQvUX2wz4Mb4BynF9yMXrcoXenFSqV31qOilAeFsLE`

#### Variable 7: M-Pesa Business Short Code
- **Key:** `MPESA_BUSINESS_SHORT_CODE`
- **Value:** `174379`

#### Variable 8: M-Pesa Passkey
- **Key:** `MPESA_PASSKEY`
- **Value:** `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`

#### Variable 9: M-Pesa Callback URL (⚠️ IMPORTANT)
- **Key:** `MPESA_CALLBACK_URL`
- **Value:** `https://YOUR_RENDER_APP_NAME.onrender.com/api/mpesa/callback`

**🔥 CRITICAL:** Replace `YOUR_RENDER_APP_NAME` with your actual Render app name!

For example, if your app URL is `https://smiling-steps-api.onrender.com`, then use:
`https://smiling-steps-api.onrender.com/api/mpesa/callback`

#### Variable 10: M-Pesa Environment
- **Key:** `MPESA_ENVIRONMENT`
- **Value:** `sandbox`

### 5. 💾 Save Changes
- After adding each variable, make sure to click **"Save"** or **"Add"**
- Render will show all your environment variables in a list

### 6. 🚀 Deploy
- After adding all variables, click **"Manual Deploy"** or **"Deploy Latest Commit"**
- Wait for the deployment to complete

## 🎯 Quick Copy-Paste Format

If Render allows bulk import, you can try pasting this format:

```
MONGODB_URI=mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0
ENCRYPTION_KEY=52e5f1f3d922ab883aacebc97ee1a07ccab8f5de4e168254fc11dddfed9a5799
JWT_SECRET=58bbceb63bcd101d169af54285646becaf3875dc1c6321099a3bdd53f85f2641fecafc9a6f7107386d5035247c81c13ce1ec00c6a35966ba182305fc2f371d70
NODE_ENV=production
MPESA_CONSUMER_KEY=HgkrKo6yLdRcXsTOnaDXTAqZAGPRpArcd96OsoiUQrAb7jVd
MPESA_CONSUMER_SECRET=QcgGt7P0i6rvXKanPzAdGmDQvUX2wz4Mb4BynF9yMXrcoXenFSqV31qOilAeFsLE
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=https://YOUR_RENDER_APP_NAME.onrender.com/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox
```

## 🔍 How to Find Your Render App Name

1. In your Render dashboard, look at the service URL
2. It will be something like: `https://your-app-name.onrender.com`
3. Copy the `your-app-name` part
4. Use it in the MPESA_CALLBACK_URL

## ✅ Verification

After deployment, your logs should show:
```
✅ MongoDB connected successfully
✅ Server is running on port 5000
✅ All routes loaded successfully
```

Instead of the previous errors about PostgreSQL and missing M-Pesa config.

## 🆘 Need Help?

If you can't find the Environment tab or have issues:
1. Look for "Settings" → "Environment Variables"
2. Or "Configuration" → "Environment"
3. The exact location may vary slightly in Render's interface

The key is to add each Key-Value pair exactly as shown above!