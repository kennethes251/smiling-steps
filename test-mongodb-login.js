require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";

// Import User model
const User = require('./server/models/User');

async function testLogin() {
  console.log('\n🧪 Testing MongoDB Login\n');
  
  try {
    // Connect to MongoDB
    console.log('1️⃣ Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    
    // Wait for connection to be ready
    await new Promise(resolve => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('open', resolve);
      }
    });
    
    console.log('✅ MongoDB connected (state:', mongoose.connection.readyState, ')\n');
    
    // Test 1: Find user
    console.log('2️⃣ Finding user nancy@gmail.com...');
    const user = await User.findOne({ email: 'nancy@gmail.com' }).select('+password');
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ User found:', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password
    });
    
    // Test 2: Verify password
    console.log('\n3️⃣ Testing password verification...');
    const isMatch = await bcrypt.compare('password123', user.password);
    console.log('Password match:', isMatch ? '✅ YES' : '❌ NO');
    
    // Test 3: List all users
    console.log('\n4️⃣ Listing all users...');
    const allUsers = await User.find({}).select('name email role');
    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach(u => {
      console.log(`   - ${u.email} (${u.role})`);
    });
    
    console.log('\n✅ MongoDB is working correctly!\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testLogin();
