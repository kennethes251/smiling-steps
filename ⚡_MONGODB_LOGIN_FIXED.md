# MongoDB Login Fixed! ⚡

## What I Fixed

### 1. Switched Models
- ✅ Replaced Sequelize User model with Mongoose User model
- ✅ Session model already was Mongoose
- ✅ Models now use `_id` instead of `id`

### 2. Updated Routes
- ✅ Changed `User = global.User` to `User = require('../models/User')`
- ✅ Converted Sequelize syntax to Mongoose:
  - `User.scope('withPassword').findOne({ where: {...} })` → `User.findOne({...}).select('+password')`
  - `user.correctPassword()` → `bcrypt.compare()`
  - `user.id` → `user._id.toString()`

### 3. Updated Server
- ✅ server/index-mongodb.js loads Mongoose models
- ✅ package.json points to MongoDB server

## Start Your Server

```bash
npm start
```

You should see:
```
✅ MongoDB connected successfully
✅ Mongoose models loaded
✅ Server running on port 5000 with MongoDB
```

## Test Login

1. **Start frontend** (in another terminal):
```bash
cd client
npm start
```

2. **Go to** http://localhost:3000

3. **Login with:**
- Email: nancy@gmail.com
- Password: password123

4. **Should work!** You'll see the psychologist dashboard

## What's Different Now

### Before (PostgreSQL/Sequelize):
```javascript
user.id  // UUID string
User.findByPk(id)
User.scope('withPassword').findOne({ where: { email } })
```

### After (MongoDB/Mongoose):
```javascript
user._id  // MongoDB ObjectId
User.findById(id)
User.findOne({ email }).select('+password')
```

## If Login Doesn't Work

Check server console for errors. Common issues:
1. MongoDB connection timeout → Check internet/firewall
2. Model not found → Restart server
3. Password mismatch → Check if data migrated correctly

## Next Steps

Once login works:
1. Test dashboard
2. Test session approval
3. Everything should use `_id` now!

🎉 **MongoDB is ready!**
