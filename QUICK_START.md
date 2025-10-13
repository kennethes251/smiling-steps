# Quick Start - PostgreSQL Setup

## 🚀 Fastest Path to Get Running

### Step 1: Install PostgreSQL (5 minutes)
Download and install: https://www.postgresql.org/download/windows/
- Remember the password you set for `postgres` user
- Use default port `5432`

### Step 2: Create Database (1 minute)
```bash
psql -U postgres
```
Then in psql:
```sql
CREATE DATABASE smiling_steps_dev;
\q
```

### Step 3: Install Dependencies (2 minutes)
```bash
cd server
npm install
```

### Step 4: Test Connection (30 seconds)
```bash
node server/test-postgres-connection.js
```

Expected output:
```
✅ PostgreSQL connected successfully.
✅ Test completed successfully!
```

### Step 5: Start Server (30 seconds)
```bash
npm run dev
```

Expected output:
```
✅ PostgreSQL connected successfully.
✅ All Sequelize models loaded successfully
✅ Database tables synchronized
✅ Server is running on port 5000
```

### Step 6: Test Frontend (1 minute)
```bash
# In a new terminal
cd client
npm start
```

Go to `http://localhost:3000` and try registering a new user.

---

## 🎯 Deploy to Render (10 minutes)

### 1. Create PostgreSQL Database
- Go to https://dashboard.render.com
- New + → PostgreSQL
- Name: `smiling-steps-postgres`
- Click "Create Database"
- Copy "Internal Database URL"

### 2. Update Backend Service
- Go to your backend service
- Environment tab
- Add: `DATABASE_URL` = [paste URL from step 1]
- Save Changes

### 3. Push Code
```bash
git add .
git commit -m "Migrate to PostgreSQL"
git push
```

Render will auto-deploy. Check logs for success!

---

## ❓ Having Issues?

### PostgreSQL won't start?
```bash
# Check if it's running (Windows)
Get-Service -Name postgresql*

# If not running, start it from Services app
```

### Can't connect to database?
Check your `.env` file has:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/smiling_steps_dev"
```
Replace `YOUR_PASSWORD` with your actual postgres password.

### Dependencies won't install?
```bash
# Clear cache and reinstall
cd server
rm -rf node_modules package-lock.json
npm install
```

### Still stuck?
Check `SETUP_INSTRUCTIONS.md` for detailed troubleshooting.

---

## 📊 What's Working Now

✅ User registration
✅ User login
✅ User authentication
✅ Profile updates

⚠️ Other features need model conversion (coming next)

---

## 🎉 Success!

If you can register and login, you're all set! The basic PostgreSQL setup is complete.