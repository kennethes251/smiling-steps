# PostgreSQL Setup Guide for Smiling Steps

## Prerequisites
- Node.js 18+ installed
- PostgreSQL installed locally (for development)

## Step 1: Install PostgreSQL Locally (Development)

### Windows:
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user
4. Default port is `5432`

### Verify Installation:
```bash
psql --version
```

## Step 2: Create Local Database

Open Command Prompt or PowerShell and run:

```bash
# Connect to PostgreSQL (you'll be prompted for password)
psql -U postgres

# Once connected, create the database:
CREATE DATABASE smiling_steps_dev;

# Create a user (optional but recommended):
CREATE USER smiling_steps_user WITH PASSWORD 'your_password_here';

# Grant privileges:
GRANT ALL PRIVILEGES ON DATABASE smiling_steps_dev TO smiling_steps_user;

# Exit psql:
\q
```

## Step 3: Update Environment Variables

Your `.env` file should already have:
```
DATABASE_URL="postgresql://localhost:5432/smiling_steps_dev"
```

If you created a custom user, update it to:
```
DATABASE_URL="postgresql://smiling_steps_user:your_password_here@localhost:5432/smiling_steps_dev"
```

## Step 4: Install Dependencies

```bash
cd server
npm install
```

This will install:
- `pg` - PostgreSQL client
- `pg-hstore` - Serialization/deserialization for JSONB
- `sequelize` - ORM for PostgreSQL

## Step 5: Test the Connection

Create a test file to verify connection:

```bash
node server/config/database.js
```

Or start your server:
```bash
npm run dev
```

You should see:
```
✅ PostgreSQL connected successfully.
✅ All Sequelize models loaded successfully
✅ Database tables synchronized
```

## Step 6: Migrate Data (Optional)

If you have existing MongoDB data to migrate:

```bash
# Make sure both MongoDB and PostgreSQL are running
node server/migrate-to-postgres.js
```

## Step 7: Deploy to Render

### 7.1 Create PostgreSQL Database on Render:
1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Name: `smiling-steps-postgres`
4. Database: `smiling_steps`
5. User: `smiling_steps_user`
6. Region: Choose closest to your users
7. Click "Create Database"

### 7.2 Update Backend Service:
1. Go to your backend service on Render
2. Go to "Environment" tab
3. Update/Add these variables:
   - `DATABASE_URL` - Copy from PostgreSQL database (Internal Database URL)
   - `NODE_ENV` = `production`
   - `JWT_SECRET` - Generate a secure random string
   - `PORT` = `5000`

### 7.3 Deploy:
1. Push your code to GitHub
2. Render will auto-deploy
3. Check logs for successful connection

## Troubleshooting

### Connection Refused (Local):
- Make sure PostgreSQL service is running
- Windows: Check Services → PostgreSQL should be running
- Verify port 5432 is not blocked by firewall

### Authentication Failed:
- Double-check username and password in DATABASE_URL
- Ensure user has proper permissions

### Tables Not Created:
- Check server logs for errors
- Verify `sequelize.sync()` is being called
- Try `sequelize.sync({ force: true })` to recreate tables (WARNING: deletes data)

### Render Deployment Issues:
- Verify DATABASE_URL is set correctly (use Internal Database URL)
- Check that pg and sequelize are in dependencies (not devDependencies)
- Review deployment logs for specific errors

## Current Migration Status

✅ **Completed:**
- CORS configuration updated (Render only)
- API configuration simplified
- Netlify configuration removed
- PostgreSQL dependencies added
- Database configuration created
- User model converted to Sequelize
- Models index updated for Sequelize

⏳ **Remaining:**
- Convert other models to Sequelize (Session, Assessment, etc.)
- Update route handlers to use Sequelize syntax
- Test all API endpoints
- Deploy to Render

## Next Steps

1. **Install PostgreSQL locally** (if not already installed)
2. **Create the database** using the commands above
3. **Install dependencies**: `cd server && npm install`
4. **Start the server**: `npm run dev`
5. **Test registration/login** to verify it works
6. **Deploy to Render** once local testing passes

## Model Conversion Notes

The User model now uses JSONB fields for flexibility:
- `personalInfo` - Personal details (phone, address, etc.)
- `healthInfo` - Medical conditions, medications, allergies
- `preferences` - User preferences and settings
- `psychologistDetails` - Psychologist-specific information
- `profileInfo` - Profile picture, bio, visibility

This maintains flexibility while providing relational database benefits.

## Useful Commands

```bash
# Connect to local database
psql -U postgres -d smiling_steps_dev

# List all tables
\dt

# Describe a table
\d users

# View all users
SELECT * FROM users;

# Drop database (careful!)
DROP DATABASE smiling_steps_dev;
```