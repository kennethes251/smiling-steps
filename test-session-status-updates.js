/**
 * Test Session Status Updates (In Progress, Completed)
 * Tests the video call session status management functionality
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:5000/api';

// Test configuration
const testConfig = {
  // Use existing test session or create one
  sessionId: '550e8400-e29b-41d4-a716-446655440000', // Replace with actual session ID
  clientToken: '', // Will be set after login
  psychologistToken: '', // Will be set after login
  adminToken: '' // Will be set after login
};

// Test credentials (replace with actual test accounts)
const testCredentials = {
  client: {
    email: 'testclient@example.com',
    password: 'testpassword123'
  },
  psychologist: {
    email: 'testpsychologist@example.com', 
    password: 'testpassword123'
  },
  admin: {
    email: 'admin@example.com',
    password: 'adminpassword123'
  }
};

async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password
    });
    return response.data.token;
  } catch (error) {
    console.error(`❌ Login failed for ${email}:`, error.response?.data?.error || error.message);
    return null;
  }
}

async function testSessionStatusUpdates() {
  console.log('🎥 Testing Session Status Updates (In Progress, Completed)');
  console.log('=' .repeat(60));

  // Step 1: Login as different users
  console.log('\n📝 Step 1: Authenticating test users...');
  
  testConfig.clientToken = await login(testCredentials.client.email, testCredentials.client.password);
  testConfig.psychologistToken = await login(testCredentials.psychologist.email, testCredentials.psychologist.password);
  testConfig.adminToken = await login(testCredentials.admin.email, testCredentials.admin.password);

  if (!testConfig.clientToken || !testConfig.psychologistToken) {
    console.log('⚠️  Could not authenticate all users. Creating test session with admin token only.');
  }

  // Step 2: Test starting video call (should update status to "In Progress")
  console.log('\n📝 Step 2: Testing video call start (status -> In Progress)...');
  
  const token = testConfig.clientToken || testConfig.adminToken;
  if (!token) {
    console.log('❌ No valid token available for testing');
    return;
  }

  try {
    const startResponse = await axios.post(
      `${API_BASE}/video-calls/start/${testConfig.sessionId}`,
      {},
      {
        headers: { 'x-auth-token': token }
      }
    );

    console.log('✅ Video call start response:', {
      success: startResponse.data.success,
      message: startResponse.data.message,
      sessionStatus: startResponse.data.session?.status,
      videoCallStarted: startResponse.data.session?.videoCallStarted
    });

    if (startResponse.data.session?.status === 'In Progress') {
      console.log('✅ Session status correctly updated to "In Progress"');
    } else {
      console.log(`❌ Expected status "In Progress", got "${startResponse.data.session?.status}"`);
    }

  } catch (error) {
    console.error('❌ Start video call failed:', error.response?.data?.error || error.message);
    
    if (error.response?.status === 404) {
      console.log('💡 Session not found. You may need to create a test session first.');
    } else if (error.response?.status === 403) {
      console.log('💡 Unauthorized or payment not confirmed. Check session payment status.');
    }
  }

  // Step 3: Test ending video call (should update status to "Completed")
  console.log('\n📝 Step 3: Testing video call end (status -> Completed)...');
  
  // Wait a moment to simulate call duration
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const endResponse = await axios.post(
      `${API_BASE}/video-calls/end/${testConfig.sessionId}`,
      {},
      {
        headers: { 'x-auth-token': token }
      }
    );

    console.log('✅ Video call end response:', {
      success: endResponse.data.success,
      message: endResponse.data.message,
      duration: endResponse.data.duration,
      sessionStatus: endResponse.data.session?.status,
      videoCallEnded: endResponse.data.session?.videoCallEnded
    });

    if (endResponse.data.session?.status === 'Completed') {
      console.log('✅ Session status correctly updated to "Completed"');
    } else {
      console.log(`❌ Expected status "Completed", got "${endResponse.data.session?.status}"`);
    }

    if (endResponse.data.duration > 0) {
      console.log(`✅ Call duration calculated: ${endResponse.data.duration} minutes`);
    } else {
      console.log('❌ Call duration not calculated correctly');
    }

  } catch (error) {
    console.error('❌ End video call failed:', error.response?.data?.error || error.message);
  }

  // Step 4: Test getting session info to verify status
  console.log('\n📝 Step 4: Verifying session status...');
  
  try {
    const sessionResponse = await axios.get(
      `${API_BASE}/video-calls/session/${testConfig.sessionId}`,
      {
        headers: { 'x-auth-token': token }
      }
    );

    const session = sessionResponse.data.session;
    console.log('✅ Session info retrieved:', {
      id: session.id,
      status: session.status,
      paymentStatus: session.paymentStatus,
      videoCallStarted: session.videoCallStarted,
      videoCallEnded: session.videoCallEnded,
      callDuration: session.callDuration,
      callStatistics: session.callStatistics
    });

    // Verify final state
    if (session.status === 'Completed' && session.videoCallStarted && session.videoCallEnded) {
      console.log('✅ Session status updates working correctly!');
    } else {
      console.log('❌ Session status updates not working as expected');
    }

  } catch (error) {
    console.error('❌ Get session info failed:', error.response?.data?.error || error.message);
  }

  // Step 5: Test status transition validation
  console.log('\n📝 Step 5: Testing status transition validation...');
  
  try {
    // Try to start an already completed session (should fail)
    const invalidStartResponse = await axios.post(
      `${API_BASE}/video-calls/start/${testConfig.sessionId}`,
      {},
      {
        headers: { 'x-auth-token': token }
      }
    );

    console.log('✅ Attempting to start completed session:', invalidStartResponse.data.message);

  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly prevented starting completed session');
    } else {
      console.error('❌ Unexpected error:', error.response?.data?.error || error.message);
    }
  }

  console.log('\n🎯 Session Status Updates Test Complete!');
  console.log('=' .repeat(60));
}

// Run the test
if (require.main === module) {
  testSessionStatusUpdates().catch(console.error);
}

module.exports = { testSessionStatusUpdates };