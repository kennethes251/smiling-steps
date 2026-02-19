/**
 * Clear Test Users Script
 * Removes all clients and psychologists, keeping only admin accounts
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling-steps';

async function clearTestUsers() {
  console.log('🧹 Clear Test Users Script\n');
  console.log('=' .repeat(50));
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const User = require('./server/models/User');
    
    // First, show what we have
    const allUsers = await User.find({}).select('name email role');
    console.log('📋 Current users in database:');
    allUsers.forEach(u => {
      console.log(`   ${u.role.padEnd(12)} | ${u.email}`);
    });
    
    // Count by role
    const admins = allUsers.filter(u => u.role === 'admin');
    const clients = allUsers.filter(u => u.role === 'client');
    const psychologists = allUsers.filter(u => u.role === 'psychologist');
    
    console.log(`\n📊 Summary:`);
    console.log(`   Admins: ${admins.length} (will be KEPT)`);
    console.log(`   Clients: ${clients.length} (will be DELETED)`);
    console.log(`   Psychologists: ${psychologists.length} (will be DELETED)`);
    
    if (clients.length === 0 && psychologists.length === 0) {
      console.log('\n✅ No clients or psychologists to delete!');
      return;
    }
    
    // Delete clients and psychologists
    console.log('\n🗑️ Deleting clients and psychologists...');
    
    const deleteResult = await User.deleteMany({
      role: { $in: ['client', 'psychologist'] }
    });
    
    console.log(`✅ Deleted ${deleteResult.deletedCount} user(s)`);
    
    // Also clear related data (sessions, etc.)
    try {
      const Session = require('./server/models/Session');
      const sessionResult = await Session.deleteMany({});
      console.log(`✅ Deleted ${sessionResult.deletedCount} session(s)`);
    } catch (e) {
      console.log('ℹ️ No sessions to delete or Session model not found');
    }
    
    // Show remaining users
    const remainingUsers = await User.find({}).select('name email role');
    console.log('\n📋 Remaining users:');
    remainingUsers.forEach(u => {
      console.log(`   ${u.role.padEnd(12)} | ${u.email}`);
    });
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Database cleared! Ready for fresh testing.\n');
    console.log('📝 Next steps:');
    console.log('   1. Register a new client at /register');
    console.log('   2. Verify email (check inbox)');
    console.log('   3. Login as client');
    console.log('   4. Register a new psychologist at /psychologist-register');
    console.log('   5. Verify email (check inbox)');
    console.log('   6. Login as admin and approve the psychologist');
    console.log('   7. Login as psychologist');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

clearTestUsers();
