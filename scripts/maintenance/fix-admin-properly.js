const mongoose = require('mongoose');
require('dotenv').config();

const PRODUCTION_MONGODB_URI = "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";

const User = require('./models/User');

const fixAdminProperly = async () => {
  try {
    console.log('🔗 Connecting to Production MongoDB...');
    await mongoose.connect(PRODUCTION_MONGODB_URI);
    console.log('✅ Connected to Production MongoDB');

    // Remove existing admin if any
    await User.deleteMany({ email: 'admin@smilingsteps.com' });
    console.log('🧹 Removed existing admin user');

    // Create new admin user (this will trigger the pre-save middleware)
    const admin = new User({
      name: 'Admin User',
      email: 'admin@smilingsteps.com',
      password: 'admin123', // This will be hashed by the pre-save middleware
      role: 'admin',
      isEmailVerified: true
    });

    await admin.save(); // This triggers the password hashing middleware
    console.log('✅ Admin user created with proper password hashing');

    // Verify the admin was created correctly
    const verifyAdmin = await User.findOne({ email: 'admin@smilingsteps.com' }).select('+password');
    console.log('\n📋 Admin verification:');
    console.log('   Email:', verifyAdmin.email);
    console.log('   Role:', verifyAdmin.role);
    console.log('   Email Verified:', verifyAdmin.isEmailVerified);
    console.log('   Password Hash Length:', verifyAdmin.password?.length || 'No password');
    console.log('   Password starts with $2b$:', verifyAdmin.password?.startsWith('$2b$') ? 'Yes (bcrypt hash)' : 'No');

    // Test password verification
    const isPasswordCorrect = await verifyAdmin.correctPassword('admin123');
    console.log('   Password verification test:', isPasswordCorrect ? '✅ Correct' : '❌ Failed');

    console.log('\n🎉 Production Admin Ready!');
    console.log('==========================');
    console.log('👑 Admin Login: admin@smilingsteps.com / admin123');
    console.log('🔐 Password properly hashed and verified');
    console.log('📧 Email verification bypassed for admin');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

fixAdminProperly();