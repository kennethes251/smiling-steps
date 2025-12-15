const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Test credentials (update with your actual test user)
const TEST_CLIENT = {
  email: 'client@test.com',
  password: 'password123'
};

const TEST_PSYCHOLOGIST = {
  email: 'psychologist@test.com',
  password: 'password123'
};

let clientToken = '';
let psychologistToken = '';
let testSessionId = '';

async function runTests() {
  console.log('🧪 Testing Video Call API Routes\n');
  
  try {
    // Test 1: Login as client
    console.log('1️⃣ Testing client login...');
    const clientLogin = await axios.post(`${API_URL}/auth/login`, TEST_CLIENT);
    clientToken = clientLogin.data.token;
    console.log('✅ Client logged in successfully');
    console.log(`   Token: ${clientToken.substring(0, 20)}...`);
    
    // Test 2: Get WebRTC config
    console.log('\n2️⃣ Testing GET /api/video-calls/config...');
    const configResponse = await axios.get(`${API_URL}/video-calls/config`, {
      headers: { 'x-auth-token': clientToken }
    });
    console.log('✅ WebRTC config retrieved');
    console.log(`   ICE Servers: ${configResponse.data.iceServers.length} servers configured`);
    console.log(`   STUN servers: ${configResponse.data.iceServers.filter(s => s.urls.includes('stun')).length}`);
    
    // Test 3: Get client's sessions
    console.log('\n3️⃣ Getting client sessions...');
    const sessionsResponse = await axios.get(`${API_URL}/sessions`, {
      headers: { 'x-auth-token': clientToken }
    });
    
    if (sessionsResponse.data.sessions && sessionsResponse.data.sessions.length > 0) {
      testSessionId = sessionsResponse.data.sessions[0]._id;
      console.log('✅ Found test session');
      console.log(`   Session ID: ${testSessionId}`);
      console.log(`   Status: ${sessionsResponse.data.sessions[0].status}`);
      console.log(`   Payment: ${sessionsResponse.data.sessions[0].paymentStatus}`);
      
      // Test 4: Check if can join call
      console.log('\n4️⃣ Testing GET /api/video-calls/can-join/:sessionId...');
      const canJoinResponse = await axios.get(`${API_URL}/video-calls/can-join/${testSessionId}`, {
        headers: { 'x-auth-token': clientToken }
      });
      console.log(`✅ Can join check completed`);
      console.log(`   Can join: ${canJoinResponse.data.canJoin}`);
      console.log(`   Minutes until session: ${canJoinResponse.data.minutesUntilSession}`);
      if (!canJoinResponse.data.canJoin) {
        console.log(`   Reason: ${canJoinResponse.data.reason}`);
      }
      
      // Test 5: Generate room
      console.log('\n5️⃣ Testing POST /api/video-calls/generate-room/:sessionId...');
      try {
        const roomResponse = await axios.post(
          `${API_URL}/video-calls/generate-room/${testSessionId}`,
          {},
          { headers: { 'x-auth-token': clientToken } }
        );
        console.log('✅ Room generated successfully');
        console.log(`   Room ID: ${roomResponse.data.roomId}`);
        console.log(`   Client: ${roomResponse.data.participants.client.name}`);
        console.log(`   Psychologist: ${roomResponse.data.participants.psychologist.name}`);
      } catch (error) {
        if (error.response) {
          console.log(`⚠️  Room generation failed: ${error.response.data.error}`);
          console.log(`   This is expected if payment is not confirmed`);
        } else {
          throw error;
        }
      }
      
      // Test 6: Get session info
      console.log('\n6️⃣ Testing GET /api/video-calls/session/:sessionId...');
      const sessionInfoResponse = await axios.get(`${API_URL}/video-calls/session/${testSessionId}`, {
        headers: { 'x-auth-token': clientToken }
      });
      console.log('✅ Session info retrieved');
      console.log(`   Session Type: ${sessionInfoResponse.data.session.sessionType}`);
      console.log(`   Status: ${sessionInfoResponse.data.session.status}`);
      console.log(`   Meeting Link: ${sessionInfoResponse.data.session.meetingLink || 'Not generated yet'}`);
      
      // Test 7: Start call (if allowed)
      console.log('\n7️⃣ Testing POST /api/video-calls/start/:sessionId...');
      try {
        const startResponse = await axios.post(
          `${API_URL}/video-calls/start/${testSessionId}`,
          {},
          { headers: { 'x-auth-token': clientToken } }
        );
        console.log('✅ Call started successfully');
        console.log(`   Status: ${startResponse.data.session.status}`);
        console.log(`   Started at: ${startResponse.data.session.videoCallStarted}`);
        
        // Wait 2 seconds
        console.log('\n   ⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test 8: End call
        console.log('\n8️⃣ Testing POST /api/video-calls/end/:sessionId...');
        const endResponse = await axios.post(
          `${API_URL}/video-calls/end/${testSessionId}`,
          {},
          { headers: { 'x-auth-token': clientToken } }
        );
        console.log('✅ Call ended successfully');
        console.log(`   Duration: ${endResponse.data.duration} minutes`);
        console.log(`   Status: ${endResponse.data.session.status}`);
      } catch (error) {
        if (error.response) {
          console.log(`⚠️  Call start/end failed: ${error.response.data.error}`);
        } else {
          throw error;
        }
      }
      
    } else {
      console.log('⚠️  No sessions found for test client');
      console.log('   Create a test session first using the booking system');
    }
    
    console.log('\n✅ All API tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run tests
console.log('Starting video call API tests...');
console.log('Make sure the server is running on http://localhost:5000\n');

runTests();
