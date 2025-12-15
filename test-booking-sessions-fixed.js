/**
 * Test Script for Fixed Booking Sessions Feature
 * Tests all critical endpoints with Sequelize syntax
 */

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:5000';
let authToken = '';
let clientToken = '';
let psychologistToken = '';
let testSessionId = '';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test 1: Login as client
async function testClientLogin() {
  try {
    logInfo('Test 1: Logging in as client...');
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'client@test.com',
      password: 'password123'
    });
    
    if (response.data.token) {
      clientToken = response.data.token;
      logSuccess('Client login successful');
      return true;
    }
    logError('Client login failed - no token received');
    return false;
  } catch (error) {
    logError(`Client login failed: ${error.response?.data?.msg || error.message}`);
    return false;
  }
}

// Test 2: Login as psychologist
async function testPsychologistLogin() {
  try {
    logInfo('Test 2: Logging in as psychologist...');
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'psychologist@test.com',
      password: 'password123'
    });
    
    if (response.data.token) {
      psychologistToken = response.data.token;
      logSuccess('Psychologist login successful');
      return true;
    }
    logError('Psychologist login failed - no token received');
    return false;
  } catch (error) {
    logError(`Psychologist login failed: ${error.response?.data?.msg || error.message}`);
    return false;
  }
}

// Test 3: Get list of psychologists
async function testGetPsychologists() {
  try {
    logInfo('Test 3: Fetching psychologists list...');
    const response = await axios.get(`${API_BASE}/api/users/psychologists`, {
      headers: { 'x-auth-token': clientToken }
    });
    
    if (response.data.success && response.data.data.length > 0) {
      logSuccess(`Found ${response.data.data.length} psychologists`);
      return response.data.data[0].id; // Return first psychologist ID
    }
    logError('No psychologists found');
    return null;
  } catch (error) {
    logError(`Failed to fetch psychologists: ${error.response?.data?.msg || error.message}`);
    return null;
  }
}

