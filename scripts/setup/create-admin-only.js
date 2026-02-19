const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const createAdminOnly = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Remove all existing users first
    console.log('🧹 Cleaning existing users...');
    await User.deleteMany({});
    console.log('✅ All users removed');

    // Create only admin user
    const admin = new User({
      name: 'Admin User',
      email: 'admin@smilingsteps.com',
      password: 'admin123',
      role: 'admin',
      isEmailVerified: true // Admin doesn't need email verification
    });
    await admin.save();
    console.log('✅ Admin user created');

    console.log('\n🎉 Production Ready for Email Verification Testing!');
    console.log('================================================');
    console.log('');
    console.log('👑 Admin Login: admin@smilingsteps.com / admin123');
    console.log('');
    console.log('📧 Email Verification Testing:');
    console.log('1. Register a new account with your real email');
    console.log('2. Check your email for verification link');
    console.log('3. Click the link to verify your account');
    console.log('4. Login with your verified account');
    console.log('');
    console.log('📮 Email Configuration:');
    console.log('- From: hr@smilingsteps.com');
    console.log('- SMTP: Gmail (kennethes251@gmail.com)');
    console.log('- Status: ✅ Ready for production testing');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

createAdminOnly();