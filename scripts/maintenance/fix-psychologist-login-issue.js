/**
 * Diagnostic and Fix Script for Psychologist Login/Approval Issue
 * 
 * This script:
 * 1. Checks the database state for a psychologist
 * 2. Ensures approvalStatus is set correctly at both levels
 * 3. Provides instructions for testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling-steps';

async function fixPsychologistApproval() {
  console.log('🔧 Psychologist Login/Approval Issue Diagnostic\n');
  console.log('=' .repeat(60));
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const User = require('./server/models/User');
    
    // Find all psychologists
    const psychologists = await User.find({ role: 'psychologist' }).select('+password');
    
    console.log(`📋 Found ${psychologists.length} psychologist(s):\n`);
    
    for (const psych of psychologists) {
      // Skip deleted/anonymized users
      if (psych.email.includes('anonymized') || psych.email.includes('deleted')) {
        continue;
      }
      
      console.log(`  📧 ${psych.email}`);
      console.log(`     Name: ${psych.name}`);
      console.log(`     Top-level approvalStatus: ${psych.approvalStatus || 'NOT SET'}`);
      console.log(`     Nested approvalStatus: ${psych.psychologistDetails?.approvalStatus || 'NOT SET'}`);
      console.log(`     isVerified: ${psych.isVerified}`);
      console.log(`     status: ${psych.status}`);
      console.log(`     Has password: ${!!psych.password}`);
      
      // Check for issues
      const issues = [];
      
      if (psych.approvalStatus !== 'approved') {
        issues.push('Top-level approvalStatus is not "approved"');
      }
      
      if (psych.psychologistDetails?.approvalStatus !== 'approved') {
        issues.push('Nested approvalStatus is not "approved"');
      }
      
      if (!psych.isVerified) {
        issues.push('Email is not verified');
      }
      
      if (psych.status !== 'active') {
        issues.push(`Account status is "${psych.status}" instead of "active"`);
      }
      
      if (issues.length > 0) {
        console.log(`     ⚠️ Issues found:`);
        issues.forEach(issue => console.log(`        - ${issue}`));
        
        // Ask if we should fix
        console.log(`\n     🔧 Fixing issues...`);
        
        psych.approvalStatus = 'approved';
        if (psych.psychologistDetails) {
          psych.psychologistDetails.approvalStatus = 'approved';
        }
        psych.isVerified = true;
        psych.status = 'active';
        
        await psych.save();
        console.log(`     ✅ Fixed! Account is now approved and verified.`);
      } else {
        console.log(`     ✅ No issues - account is properly configured`);
      }
      
      console.log('');
    }
    
    console.log('=' .repeat(60));
    console.log('\n📝 NEXT STEPS:\n');
    console.log('1. Restart your server: npm run dev');
    console.log('2. Clear browser localStorage (or use incognito)');
    console.log('3. Try logging in again');
    console.log('\n💡 If still having issues, check browser console for:');
    console.log('   - "🔐 User loaded from /api/auth" - shows what data is received');
    console.log('   - "🚫 RoleGuard" - shows why pending page is displayed');
    console.log('   - "Login successful" - shows login response data');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixPsychologistApproval();
