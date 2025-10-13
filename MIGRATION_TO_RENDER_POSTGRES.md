# Migration to Render with PostgreSQL

## Changes Made

### 1. CORS Configuration Updated
- **File**: `server/index.js`
- **Changes**: 
  - Removed Netlify URLs from CORS origins
  - Now only allows `localhost:3000` and `smiling-steps-frontend.onrender.com`
  - Simplified CORS configuration for Render-only deployment

### 2. API Configuration Simplified  
- **File**: `client/src/config/api.js`
- **Changes**:
  - Removed Netlify-specific logic
  - Simplified environment detection to only handle localhost vs Render
  - Updated logging to reflect new configuration

### 3. Deployment Configuration
- **File**: `render.yaml`
- **Changes**:
  - Updated to use PostgreSQL database instead of MongoDB
  - Added database configuration section
  - Updated environment variables to use `DATABASE_URL` instead of `MONGODB_URI`

### 4. Netlify Configuration Removed
- **File**: `netlify.toml` - **DELETED**
- **Reason**: Standardizing on Render deployment only

### 5. Package Dependencies Updated
- **File**: `server/package.json`
- **Changes**:
  - Removed `mongoose` dependency
  - Added `pg` (PostgreSQL driver) and `sequelize` (ORM)

### 6. Environment Variables Updated
- **File**: `.env`
- **Changes**:
  - Replaced `MONGODB_URI` with `DATABASE_URL`
  - Updated to use PostgreSQL connection string format

### 7. Database Configuration
- **New File**: `server/config/database.js`
- **Purpose**: Handles PostgreSQL connection using Sequelize
- **Features**: 
  - Environment-based SSL configuration
  - Proper error handling and logging

### 8. Model System Restructured
- **File**: `server/models/index.js` - **UPDATED**
- **Changes**: Now exports a function that initializes Sequelize models
- **New File**: `server/models/User-sequelize.js` - **CREATED**
- **Purpose**: Sequelize version of User model with JSONB fields for flexibility

### 9. Migration Script Created
- **New File**: `server/migrate-to-postgres.js`
- **Purpose**: Helps migrate existing MongoDB data to PostgreSQL
- **Features**: 
  - Connects to both databases
  - Migrates user data with proper field mapping
  - Handles complex nested data using JSONB

## Next Steps Required

### 1. Database Setup on Render
1. Create PostgreSQL database on Render dashboard
2. Update environment variables in Render service settings
3. Deploy updated code

### 2. Data Migration (if needed)
```bash
# If you have existing MongoDB data to migrate:
node server/migrate-to-postgres.js
```

### 3. Install New Dependencies
```bash
cd server
npm install pg sequelize
npm uninstall mongoose
```

### 4. Update Remaining Models
- Convert other Mongoose models to Sequelize format
- Update all route handlers to use Sequelize syntax
- Test all API endpoints

### 5. Environment Variables on Render
Set these in your Render service dashboard:
- `DATABASE_URL` - Will be auto-populated by Render PostgreSQL service
- `JWT_SECRET` - Generate a secure secret
- `NODE_ENV=production`

## Benefits of This Migration

1. **Simplified Deployment**: Single platform (Render) for both frontend and backend
2. **Better Performance**: PostgreSQL generally offers better performance for complex queries
3. **JSONB Support**: Flexible schema for complex nested data
4. **Integrated Services**: Database and application services on same platform
5. **Cost Efficiency**: Potentially lower costs with integrated services

## Database Schema Changes

The new PostgreSQL schema uses JSONB fields for flexibility:
- `personalInfo` - Contains personal details (name, phone, address, etc.)
- `healthInfo` - Medical conditions, medications, allergies
- `preferences` - User preferences and settings
- `psychologistDetails` - Psychologist-specific information
- `profileInfo` - Profile picture, bio, visibility settings

This approach maintains flexibility while providing the benefits of a relational database.