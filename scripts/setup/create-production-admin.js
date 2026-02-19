const mongoose = require('mongoose');
require('dotenv').config();

// Use the production MongoDB URI directly
const PRODUCTION_MONGODB_URI = "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";

const User = require('./models/User');

const createProductionAdmin = async () => {
  try {
    console.log('🔗 Connecting to Production MongoDB...');
    await mongoose.connect(PRODUCTION_MONGODB_URI);
    console.log('✅ Connected to Production MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@smilingsteps.com' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('   Email:', existingAdmin.email);
      console.log('   Role:', existingAdmin.role);
      console.log('   Email Verified:', existingAdmin.isEmailVerified);
    } else {
      // Create admin user
      const admin = new User({
        name: 'Admin User',
        email: 'admin@smilingsteps.com',
        password: 'admin123',
        role: 'admin',
        isEmailVerified: true
      });
      await admin.save();
      console.log('✅ Admin user created in production');
    }

    // Count total users
    const userCount = await User.countDocuments();
    console.log(`📊 Total users in production: ${userCount}`);

    // List all users (for verification)
    const allUsers = await User.find({}, 'name email role isEmailVerified');
    console.log('\n👥 All users in production:');
    allUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - Verified: ${user.isEmailVerified}`);
    });

    console.log('\n🎉 Production Database Ready!');
    console.log('=============================');
    console.log('👑 Admin Login: admin@smilingsteps.com / admin123');
    console.log('📧 Ready for email verification testing');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

createProductionAdmin();