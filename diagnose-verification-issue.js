/**
 * Diagnose email verification issue
 * Checks the actual field values in the database
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function diagnoseVerification() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling-steps';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get the User collection directly to see raw data
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get email from command line or use default
    const email = process.argv[2] || 'test@example.com';
    console.log(`\n🔍 Looking up user: ${email}\n`);

    // Find user with raw query to see all fields
    const user = await usersCollection.findOne({ 
      email: email.toLowerCase() 
    });

    if (!user) {
      console.log('❌ User not found with email:', email);
      console.log('\n📋 Available users:');
      const allUsers = await usersCollection.find({}, { 
        projection: { email: 1, name: 1, role: 1 } 
      }).limit(10).toArray();
      allUsers.forEach(u => console.log(`  - ${u.email} (${u.role})`));
      return;
    }

    console.log('📊 User Data:');
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('');
    console.log('🔐 Verification Fields:');
    console.log('  isVerified:', user.isVerified, '(checked by login)');
    console.log('  isEmailVerified:', user.isEmailVerified, '(set by verification service)');
    console.log('  verificationToken:', user.verificationToken ? 'EXISTS' : 'NOT SET');
    console.log('  verificationTokenExpires:', user.verificationTokenExpires || 'NOT SET');
    console.log('');
    console.log('📋 Account Status:');
    console.log('  status:', user.status);
    console.log('  active:', user.active);
    console.log('  loginAttempts:', user.loginAttempts);
    console.log('  lockUntil:', user.lockUntil);

    // Check for the field mismatch issue
    if (user.isEmailVerified === true && user.isVerified !== true) {
      console.log('\n⚠️  ISSUE DETECTED: isEmailVerified is true but isVerified is not!');
      console.log('   This is why login is failing.');
      console.log('\n🔧 To fix this user, run:');
      console.log(`   node diagnose-verification-issue.js ${email} --fix`);
    }

    // Fix if requested
    if (process.argv[3] === '--fix') {
      console.log('\n🔧 Fixing verification status...');
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            isVerified: true,
            isEmailVerified: true 
          },
          $unset: {
            verificationToken: 1,
            verificationTokenExpires: 1
          }
        }
      );
      console.log('✅ User verification status fixed!');
      console.log('   You should now be able to login.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

diagnoseVerification();
