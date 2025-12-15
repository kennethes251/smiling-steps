const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

// User model
const User = require('./server/models/User');

// Debug user login issues
async function debugLoginIssue(email) {
  try {
    console.log('\n🔍 DEBUGGING LOGIN ISSUE FOR:', email);
    console.log('='.repeat(60));

    // Find user
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password +loginAttempts +lockUntil +isVerified +verificationToken');

    if (!user) {
      console.log('\n❌ USER NOT FOUND');
      console.log('   This email is not registered in the database.');
      console.log('   User needs to register first.');
      return;
    }

    console.log('\n✅ USER FOUND');
    console.log('   ID:', user._id);
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Created:', user.createdAt);

    // Check account status
    console.log('\n📊 ACCOUNT STATUS:');
    
    // 1. Email Verification (for clients)
    if (user.role === 'client') {
      if (user.isVerified) {
        console.log('   ✅ Email Verified');
      } else {
        console.log('   ❌ Email NOT Verified');
        console.log('   → User needs to verify email before logging in');
        if (user.verificationToken) {
          console.log('   → Verification token exists (check email)');
        }
      }
    } else {
      console.log('   ℹ️  Email verification not required for', user.role);
    }

    // 2. Account Lock Status
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      console.log('   ❌ Account LOCKED');
      console.log('   → Locked for', minutesLeft, 'more minutes');
      console.log('   → Failed attempts:', user.loginAttempts);
      console.log('   → Run unlock script to fix:');
      console.log('      node unlock-account.js', email);
    } else {
      console.log('   ✅ Account NOT Locked');
      if (user.loginAttempts > 0) {
        console.log('   → Failed attempts:', user.loginAttempts, '(will lock at 5)');
      }
    }

    // 3. Psychologist Approval Status
    if (user.role === 'psychologist') {
      const approvalStatus = user.psychologistDetails?.approvalStatus || 'pending';
      const isActive = user.psychologistDetails?.isActive;

      console.log('   Approval Status:', approvalStatus);
      console.log('   Is Active:', isActive);

      if (approvalStatus === 'pending') {
        console.log('   ❌ Account Pending Approval');
        console.log('   → Admin needs to approve this psychologist');
      } else if (approvalStatus === 'rejected') {
        console.log('   ❌ Account Rejected');
        console.log('   → Application was not approved');
      } else if (approvalStatus === 'approved' && isActive !== false) {
        console.log('   ✅ Account Approved and Active');
      } else if (isActive === false) {
        console.log('   ❌ Account Disabled');
        console.log('   → Admin has disabled this account');
      }
    }

    // 4. Password Check
    console.log('\n🔑 PASSWORD INFORMATION:');
    console.log('   Password Hash:', user.password ? 'EXISTS' : 'MISSING');
    console.log('   Hash Length:', user.password?.length || 0);
    console.log('   Hash Prefix:', user.password?.substring(0, 7) || 'N/A');
    
    if (user.password && user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      console.log('   ✅ Password is properly hashed with bcrypt');
    } else {
      console.log('   ⚠️  Password hash format looks unusual');
    }

    // Test password comparison
    console.log('\n🧪 PASSWORD TEST:');
    console.log('   Enter a password to test (or press Enter to skip):');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('   Password: ', async (testPassword) => {
      if (testPassword) {
        try {
          const isMatch = await bcrypt.compare(testPassword, user.password);
          if (isMatch) {
            console.log('   ✅ Password MATCHES');
          } else {
            console.log('   ❌ Password DOES NOT MATCH');
          }
        } catch (err) {
          console.log('   ❌ Error comparing password:', err.message);
        }
      }

      // Summary
      console.log('\n📋 SUMMARY:');
      const issues = [];
      
      if (!user.isVerified && user.role === 'client') {
        issues.push('Email not verified');
      }
      if (user.lockUntil && user.lockUntil > Date.now()) {
        issues.push('Account locked');
      }
      if (user.role === 'psychologist') {
        const status = user.psychologistDetails?.approvalStatus;
        if (status === 'pending') issues.push('Pending approval');
        if (status === 'rejected') issues.push('Application rejected');
        if (user.psychologistDetails?.isActive === false) issues.push('Account disabled');
      }

      if (issues.length === 0) {
        console.log('   ✅ No issues found - login should work if password is correct');
      } else {
        console.log('   ❌ Issues preventing login:');
        issues.forEach(issue => console.log('      -', issue));
      }

      console.log('\n' + '='.repeat(60));
      rl.close();
      mongoose.connection.close();
    });

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error(err);
    mongoose.connection.close();
  }
}

// Main
const email = process.argv[2];

if (!email) {
  console.log('Usage: node debug-login-issue.js <email>');
  console.log('Example: node debug-login-issue.js nancy@gmail.com');
  process.exit(1);
}

connectDB().then(() => {
  debugLoginIssue(email);
});
