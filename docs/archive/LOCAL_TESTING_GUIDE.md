# 🧪 Local MongoDB Testing Guide

This guide will help you test the teletherapy platform locally with MongoDB to ensure everything is working correctly from corner to corner.

## 🚀 Quick Start

### Option 1: Automated Setup and Test
```bash
# Run the automated setup (installs dependencies, starts server, runs tests)
start-local-test.bat
```

### Option 2: Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Start the server (in one terminal)
npm start

# 3. Run tests (in another terminal)
run-local-tests.bat
# OR
node test-local-mongodb.js
```

## 📋 Prerequisites

1. **Node.js** installed (v14 or higher)
2. **MongoDB** connection available:
   - **Option A**: MongoDB Atlas (cloud) - already configured in `.env`
   - **Option B**: Local MongoDB instance
3. **Environment variables** properly set in `.env` file

## 🔧 Configuration Check

Make sure your `.env` file has:
```env
# MongoDB (should be active)
MONGODB_URI="mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0"

# Email configuration
EMAIL_USER="kennethes251@gmail.com"
EMAIL_PASSWORD="gmhp uzew qwpl zepz"
FROM_EMAIL="hr@smilingsteps.com"

# JWT Secret
JWT_SECRET="your_jwt_secret_key_here"
```

## 🧪 What Gets Tested

### Core Infrastructure
- ✅ Server health check
- ✅ MongoDB database connection
- ✅ CORS configuration
- ✅ Error handling

### Authentication & Authorization
- ✅ Admin login (bypasses email verification)
- ✅ Email verification status endpoint
- ✅ Role-based access control

### User Registration
- ✅ Client registration (requires email verification)
- ✅ Psychologist registration (requires email verification)
- ✅ Streamlined registration (bypasses verification)
- ✅ Input validation and sanitization

### Email Verification System
- ✅ Unverified users blocked from login
- ✅ Verification emails sent (when configured)
- ✅ Correct field names (isEmailVerified vs isVerified)

### API Endpoints
- ✅ Public psychologists API
- ✅ User registration endpoints
- ✅ Login endpoints
- ✅ Email verification endpoints

### Database Integration
- ✅ MongoDB field name consistency
- ✅ Mongoose model compatibility
- ✅ Data persistence and retrieval

## 📊 Expected Results

When all tests pass, you should see:
```
🎊 ALL TESTS PASSED! Local MongoDB system is working correctly corner-to-corner.

🔍 System Status:
✅ Database: MongoDB (Local)
✅ Email Verification: Both clients and psychologists require verification
✅ Admin Access: Bypasses email verification
✅ Streamlined Registration: Working for quick onboarding
✅ API Endpoints: Responding correctly
✅ Error Handling: Working properly
✅ Field Names: Using correct MongoDB field names

🎯 System is ready for production deployment!
```

## 🐛 Troubleshooting

### Server Won't Start
- Check if port 5000 is available
- Verify MongoDB connection string in `.env`
- Run `npm install` to ensure dependencies are installed

### Database Connection Issues
- Verify `MONGODB_URI` in `.env` file
- Check MongoDB Atlas network access (if using Atlas)
- Ensure MongoDB service is running (if using local MongoDB)

### Test Failures
- Make sure server is running on http://localhost:5000
- Check server logs for error messages
- Verify `.env` configuration

### Email Verification Issues
- Email sending is optional for local testing
- Tests focus on the verification logic, not actual email delivery
- Gmail SMTP configuration is already set up

## 🎯 Next Steps After Local Testing

1. **All tests pass**: System is ready for production deployment
2. **Some tests fail**: Review the specific failures and fix issues
3. **Deploy to production**: Use the same MongoDB configuration
4. **Monitor production**: Set up logging and monitoring

## 📁 Generated Files

After running tests, you'll find:
- `local-test-report.json` - Detailed test results
- Server logs in the terminal

## 🔄 Continuous Testing

Run tests regularly during development:
```bash
# Quick test run (server must be running)
node test-local-mongodb.js

# Full automated test (starts server automatically)
start-local-test.bat
```

---

**Note**: This local testing ensures the system works correctly before deploying to production. All the same functionality will work in production with the same MongoDB Atlas database.