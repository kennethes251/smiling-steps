require('dotenv').config();
const mongoose = require('mongoose');
const Resource = require('./server/models/Resource');

async function testResources() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    // Test 1: Count all resources
    console.log('📊 TEST 1: Counting resources...');
    const totalCount = await Resource.countDocuments();
    console.log(`   Found ${totalCount} resources\n`);

    // Test 2: Get resources by category
    console.log('📂 TEST 2: Resources by category...');
    const categories = await Resource.distinct('category');
    for (const category of categories) {
      const count = await Resource.countDocuments({ category });
      console.log(`   ${category}: ${count} resources`);
    }
    console.log('');

    // Test 3: Get resources by type
    console.log('📝 TEST 3: Resources by type...');
    const types = await Resource.distinct('type');
    for (const type of types) {
      const count = await Resource.countDocuments({ type });
      console.log(`   ${type}: ${count} resources`);
    }
    console.log('');

    // Test 4: Get public resources
    console.log('🌐 TEST 4: Public resources...');
    const publicResources = await Resource.find({ accessLevel: 'public' });
    console.log(`   Found ${publicResources.length} public resources:`);
    publicResources.forEach(r => {
      console.log(`   - ${r.title}`);
    });
    console.log('');

    // Test 5: Get downloadable resources
    console.log('⬇️  TEST 5: Downloadable resources...');
    const downloadable = await Resource.countDocuments({ downloadable: true });
    console.log(`   ${downloadable} resources are downloadable\n`);

    // Test 6: List all resources with details
    console.log('📋 TEST 6: All resources summary...\n');
    const allResources = await Resource.find().populate('createdBy', 'name email');
    
    allResources.forEach((resource, index) => {
      console.log(`${index + 1}. ${resource.title}`);
      console.log(`   Type: ${resource.type} | Category: ${resource.category}`);
      console.log(`   Access: ${resource.accessLevel} | Downloadable: ${resource.downloadable}`);
      console.log(`   Tags: ${resource.tags.join(', ')}`);
      console.log(`   Created by: ${resource.createdBy?.name || 'Unknown'}`);
      console.log('');
    });

    console.log('✅ All tests completed successfully!\n');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testResources();
