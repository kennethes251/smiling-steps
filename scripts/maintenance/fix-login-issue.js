/**
 * Fix Login Issue Script
 * This script diagnoses and fixes login issues for users
 * 
 * Usage:
 *   node fix-login-issue.js                    # List all users
 *   node fix-login-issue.js test@example.com   # Check specific user
 *   node fix-login-issue.js test@example.com newpassword  # Reset password
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Remove quotes if present in env var
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling-steps';
MONGODB_URI = MONGODB_URI.replace(/^["']|["']$/g, '');

async function main() {
  console.log('🔧 Login Issue Diagnostic & Fix Tool\n');
  console.log('='.repeat(60));
  
  const email = process.argv[2];
  const newPassword = process.argv[3];
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Get User model
    const User = require('./server/models/User');
    
    if (!email) {
      // List all users
      console.log('📋 All Users in Database:\n');
      const users = await User.find({}).select('email name role isVerified status createdAt').limit(20);
      
      if (users.length === 0) {
        console.log('   No users found in database.');
      } else {
        users.forEach((u, i) => {
          console.log(`${i + 1}. ${u.email}`);
          console.log(`   Name: ${u.name}`);
          console.log(`   Role: ${u.role}`);
          console.log(`   Verified: ${u.isVerified}`);
          console.log(`   Status: ${u.status || 'active'}`);
          console.log('');
        });
      }
      
      console.log('\n💡 To check a specific user: node fix-login-issue.js <email>');
      console.log('💡 To reset password: node fix-login-issue.js <email> <newpassword>');
      
    } else if (!newPassword) {
      // Check specific user
      console.log(`🔍 Checking user: ${email}\n`);
      
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password +loginAttempts +lockUntil');
      
      if (!user) {
        console.log('❌ User not found!');
        return;
      }
      
      console.log('📋 User Details:');
      console.log(`   ID: ${user._id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Verified: ${user.isVerified}`);
      console.log(`   Status: ${user.status || 'active'}`);
      console.log(`   Login Attempts: ${user.loginAttempts || 0}`);
      console.log(`   Locked Until: ${user.lockUntil ? new Date(user.lockUntil).toISOString() : 'Not locked'}`);
      
      console.log('\n🔐 Password Analysis:');
      console.log(`   Has password: ${!!user.password}`);
      
      if (user.password) {
        console.log(`   Password length: ${user.password.length}`);
        console.log(`   Is bcrypt hash: ${user.password.startsWith('$2')}`);
        console.log(`   Hash prefix: ${user.password.substring(0, 10)}...`);
        
        // Test common passwords
        console.log('\n🧪 Testing common passwords:');
        const testPasswords = ['password123', 'test123', 'psych123', 'secure123', 'admin123', 'client123'];
        
        for (const pwd of testPasswords) {
          const match = await bcrypt.compare(pwd, user.password);
          if (match) {
            console.log(`   ✅ "${pwd}" - MATCHES!`);
          }
        }
      } else {
        console.log('   ⚠️ NO PASSWORD STORED - This is the problem!');
      }
      
      // Check for issues
      console.log('\n🔍 Issue Detection:');
      
      if (!user.password) {
        console.log('   ❌ ISSUE: No password stored');
        console.log('   FIX: Run: node fix-login-issue.js ' + email + ' <newpassword>');
      }
      
      if (!user.isVerified && (user.role === 'client' || user.role === 'psychologist')) {
        console.log('   ⚠️ ISSUE: Email not verified');
        console.log('   FIX: User needs to verify email or admin can manually verify');
      }
      
      if (user.lockUntil && user.lockUntil > Date.now()) {
        console.log('   ⚠️ ISSUE: Account is locked');
        console.log('   FIX: Wait or run unlock script');
      }
      
      if (user.status === 'deleted' || user.status === 'inactive') {
        console.log('   ❌ ISSUE: Account is ' + user.status);
      }
      
    } else {
      // Reset password
      console.log(`🔧 Resetting password for: ${email}\n`);
      
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      
      if (!user) {
        console.log('❌ User not found!');
        return;
      }
      
      console.log(`   Found user: ${user.name} (${user.role})`);
      
      // Hash the new password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      console.log(`   New password: ${newPassword}`);
      console.log(`   Hashed: ${hashedPassword.substring(0, 20)}...`);
      
      // Update directly to avoid pre-save hook issues
      await User.updateOne(
        { _id: user._id },
        { 
          $set: { 
            password: hashedPassword,
            loginAttempts: 0,
            lockUntil: null
          }
        }
      );
      
      console.log('\n✅ Password reset successfully!');
      console.log(`   Email: ${email}`);
      console.log(`   New Password: ${newPassword}`);
      
      // Verify the update
      const updatedUser = await User.findById(user._id).select('+password');
      const verifyMatch = await bcrypt.compare(newPassword, updatedUser.password);
      console.log(`   Verification: ${verifyMatch ? '✅ Password works!' : '❌ Something went wrong'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('buffering timed out')) {
      console.log('\n💡 MongoDB connection timed out. Check:');
      console.log('   1. Your MONGODB_URI in .env is correct');
      console.log('   2. Your IP is whitelisted in MongoDB Atlas');
      console.log('   3. Your network connection is stable');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

main();
