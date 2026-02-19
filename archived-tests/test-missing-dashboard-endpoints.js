/**
 * Test script for Missing Dashboard Endpoints
 * 
 * Tests:
 * 1. GET /api/sessions/history - Should return 200 with session history
 * 2. GET /api/feedback/client - Should return 200 with empty array or feedback
 * 
 * Requirements: 5.1, 5.2, 5.3
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Test credentials - use existing test user or create one
const TEST_CLIENT = {
  email: 'testclient@example.com',
  password: 'Test123!'
};

let authToken = null;

async function login() {
  console.log('\n🔐 Attempting to login...');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/login`, TEST_CLIENT);
    authToken = response.data.token;
    console.log('✅ Login successful');
    console.log('   Token received:', authToken ? 'Yes' : 'No');
    return true;
  } catch (error) {
    console.log('⚠️ Login failed with test client, trying to register...');
    console.log('   Error:', error.response?.data?.message || error.response?.data?.msg || error.message);
    
    try {
      // Try to register a new test client with skipVerification
      const registerResponse = await axios.post(`${API_BASE_URL}/api/users/register`, {
        name: 'Test Client',
        email: TEST_CLIENT.email,
        password: TEST_CLIENT.password,
        role: 'client',
        skipVerification: true  // Skip email verification for testing
      });
      authToken = registerResponse.data.token;
      console.log('✅ Registration successful');
      console.log('   Token received:', authToken ? 'Yes' : 'No');
      return true;
    } catch (regError) {
      // If registration fails, try login again (user might exist but with different password)
      console.log('⚠️ Registration failed:', regError.response?.data?.message || regError.response?.data?.msg || regError.message);
      
      // Try with a different unique email
      const uniqueEmail = `testclient_${Date.now()}@example.com`;
      console.log('   Trying with unique email:', uniqueEmail);
      
      try {
        const uniqueRegResponse = await axios.post(`${API_BASE_URL}/api/users/register`, {
          name: 'Test Client',
          email: uniqueEmail,
          password: TEST_CLIENT.password,
          role: 'client',
          skipVerification: true
        });
        authToken = uniqueRegResponse.data.token;
        console.log('✅ Registration successful with unique email');
        console.log('   Token received:', authToken ? 'Yes' : 'No');
        return true;
      } catch (uniqueError) {
        console.error('❌ Could not authenticate. Error:', uniqueError.response?.data || uniqueError.message);
        return false;
      }
    }
  }
}

async function testSessionHistoryEndpoint() {
  console.log('\n📋 Testing GET /api/sessions/history...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/sessions/history`, {
      headers: { 'x-auth-token': authToken }
    });
    
    console.log('✅ /api/sessions/history returned status:', response.status);
    console.log('   Response structure:', {
      success: response.data.success,
      hasSessionHistory: Array.isArray(response.data.sessionHistory),
      sessionCount: response.data.sessionHistory?.length || 0,
      hasPagination: !!response.data.pagination
    });
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error('❌ /api/sessions/history failed');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.response?.data || error.message);
    
    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data || error.message
    };
  }
}

async function testFeedbackClientEndpoint() {
  console.log('\n📝 Testing GET /api/feedback/client...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/feedback/client`, {
      headers: { 'x-auth-token': authToken }
    });
    
    console.log('✅ /api/feedback/client returned status:', response.status);
    console.log('   Response structure:', {
      success: response.data.success,
      hasFeedback: Array.isArray(response.data.feedback),
      feedbackCount: response.data.count || response.data.feedback?.length || 0
    });
    
    // Verify it returns empty array, not 404
    if (Array.isArray(response.data.feedback)) {
      console.log('✅ Correctly returns array (even if empty)');
    }
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error('❌ /api/feedback/client failed');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.response?.data || error.message);
    
    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data || error.message
    };
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing server health...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Server is healthy:', response.data.status);
    console.log('   Database:', response.data.database);
    return true;
  } catch (error) {
    console.error('❌ Server health check failed');
    console.error('   Is the server running on', API_BASE_URL, '?');
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Missing Dashboard Endpoints - Verification Tests');
  console.log('='.repeat(60));
  console.log('API Base URL:', API_BASE_URL);
  
  // Check server health first
  const serverHealthy = await testHealthEndpoint();
  if (!serverHealthy) {
    console.log('\n❌ Server is not running. Please start the server first:');
    console.log('   npm run dev');
    process.exit(1);
  }
  
  // Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Authentication failed. Cannot proceed with tests.');
    process.exit(1);
  }
  
  // Run endpoint tests
  const results = {
    sessionHistory: await testSessionHistoryEndpoint(),
    feedbackClient: await testFeedbackClientEndpoint()
  };
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const sessionHistoryPassed = results.sessionHistory.success && results.sessionHistory.status === 200;
  const feedbackClientPassed = results.feedbackClient.success && results.feedbackClient.status === 200;
  
  console.log(`\n/api/sessions/history: ${sessionHistoryPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`/api/feedback/client:  ${feedbackClientPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = sessionHistoryPassed && feedbackClientPassed;
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED - Endpoints are working correctly!');
    console.log('   ClientDashboard should load without 404 errors.');
  } else {
    console.log('⚠️ SOME TESTS FAILED - Please review the errors above.');
  }
  console.log('='.repeat(60));
  
  return allPassed;
}

// Run tests
runTests()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
  });
