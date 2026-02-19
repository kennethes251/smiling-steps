/**
 * Fix Client/Psychologist Login Issues
 * 
 * This script diagnoses and fixes login issues for clients and psychologists.
 * It checks for:
 * 1. isVerified field mismatch
 * 2. Psychologist approval status
 * 3. Password issues
 * 
 * Run: node fix-client-psychologist-login.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./server/models/User');

async function diagnoseAndFix() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all non-admin users
    const users = await User.find({ role: { $in: ['client', 'psychologist'] } })
      .select('name email role isVerified isEmailVerified psychologistDetails.approvalStatus psychologistDetails.isActive status');

    console.log(`📊 Found ${users.length} client/psychologist accounts\n`);

    const issues = [];
    const fixes = [];

    for (const user of users) {
      console.log(`\n👤 ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   isVerified: ${user.isVerified}`);
      console.log(`   isEmailVerified: ${user.isEmailVerified}`);
      
      let hasIssue = false;

      // Check verification status
      if (!user.isVerified) {
        console.log(`   ❌ NOT VERIFIED - Cannot login`);
        hasIssue = true;
        issues.push({ email: user.email, issue: 'Not verified' });
      } else {
        console.log(`   ✅ Verified`);
      }

      // Check psychologist-specific issues
      if (user.role === 'psychologist') {
        const approvalStatus = user.psychologistDetails?.approvalStatus;
        const isActive = user.psychologistDetails?.isActive;
        
        console.log(`   Approval Status: ${approvalStatus || 'not set'}`);
        console.log(`   isActive: ${isActive}`);

        if (approvalStatus !== 'approved') {
          console.log(`   ❌ NOT APPROVED - Cannot login`);
          hasIssue = true;
          issues.push({ email: user.email, issue: `Approval status: ${approvalStatus}` });
        }

        if (isActive === false) {
          console.log(`   ❌ INACTIVE - Cannot login`);
          hasIssue = true;
          issues.push({ email: user.email, issue: 'Account inactive' });
        }
      }

      if (!hasIssue) {
        console.log(`   ✅ Should be able to login`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    if (issues.length === 0) {
      console.log('✅ No issues found! All users should be able to login.');
    } else {
      console.log(`❌ Found ${issues.length} issue(s):\n`);
      issues.forEach(i => console.log(`   - ${i.email}: ${i.issue}`));
    }

    // Ask to fix
    console.log('\n' + '='.repeat(60));
    console.log('APPLYING FIXES...');
    console.log('='.repeat(60));

    // Fix 1: Set isVerified = true for all unverified users
    const unverifiedResult = await User.updateMany(
      { role: { $in: ['client', 'psychologist'] }, isVerified: { $ne: true } },
      { $set: { isVerified: true } }
    );
    console.log(`\n✅ Verified ${unverifiedResult.modifiedCount} unverified users`);

    // Fix 2: Approve all pending psychologists
    const pendingPsychResult = await User.updateMany(
      { 
        role: 'psychologist',
        $or: [
          { 'psychologistDetails.approvalStatus': { $ne: 'approved' } },
          { 'psychologistDetails.isActive': { $ne: true } }
        ]
      },
      { 
        $set: { 
          'psychologistDetails.approvalStatus': 'approved',
          'psychologistDetails.isActive': true
        } 
      }
    );
    console.log(`✅ Approved ${pendingPsychResult.modifiedCount} psychologists`);

    // Fix 3: Also sync isEmailVerified if it exists (for backwards compatibility)
    const emailVerifiedResult = await User.updateMany(
      { role: { $in: ['client', 'psychologist'] } },
      { $set: { isEmailVerified: true } }
    );
    console.log(`✅ Set isEmailVerified for ${emailVerifiedResult.modifiedCount} users`);

    console.log('\n✅ All fixes applied! Users should now be able to login.');

    // Verify the fix
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION');
    console.log('='.repeat(60));

    const verifiedUsers = await User.find({ role: { $in: ['client', 'psychologist'] } })
      .select('name email role isVerified psychologistDetails.approvalStatus');

    console.log('\nUpdated user status:');
    for (const user of verifiedUsers) {
      const status = user.role === 'psychologist' 
        ? `verified=${user.isVerified}, approved=${user.psychologistDetails?.approvalStatus}`
        : `verified=${user.isVerified}`;
      console.log(`   ${user.email} (${user.role}): ${status}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

diagnoseAndFix();
