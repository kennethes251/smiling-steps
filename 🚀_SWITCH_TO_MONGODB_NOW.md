# Switch to MongoDB - Step by Step

## What We're Doing

1. Export all data from PostgreSQL
2. Import into MongoDB
3. Switch server to use MongoDB
4. Keep PostgreSQL on Render untouched (for backup)

## Steps

### Step 1: Run Migration (5 minutes)

```bash
node migrate-postgres-to-mongodb.js
```

This will:
- Connect to both databases
- Copy all users from PostgreSQL → MongoDB
- Copy all sessions from PostgreSQL → MongoDB  
- Copy all blogs from PostgreSQL → MongoDB
- Show you a summary

### Step 2: Update .env File

Add this line to your `.env`:
```
MONGODB_URI="mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0"
```

### Step 3: Update package.json

Change the start script:

**Before:**
```json
"start": "node server/index.js"
```

**After:**
```json
"start": "node server/index-mongodb.js"
```

### Step 4: Restart Server

```bash
cd server
npm start
```

You should see:
```
✅ MongoDB connected successfully
✅ Server running on port 5000 with MongoDB
```

### Step 5: Test Everything

1. Login as psychologist
2. Check dashboard
3. Try approving a session
4. Everything should work with `_id` now!

## What Changes?

### Before (PostgreSQL/Sequelize):
- `session.id` 
- `User.findByPk()`
- UUID format
- Complex setup

### After (MongoDB/Mongoose):
- `session._id`
- `User.findById()`
- MongoDB ObjectId
- Simple and clean!

## Rollback Plan

If something goes wrong:
1. Change package.json back to `server/index.js`
2. Restart server
3. You're back on PostgreSQL

Your PostgreSQL data is safe on Render!

## Benefits

✅ Simpler code
✅ Faster development
✅ Better for this project
✅ Less confusion
✅ Native `_id` support

## Ready?

Run: `node migrate-postgres-to-mongodb.js`
