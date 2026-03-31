require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Use production MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI;

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isVerified: Boolean,
  loginAttempts: Number,
  lockUntil: Date,
  lastLogin: Date
});

const User = mongoose.model('User', UserSchema);

async function checkAndFixAdmin() {
  try {
    console.log('🔌 Connecting to production MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to production database\n');

    // Check for admin accounts
    const admins = await User.find({ role: 'admin' }).select('+password +loginAttempts +lockUntil');
    
    console.log(`📊 Found ${admins.length} admin account(s)\n`);

    if (admins.length === 0) {
      console.log('❌ NO ADMIN ACCOUNTS FOUND!');
      console.log('\n🔧 Creating new admin account...');
      
      const hashedPassword = await bcrypt.hash('Admin@2024', 10);
      const newAdmin = await User.create({
        name: 'System Admin',
        email: 'admin@smilingsteps.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        loginAttempts: 0,
        lastLogin: new Date()
      });

      console.log('✅ Admin account created!');
      console.log('\n📧 Email: admin@smilingsteps.com');
      console.log('🔑 Password: Admin@2024');
      console.log('\n⚠️ IMPORTANT: Change this password after first login!\n');
    } else {
      // Display all admin accounts
      admins.forEach((admin, index) => {
        console.log(`\n👤 Admin Account ${index + 1}:`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Name: ${admin.name}`);
        console.log(`   Verified: ${admin.isVerified ? '✅' : '❌'}`);
        console.log(`   Login Attempts: ${admin.loginAttempts || 0}`);
        console.log(`   Locked: ${admin.lockUntil && admin.lockUntil > Date.now() ? '🔒 YES' : '✅ NO'}`);
        console.log(`   Last Login: ${admin.lastLogin || 'Never'}`);
        console.log(`   Has Password: ${admin.password ? '✅' : '❌'}`);
      });

      // Ask if user wants to reset password
      console.log('\n\n🔧 ADMIN ACCOUNT FIX OPTIONS:');
      console.log('1. Reset password to: Admin@2024');
      console.log('2. Unlock account (if locked)');
      console.log('3. Ensure verified status');
      console.log('\nApplying all fixes...\n');

      for (const admin of admins) {
        // Reset password
        const hashedPassword = await bcrypt.hash('Admin@2024', 10);
        admin.password = hashedPassword;
        
        // Unlock account
        admin.loginAttempts = 0;
        admin.lockUntil = undefined;
        
        // Ensure verified
        admin.isVerified = true;
        
        await admin.save();
        
        console.log(`✅ Fixed admin account: ${admin.email}`);
        console.log(`   New password: Admin@2024`);
      }

      console.log('\n✅ All admin accounts have been fixed!');
      console.log('\n📧 Try logging in with:');
      console.log(`   Email: ${admins[0].email}`);
      console.log('   Password: Admin@2024');
      console.log('\n⚠️ IMPORTANT: Change this password after first login!\n');
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndFixAdmin();
