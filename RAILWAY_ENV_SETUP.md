# Railway Environment Variables Setup

## 🚀 **Critical: Set These in Railway Dashboard**

### **Step 1: Go to Railway Settings**
1. Go to [railway.app](https://railway.app)
2. Open your project
3. Click **"Variables"** tab (or **"Settings"** → **"Environment"**)

### **Step 2: Add These Environment Variables**

**Click "Add Variable" for each:**

```
MONGODB_URI = mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0

JWT_SECRET = your_jwt_secret_key_here_make_it_long_and_secure

NODE_ENV = production

PORT = 5000
```

### **Step 3: Deploy After Adding Variables**
1. **Save all variables**
2. **Click "Deploy"** or wait for auto-deploy
3. **Check logs** for successful connection

## 🔍 **What Each Variable Does:**

- **MONGODB_URI**: Connects to your MongoDB Atlas database
- **JWT_SECRET**: Secures user authentication tokens  
- **NODE_ENV**: Tells Railway this is production
- **PORT**: Railway will override this, but good to have

## ⚠️ **Important Notes:**

1. **Database Name**: Added `/smiling-steps` to the MongoDB URI
2. **Production Mode**: Set NODE_ENV to production
3. **Security**: JWT_SECRET should be long and random in production

## 🧪 **Test After Setup:**

Visit: `https://smiling-steps-production.up.railway.app/`

Should show:
```json
{
  "message": "Smiling Steps API is running!",
  "status": "Railway deployment active"
}
```