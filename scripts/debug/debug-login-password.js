/**
 * Debug Login Password Flow
 * Tests the exact password hashing and comparison flow
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Remove quotes if present in env var
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling-steps';
MONGODB_URI = MONGODB_URI.replace(/^["']|["']$/g, '');

async function debugPasswordFlow() {
  console.log('🔍 DEBUG: Password Flow Analysis\n');
  console.log('='.repeat(60));
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get User model
    const User = require('./server/models/User');
    
    // Find a test user - get one with password field
    const testEmail = process.argv[2] || 'test@example.com';
    console.log(`📧 Looking for user: ${testEmail}\n`);
    
    // First, find user without password to see basic info
    const userBasic = await User.findOne({ email: testEmail.toLowerCase() });
    
    if (!userBasic) {
      console.log('❌ User not found!');
      console.log('\n📋 Available users in database:');
      const allUsers = await User.find({}).select('email name role isVerified').limit(10);
      allUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.role}) - Verified: ${u.isVerified}`);
      });
      return;
    }
    
    console.log('📋 User Basic Info:');
    console.log(`   Name: ${userBasic.name}`);
    console.log(`   Email: ${userBasic.email}`);
    console.log(`   Role: ${userBasic.role}`);
    console.log(`   isVerified: ${userBasic.isVerified}`);
    console.log(`   Status: ${userBasic.status}`);
    console.log(`   ID: ${userBasic._id}`);
    
    // Now get user WITH password
    const userWithPassword = await User.findOne({ email: testEmail.toLowerCase() }).select('+password');
    
    console.log('\n🔐 Password Analysis:');
    console.log(`   Has password field: ${!!userWithPassword.password}`);
    
    if (userWithPassword.password) {
      console.log(`   Password length: ${userWithPassword.password.length}`);
      console.log(`   Password starts with: ${userWithPassword.password.substring(0, 10)}...`);
      console.log(`   Is bcrypt hash: ${userWithPassword.password.startsWith('$2')}`);
      
      // Test password comparison
      const testPasswords = ['password123', 'test123', 'psych123', 'secure123', 'therapist123', 'admin123'];
      
      console.log('\n🧪 Testing common passwords:');
      for (const pwd of testPasswords) {
        const isMatch = await bcrypt.compare(pwd, userWithPassword.password);
        console.log(`   "${pwd}": ${isMatch ? '✅ MATCH!' : '❌ No match'}`);
        if (isMatch) {
          console.log(`\n🎉 Found password: "${pwd}"`);
          break;
        }
      }
      
      // Test using the model's correctPassword method
      console.log('\n🔧 Testing correctPassword method:');
      const methodResult = await userWithPassword.correctPassword('password123');
      console.log(`   correctPassword('password123'): ${methodResult}`);
      
    } else {
      console.log('   ⚠️ NO PASSWORD STORED! This is the problem.');
    }
    
    // Check if there's a double-hashing issue
    console.log('\n🔬 Double-Hash Detection:');
    if (userWithPassword.password) {
      // A double-hashed password would be a bcrypt hash of a bcrypt hash
      // bcrypt hashes are 60 chars, so if we hash a 60-char string, we get another 60-char hash
      // The original password would NOT match
      const testPwd = 'password123';
      const singleHash = await bcrypt.hash(testPwd, 12);
      const doubleHash = await bcrypt.hash(singleHash, 12);
      
      console.log(`   Single hash length: ${singleHash.length}`);
      console.log(`   Double hash length: ${doubleHash.length}`);
      console.log(`   Stored hash length: ${userWithPassword.password.length}`);
      
      // If stored password is a double hash, comparing with original won't work
      // but comparing with single hash might
      const compareWithSingleHash = await bcrypt.compare(singleHash, userWithPassword.password);
      console.log(`   Is stored hash a double-hash of 'password123': ${compareWithSingleHash}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

debugPasswordFlow();
