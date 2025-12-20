const fs = require('fs');

console.log('🔧 Fixing Production Issues');
console.log('===========================');

const createProductionTestUsers = () => {
  console.log('\n1. Creating production test users script:');
  
  const script = `const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const createTestUsers = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@smilingsteps.com' });
    if (!adminExists) {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@smilingsteps.com',
        password: 'admin123',
        role: 'admin',
        isEmailVerified: true
      });
      await admin.save();
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }

    // Create test psychologist
    const psychExists = await User.findOne({ email: 'psychologist@smilingsteps.com' });
    if (!psychExists) {
      const psychologist = new User({
        name: 'Dr. Test Psychologist',
        email: 'psychologist@smilingsteps.com',
        password: 'psych123',
        role: 'psychologist',
        isEmailVerified: true,
        isApproved: true,
        specialization: 'Clinical Psychology',
        experience: '5 years',
        bio: 'Experienced clinical psychologist specializing in anxiety and depression.',
        hourlyRate: 50
      });
      await psychologist.save();
      console.log('✅ Test psychologist created');
    } else {
      console.log('✅ Test psychologist already exists');
    }

    // Create test client
    const clientExists = await User.findOne({ email: 'client@smilingsteps.com' });
    if (!clientExists) {
      const client = new User({
        name: 'Test Client',
        email: 'client@smilingsteps.com',
        password: 'client123',
        role: 'client',
        isEmailVerified: true
      });
      await client.save();
      console.log('✅ Test client created');
    } else {
      console.log('✅ Test client already exists');
    }

    console.log('\\n🎉 Test users ready!');
    console.log('Admin: admin@smilingsteps.com / admin123');
    console.log('Psychologist: psychologist@smilingsteps.com / psych123');
    console.log('Client: client@smilingsteps.com / client123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

createTestUsers();`;

  fs.writeFileSync('create-production-users.js', script);
  console.log('✅ Created production test users script');
};

const createProductionHealthCheck = () => {
  console.log('\n2. Creating production health check:');
  
  const healthCheck = `const mongoose = require('mongoose');
require('dotenv').config();

const checkProduction = async () => {
  console.log('🏥 Production Health Check');
  console.log('=========================');
  
  try {
    // Check MongoDB connection
    console.log('\\n1. Testing MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB connection successful');
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Collections found:', collections.map(c => c.name));
    
    // Check users count
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    console.log(\`👥 Users in database: \${userCount}\`);
    
    // Check if admin exists
    const admin = await User.findOne({ role: 'admin' });
    console.log(\`👑 Admin user exists: \${admin ? 'Yes' : 'No'}\`);
    
    // Check psychologists
    const psychCount = await User.countDocuments({ role: 'psychologist' });
    console.log(\`🧠 Psychologists: \${psychCount}\`);
    
    console.log('\\n✅ Production health check complete!');
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

checkProduction();`;

  fs.writeFileSync('check-production-health.js', healthCheck);
  console.log('✅ Created production health check');
};

const createQuickFix = () => {
  console.log('\n3. Creating quick production fix:');
  
  const quickFix = `# 🚨 Production Quick Fix

## Issues Detected:
- 500 error on /api/public/psychologists
- 400 error on /api/users/login

## Likely Causes:
1. Database not populated with test data
2. Missing environment variables
3. Route configuration issues

## Quick Fixes:

### 1. Check Render Logs
Go to Render dashboard → Your service → Logs tab

### 2. Verify Environment Variables
In Render dashboard → Environment tab, ensure:
\`\`\`
MONGODB_URI=mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-production-secret
NODE_ENV=production
\`\`\`

### 3. Create Test Users
Run this in Render console or redeploy with:
\`\`\`bash
node create-production-users.js
\`\`\`

### 4. Test Endpoints
- Health: https://smiling-steps.onrender.com/
- Users: https://smiling-steps.onrender.com/api/users/login
- Psychologists: https://smiling-steps.onrender.com/api/public/psychologists

### 5. Test Credentials
Try logging in with:
- **Admin**: admin@smilingsteps.com / admin123
- **Psychologist**: psychologist@smilingsteps.com / psych123
- **Client**: client@smilingsteps.com / client123

## If Still Not Working:
1. Check Render build logs
2. Verify MongoDB Atlas connection
3. Check if all routes are properly loaded
4. Ensure models are correctly imported

## Emergency Rollback:
If needed, redeploy from GitHub with latest commit.
`;

  fs.writeFileSync('PRODUCTION_QUICK_FIX.md', quickFix);
  console.log('✅ Created production quick fix guide');
};

const main = () => {
  createProductionTestUsers();
  createProductionHealthCheck();
  createQuickFix();
  
  console.log('\n🎯 Production Fix Ready!');
  console.log('========================');
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('1. Check Render logs for specific errors');
  console.log('2. Verify environment variables in Render dashboard');
  console.log('3. Run: node create-production-users.js (if database is empty)');
  console.log('4. Test with provided credentials');
  console.log('');
  console.log('📖 Read PRODUCTION_QUICK_FIX.md for detailed troubleshooting');
};

main();