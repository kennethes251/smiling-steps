# 🚀 Supabase Migration Guide

## Complete Step-by-Step Guide for November 9th

---

## 📋 Prerequisites

- ✅ Backup file created: `database-backups/smiling_steps_backup_2025-10-22.json`
- ✅ Backup uploaded to cloud storage
- ⏳ Supabase account (create on Nov 9th)

---

## 🎯 Migration Steps (30 minutes total)

### Step 1: Create Supabase Account (5 minutes)

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Verify your email

### Step 2: Create New Project (5 minutes)

1. Click "New Project"
2. Fill in details:
   - **Name**: `smiling-steps`
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to Kenya (e.g., Singapore or Frankfurt)
   - **Pricing Plan**: Free
3. Click "Create new project"
4. Wait 2-3 minutes for project to initialize

### Step 3: Get Connection String (2 minutes)

1. Go to **Project Settings** (gear icon)
2. Click **Database** in sidebar
3. Scroll to **Connection string**
4. Select **URI** format
5. Copy the connection string
6. Replace `[YOUR-PASSWORD]` with your database password
7. Save this string - you'll need it!

Example:
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### Step 4: Create Database Schema (5 minutes)

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New query**
3. Copy and paste this schema:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'client',
  "isVerified" BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  "lastLogin" TIMESTAMPTZ,
  "loginAttempts" INTEGER DEFAULT 0,
  "lockUntil" TIMESTAMPTZ,
  "passwordChangedAt" TIMESTAMPTZ,
  "passwordResetToken" VARCHAR(255),
  "passwordResetExpires" TIMESTAMPTZ,
  "verificationToken" VARCHAR(255),
  "verificationTokenExpires" TIMESTAMPTZ,
  "personalInfo" JSONB DEFAULT '{}',
  "healthInfo" JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  "psychologistDetails" JSONB DEFAULT '{}',
  "profileInfo" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "clientId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "psychologistId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sessionType" VARCHAR(50) NOT NULL,
  "sessionDate" TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending Approval',
  "meetingLink" VARCHAR(255),
  "sessionNotes" TEXT,
  "sessionProof" VARCHAR(255),
  price INTEGER NOT NULL,
  "sessionRate" INTEGER NOT NULL,
  "isVideoCall" BOOLEAN DEFAULT true,
  "videoCallStarted" TIMESTAMPTZ,
  "videoCallEnded" TIMESTAMPTZ,
  duration INTEGER,
  "paymentStatus" VARCHAR(50) DEFAULT 'Pending',
  "paymentMethod" VARCHAR(255) DEFAULT 'M-Pesa',
  "paymentProof" JSONB DEFAULT '{}',
  "paymentVerifiedBy" UUID REFERENCES users(id),
  "paymentVerifiedAt" TIMESTAMPTZ,
  "paymentInstructions" TEXT,
  "confidentialityAgreement" JSONB DEFAULT '{}',
  "clientIntakeForm" JSONB DEFAULT '{}',
  "approvedBy" UUID REFERENCES users(id),
  "approvedAt" TIMESTAMPTZ,
  "declineReason" TEXT,
  "cancellationReason" TEXT,
  "notificationsSent" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Blogs table
CREATE TABLE "Blogs" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt VARCHAR(500),
  content TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  tags VARCHAR(255)[],
  published BOOLEAN DEFAULT false,
  "publishedAt" TIMESTAMPTZ,
  "authorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "featuredImage" VARCHAR(255),
  "metaTitle" VARCHAR(60),
  "metaDescription" VARCHAR(160),
  "readTime" INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_sessions_client ON sessions("clientId");
CREATE INDEX idx_sessions_psychologist ON sessions("psychologistId");
CREATE INDEX idx_sessions_date ON sessions("sessionDate");
CREATE INDEX idx_blogs_slug ON "Blogs"(slug);
CREATE INDEX idx_blogs_published ON "Blogs"(published);
```

4. Click **Run** (or press Ctrl+Enter)
5. Verify "Success" message

### Step 5: Import Your Data (5 minutes)

**Option A: Using Supabase Dashboard**

1. Go to **Table Editor**
2. For each table (users, sessions, Blogs):
   - Click on the table
   - Click **Insert** → **Insert row**
   - Manually copy data from your backup JSON file
   - Repeat for each row

**Option B: Using SQL (Faster)**

1. Open your backup file: `database-backups/smiling_steps_backup_2025-10-22.json`
2. I'll create a script to convert JSON to SQL INSERT statements
3. Run the generated SQL in Supabase SQL Editor

### Step 6: Update Your Application (5 minutes)

1. Open `server/.env`
2. Update DATABASE_URL:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

3. Save the file

### Step 7: Test Locally (3 minutes)

```bash
cd server
npm start
```

Check for:
- ✅ "PostgreSQL connected successfully"
- ✅ No errors
- ✅ Server running on port 5000

Test in browser:
- ✅ Login works
- ✅ Data displays correctly

### Step 8: Deploy to Render (5 minutes)

1. Go to Render dashboard
2. Select your backend service
3. Go to **Environment**
4. Update `DATABASE_URL` with Supabase connection string
5. Click **Save Changes**
6. Render will auto-redeploy

### Step 9: Verify Production (5 minutes)

1. Visit your production site
2. Test:
   - ✅ Login
   - ✅ View blogs
   - ✅ Book session
   - ✅ All features work

---

## 🎉 Success Checklist

- [ ] Supabase project created
- [ ] Database schema created
- [ ] Data imported successfully
- [ ] Local testing passed
- [ ] Production deployed
- [ ] Production testing passed
- [ ] Old Render database can be deleted

---

## 🆘 Troubleshooting

### "Connection refused"
- Check your connection string
- Verify password is correct
- Ensure no extra spaces

### "Table does not exist"
- Run the schema SQL again
- Check table names match exactly

### "Data not showing"
- Verify data was imported
- Check Supabase Table Editor
- Look for import errors

### "Authentication failed"
- Double-check password in connection string
- Regenerate database password if needed

---

## 📞 Need Help?

**Supabase Support:**
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub: https://github.com/supabase/supabase

**Quick Help:**
Run this to test connection:
```bash
node server/test-postgres-connection.js
```

---

## 💡 Pro Tips

1. **Keep Render database** for a few days after migration (as backup)
2. **Test thoroughly** before deleting anything
3. **Save your Supabase password** in a password manager
4. **Enable 2FA** on Supabase account
5. **Set up Supabase backups** (automatic in free tier)

---

## 🎯 After Migration

1. Update documentation with new DATABASE_URL format
2. Delete Render PostgreSQL service (after Nov 12)
3. Keep backup files forever
4. Enjoy free PostgreSQL! 🎉

---

**You've got this!** The migration is straightforward and you have a backup. 💪
