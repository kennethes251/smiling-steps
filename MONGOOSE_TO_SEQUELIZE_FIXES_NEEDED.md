# Mongoose to Sequelize Conversion - Remaining Fixes

## Files That Need Conversion

### ✅ Already Fixed:
- `server/routes/auth.js` - Fixed!
- `server/routes/admin.js` - Fixed!
- `server/models/User.js` - Converted to Sequelize

### 🔄 Need Fixing:

#### 1. server/routes/users.js (CRITICAL - Authentication)
**Mongoose Methods Found:**
- `await findById(req.user.id)` → `await User.findByPk(req.user.id)`
- `await findOne({ email })` → `await User.findOne({ where: { email } })`
- `await findByIdAndUpdate()` → `await User.update()`
- `new User()` → `await User.create()`
- `await user.save()` → `await user.save()` or `await user.update()`
- `.select('-password')` → `{ attributes: { exclude: ['password'] } }`

**Lines with Issues:**
- Line 226: `await findById(req.user.id)`
- Line 270: `await findOne({ verificationToken, ... })`
- Line 450: `await findOne({ _id: id, ... })`
- Line 521: `await findById(req.user.id)`
- Line 678: `await findById(req.user.id)`
- Line 905: `await findOne({ email })`
- Line 959-960: `await findOne({ role })`
- Line 996: `await findById(req.params.id).select('-password')`
- Line 1049: `await findOne({ email })`
- Line 1073: `new User(psychologistData)`
- Line 1125: `await findById(req.user.id)`
- Line 1156: `await findByIdAndUpdate()`
- Line 1202: `await findById(req.user.id)`

#### 2. server/routes/upload.js
**Mongoose Methods:**
- Line 56: `await User.findByIdAndUpdate()` → `await User.update()`
- Line 73: `await User.findById()` → `await User.findByPk()`
- Line 83: `await User.findByIdAndUpdate()` → `await User.update()`

#### 3. server/routes/sessions.js (If using sessions)
**Mongoose Methods:**
- Multiple `Session.findById()` → `Session.findByPk()`
- `Session.findOne()` → `Session.findOne({ where: {} })`
- `new Session()` → `await Session.create()`
- `await session.save()` → Already works with Sequelize

#### 4. server/routes/messages.js (If using messages)
**Mongoose Methods:**
- `Session.findById()` → `Session.findByPk()`
- `new Message()` → `await Message.create()`

## Conversion Rules

### Mongoose → Sequelize Cheat Sheet:

```javascript
// Find by ID
User.findById(id) → User.findByPk(id)

// Find one
User.findOne({ email }) → User.findOne({ where: { email } })

// Find with exclusion
User.findById(id).select('-password') → 
User.findByPk(id, { attributes: { exclude: ['password'] } })

// Create
new User(data); await user.save() → await User.create(data)

// Update by ID
User.findByIdAndUpdate(id, data) → 
await User.update(data, { where: { id } })

// Update instance
user.field = value; await user.save() → 
await user.update({ field: value })
// OR just await user.save() (Sequelize supports this too)

// Delete
User.findByIdAndDelete(id) → 
const user = await User.findByPk(id); await user.destroy()

// Mongoose operators
$gt → { [Op.gt]: value }
$lt → { [Op.lt]: value }
$gte → { [Op.gte]: value }
$set → Just use the object directly
$unset → Set to null
```

## Priority Order:

1. **HIGH**: `server/routes/users.js` - Authentication routes
2. **MEDIUM**: `server/routes/upload.js` - Profile pictures
3. **LOW**: `server/routes/sessions.js` - If sessions are being used
4. **LOW**: `server/routes/messages.js` - If messages are being used

## Current Status:

- ✅ Auth route fixed
- ✅ Admin routes fixed
- 🔄 Users routes - IN PROGRESS
- ⏳ Upload routes - PENDING
- ⏳ Sessions routes - PENDING (if needed)
- ⏳ Messages routes - PENDING (if needed)

## Recommendation:

Focus on `server/routes/users.js` first as it's critical for authentication and registration to work properly.
