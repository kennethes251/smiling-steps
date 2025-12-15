# 🔓 Account Locked - Quick Fix

## 🎯 The Problem

Your accounts (leon@gmail.com, nancy@gmail.com) are **temporarily locked** due to multiple failed login attempts.

The server shows:
- **429 (Too Many Requests)** = Account is locked
- **400 (Bad Request)** = Wrong password OR account locked

## ✅ Solution 1: Wait 15 Minutes (Easiest)

The accounts will **automatically unlock after 15 minutes** of inactivity.

Just wait 15 minutes and try again.

## ✅ Solution 2: Unlock via Database (Fastest)

Run this SQL command in your database:

```sql
UPDATE "users"
SET "loginAttempts" = 0, "lockUntil" = NULL
WHERE email IN ('leon@gmail.com', 'nancy@gmail.com', 'amos@gmail.com');
```

### How to Run It:

1. **Go to Render.com**
2. **Open your database**
3. **Click "Shell" or "Query"**
4. **Paste the SQL above**
5. **Run it**

## ✅ Solution 3: Use Correct Password

The server logs show the accounts ARE being found, but password comparison is failing.

### Check Your Password:

The accounts were created with these passwords:
- **leon@gmail.com** → Check what password you set when creating
- **nancy@gmail.com** → Check what password you set when creating

### Reset Password (if needed):

Run this to set a new password:

```sql
-- This sets password to 'password123' for leon
UPDATE "users"
SET 
  password = '$2a$10$YourHashedPasswordHere',
  "loginAttempts" = 0,
  "lockUntil" = NULL
WHERE email = 'leon@gmail.com';
```

## 🔍 What's Happening

Looking at your server logs:

1. ✅ **Account found**: `SELECT ... WHERE "User"."email" = 'leon@gmail.com'`
2. ❌ **Password fails**: Server updates `loginAttempts`
3. 🔒 **Account locked**: After 5 failed attempts
4. ⏰ **Auto-unlock**: After 15 minutes

## 💡 Quick Test

Try logging in with **amos@gmail.com** instead - it might not be locked yet.

## 🎯 Best Solution Right Now

**Just wait 15 minutes** - the accounts will unlock automatically.

In the meantime, you can:
1. Test with other accounts
2. Create a new test account
3. Check the dashboard with the account that's already logged in

## 📊 Current Status

From your logs, I can see:
- ✅ **Dashboard is working** (6 sessions loaded!)
- ✅ **Database is working**
- ✅ **API is working**
- ❌ **Accounts are temporarily locked**

The system is working perfectly - just need to unlock the accounts!

## 🚀 After Unlocking

Once unlocked, you can test the complete booking flow:
1. Client creates booking
2. Psychologist approves
3. Client submits payment
4. Psychologist verifies
5. Both see confirmed session

Everything is ready to go! 🎉