// Test 4: Create booking request
async function testCreateBooking(psychologistId) {
  try {
    logInfo('Test 4: Creating booking request...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    
    const response = await axios.post(
      `${API_BASE}/api/sessions/request`,
      {
        psychologistId: psychologistId,
        sessionType: 'Individual',
        sessionDate: tomorrow.toISOString(),
        sessionRate: 2500,
        price: 2500
      },
      {
        headers: { 'x-auth-token': clientToken }
      }
    );
    
    if (response.data.success && response.data.session) {
      testSessionId = response.data.session.id;
      logSuccess(`Booking request created: ${testSessionId}`);
      logInfo(`Status: ${response.data.session.status}`);
      logInfo(`Payment Status: ${response.data.session.paymentStatus}`);
      return true;
    }
    logError('Booking creation failed - no session returned');
    return false;
  } catch (error) {
    logError(`Booking creation failed: ${error.response?.data?.msg || error.message}`);
    return false;
  }
}

// Test 5: Get client sessions
async function testGetClientSessions() {
  try {
    logInfo('Test 5: Fetching client sessions...');
    const response = await axios.get(`${API_BASE}/api/sessions`, {
      headers: { 'x-auth-token': clientToken }
    });
    
    if (Array.isArray(response.data)) {
      logSuccess(`Found ${response.data.length} sessions for client`);
      return true;
    }
    logError('Failed to fetch client sessions');
    return false;
  } catch (error) {
    logError(`Failed to fetch client sessions: ${error.response?.data?.msg || error.message}`);
    return false;
  }
}

// Test 6: Get pending sessions (psychologist)
async function testGetPendingSessions() {
  try {
    logInfo('Test 6: Fetching pending sessions for psychologist...');
    const response = await axios.get(`${API_BASE}/api/sessions/pending-approval`, {
      headers: { 'x-auth-token': psychologistToken }
    });
    
    if (response.data.success && Array.isArray(response.data.sessions)) {
      logSuccess(`Found ${response.data.sessions.length} pending sessions`);
      return true;
    }
    logError('Failed to fetch pending sessions');
    return false;
  } catch (error) {
    logError(`Failed to fetch pending sessions: ${error.response?.data?.msg || error.message}`);
    return false;
  }
}

// Test 7: Approve session
async function testApproveSession() {
  try {
    logInfo('Test 7: Approving session...');
    const response = await axios.put(
      `${API_BASE}/api/sessions/${testSessionId}/approve`,
      { sessionRate: 2500 },
      {
        headers: { 'x-auth-token': psychologistToken }
      }
    );
    
    if (response.data.success && response.data.session) {
      logSuccess('Session approved successfully');
      logInfo(`Status: ${response.data.session.status}`);
      logInfo(`Payment Instructions: ${response.data.session.paymentInstructions}`);
      return true;
    }
    logError('Session approval failed');
    return false;
  } catch (error) {
    logError(`Session approval failed: ${error.response?.data?.msg || error.message}`);
    return false;
  }
}

// Test 8: Get specific session
async function testGetSession() {
  try {
    logInfo('Test 8: Fetching specific session...');
    const response = await axios.get(`${API_BASE}/api/sessions/${testSessionId}`, {
      headers: { 'x-auth-token': clientToken }
    });
    
    if (response.data && response.data.id) {
      logSuccess('Session fetched successfully');
      logInfo(`Session Type: ${response.data.sessionType}`);
      logInfo(`Status: ${response.data.status}`);
      logInfo(`Price: KSh ${response.data.price}`);
      return true;
    }
    logError('Failed to fetch session');
    return false;
  } catch (error) {
    logError(`Failed to fetch session: ${error.response?.data?.msg || error.message}`);
    return false;
  }
}

// Test 9: Submit payment proof
async function testSubmitPayment() {
  try {
    logInfo('Test 9: Submitting payment proof...');
    const response = await axios.post(
      `${API_BASE}/api/sessions/${testSessionId}/submit-payment`,
      {
        transactionCode: 'TEST123456',
        screenshot: 'https://example.com/screenshot.jpg'
      },
      {
        headers: { 'x-auth-token': clientToken }
      }
    );
    
    if (response.data.success && response.data.session) {
      logSuccess('Payment proof submitted successfully');
      logInfo(`Status: ${response.data.session.status}`);
      return true;
    }
    logError('Payment submission failed');
    return false;
  } catch (error) {
    logError(`Payment submission failed: ${error.response?.data?.msg || error.message}`);
    return false;
  }
}

// Test 10: Verify payment
async function testVerifyPayment() {
  try {
    logInfo('Test 10: Verifying payment...');
    const response = await axios.put(
      `${API_BASE}/api/sessions/${testSessionId}/verify-payment`,
      {},
      {
        headers: { 'x-auth-token': psychologistToken }
      }
    );
    
    if (response.data.success && response.data.session) {
      logSuccess('Payment verified successfully');
      logInfo(`Status: ${response.data.session.status}`);
      logInfo(`Payment Status: ${response.data.session.paymentStatus}`);
      return true;
    }
    logError('Payment verification failed');
    return false;
  } catch (error) {
    logError(`Payment verification failed: ${error.response?.data?.msg || error.message}`);
    return false;
  }
}

// Test 11: Debug endpoint
async function testDebugEndpoint() {
  try {
    logInfo('Test 11: Testing debug endpoint...');
    const response = await axios.get(`${API_BASE}/api/sessions/debug/test`);
    
    if (response.data.success) {
      logSuccess('Debug endpoint working');
      logInfo(`Test session created: ${response.data.session.id}`);
      return true;
    }
    logError('Debug endpoint failed');
    return false;
  } catch (error) {
    logError(`Debug endpoint failed: ${error.response?.data?.msg || error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  log('\n========================================', 'blue');
  log('  BOOKING SESSIONS - FIXED VERSION TEST', 'blue');
  log('========================================\n', 'blue');
  
  logInfo(`Testing API at: ${API_BASE}`);
  logInfo('Starting tests...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 11
  };
  
  // Run tests sequentially
  const tests = [
    { name: 'Client Login', fn: testClientLogin },
    { name: 'Psychologist Login', fn: testPsychologistLogin },
    { name: 'Get Psychologists', fn: async () => {
      const psychId = await testGetPsychologists();
      if (psychId) {
        return await testCreateBooking(psychId);
      }
      return false;
    }},
    { name: 'Get Client Sessions', fn: testGetClientSessions },
    { name: 'Get Pending Sessions', fn: testGetPendingSessions },
    { name: 'Approve Session', fn: testApproveSession },
    { name: 'Get Specific Session', fn: testGetSession },
    { name: 'Submit Payment', fn: testSubmitPayment },
    { name: 'Verify Payment', fn: testVerifyPayment },
    { name: 'Debug Endpoint', fn: testDebugEndpoint }
  ];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      logError(`Test "${test.name}" threw an error: ${error.message}`);
      results.failed++;
    }
    console.log(''); // Empty line between tests
  }
  
  // Print summary
  log('\n========================================', 'blue');
  log('  TEST SUMMARY', 'blue');
  log('========================================\n', 'blue');
  
  log(`Total Tests: ${results.total}`, 'cyan');
  logSuccess(`Passed: ${results.passed}`);
  logError(`Failed: ${results.failed}`);
  
  const percentage = ((results.passed / results.total) * 100).toFixed(1);
  log(`\nSuccess Rate: ${percentage}%`, percentage >= 80 ? 'green' : 'yellow');
  
  if (results.passed === results.total) {
    log('\n🎉 ALL TESTS PASSED! Booking system is fully functional!', 'green');
  } else if (results.passed >= results.total * 0.8) {
    log('\n⚠️  Most tests passed. Check failed tests above.', 'yellow');
  } else {
    log('\n❌ Multiple tests failed. Please review the errors above.', 'red');
  }
  
  log('\n========================================\n', 'blue');
}

// Run the tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
