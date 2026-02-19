const mongoose = require('mongoose');
const User = require('./server/models/User');

async function debugUserVerification() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB Atlas');

    // Find the most recent test user
    const testUser = await User.findOne({ 
      email: { $regex: /^test.*@example\.com$/ } 
    }).sort({ createdAt: -1 });

    if (testUser) {
      console.log('🔍 Most recent test user:');
      console.log('- ID:', testUser._id);
      console.log('- Name:', testUser.name);
      console.log('- Email:', testUser.email);
      console.log('- Role:', testUser.role);
      console.log('- isVerified:', testUser.isVerified);
      console.log('- Created:', testUser.createdAt);
      console.log('- Updated:', testUser.updatedAt);
    } else {
      console.log('❌ No test users found');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugUserVerification();