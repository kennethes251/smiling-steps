# Smiling Steps - Complete Setup Guide

*A comprehensive guide to set up the Smiling Steps teletherapy platform*

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18.x or higher
- MongoDB (local or Atlas)
- Git

### Rapid Setup
```bash
# 1. Clone and install
git clone <repository-url>
cd smiling-steps
npm install
cd client && npm install && cd ..

# 2. Environment setup
cp .env.example .env
# Edit .env with your configuration

# 3. Start development
npm run dev          # Backend (port 5000)
cd client && npm start  # Frontend (port 3000)
```

---

## 📋 Detailed Setup Instructions

### 1. System Requirements

#### Minimum Requirements
- **OS**: Windows 10, macOS 10.15, or Ubuntu 18.04+
- **Node.js**: Version 18.x or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space

#### Recommended Development Tools
- **IDE**: VS Code with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - MongoDB for VS Code
- **Database GUI**: MongoDB Compass
- **API Testing**: Postman or Thunder Client

### 2. Database Setup

#### Option A: MongoDB Atlas (Recommended for Production)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier available)
3. Create database user with read/write permissions
4. Whitelist your IP address (or 0.0.0.0/0 for development)
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/smiling-steps`

#### Option B: Local MongoDB
```bash
# Windows (using Chocolatey)
choco install mongodb

# macOS (using Homebrew)
brew tap mongodb/brew
brew install mongodb-community

# Ubuntu
sudo apt-get install mongodb

# Start MongoDB service
mongod --dbpath /path/to/your/db
```

### 3. Environment Configuration

Create `.env` file in root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/smiling-steps
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smiling-steps

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Client Configuration
CLIENT_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# M-Pesa Configuration (Optional)
MPESA_CONSUMER_KEY=your-mpesa-consumer-key
MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
MPESA_BUSINESS_SHORT_CODE=your-short-code
MPESA_PASSKEY=your-mpesa-passkey
MPESA_CALLBACK_URL=https://your-domain.com/api/mpesa/callback

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Development
NODE_ENV=development
PORT=5000
```

### 4. Email Setup (Gmail)

#### Step 1: Enable 2-Factor Authentication
1. Go to Google Account settings
2. Enable 2-Factor Authentication

#### Step 2: Generate App Password
1. Go to Google Account > Security > App passwords
2. Generate password for "Mail"
3. Use this password in `EMAIL_PASSWORD`

#### Step 3: Test Email Configuration
```bash
node scripts/setup/test-email-setup.js
```

### 5. Installation Steps

#### Backend Setup
```bash
# Install dependencies
npm install

# Initialize database (creates admin user)
node server/scripts/setup/init-database.js

# Test database connection
node scripts/setup/test-database-connection.js

# Start development server
npm run dev
```

#### Frontend Setup
```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm start
```

### 6. Initial Configuration

#### Create Admin User
```bash
# Run the admin creation script
node server/scripts/setup/create-admin.js

# Default admin credentials:
# Email: admin@smilingsteps.com
# Password: Admin123!
# (Change these immediately after first login)
```

#### Create Sample Data (Optional)
```bash
# Create sample psychologists
node server/scripts/setup/create-sample-psychologists.js

# Create sample blog posts
node server/scripts/setup/create-sample-blogs.js

# Create sample resources
node server/scripts/setup/create-sample-resources.js
```

---

## 🔧 Development Workflow

### Running the Application

#### Development Mode
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd client && npm start

# Access application:
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# API Documentation: http://localhost:5000/api/docs
```

#### Production Mode
```bash
# Build frontend
cd client && npm run build

# Start production server
npm start
```

### Testing

#### Run All Tests
```bash
# Backend tests
npm test

# Frontend tests
cd client && npm test

# Integration tests
npm run test:integration

# Property-based tests
npm run test:property
```

#### Specific Test Categories
```bash
# Authentication tests (stable - do not modify)
npm test -- --testPathPattern="auth-login.stable"

# API endpoint tests
npm test -- --testPathPattern="integration"

# Security tests
npm test -- --testPathPattern="security"
```

---

## 🚀 Deployment Guide

### Render Deployment (Recommended)

#### Prerequisites
- GitHub repository
- Render account

#### Step 1: Prepare Repository
```bash
# Ensure render.yaml is configured
cat render.yaml

# Commit all changes
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### Step 2: Create Render Services
1. **Database**: Create PostgreSQL or use MongoDB Atlas
2. **Backend**: Create Web Service from GitHub
3. **Frontend**: Create Static Site from GitHub

#### Step 3: Environment Variables
Set in Render dashboard:
```
MONGODB_URI=<your-atlas-connection-string>
JWT_SECRET=<secure-random-string>
EMAIL_USER=<your-email>
EMAIL_PASSWORD=<your-app-password>
CLIENT_URL=<your-frontend-url>
NODE_ENV=production
```

#### Step 4: Deploy
```bash
# Trigger deployment
git push origin main

# Monitor deployment in Render dashboard
```

### Alternative Deployment Options

#### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Heroku
```bash
# Install Heroku CLI
# Create Heroku app
heroku create smiling-steps-app

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Deploy
git push heroku main
```

---

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Test MongoDB connection
node scripts/setup/test-database-connection.js

# Check MongoDB service status
# Windows: services.msc -> MongoDB
# macOS/Linux: brew services list | grep mongodb
```

#### Email Not Working
```bash
# Test email configuration
node scripts/setup/test-email-setup.js

# Common fixes:
# 1. Enable 2FA on Google account
# 2. Generate app-specific password
# 3. Check firewall settings
```

#### Port Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000  # Windows
lsof -ti:5000                 # macOS/Linux

# Kill process
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # macOS/Linux
```

#### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear client dependencies
cd client
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

#### Log Files
- Backend logs: `logs/app.log`
- Error logs: `logs/error.log`
- Access logs: `logs/access.log`

#### Debug Mode
```bash
# Enable debug logging
DEBUG=smiling-steps:* npm run dev

# Verbose logging
NODE_ENV=development LOG_LEVEL=debug npm run dev
```

#### Health Checks
```bash
# Test system health
node scripts/maintenance/health-check.js

# Test all endpoints
node scripts/maintenance/test-all-endpoints.js
```

---

## 📚 Additional Resources

### Documentation
- [API Reference](./API_REFERENCE.md)
- [User Guides](./USER_GUIDES.md)
- [Feature Documentation](./features/)

### Development Tools
- [Testing Guide](../TESTING_QUICK_REFERENCE.md)
- [Commands Reference](../COMMANDS_REFERENCE.md)
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)

### Support
- Check existing issues in project repository
- Review troubleshooting guides in `docs/`
- Contact development team for critical issues

---

*Last Updated: January 8, 2026*