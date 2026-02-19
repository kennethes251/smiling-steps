const mongoose = require('mongoose');
const User = require('./server/models/User');
require('dotenv').config();

async function debugUserCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');

    // Create a test user directly
    const testEmail = `directtest${Date.now()}@example.com`;
    
    console.log('🔍 Creating user with isVerified: true...');
    const userPayload = {
      name: 'Direct Test User',
      email: testEmail,
      password: 'password123',
      role: 'client',
      isVerified: true
    };

    console.log('📝 User payload:', userPayload);

    const user = await User.create(userPayload);
    console.log('✅ User created with ID:', user._id);

    // Now query the user back
    const queriedUser = await User.findById(user._id);
    console.log('🔍 Queried user isVerified:', queriedUser.isVerified);
    console.log('🔍 Full user object:', {
      id: queriedUser._id,
      name: queriedUser.name,
      email: queriedUser.email,
      role: queriedUser.role,
      isVerified: queriedUser.isVerified
    });

    await mongoose.disconnect();
    console.log('✅ Done');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugUserCreation();