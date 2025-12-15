# Booking Route Database Fix - Complete

## Problem
The booking system was failing with error: `User.findByPk is not a function`

This occurred because the `/api/sessions/request` endpoint and several other endpoints in `server/routes/sessions.js` were using Sequelize methods (`findByPk`, `create`, `where`) instead of Mongoose methods.

## Root Cause
Your application uses MongoDB with Mongoose, but the sessions route had mixed database methods:
- Some endpoints used Mongoose correctly (`findById`, `findOne`)
- Other endpoints used Sequelize methods (`findByPk`, `create`, `where`)

## Changes Made

### Fixed Endpoints in `server/routes/sessions.js`:

1. **POST /api/sessions/request** (Session booking)
   - Changed `User.findByPk()` → `User.findById()`
   - Changed `Session.create()` → `new Session().save()`
   - Changed Sequelize `where` syntax → Mongoose query syntax
   - Changed `session.id` → `session._id`

2. **PUT /api/sessions/:id/approve** (Approve session)
   - Changed `Session.findByPk()` → `Session.findById()`
   - Changed `User.findByPk()` → `User.findById()`
   - Changed `session.psychologistId` → `session.psychologist.toString()`
   - Changed `session.clientId` → `session.client`

3. **PUT /api/sessions/:id/decline** (Decline session)
   - Changed `Session.findByPk()` → `Session.findById()`
   - Changed `session.psychologistId` → `session.psychologist.toString()`

4. **POST /api/sessions/:id/submit-payment** (Submit payment proof)
   - Changed `Session.findByPk()` → `Session.findById()`
   - Changed `session.clientId` → `session.client.toString()`

5. **PUT /api/sessions/:id/verify-payment** (Verify payment)
   - Changed `Session.findByPk()` → `Session.findById()`
   - Changed `User.findByPk()` → `User.findById()`
   - Changed `session.psychologistId` → `session.psychologist.toString()`

6. **PUT /api/sessions/:id/link** (Add meeting link)
   - Changed `Session.findByPk()` → `Session.findById()`
   - Changed `session.psychologistId` → `session.psychologist.toString()`

7. **POST /api/sessions/:id/complete** (Complete session)
   - Changed `Session.findByPk()` → `Session.findById()`
   - Changed `session.psychologistId` → `session.psychologist.toString()`

## Key Differences

### Sequelize (PostgreSQL) vs Mongoose (MongoDB)

| Operation | Sequelize | Mongoose |
|-----------|-----------|----------|
| Find by ID | `findByPk(id)` | `findById(id)` |
| Create | `Model.create({})` | `new Model({}).save()` |
| Query | `findOne({ where: {} })` | `findOne({})` |
| ID field | `model.id` | `model._id` |
| Reference field | `model.foreignKeyId` | `model.reference.toString()` |
| Array contains | `{ [Op.in]: [] }` | `{ $in: [] }` |

## Testing
The booking system should now work correctly:
1. Clients can request sessions
2. Psychologists can approve/decline sessions
3. Clients can submit payment proof
4. Psychologists can verify payment
5. All session management features work

## Status
✅ All database method mismatches fixed
✅ No diagnostic errors
✅ Ready for testing

## Next Steps
1. Restart your server
2. Test the booking flow:
   - Login as client
   - Select a psychologist
   - Choose session type and date
   - Submit booking request
3. Verify the session appears in the database
