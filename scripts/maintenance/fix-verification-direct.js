/**
 * Direct MongoDB fix for user verification issues
 * Uses native MongoDB driver with better connection handling
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  console.log('🔧 Direct MongoDB Fix for User Verification\n');
  
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
  });

  try {
    console.log('🔍 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected!\n');

    const db = client.db('smiling-steps');
    const users = db.collection('users');

    // Find all non-admin users
    console.log('📋 Finding users to fix...');
    const allUsers = await users.find({ role: { $ne: 'admin' } }).toArray();
    console.log(`   Found ${allUsers.length} non-admin users\n`);

    // Show current status
    console.log('Current Status:');
    console.log('─'.repeat(70));
    for (const user of allUsers) {
      console.log(`${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   isVerified: ${user.isVerified}`);
      if (user.role === 'psychologist') {
        console.log(`   approvalStatus: ${user.psychologistDetails?.approvalStatus}`);
        console.log(`   isActive: ${user.psychologistDetails?.isActive}`);
      }
    }
    console.log('─'.repeat(70));
    console.log('');

    // Fix all clients - set isVerified to true
    console.log('🔧 Fixing clients...');
    const clientResult = await users.updateMany(
      { role: 'client' },
      { 
        $set: { 
          isVerified: true,
          isEmailVerified: true  // For backwards compatibility
        } 
      }
    );
    console.log(`   Updated ${clientResult.modifiedCount} clients\n`);

    // Fix all psychologists - set isVerified and ensure approval
    console.log('🔧 Fixing psychologists...');
    const psychResult = await users.updateMany(
      { role: 'psychologist' },
      { 
        $set: { 
          isVerified: true,
          isEmailVerified: true,
          'psychologistDetails.approvalStatus': 'approved',
          'psychologistDetails.isActive': true
        } 
      }
    );
    console.log(`   Updated ${psychResult.modifiedCount} psychologists\n`);

    // Verify the fix
    console.log('✅ Verification after fix:');
    console.log('─'.repeat(70));
    const fixedUsers = await users.find({ role: { $ne: 'admin' } }).toArray();
    for (const user of fixedUsers) {
      const verified = user.isVerified ? '✅' : '❌';
      const approved = user.role === 'psychologist' 
        ? (user.psychologistDetails?.approvalStatus === 'approved' ? '✅' : '❌')
        : 'N/A';
      console.log(`${verified} ${user.email} (${user.role}) - Approved: ${approved}`);
    }
    console.log('─'.repeat(70));

    console.log('\n🎉 All users fixed! They should now be able to login.');
    console.log('\n📝 Test credentials (if you know the passwords):');
    for (const user of fixedUsers) {
      console.log(`   - ${user.email}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

main();
