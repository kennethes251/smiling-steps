# Admin Dashboard - Complete Setup Guide

## 🎉 What's Been Configured

### ✅ Backend Setup Complete
1. **Session Model** - Sequelize version created and integrated
2. **Admin API Endpoints** - Full CRUD operations
3. **Statistics API** - Dashboard metrics
4. **Admin Authentication** - Middleware protection

### 📊 Available Admin API Endpoints

#### Statistics
```
GET /api/admin/stats
```
Returns:
- Total clients
- Total psychologists  
- Total sessions
- Completed sessions
- Recent activity (last 30 days)

#### Psychologists Management
```
GET /api/admin/psychologists - List all psychologists
POST /api/admin/psychologists - Create new psychologist
PUT /api/admin/psychologists/:id - Update psychologist
DELETE /api/admin/psychologists/:id - Delete psychologist
```

#### Clients Management
```
GET /api/admin/clients - List all clients
```

#### Sessions Management (via /api/sessions)
```
GET /api/sessions - List all sessions
POST /api/sessions - Create session
PUT /api/sessions/:id - Update session
DELETE /api/sessions/:id - Delete session
```

## 🔐 Create Your Admin Account

### Option 1: Run the Script (Recommended)

The script `server/create-my-admin.js` is ready with your credentials:
- Email: kennethesilo@gmail.com
- Password: admin123

**To run it:**
```bash
# You'll need to connect to your Render PostgreSQL database
# Or run it after deploying to Render
```

### Option 2: Register and Update Role

1. Register a regular account with your email
2. Then update the role in the database:

```sql
UPDATE users 
SET role = 'admin', "isVerified" = true 
WHERE email = 'kennethesilo@gmail.com';
```

### Option 3: Use Render PostgreSQL Dashboard

1. Go to your Render PostgreSQL database
2. Click "Connect" → Use the connection string
3. Run this SQL:

```sql
INSERT INTO users (
  id, name, email, password, role, "isVerified", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Kenneth Esilo',
  'kennethesilo@gmail.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5kosgVQOJ/1WW', -- password: admin123
  'admin',
  true,
  NOW(),
  NOW()
);
```

## 🎨 Admin Dashboard Features

The admin dashboard (`client/src/components/dashboards/AdminDashboard.js`) includes:

### Dashboard Overview
- Total users count
- Total psychologists count
- Total sessions count
- Quick stats cards

### Psychologists Management
- View all psychologists
- Create new psychologist accounts
- Edit psychologist details
- Delete psychologists
- View specializations and rates

### Clients Management
- View all registered clients
- See registration dates
- Check verification status
- View last login times

### Sessions Management
- View all therapy sessions
- See session status (Pending, Booked, Completed, Cancelled)
- Filter by status
- View client and psychologist details

## 🚀 Testing the Admin Dashboard

1. **Login as Admin:**
   ```
   Email: kennethesilo@gmail.com
   Password: admin123
   ```

2. **Access Admin Dashboard:**
   - After login, you should be redirected to `/admin` or admin dashboard
   - Or navigate to the admin section from the menu

3. **Test Features:**
   - View statistics
   - Create a test psychologist
   - View clients list
   - Check sessions (if any exist)

## 📝 Admin Dashboard Component

The dashboard is located at:
```
client/src/components/dashboards/AdminDashboard.js
```

Key features:
- Material-UI components
- Responsive design
- Real-time statistics
- CRUD operations for psychologists
- Client management
- Session overview

## 🔒 Security Features

1. **Admin Middleware** - Checks user role before allowing access
2. **JWT Authentication** - All admin routes require valid token
3. **Role-based Access** - Only users with role='admin' can access
4. **Protected Routes** - Frontend routes protected by auth context

## 🎯 Next Steps

1. **Create Admin Account** - Use one of the methods above
2. **Login** - Test admin login
3. **Create Psychologists** - Add some psychologist accounts
4. **Test Features** - Try all admin functions
5. **Customize** - Adjust dashboard to your needs

## 💡 Quick Commands

### Create Sample Psychologists
After creating your admin account, you can use the admin dashboard to create psychologists, or run:

```sql
-- Create sample psychologist
INSERT INTO users (
  id, name, email, password, role, "isVerified",
  "psychologistDetails", "profileInfo", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Dr. Sarah Johnson',
  'sarah@smilingsteps.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5kosgVQOJ/1WW',
  'psychologist',
  true,
  '{"specializations": ["Anxiety", "Depression"], "experience": "10+ years", "approvalStatus": "approved"}'::jsonb,
  '{"bio": "Experienced therapist specializing in anxiety and depression."}'::jsonb,
  NOW(),
  NOW()
);
```

## 📊 Database Schema

### Users Table
- id (UUID, primary key)
- name (STRING)
- email (STRING, unique)
- password (STRING, hashed)
- role (ENUM: 'client', 'psychologist', 'admin')
- isVerified (BOOLEAN)
- psychologistDetails (JSONB)
- profileInfo (JSONB)
- timestamps

### Sessions Table
- id (UUID, primary key)
- clientId (UUID, foreign key)
- psychologistId (UUID, foreign key)
- sessionType (ENUM)
- sessionDate (DATE)
- status (ENUM)
- price (INTEGER)
- timestamps

## ⚠️ Important Notes

1. **Change Default Password** - After first login, change the default password
2. **Backup Data** - Always backup before making bulk changes
3. **Test First** - Test admin features in development before production use
4. **Monitor Access** - Keep track of who has admin access

## 🎉 You're All Set!

Your admin dashboard is now fully configured and ready to use. Login with your credentials and start managing your mental health platform!

**Live URLs:**
- Frontend: https://smiling-steps-frontend.onrender.com
- Backend API: https://smiling-steps.onrender.com
- Admin Dashboard: https://smiling-steps-frontend.onrender.com/admin (after login)
