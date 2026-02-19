/**
 * Diagnose psychologist approval status
 * Checks both top-level and nested approvalStatus fields
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function diagnosePsychologistApproval() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling-steps';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const email = process.argv[2];
    
    if (!email) {
      // List all psychologists
      console.log('\n📋 All Psychologists:');
      const psychologists = await usersCollection.find({ role: 'psychologist' }).toArray();
      
      if (psychologists.length === 0) {
        console.log('  No psychologists found');
      } else {
        psychologists.forEach(p => {
          const topLevel = p.approvalStatus || 'NOT SET';
          const nested = p.psychologistDetails?.approvalStatus || 'NOT SET';
          console.log(`\n  📧 ${p.email}`);
          console.log(`     Name: ${p.name}`);
          console.log(`     Top-level approvalStatus: ${topLevel}`);
          console.log(`     Nested approvalStatus: ${nested}`);
          console.log(`     isVerified: ${p.isVerified}`);
        });
      }
      console.log('\n💡 To check/fix a specific psychologist, run:');
      console.log('   node diagnose-psychologist-approval.js psychologist@email.com');
      return;
    }

    console.log(`\n🔍 Looking up psychologist: ${email}\n`);

    const user = await usersCollection.findOne({ 
      email: email.toLowerCase(),
      role: 'psychologist'
    });

    if (!user) {
      console.log('❌ Psychologist not found with email:', email);
      return;
    }

    console.log('📊 Psychologist Data:');
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('');
    console.log('🔐 Approval Status Fields:');
    console.log('  Top-level approvalStatus:', user.approvalStatus || 'NOT SET');
    console.log('  Nested approvalStatus:', user.psychologistDetails?.approvalStatus || 'NOT SET');
    console.log('  approvedAt:', user.approvedAt || 'NOT SET');
    console.log('  approvedBy:', user.approvedBy || 'NOT SET');
    console.log('');
    console.log('📋 Other Status:');
    console.log('  isVerified:', user.isVerified);
    console.log('  isEmailVerified:', user.isEmailVerified);
    console.log('  status:', user.status);
    console.log('  active:', user.active);

    // Check for mismatch
    const topLevel = user.approvalStatus;
    const nested = user.psychologistDetails?.approvalStatus;
    
    if (topLevel !== nested) {
      console.log('\n⚠️  MISMATCH DETECTED between top-level and nested approvalStatus!');
    }

    if (topLevel !== 'approved' && nested !== 'approved') {
      console.log('\n❌ Psychologist is NOT approved. Login will be blocked.');
      console.log('\n🔧 To approve this psychologist, run:');
      console.log(`   node diagnose-psychologist-approval.js ${email} --approve`);
    } else {
      console.log('\n✅ Psychologist IS approved. Login should work.');
    }

    // Fix if requested
    if (process.argv[3] === '--approve') {
      console.log('\n🔧 Approving psychologist...');
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            approvalStatus: 'approved',
            'psychologistDetails.approvalStatus': 'approved',
            'psychologistDetails.isActive': true,
            approvedAt: new Date(),
            isVerified: true,
            isEmailVerified: true
          }
        }
      );
      console.log('✅ Psychologist approved! They should now be able to login.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

diagnosePsychologistApproval();
