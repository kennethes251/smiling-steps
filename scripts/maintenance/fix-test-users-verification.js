const mongoose = require('mongoose');
require('dotenv').config();

async function fixTestUsers() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Update all test users to be verified
    const result = await mongoose.connection.db.collection('users').updateMany(
      { email: { $regex: /^test.*@example\.com$/ } },
      { $set: { isVerified: true } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} test users to verified status`);
    
    await mongoose.disconnect();
    console.log('✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixTestUsers();