/**
 * Test script for Availability Management Endpoints
 * Tests Requirements 6.1, 6.2, 6.3, 6.4
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

// Test credentials - use an existing psychologist account
const TEST_PSYCHOLOGIST = {
  email: process.env.TEST_PSYCHOLOGIST_EMAIL || 'test.psychologist@example.com',
  password: process.env.TEST_PSYCHOLOGIST_PASSWORD || 'password123'
};

let authToken = null;

async function makeRequest(method, endpoint, data = null, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers
  };
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const responseData = await response.json();
    return { status: response.status, data: responseData };
  } catch (error) {
    return { status: 500, error: error.message };
  }
}

async function login(email, password) {
  console.log(`\n🔐 Logging in as ${email}...`);
  const result = await makeRequest('POST', '/api/users/login', { email, password });
  
  if (result.status === 200 && result.data.token) {
    console.log('✅ Login successful');
    return result.data.token;
  } else {
    console.log('❌ Login failed:', result.data?.message || result.error);
    return null;
  }
}

async function testGetAvailability(token) {
  console.log('\n📅 Test: GET /api/users/availability');
  console.log('   Testing: Fetch current availability schedule (Requirement 6.1)');
  
  const result = await makeRequest('GET', '/api/users/availability', null, token);
  
  if (result.status === 200) {
    console.log('   ✅ Success - Status:', result.status);
    console.log('   📊 Availability slots:', result.data.data?.availability?.length || 0);
    console.log('   📊 Blocked dates:', result.data.data?.blockedDates?.length || 0);
    return true;
  } else {
    console.log('   ❌ Failed - Status:', result.status);
    console.log('   Message:', result.data?.message);
    return false;
  }
}

async function testUpdateAvailability(token) {
  console.log('\n🔄 Test: PUT /api/users/availability');
  console.log('   Testing: Update availability schedule (Requirement 6.2)');
  
  const availability = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Tuesday
    { dayOfWeek: 3, startTime: '10:00', endTime: '18:00' }, // Wednesday
    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Thursday
    { dayOfWeek: 5, startTime: '09:00', endTime: '15:00' }  // Friday
  ];
  
  const result = await makeRequest('PUT', '/api/users/availability', { availability }, token);
  
  if (result.status === 200) {
    console.log('   ✅ Success - Status:', result.status);
    console.log('   📊 Updated slots:', result.data.data?.availability?.length || 0);
    return true;
  } else {
    console.log('   ❌ Failed - Status:', result.status);
    console.log('   Message:', result.data?.message);
    if (result.data?.errors) {
      console.log('   Errors:', result.data.errors);
    }
    return false;
  }
}

async function testInvalidTimeRange(token) {
  console.log('\n⚠️ Test: PUT /api/users/availability (Invalid time range)');
  console.log('   Testing: startTime must be before endTime (Requirement 6.2)');
  
  const availability = [
    { dayOfWeek: 1, startTime: '17:00', endTime: '09:00' } // Invalid: end before start
  ];
  
  const result = await makeRequest('PUT', '/api/users/availability', { availability }, token);
  
  if (result.status === 400) {
    console.log('   ✅ Correctly rejected invalid time range - Status:', result.status);
    console.log('   Message:', result.data?.message);
    return true;
  } else {
    console.log('   ❌ Should have rejected invalid time range - Status:', result.status);
    return false;
  }
}

async function testBlockDates(token) {
  console.log('\n🚫 Test: POST /api/users/availability/block');
  console.log('   Testing: Block specific dates (Requirement 6.3)');
  
  // Block dates in the future
  const today = new Date();
  const futureDate1 = new Date(today);
  futureDate1.setDate(today.getDate() + 30);
  const futureDate2 = new Date(today);
  futureDate2.setDate(today.getDate() + 31);
  
  const dates = [
    futureDate1.toISOString().split('T')[0],
    futureDate2.toISOString().split('T')[0]
  ];
  
  const result = await makeRequest('POST', '/api/users/availability/block', { dates }, token);
  
  if (result.status === 200) {
    console.log('   ✅ Success - Status:', result.status);
    console.log('   📊 Newly blocked:', result.data.data?.newlyBlocked?.length || 0);
    console.log('   📊 Total blocked dates:', result.data.data?.blockedDates?.length || 0);
    return true;
  } else {
    console.log('   ❌ Failed - Status:', result.status);
    console.log('   Message:', result.data?.message);
    return false;
  }
}

async function testBlockPastDate(token) {
  console.log('\n⚠️ Test: POST /api/users/availability/block (Past date)');
  console.log('   Testing: Cannot block dates in the past');
  
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 7);
  
  const dates = [pastDate.toISOString().split('T')[0]];
  
  const result = await makeRequest('POST', '/api/users/availability/block', { dates }, token);
  
  if (result.status === 400) {
    console.log('   ✅ Correctly rejected past date - Status:', result.status);
    console.log('   Message:', result.data?.message);
    return true;
  } else {
    console.log('   ❌ Should have rejected past date - Status:', result.status);
    return false;
  }
}

async function testUnauthorizedAccess() {
  console.log('\n🔒 Test: Unauthorized access');
  console.log('   Testing: Endpoints require authentication');
  
  const result = await makeRequest('GET', '/api/users/availability');
  
  if (result.status === 401) {
    console.log('   ✅ Correctly rejected unauthorized request - Status:', result.status);
    return true;
  } else {
    console.log('   ❌ Should have rejected unauthorized request - Status:', result.status);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 Availability Management Endpoints Test Suite');
  console.log('='.repeat(60));
  console.log(`API Base: ${API_BASE}`);
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test unauthorized access first
  const unauthorizedTest = await testUnauthorizedAccess();
  results.tests.push({ name: 'Unauthorized Access', passed: unauthorizedTest });
  if (unauthorizedTest) results.passed++; else results.failed++;
  
  // Login as psychologist
  authToken = await login(TEST_PSYCHOLOGIST.email, TEST_PSYCHOLOGIST.password);
  
  if (!authToken) {
    console.log('\n⚠️ Cannot proceed without authentication.');
    console.log('   Please ensure a psychologist account exists with the test credentials.');
    console.log('   Or set TEST_PSYCHOLOGIST_EMAIL and TEST_PSYCHOLOGIST_PASSWORD environment variables.');
    return;
  }
  
  // Run authenticated tests
  const tests = [
    { name: 'Get Availability', fn: () => testGetAvailability(authToken) },
    { name: 'Update Availability', fn: () => testUpdateAvailability(authToken) },
    { name: 'Invalid Time Range', fn: () => testInvalidTimeRange(authToken) },
    { name: 'Block Dates', fn: () => testBlockDates(authToken) },
    { name: 'Block Past Date', fn: () => testBlockPastDate(authToken) }
  ];
  
  for (const test of tests) {
    const passed = await test.fn();
    results.tests.push({ name: test.name, passed });
    if (passed) results.passed++; else results.failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`Total: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log('\nDetailed Results:');
  results.tests.forEach(t => {
    console.log(`  ${t.passed ? '✅' : '❌'} ${t.name}`);
  });
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the output above.');
  }
}

runTests().catch(console.error);
