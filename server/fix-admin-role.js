require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function fixAdminRole() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the admin user
    const adminUser = await User.findOne({ email: 'smilingsteps@gmail.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('👤 Current admin user:', {
      email: adminUser.email,
      role: adminUser.role,
      name: adminUser.name
    });

    // Update role to admin if it's not already
    if (adminUser.role !== 'admin') {
      adminUser.role = 'admin';
      await adminUser.save();
      console.log('✅ Updated admin user role to "admin"');
    } else {
      console.log('✅ Admin user already has correct role');
    }

    // Verify the update
    const updatedUser = await User.findOne({ email: 'smilingsteps@gmail.com' });
    console.log('🔍 Verified admin user:', {
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.name
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixAdminRole();