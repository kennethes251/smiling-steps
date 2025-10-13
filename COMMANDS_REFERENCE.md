# Command Reference Sheet

## 🔧 PostgreSQL Commands

### Installation Check
```bash
psql --version
```

### Connect to PostgreSQL
```bash
psql -U postgres
```

### Database Operations (in psql)
```sql
-- List all databases
\l

-- Create database
CREATE DATABASE smiling_steps_dev;

-- Connect to database
\c smiling_steps_dev

-- List all tables
\dt

-- Describe table structure
\d users

-- View all users
SELECT * FROM users;

-- Count users
SELECT COUNT(*) FROM users;

-- Delete all users (careful!)
DELETE FROM users;

-- Drop database (careful!)
DROP DATABASE smiling_steps_dev;

-- Exit psql
\q
```

### Windows Service Management
```powershell
# Check PostgreSQL service status
Get-Service -Name postgresql*

# Start PostgreSQL service
Start-Service postgresql-x64-15

# Stop PostgreSQL service
Stop-Service postgresql-x64-15

# Restart PostgreSQL service
Restart-Service postgresql-x64-15
```

---

## 📦 NPM Commands

### Server Commands
```bash
# Navigate to server
cd server

# Install dependencies
npm install

# Start development server (with auto-reload)
npm run dev

# Start production server
npm start

# Test PostgreSQL connection
node test-postgres-connection.js

# Migrate data from MongoDB (if needed)
node migrate-to-postgres.js
```

### Client Commands
```bash
# Navigate to client
cd client

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Test production build
npx serve -s build
```

### Clean Install
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## 🔍 Debugging Commands

### Check Server Status
```bash
# Test connection
node server/test-postgres-connection.js

# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process on port 5000 (if needed)
# Find PID from above command, then:
taskkill /PID <PID> /F
```

### View Logs
```bash
# Server logs (while running)
npm run dev

# Check for errors
# Look for ❌ symbols in output
```

### Database Inspection
```bash
# Connect and inspect
psql -U postgres -d smiling_steps_dev

# In psql:
SELECT * FROM users;
SELECT email, role, "isVerified" FROM users;
```

---

## 🌐 Git Commands

### Commit and Push
```bash
# Check status
git status

# Add all changes
git add .

# Commit with message
git commit -m "PostgreSQL migration complete"

# Push to GitHub
git push

# Push to specific branch
git push origin main
```

### Branch Management
```bash
# Create new branch
git checkout -b postgres-migration

# Switch branch
git checkout main

# Merge branch
git merge postgres-migration
```

---

## 🚀 Render Commands

### Deploy
```bash
# Render auto-deploys on push
git push

# Manual deploy
# Go to Render Dashboard → Service → Manual Deploy
```

### View Logs
```bash
# In Render Dashboard:
# Service → Logs tab
# Or use Render CLI (if installed)
render logs
```

---

## 🧪 Testing Commands

### Test Registration
```bash
# Using curl (Windows PowerShell)
$body = @{
    name = "Test User"
    email = "test@example.com"
    password = "password123"
    role = "client"
    skipVerification = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/users/register" -Method POST -Body $body -ContentType "application/json"
```

### Test Login
```bash
# Using curl (Windows PowerShell)
$body = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/users/login" -Method POST -Body $body -ContentType "application/json"
```

---

## 🔐 Environment Variables

### View Environment Variables
```bash
# Windows PowerShell
Get-Content .env

# Windows CMD
type .env
```

### Edit .env File
```bash
# Using notepad
notepad .env

# Using VS Code
code .env
```

### Required Variables
```env
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/smiling_steps_dev"
JWT_SECRET="your_jwt_secret_key_here"
NODE_ENV=development
```

---

## 📊 Useful Queries

### User Statistics
```sql
-- Count users by role
SELECT role, COUNT(*) FROM users GROUP BY role;

-- Recent registrations
SELECT name, email, "createdAt" FROM users ORDER BY "createdAt" DESC LIMIT 10;

-- Verified vs unverified
SELECT "isVerified", COUNT(*) FROM users GROUP BY "isVerified";
```

### Database Size
```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('smiling_steps_dev'));

-- Table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🆘 Emergency Commands

### Reset Database
```sql
-- Connect to postgres database first
\c postgres

-- Drop and recreate
DROP DATABASE smiling_steps_dev;
CREATE DATABASE smiling_steps_dev;

-- Reconnect
\c smiling_steps_dev
```

### Reset Server
```bash
# Stop server (Ctrl+C)
# Clear node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Restart
npm run dev
```

### Reset Everything
```bash
# 1. Drop database
psql -U postgres -c "DROP DATABASE smiling_steps_dev;"
psql -U postgres -c "CREATE DATABASE smiling_steps_dev;"

# 2. Clean server
cd server
rm -rf node_modules package-lock.json
npm install

# 3. Clean client
cd ../client
rm -rf node_modules package-lock.json
npm install

# 4. Restart
cd ../server
npm run dev
```

---

## 📝 Quick Reference

| Task | Command |
|------|---------|
| Start PostgreSQL | `Start-Service postgresql*` |
| Connect to DB | `psql -U postgres` |
| Install deps | `npm install` |
| Test connection | `node server/test-postgres-connection.js` |
| Start server | `npm run dev` |
| Start client | `cd client && npm start` |
| View logs | Check terminal output |
| Push to Git | `git add . && git commit -m "msg" && git push` |
| View DB tables | `psql -U postgres -d smiling_steps_dev` then `\dt` |

---

## 💡 Pro Tips

1. **Keep two terminals open**: One for server, one for client
2. **Check logs first**: Most errors are visible in terminal
3. **Use psql for debugging**: Direct database access is powerful
4. **Commit often**: Small commits are easier to debug
5. **Test locally first**: Always test before deploying

---

**Bookmark this file for quick command access!** 📌