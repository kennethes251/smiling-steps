const mongoose = require('mongoose');
require('dotenv').config();

const checkProduction = async () => {
  console.log('🏥 Production Health Check');
  console.log('=========================');
  
  try {
    // Check MongoDB connection
    console.log('\n1. Testing MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB connection successful');
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Collections found:', collections.map(c => c.name));
    
    // Check users count
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    console.log(`👥 Users in database: ${userCount}`);
    
    // Check if admin exists
    const admin = await User.findOne({ role: 'admin' });
    console.log(`👑 Admin user exists: ${admin ? 'Yes' : 'No'}`);
    
    // Check psychologists
    const psychCount = await User.countDocuments({ role: 'psychologist' });
    console.log(`🧠 Psychologists: ${psychCount}`);
    
    console.log('\n✅ Production health check complete!');
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

checkProduction();