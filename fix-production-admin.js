const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const PRODUCTION_MONGODB_URI = "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";

const User = require('./models/User');

const fixProductionAdmin = async () => {
  try {
    console.log('🔗 Connecting to Production MongoDB...');
    await mongoose.connect(PRODUCTION_MONGODB_URI);
    console.log('✅ Connected to Production MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@smilingsteps.com' });
    
    if (admin) {
      console.log('👑 Found admin user, updating...');
      
      // Hash the password properly
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Update admin with proper fields
      await User.updateOne(
        { email: 'admin@smilingsteps.com' },
        {
          $set: {
            password: hashedPassword,
            isEmailVerified: true,
            role: 'admin',
            name: 'Admin User'
          }
        }
      );
      
      console.log('✅ Admin user updated with:');
      console.log('   - Properly hashed password');
      console.log('   - Email verification: true');
      console.log('   - Role: admin');
      
      // Verify the update
      const updatedAdmin = await User.findOne({ email: 'admin@smilingsteps.com' });
      console.log('\n📋 Updated admin details:');
      console.log('   Email:', updatedAdmin.email);
      console.log('   Role:', updatedAdmin.role);
      console.log('   Email Verified:', updatedAdmin.isEmailVerified);
      console.log('   Password Hash Length:', updatedAdmin.password?.length || 'No password');
      
    } else {
      console.log('❌ Admin user not found, creating new one...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = new User({
        name: 'Admin User',
        email: 'admin@smilingsteps.com',
        password: hashedPassword,
        role: 'admin',
        isEmailVerified: true
      });
      
      await newAdmin.save();
      console.log('✅ New admin user created');
    }

    console.log('\n🎉 Production Admin Fixed!');
    console.log('==========================');
    console.log('👑 Admin Login: admin@smilingsteps.com / admin123');
    console.log('🔐 Password properly hashed and ready for login');
    console.log('📧 Email verification bypassed for admin');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

fixProductionAdmin();