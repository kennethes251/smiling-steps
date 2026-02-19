/**
 * Fix Any User Password Script
 * 
 * Usage:
 *   node fix-any-user-password.js <email> <new-password>
 *   
 * Examples:
 *   node fix-any-user-password.js user@example.com newpassword123
 *   node fix-any-user-password.js admin@smilingsteps.com admin123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
const EMAIL = process.argv[2];
const NEW_PASSWORD = process.argv[3];

if (!EMAIL || !NEW_PASSWORD) {
  console.log('❌ Usage: node fix-any-user-password.js <email> <new-password>');
  console.log('   Example: node fix-any-user-password.js user@example.com newpassword123');
  process.exit(1);
}

async function fixPassword() {
  console.log('🔧 PASSWORD FIX SCRIPT');
  console.log('='.repeat(50));
  console.log(`Email: ${EMAIL}`);
  console.log(`New Password: ${NEW_PASSWORD.substring(0, 3)}***`);
  console.log('='.repeat(50));

  try {
    // Connect to MongoDB
    console.log('\n1️⃣ Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected');

    // Simple schema for direct access
    const UserSchema = new mongoose.Schema({
      email: String,
      password: String,
      name: String,
      role: String,
      isVerified: Boolean,
      loginAttempts: Number,
      lockUntil: Number
    }, { collection: 'users' });
    
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Find user
    console.log('\n2️⃣ Finding user...');
    const user = await User.findOne({ email: EMAIL.toLowerCase().trim() });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('✅ User found:', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      currentPasswordLength: user.password ? user.password.length : 0
    });

    // Hash new password
    console.log('\n3️⃣ Hashing new password...');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
    console.log('✅ Password hashed:', {
      length: hashedPassword.length,
      prefix: hashedPassword.substring(0, 7)
    });

    // Update password directly (bypassing pre-save hook)
    console.log('\n4️⃣ Updating password in database...');
    const result = await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          password: hashedPassword,
          loginAttempts: 0,
          lockUntil: null
        } 
      }
    );
    console.log('✅ Update result:', result);

    // Verify the fix
    console.log('\n5️⃣ Verifying fix...');
    const updatedUser = await User.findOne({ _id: user._id });
    const verifyResult = await bcrypt.compare(NEW_PASSWORD, updatedUser.password);
    
    if (verifyResult) {
      console.log('✅ PASSWORD FIXED SUCCESSFULLY!');
      console.log('\n📋 You can now login with:');
      console.log(`   Email: ${EMAIL}`);
      console.log(`   Password: ${NEW_PASSWORD}`);
    } else {
      console.log('❌ Verification failed - something went wrong');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Done');
  }
}

fixPassword();
