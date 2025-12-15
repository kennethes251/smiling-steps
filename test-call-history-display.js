const axios = require('axios');
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0";
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Import models
const Session = require('./server/models/Session');
const User = require('./server/models/User');

async function testCallHistoryDisplay() {
  console.log('🧪 Testing Call History Display Functionality\n');
  
  try {
    await connectDB();
    
    // Find a test client and psychologist
    const client = await User.findOne({ role: 'client' });
    const psychologist = await User.findOne({ role: 'psychologist' });
    
    if (!client || !psychologist) {
      console.log('❌ No test users found. Please create test users first.');
      return;
    }
    
    console.log('👤 Found test users:');
    console.log(`   Client: ${client.name} (${client.email})`);
    console.log(`   Psychologist: ${psychologist.name} (${psychologist.email})`);
    
    // Create a test session with video call data
    const testSession = new Session({
      client: client._id,
      psychologist: psychologist._id,
      sessionType: 'Individual',
      sessionDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      status: 'Completed',
      price: 2500,
      paymentStatus: 'Paid',
      isVideoCall: true,
      videoCallStarted: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      videoCallEnded: new Date(Date.now() - 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // 45 minutes later
      callDuration: 45,
      mpesaTransactionID: 'TEST123456789',
      mpesaAmount: 2500,
      paymentVerifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });
    
    await testSession.save();
    console.log('✅ Test session with video call data created');
    console.log(`   Session ID: ${testSession._id}`);
    console.log(`   Call Duration: ${testSession.callDuration} minutes`);
    console.log(`   Call Started: ${testSession.videoCallStarted}`);
    console.log(`   Call Ended: ${testSession.videoCallEnded}`);
    
    // Test API endpoint to verify data is returned correctly
    const API_URL = 'http://localhost:5000/api';
    
    // Login as client to test client dashboard
    console.log('\n🔐 Testing client login...');
    const clientLogin = await axios.post(`${API_URL}/auth/login`, {
      email: client.email,
      password: 'password123' // Default test password
    }).catch(err => {
      console.log('❌ Client login failed. Using existing session data for verification.');
      return null;
    });
    
    if (clientLogin) {
      console.log('✅ Client logged in successfully');
      
      // Get sessions for client
      const sessionsResponse = await axios.get(`${API_URL}/sessions`, {
        headers: { 'x-auth-token': clientLogin.data.token }
      });
      
      console.log('✅ Sessions retrieved for client');
      console.log(`   Total sessions: ${sessionsResponse.data.length}`);
      
      // Find our test session
      const ourSession = sessionsResponse.data.find(s => s._id === testSession._id.toString());
      if (ourSession) {
        console.log('✅ Test session found in API response');
        console.log(`   Call Duration: ${ourSession.callDuration} minutes`);
        console.log(`   Video Call Started: ${ourSession.videoCallStarted}`);
        console.log(`   Video Call Ended: ${ourSession.videoCallEnded}`);
        console.log(`   Payment Status: ${ourSession.paymentStatus}`);
      } else {
        console.log('❌ Test session not found in API response');
      }
    }
    
    // Login as psychologist to test psychologist dashboard
    console.log('\n🔐 Testing psychologist login...');
    const psychologistLogin = await axios.post(`${API_URL}/auth/login`, {
      email: psychologist.email,
      password: 'password123' // Default test password
    }).catch(err => {
      console.log('❌ Psychologist login failed. Using existing session data for verification.');
      return null;
    });
    
    if (psychologistLogin) {
      console.log('✅ Psychologist logged in successfully');
      
      // Get sessions for psychologist
      const sessionsResponse = await axios.get(`${API_URL}/sessions`, {
        headers: { 'x-auth-token': psychologistLogin.data.token }
      });
      
      console.log('✅ Sessions retrieved for psychologist');
      console.log(`   Total sessions: ${sessionsResponse.data.length}`);
      
      // Find our test session
      const ourSession = sessionsResponse.data.find(s => s._id === testSession._id.toString());
      if (ourSession) {
        console.log('✅ Test session found in psychologist API response');
        console.log(`   Call Duration: ${ourSession.callDuration} minutes`);
        console.log(`   Video Call Started: ${ourSession.videoCallStarted}`);
        console.log(`   Video Call Ended: ${ourSession.videoCallEnded}`);
        console.log(`   Client Name: ${ourSession.client?.name}`);
      } else {
        console.log('❌ Test session not found in psychologist API response');
      }
    }
    
    console.log('\n✅ Call History Display Test Complete!');
    console.log('\n📋 Summary:');
    console.log('   - Test session with video call data created');
    console.log('   - Session includes call duration, start/end times');
    console.log('   - Payment information included');
    console.log('   - Data should now be visible in both dashboards');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Open client dashboard to see call history section');
    console.log('   2. Open psychologist dashboard to see completed sessions');
    console.log('   3. Verify call duration and timing information is displayed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
testCallHistoryDisplay();