# Render PostgreSQL Setup Guide

## ✅ Configuration Updated

The application has been switched to use PostgreSQL instead of MongoDB for better Render compatibility.

## 🗄️ Database Setup

1. **Automatic Database Creation**: The render.yaml now includes a PostgreSQL database configuration
2. **Environment Variable**: Render will automatically set `DATABASE_URL` for the PostgreSQL connection

## 🔧 Changes Made

- **render.yaml**: Updated to use PostgreSQL and include database configuration
- **Procfile**: Updated to use `index.js` (PostgreSQL version)
- **package.json**: Updated start scripts to use PostgreSQL version
- **Environment Variables**: Changed from `MONGODB_URI` to `DATABASE_URL`

## 🚀 Deployment Steps

1. **Push Changes**: The configuration is now ready for PostgreSQL
2. **Environment Variables**: In Render dashboard, ensure these are set:
   - `DATABASE_URL` (automatically set by Render)
   - `ENCRYPTION_KEY`
   - `JWT_SECRET`
   - All M-Pesa credentials

## 📊 Database Migration

The PostgreSQL version uses Sequelize ORM and will automatically:
- Create tables on first run
- Handle database schema
- Sync models with database

## ✨ Benefits of PostgreSQL on Render

- Better integration with Render platform
- Automatic database URL configuration
- More reliable deployments
- Better performance for production workloads

The application should now deploy successfully with PostgreSQL!