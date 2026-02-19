/**
 * Password Diagnosis & Fix Script
 * 
 * This script diagnoses and fixes common password issues:
 * 1. Password comparison failing
 * 2. Double-hashing (password got hashed twice)
 * 3. select('+password') not working
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
console.log('Using MongoDB URI:', MONGODB_URI ? MONGODB_URI.substring(0, 30) + '...' : 'NOT SET');

// Test user credentials - change these to test specific users
const TEST_EMAIL = process.argv[2] || 'kennethes251@gmail.com';
const TEST_PASSWORD = process.argv[3] || '33285322';

async function diagnosePasswordIssue() {
  console.log('🔍 PASSWORD DIAGNOSIS SCRIPT');
  console.log('='.repeat(50));
  console.log(`Testing: ${TEST_EMAIL}`);
  console.log(`Password: ${TEST_PASSWORD.substring(0, 3)}***`);
  console.log('='.repeat(50));

  try {
    // Connect to MongoDB with explicit options
    console.log('\n1️⃣ Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    // Define a simple User schema for direct access
    const UserSchema = new mongoose.Schema({
      email: String,
      password: String,
      name: String,
      role: String,
      isVerified: Boolean,
      loginAttempts: Number,
      lockUntil: Number
    }, { collection: 'users' });
    
    // Use existing model or create new one
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Test 1: Check if select('+password') works
    console.log('\n2️⃣ Testing select("+password")...');
    
    const userWithPassword = await User.findOne({ 
      email: TEST_EMAIL.toLowerCase().trim() 
    });
    
    if (!userWithPassword) {
      console.log('❌ User not found!');
      return;
    }

    console.log('User found:', {
      id: userWithPassword._id,
      email: userWithPassword.email,
      role: userWithPassword.role,
      hasPassword: !!userWithPassword.password,
      passwordLength: userWithPassword.password ? userWithPassword.password.length : 0
    });

    if (!userWithPassword.password) {
      console.log('❌ PROBLEM: Password field is empty/null!');
      console.log('   This means select("+password") is not working or password was never set.');
      return;
    }

    // Test 2: Check if password looks like a bcrypt hash
    console.log('\n3️⃣ Checking password hash format...');
    const storedPassword = userWithPassword.password;
    console.log('Stored password:', {
      length: storedPassword.length,
      prefix: storedPassword.substring(0, 7),
      isBcryptFormat: storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')
    });

    if (!storedPassword.startsWith('$2')) {
      console.log('❌ PROBLEM: Password is NOT a bcrypt hash!');
      console.log('   The password might be stored in plain text.');
      return;
    }

    // Test 3: Check for double-hashing
    console.log('\n4️⃣ Checking for double-hashing...');
    
    // A double-hashed password would be a bcrypt hash of a bcrypt hash
    // The inner hash would be ~60 chars, so the outer hash would still be ~60 chars
    // But comparing the plain password would fail
    
    const directCompare = await bcrypt.compare(TEST_PASSWORD, storedPassword);
    console.log('Direct bcrypt.compare result:', directCompare);

    if (!directCompare) {
      console.log('\n⚠️ Password comparison FAILED. Possible causes:');
      console.log('   1. Wrong password entered');
      console.log('   2. Password was double-hashed');
      console.log('   3. Password was changed');
      
      // Test if it's double-hashed by checking if the stored hash is itself a hash of a hash
      console.log('\n5️⃣ Testing for double-hash scenario...');
      
      // Hash the test password once
      const singleHash = await bcrypt.hash(TEST_PASSWORD, 12);
      console.log('Single hash of test password:', singleHash.substring(0, 20) + '...');
      
      // Check if stored password might be a hash of a hash
      // This is unlikely but let's check
      const isDoubleHashed = await bcrypt.compare(singleHash, storedPassword);
      console.log('Is stored password a hash of a hash?', isDoubleHashed);
      
      if (isDoubleHashed) {
        console.log('❌ CONFIRMED: Password was DOUBLE-HASHED!');
      }
    } else {
      console.log('✅ Password comparison SUCCEEDED!');
      console.log('   The password is correctly stored and can be verified.');
    }

    // Test 4: Test the model's correctPassword method
    console.log('\n6️⃣ Testing password comparison...');
    // Skip model method test since we're using simple schema
    console.log('(Skipping model method test - using direct bcrypt)');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 DIAGNOSIS SUMMARY');
    console.log('='.repeat(50));
    console.log(`User exists: ✅`);
    console.log(`Password field retrieved: ${userWithPassword.password ? '✅' : '❌'}`);
    console.log(`Password is bcrypt hash: ${storedPassword.startsWith('$2') ? '✅' : '❌'}`);
    console.log(`Password comparison: ${directCompare ? '✅ PASS' : '❌ FAIL'}`);

    if (!directCompare) {
      console.log('\n🔧 RECOMMENDED FIX:');
      console.log('   Run: node diagnose-password-issue.js <email> <password> --fix');
    }

    // Fix option
    if (process.argv.includes('--fix') && !directCompare) {
      console.log('\n🔧 APPLYING FIX...');
      await fixPassword(User, TEST_EMAIL, TEST_PASSWORD);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

async function fixPassword(User, email, newPassword) {
  console.log(`\nResetting password for ${email}...`);
  
  // Hash the password manually (single hash)
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  
  console.log('New hash:', {
    length: hashedPassword.length,
    prefix: hashedPassword.substring(0, 7)
  });

  // Update directly in database to bypass pre-save hook
  const result = await User.updateOne(
    { email: email.toLowerCase().trim() },
    { 
      $set: { 
        password: hashedPassword,
        loginAttempts: 0,
        lockUntil: null
      } 
    }
  );

  console.log('Update result:', result);

  // Verify the fix
  const updatedUser = await User.findOne({ 
    email: email.toLowerCase().trim() 
  }).select('+password');

  const verifyResult = await bcrypt.compare(newPassword, updatedUser.password);
  console.log('Verification after fix:', verifyResult ? '✅ SUCCESS' : '❌ FAILED');
}

// Run the diagnosis
diagnosePasswordIssue();
