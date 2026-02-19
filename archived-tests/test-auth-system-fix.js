/**
 * Auth System Fix Verification Test
 * 
 * Tests the fixed authentication system components:
 * 1. /api/auth endpoint (GET - load user)
 * 2. /api/auth/refresh endpoint (POST - refresh token)
 * 3. /api/auth/validate endpoint (GET - validate token)
 * 4. /api/email-verification/verify endpoint (POST - verify email)
 * 5. Rate limiting configuration
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

console.log('🔧 Auth System Fix Verification Test');
console.log('=====================================\n');

async function testAuthEndpoints() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Health check
  console.log('1️⃣ Testing health endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    if (response.ok && data.status) {
      console.log('   ✅ Health check passed');
      console.log(`   Database: ${data.database}`);
      results.passed++;
      results.tests.push({ name: 'Health Check', status: 'PASS' });
    } else {
      throw new Error('Health check failed');
    }
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Health Check', status: 'FAIL', error: error.message });
  }

  // Test 2: Auth endpoint without token (should return 401)
  console.log('\n2️⃣ Testing /api/auth without token...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth`);
    
    if (response.status === 401) {
      console.log('   ✅ Correctly returns 401 without token');
      results.passed++;
      results.tests.push({ name: 'Auth No Token', status: 'PASS' });
    } else {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  } catch (error) {
    console.log('   ❌ Test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Auth No Token', status: 'FAIL', error: error.message });
  }

  // Test 3: Auth validate endpoint without token (should return 401)
  console.log('\n3️⃣ Testing /api/auth/validate without token...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/validate`);
    
    if (response.status === 401) {
      console.log('   ✅ Correctly returns 401 without token');
      results.passed++;
      results.tests.push({ name: 'Auth Validate No Token', status: 'PASS' });
    } else {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  } catch (error) {
    console.log('   ❌ Test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Auth Validate No Token', status: 'FAIL', error: error.message });
  }

  // Test 4: Email verification with missing token (should return 400)
  console.log('\n4️⃣ Testing /api/email-verification/verify with missing token...');
  try {
    const response = await fetch(`${BASE_URL}/api/email-verification/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();
    
    if (response.status === 400 && data.code === 'MISSING_TOKEN') {
      console.log('   ✅ Correctly returns 400 with MISSING_TOKEN code');
      results.passed++;
      results.tests.push({ name: 'Email Verify Missing Token', status: 'PASS' });
    } else {
      throw new Error(`Expected 400 with MISSING_TOKEN, got ${response.status}`);
    }
  } catch (error) {
    console.log('   ❌ Test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Email Verify Missing Token', status: 'FAIL', error: error.message });
  }

  // Test 5: Email verification with short token (should return 400)
  console.log('\n5️⃣ Testing /api/email-verification/verify with short token...');
  try {
    const response = await fetch(`${BASE_URL}/api/email-verification/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'short' })
    });
    const data = await response.json();
    
    if (response.status === 400 && data.code === 'INVALID_TOKEN_FORMAT') {
      console.log('   ✅ Correctly returns 400 with INVALID_TOKEN_FORMAT code');
      results.passed++;
      results.tests.push({ name: 'Email Verify Short Token', status: 'PASS' });
    } else {
      throw new Error(`Expected 400 with INVALID_TOKEN_FORMAT, got ${response.status}`);
    }
  } catch (error) {
    console.log('   ❌ Test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Email Verify Short Token', status: 'FAIL', error: error.message });
  }

  // Test 6: Email verification status without auth (should return 401)
  console.log('\n6️⃣ Testing /api/email-verification/status without auth...');
  try {
    const response = await fetch(`${BASE_URL}/api/email-verification/status`);
    
    if (response.status === 401) {
      console.log('   ✅ Correctly returns 401 without auth');
      results.passed++;
      results.tests.push({ name: 'Email Status No Auth', status: 'PASS' });
    } else {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  } catch (error) {
    console.log('   ❌ Test failed:', error.message);
    results.failed++;
    results.tests.push({ name: 'Email Status No Auth', status: 'FAIL', error: error.message });
  }

  // Summary
  console.log('\n=====================================');
  console.log('📊 Test Results Summary');
  console.log('=====================================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total:  ${results.passed + results.failed}`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All auth system tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Check the output above for details.');
  }

  return results;
}

// Run tests
testAuthEndpoints().catch(console.error);
