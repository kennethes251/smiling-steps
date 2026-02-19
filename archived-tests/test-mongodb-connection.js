/**
 * Quick MongoDB Connection Test
 * Run: node test-mongodb-connection.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');
  
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.log('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }
  
  // Mask password for display
  const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
  console.log('📡 Connection string:', maskedUri);
  
  try {
    console.log('\n⏳ Connecting...');
    const startTime = Date.now();
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Connected in ${duration}ms!`);
    
    // Get database info
    const db = mongoose.connection;
    console.log('\n📊 Database Info:');
    console.log(`   Host: ${db.host}`);
    console.log(`   Port: ${db.port}`);
    console.log(`   Database: ${db.name}`);
    console.log(`   Ready State: ${db.readyState} (1 = connected)`);
    
    // List collections
    const collections = await db.db.listCollections().toArray();
    console.log(`\n📁 Collections (${collections.length}):`);
    collections.forEach(c => console.log(`   - ${c.name}`));
    
    // Count documents in key collections
    console.log('\n📈 Document Counts:');
    for (const coll of ['users', 'sessions', 'blogs']) {
      try {
        const count = await db.db.collection(coll).countDocuments();
        console.log(`   ${coll}: ${count}`);
      } catch (e) {
        console.log(`   ${coll}: (not found)`);
      }
    }
    
    console.log('\n🎉 Database connection is STABLE and working!');
    
  } catch (error) {
    console.log('\n❌ Connection FAILED');
    console.log('   Error:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Tip: Check your internet connection');
    } else if (error.message.includes('authentication')) {
      console.log('\n💡 Tip: Check username/password in connection string');
    } else if (error.message.includes('IP')) {
      console.log('\n💡 Tip: Add your IP to Network Access in MongoDB Atlas');
    }
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

testConnection();
