const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function testSessionStatusIndicators() {
  console.log('🧪 Testing Session Status Indicators...\n');

  try {
    // Test 1: Check if sessions endpoint returns proper status fields
    console.log('1. Testing session status fields...');
    
    const token = process.env.TEST_TOKEN || 'your-test-token-here';
    const config = {
      headers: { 'x-auth-token': token }
    };

    const response = await axios.get(`${API_BASE_URL}/api/sessions`, config);
    const sessions = response.data;

    if (Array.isArray(sessions) && sessions.length > 0) {
      const session = sessions[0];
      
      console.log('✅ Session structure:');
      console.log(`   - ID: ${session._id || session.id}`);
      console.log(`   - Status: ${session.status}`);
      console.log(`   - Payment Status: ${session.paymentStatus}`);
      console.log(`   - Video Call Started: ${session.videoCallStarted || 'Not started'}`);
      console.log(`   - Video Call Ended: ${session.videoCallEnded || 'Not ended'}`);
      console.log(`   - Call Duration: ${session.callDuration || 'No duration'} minutes`);
      console.log(`   - Meeting Link: ${session.meetingLink ? 'Present' : 'Not set'}`);
      
      // Test status indicator logic
      console.log('\n2. Testing status indicator logic...');
      
      // Test "In Progress" detection
      const isInProgress = session.status === 'In Progress' || (session.videoCallStarted && !session.videoCallEnded);
      console.log(`   - Is In Progress: ${isInProgress}`);
      
      // Test "Can Join" logic
      const now = new Date();
      const sessionDate = new Date(session.sessionDate);
      const timeDiffMinutes = (sessionDate - now) / (1000 * 60);
      const canJoin = session.status === 'Confirmed' &&
                     ['Confirmed', 'Paid', 'Verified'].includes(session.paymentStatus) &&
                     timeDiffMinutes <= 15 && 
                     timeDiffMinutes >= -120;
      console.log(`   - Can Join Video Call: ${canJoin}`);
      console.log(`   - Time until session: ${Math.round(timeDiffMinutes)} minutes`);
      
      // Test call duration calculation
      if (session.videoCallStarted) {
        const startTime = new Date(session.videoCallStarted);
        const endTime = session.videoCallEnded ? new Date(session.videoCallEnded) : new Date();
        const calculatedDuration = Math.round((endTime - startTime) / 60000);
        console.log(`   - Calculated Duration: ${calculatedDuration} minutes`);
        console.log(`   - Stored Duration: ${session.callDuration || 0} minutes`);
      }
      
    } else {
      console.log('⚠️  No sessions found to test');
    }

    // Test 2: Check video call API endpoints
    console.log('\n3. Testing video call API endpoints...');
    
    try {
      const configResponse = await axios.get(`${API_BASE_URL}/api/video-calls/config`, config);
      console.log('✅ Video call config endpoint working');
      console.log(`   - ICE servers configured: ${configResponse.data.iceServers?.length || 0}`);
    } catch (err) {
      console.log('❌ Video call config endpoint failed:', err.response?.data?.error || err.message);
    }

    console.log('\n✅ Session status indicators test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Note: You need to set a valid TEST_TOKEN environment variable');
      console.log('   Example: TEST_TOKEN=your-jwt-token node test-session-status-indicators.js');
    }
  }
}

// Helper function to format session status for display
function getSessionStatusDisplay(session) {
  const status = {
    main: session.status,
    payment: session.paymentStatus,
    videoCall: 'Not started'
  };

  if (session.videoCallStarted && !session.videoCallEnded) {
    status.videoCall = 'In Progress';
  } else if (session.videoCallStarted && session.videoCallEnded) {
    status.videoCall = 'Completed';
  }

  return status;
}

// Helper function to get status indicator color
function getStatusColor(session) {
  if (session.status === 'In Progress' || (session.videoCallStarted && !session.videoCallEnded)) {
    return 'error'; // Red for active/live
  } else if (session.status === 'Confirmed') {
    return 'success'; // Green for confirmed
  } else if (session.status === 'Pending Approval') {
    return 'warning'; // Orange for pending
  } else if (session.status === 'Completed') {
    return 'primary'; // Blue for completed
  }
  return 'default';
}

// Run the test
if (require.main === module) {
  testSessionStatusIndicators();
}

module.exports = {
  testSessionStatusIndicators,
  getSessionStatusDisplay,
  getStatusColor
};