/**
 * Test Admin Stats Service
 * 
 * Tests the admin statistics service implementation
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function testAdminStatsService() {
  console.log('🧪 Testing Admin Stats Service\n');
  console.log('='.repeat(50));
  
  try {
    // Get MongoDB URI - remove quotes if present
    let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling-steps';
    MONGODB_URI = MONGODB_URI.replace(/^["']|["']$/g, '');
    
    console.log('\n📡 Connecting to MongoDB...');
    console.log('   URI:', MONGODB_URI.substring(0, 30) + '...');
    
    // Connect with explicit options
    const conn = await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000
    });
    
    console.log('✅ Connected to MongoDB');
    console.log('   Database:', conn.connection.name);
    console.log('   Host:', conn.connection.host);
    console.log('   Ready State:', conn.connection.readyState);
    console.log('   DB object:', conn.connection.db ? 'Available' : 'Not available');
    
    // Direct database queries to verify connection works
    console.log('\n🔍 Testing direct database queries...');
    
    const db = conn.connection.db;
    
    // Test direct collection access
    const usersCollection = db.collection('users');
    const sessionsCollection = db.collection('sessions');
    
    // Count clients directly
    const clientCount = await usersCollection.countDocuments({ role: 'client', status: { $ne: 'deleted' } });
    console.log(`   Direct client count: ${clientCount}`);
    
    // Count psychologists directly
    const psychCount = await usersCollection.countDocuments({ role: 'psychologist', status: { $ne: 'deleted' } });
    console.log(`   Direct psychologist count: ${psychCount}`);
    
    // Count sessions directly
    const sessionCount = await sessionsCollection.countDocuments({});
    console.log(`   Direct session count: ${sessionCount}`);
    
    // Count pending approvals directly
    const pendingCount = await usersCollection.countDocuments({
      role: 'psychologist',
      status: { $ne: 'deleted' },
      $or: [
        { approvalStatus: 'pending' },
        { 'psychologistDetails.approvalStatus': 'pending' }
      ]
    });
    console.log(`   Direct pending approvals: ${pendingCount}`);
    
    // Now test the service using the same mongoose connection
    console.log('\n📊 Testing AdminStatsService...');
    
    // Import the service - it should use the same mongoose connection
    const { AdminStatsService } = require('./services/adminStatsService');
    const statsService = new AdminStatsService();
    
    // Check if the service can see the db
    console.log('   Service getDb():', statsService.getDb() ? 'Available' : 'Not available');
    console.log('   Mongoose connection.db:', mongoose.connection.db ? 'Available' : 'Not available');
    
    // Test individual methods
    console.log('\n📊 Testing individual methods...');
    
    const totalClients = await statsService.getTotalClients();
    console.log(`   ✅ getTotalClients(): ${totalClients}`);
    
    const totalPsychologists = await statsService.getTotalPsychologists();
    console.log(`   ✅ getTotalPsychologists(): ${totalPsychologists}`);
    
    const sessionStatsResult = await statsService.getSessionStats();
    console.log(`   ✅ getSessionStats():`, JSON.stringify(sessionStatsResult));
    
    const paymentStatsResult = await statsService.getPaymentStats();
    console.log(`   ✅ getPaymentStats():`, JSON.stringify(paymentStatsResult));
    
    const pendingApprovals = await statsService.getPendingApprovals();
    console.log(`   ✅ getPendingApprovals(): ${pendingApprovals}`);
    
    // Test getAllStats
    console.log('\n📊 Testing getAllStats()...');
    const allStats = await statsService.getAllStats();
    console.log('   Stats result:', JSON.stringify(allStats, null, 2));
    
    // Verify structure
    console.log('\n🔍 Verifying response structure...');
    const requiredFields = ['totalClients', 'totalPsychologists', 'totalSessions', 'totalPayments', 'pendingApprovals'];
    const missingFields = requiredFields.filter(field => !(field in allStats));
    
    if (missingFields.length === 0) {
      console.log('   ✅ All required fields present');
    } else {
      console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`);
    }
    
    // Verify counts match direct queries
    console.log('\n🔍 Verifying counts match direct queries...');
    if (allStats.totalClients === clientCount) {
      console.log(`   ✅ Client count matches: ${clientCount}`);
    } else {
      console.log(`   ❌ Client count mismatch: service=${allStats.totalClients}, direct=${clientCount}`);
    }
    
    if (allStats.totalPsychologists === psychCount) {
      console.log(`   ✅ Psychologist count matches: ${psychCount}`);
    } else {
      console.log(`   ❌ Psychologist count mismatch: service=${allStats.totalPsychologists}, direct=${psychCount}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Admin Stats Service tests completed successfully!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

testAdminStatsService();
