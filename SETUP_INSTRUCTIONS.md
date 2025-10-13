# Complete Setup Instructions - PostgreSQL Migration

## 🎯 What We've Done

1. ✅ Updated CORS to only allow Render deployment
2. ✅ Removed Netlify configuration
3. ✅ Added PostgreSQL dependencies (pg, pg-hstore, sequelize)
4. ✅ Created database configuration for Sequelize
5. ✅ Converted User model from Mongoose to Sequelize
6. ✅ Updated server initialization for PostgreSQL
7. ✅ Created migration scripts and test utilities

## 📋 What You Need to Do Now

### Option A: Local Development Setup (Recommended First)

#### 1. Install PostgreSQL
**Windows:**
```bash
# Download from: https://www.postgresql.org/download/windows/
# Run installer, remember the postgres password
```

#### 2. Create Database
```bash
# Open Command Prompt or PowerShell
psql -U postgres

# In psql prompt:
CREATE DATABASE smiling_steps_dev;
\q
```

#### 3. Install Dependencies
```bash
cd server
npm install
```

#### 4. Test Connection
```bash
node server/test-postgres-connection.js
```

You should see:
```
✅ PostgreSQL connected successfully.
🐘 PostgreSQL Version: PostgreSQL 15.x...
```

#### 5. Start Server
```bash
npm run dev
```

Look for these messages:
```
✅ PostgreSQL connected successfully.
✅ All Sequelize models loaded successfully
✅ Database tables synchronized
✅ Server is running on port 5000
```

#### 6. Test Registration
Open your browser to `http://localhost:3000` and try to register a new user.

---

### Option B: Deploy Directly to Render (Skip Local Setup)

#### 1. Create PostgreSQL Database on Render
1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Settings:
   - Name: `smiling-steps-postgres`
   - Database: `smiling_steps`
   - User: `smiling_steps_user`
   - Region: Oregon (or closest to you)
   - Plan: Free
4. Click "Create Database"
5. **Copy the "Internal Database URL"** (starts with `postgresql://`)

#### 2. Update Backend Service Environment Variables
1. Go to your `smiling-steps-backend` service
2. Click "Environment" tab
3. Update/Add these variables:
   ```
   DATABASE_URL = [paste Internal Database URL from step 1]
   NODE_ENV = production
   JWT_SECRET = [generate a random 32+ character string]
   PORT = 5000
   ```
4. Click "Save Changes"

#### 3. Deploy
1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Migrate to PostgreSQL and Render-only deployment"
   git push
   ```
2. Render will automatically deploy
3. Check deployment logs for success messages

---

## 🚨 Important Notes

### Current Status
- ✅ User model is converted to Sequelize
- ⚠️ Other models (Session, Assessment, etc.) still use Mongoose syntax
- ⚠️ Routes still use Mongoose methods (findById, findOne, etc.)

### What This Means
**The app will work for basic user registration/login**, but other features may not work until we convert the remaining models.

### Priority Conversion Order
1. **User** ✅ (Done)
2. **Session** (Booking system)
3. **Assessment** (Mental health assessments)
4. **Message** (Chat system)
5. **CheckIn** (Progress tracking)
6. **Blog, Resource, Feedback** (Content management)

---

## 🔧 Troubleshooting

### "Connection refused" Error
**Problem:** PostgreSQL is not running
**Solution:**
- Windows: Open Services → Find PostgreSQL → Start it
- Or reinstall PostgreSQL

### "Authentication failed" Error
**Problem:** Wrong username/password in DATABASE_URL
**Solution:**
- Check your .env file
- Default is: `postgresql://postgres:your_password@localhost:5432/smiling_steps_dev`
- Replace `your_password` with the password you set during PostgreSQL installation

### "Database does not exist" Error
**Problem:** Database not created
**Solution:**
```bash
psql -U postgres
CREATE DATABASE smiling_steps_dev;
\q
```

### "Module not found: sequelize" Error
**Problem:** Dependencies not installed
**Solution:**
```bash
cd server
npm install
```

### Render Deployment Fails
**Problem:** Various issues
**Solution:**
1. Check that `render.yaml` is in root directory
2. Verify DATABASE_URL is set in Render dashboard
3. Check deployment logs for specific error
4. Ensure `pg` and `sequelize` are in `dependencies` (not `devDependencies`)

---

## 📝 Next Steps After Basic Setup Works

Once you can successfully register and login:

1. **Convert Session Model** - For booking functionality
2. **Update Session Routes** - To use Sequelize syntax
3. **Test Booking Flow** - Verify sessions work
4. **Convert Remaining Models** - One by one
5. **Full System Test** - Test all features
6. **Remove MongoDB References** - Clean up old code

---

## 🆘 Need Help?

### Check These Files:
- `POSTGRESQL_SETUP_GUIDE.md` - Detailed PostgreSQL setup
- `MIGRATION_TO_RENDER_POSTGRES.md` - Migration overview
- `server/test-postgres-connection.js` - Connection test script
- `server/migrate-to-postgres.js` - Data migration script (if needed)

### Common Commands:
```bash
# Test PostgreSQL connection
node server/test-postgres-connection.js

# Start development server
cd server && npm run dev

# Check PostgreSQL is running (Windows)
Get-Service -Name postgresql*

# Connect to database
psql -U postgres -d smiling_steps_dev

# View tables
\dt

# View users
SELECT * FROM users;
```

---

## ✅ Success Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `smiling_steps_dev` created
- [ ] Dependencies installed (`npm install`)
- [ ] Connection test passes
- [ ] Server starts without errors
- [ ] Can register a new user
- [ ] Can login with registered user
- [ ] Deployed to Render (optional)

Once all checkboxes are complete, you're ready to convert the remaining models!