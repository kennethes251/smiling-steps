require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('./server/models/Resource');

async function testResources() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    const resources = await Resource.find({ active: true });
    
    console.log(`📊 Found ${resources.length} active resources:\n`);
    
    resources.forEach((resource, index) => {
      console.log(`${index + 1}. ${resource.title}`);
      console.log(`   Type: ${resource.type} | Category: ${resource.category}`);
      console.log(`   Access: ${resource.accessLevel} | Downloadable: ${resource.downloadable}`);
      console.log('');
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testResources();
