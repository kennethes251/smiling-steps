/**
 * Debug script to investigate login issues for a specific user
 * Run with: node debug-login-issue.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smilingsteps';
const EMAIL_TO_CHECK = 'kennethes251@gmail.com';

async function debugLoginIssue() {
  console.log('🔍 Debugging login issue for:', EMAIL_TO_CHECK);
  console.log('='.repeat(60));
  
  try {
    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Load User model
    const User = require('./server/models/User');
    
    // Find the user with password field included
    console.log('\n🔍 Looking up user...');
    const user = await User.findOne({ 
      email: EMAIL_TO_CHECK.toLowerCase().trim() 
    }).select('+password');
    
    if (!user) {
      console.log('❌ USER NOT FOUND in database');
      console.log('\n💡 Possible causes:');
      console.log('   - User never registered');
      console.log('   - Email was entered differently during registration');
      console.log('   - User was deleted');
      return;
    }
    
    console.log('✅ User found!');
    console.log('\n📋 User Details:');
    console.log('   ID:', user._id.toString());
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Created:', user.createdAt);
    console.log('   Last Login:', user.lastLogin || 'Never');
    
    console.log('\n🔐 Authentication Status:');
    console.log('   isVerified:', user.isVerified);
    console.log('   Has Password:', !!user.password);
    console.log('   Password Length:', user.password ? user.password.length : 0);
    console.log('   Status:', user.status || 'active');
    
    console.log('\n🔒 Account Lock Status:');
    console.log('   Login Attempts:', user.loginAttempts || 0);
    console.log('   Lock Until:', user.lockUntil || 'Not locked');
    
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      console.log('   ⚠️  ACCOUNT IS LOCKED for', minutesRemaining, 'more minutes');
    }
    
    if (user.role === 'psychologist') {
      console.log('\n👨‍⚕️ Psychologist Details:');
      console.log('   Approval Status:', user.psychologistDetails?.approvalStatus || 'N/A');
      console.log('   Is Active:', user.psychologistDetails?.isActive);
    }
    
    // Diagnose the issue
    console.log('\n' + '='.repeat(60));
    console.log('🔍 DIAGNOSIS:');
    console.log('='.repeat(60));
    
    const issues = [];
    
    if (!user.isVerified && (user.role === 'client' || user.role === 'psychologist')) {
      issues.push({
        issue: 'Email not verified',
        fix: 'User needs to verify email or admin can manually verify',
        code: 'await User.updateOne({ email: "' + user.email + '" }, { isVerified: true })'
      });
    }
    
    if (user.lockUntil && user.lockUntil > Date.now()) {
      issues.push({
        issue: 'Account is locked due to too many failed login attempts',
        fix: 'Wait for lock to expire or manually unlock',
        code: 'await User.updateOne({ email: "' + user.email + '" }, { loginAttempts: 0, lockUntil: null })'
      });
    }
    
    if (user.role === 'psychologist') {
      if (user.psychologistDetails?.approvalStatus === 'pending') {
        issues.push({
          issue: 'Psychologist account pending approval',
          fix: 'Admin needs to approve the psychologist',
          code: 'await User.updateOne({ email: "' + user.email + '" }, { "psychologistDetails.approvalStatus": "approved", "psychologistDetails.isActive": true })'
        });
      }
      if (user.psychologistDetails?.approvalStatus === 'rejected') {
        issues.push({
          issue: 'Psychologist application was rejected',
          fix: 'Contact support or re-apply'
        });
      }
      if (user.psychologistDetails?.isActive === false) {
        issues.push({
          issue: 'Psychologist account is disabled',
          fix: 'Admin needs to re-enable the account',
          code: 'await User.updateOne({ email: "' + user.email + '" }, { "psychologistDetails.isActive": true })'
        });
      }
    }
    
    if (user.status && user.status !== 'active') {
      issues.push({
        issue: 'Account status is not active: ' + user.status,
        fix: 'Admin needs to reactivate the account',
        code: 'await User.updateOne({ email: "' + user.email + '" }, { status: "active" })'
      });
    }
    
    if (issues.length === 0) {
      console.log('✅ No obvious issues found with the account.');
      console.log('   The 400 error is likely due to:');
      console.log('   - Wrong password being entered');
      console.log('   - Password was changed and user forgot');
      console.log('\n💡 To test password, you can reset it:');
      console.log('   const bcrypt = require("bcryptjs");');
      console.log('   const newPassword = await bcrypt.hash("newpassword123", 10);');
      console.log('   await User.updateOne({ email: "' + user.email + '" }, { password: newPassword });');
    } else {
      console.log('❌ Found', issues.length, 'issue(s):\n');
      issues.forEach((item, index) => {
        console.log(`${index + 1}. ${item.issue}`);
        console.log(`   Fix: ${item.fix}`);
        if (item.code) {
          console.log(`   Code: ${item.code}`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

debugLoginIssue();
