const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_CREDENTIALS = {
  client: {
    email: 'nancy@gmail.com',
    password: 'password123'
  },
  psychologist: {
    email: 'john@gmail.com',
    password: 'password123'
  },
  admin: {
    email: 'admin@example.com',
    password: 'admin123'
  }
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`)
};

// Test login function
async function testLogin(email, password, role) {
  try {
    log.info(`Testing login for ${role}: ${email}`);
    
    const response = await axios.post(`${API_BASE_URL}/api/users/login`, {
      email,
      password
    });

    if (response.data.success && response.data.token) {
      log.success(`Login successful for ${role}`);
      console.log('   Token:', response.data.token.substring(0, 20) + '...');
      console.log('   User:', response.data.user.name);
      console.log('   Role:', response.data.user.role);
      console.log('   Email:', response.data.user.email);
      return { success: true, data: response.data };
    } else {
      log.error(`Login failed - No token received`);
      return { success: false, error: 'No token in response' };
    }
  } catch (error) {
    log.error(`Login failed for ${role}`);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data.message || error.response.data.msg);
      console.log('   Errors:', error.response.data.errors);
    } else {
      console.log('   Error:', error.message);
    }
    return { success: false, error: error.message };
  }
}

// Test authenticated request
async function testAuthenticatedRequest(token) {
  try {
    log.info('Testing authenticated request with token');
    
    const response = await axios.get(`${API_BASE_URL}/api/auth`, {
      headers: {
        'x-auth-token': token
      }
    });

    if (response.data) {
      log.success('Authenticated request successful');
      console.log('   User ID:', response.data._id || response.data.id);
      console.log('   Name:', response.data.name);
      console.log('   Email:', response.data.email);
      return { success: true };
    }
  } catch (error) {
    log.error('Authenticated request failed');
    console.log('   Error:', error.response?.data?.msg || error.message);
    return { success: false };
  }
}

// Test invalid credentials
async function testInvalidLogin() {
  try {
    log.info('Testing login with invalid credentials');
    
    await axios.post(`${API_BASE_URL}/api/users/login`, {
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    });
    
    log.error('Should have failed but succeeded');
    return { success: false };
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log.success('Invalid credentials correctly rejected');
      console.log('   Message:', error.response.data.message);
      return { success: true };
    } else {
      log.error('Unexpected error');
      return { success: false };
    }
  }
}

// Test missing fields
async function testMissingFields() {
  try {
    log.info('Testing login with missing password');
    
    await axios.post(`${API_BASE_URL}/api/users/login`, {
      email: 'test@example.com'
    });
    
    log.error('Should have failed but succeeded');
    return { success: false };
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log.success('Missing fields correctly rejected');
      console.log('   Message:', error.response.data.message);
      return { success: true };
    } else {
      log.error('Unexpected error');
      return { success: false };
    }
  }
}

// Main test runner
async function runTests() {
  log.section('🔐 COMPREHENSIVE LOGIN SYSTEM TEST');
  
  console.log(`API Base URL: ${API_BASE_URL}\n`);
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Client Login
  log.section('Test 1: Client Login');
  const clientResult = await testLogin(
    TEST_CREDENTIALS.client.email,
    TEST_CREDENTIALS.client.password,
    'Client'
  );
  results.total++;
  if (clientResult.success) {
    results.passed++;
    
    // Test authenticated request with client token
    log.section('Test 1b: Authenticated Request (Client)');
    const authResult = await testAuthenticatedRequest(clientResult.data.token);
    results.total++;
    if (authResult.success) results.passed++;
    else results.failed++;
  } else {
    results.failed++;
  }

  // Test 2: Psychologist Login
  log.section('Test 2: Psychologist Login');
  const psychResult = await testLogin(
    TEST_CREDENTIALS.psychologist.email,
    TEST_CREDENTIALS.psychologist.password,
    'Psychologist'
  );
  results.total++;
  if (psychResult.success) results.passed++;
  else results.failed++;

  // Test 3: Invalid Credentials
  log.section('Test 3: Invalid Credentials');
  const invalidResult = await testInvalidLogin();
  results.total++;
  if (invalidResult.success) results.passed++;
  else results.failed++;

  // Test 4: Missing Fields
  log.section('Test 4: Missing Required Fields');
  const missingResult = await testMissingFields();
  results.total++;
  if (missingResult.success) results.passed++;
  else results.failed++;

  // Summary
  log.section('📊 TEST SUMMARY');
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    log.success('All tests passed! 🎉');
  } else {
    log.warning(`${results.failed} test(s) failed. Please review the errors above.`);
  }
}

// Run tests
runTests().catch(error => {
  log.error('Test runner failed');
  console.error(error);
  process.exit(1);
});
