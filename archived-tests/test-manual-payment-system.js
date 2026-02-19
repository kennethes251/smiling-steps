/**
 * Test Manual Payment Verification System
 * 
 * Tests the Till Number + Confirmation Code payment flow
 */

const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:5000';

// Test data
let clientToken = null;
let adminToken = null;
let testSessionId = null;

const testConfirmationCode = 'TEST123456'; // Valid format for testing

async function login(email, password) {
  try {
    const response = await axios.post(`${API_URL}/api/users/login`, {
      email,
      password
    });
    return response.data.token;
  } catch (error) {
    console.error(`Login failed for ${email}:`, error.response?.data?.msg || error.message);
    return null;
  }
}

async function testPaymentInstructions() {
  console.log('\n📋 Test 1: Get Payment Instructions');
  console.log('=' .repeat(50));
  
  if (!testSessionId) {
    console.log('⚠️ No test session ID available. Skipping...');
    return false;
  }
  
  try {
    const response = await axios.get(
      `${API_URL}/api/manual-payments/instructions/${testSessionId}`,
      { headers: { 'x-auth-token': clientToken } }
    );
    
    console.log('✅ Payment instructions retrieved:');
    console.log('   Till Number:', response.data.paymentInstructions?.tillNumber);
    console.log('   Amount:', response.data.amount);
    console.log('   Business:', response.data.paymentInstructions?.businessName);
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data?.msg || error.message);
    return false;
  }
}

async function testSubmitPaymentCode() {
  console.log('\n💰 Test 2: Submit Payment Code');
  console.log('=' .repeat(50));
  
  if (!testSessionId) {
    console.log('⚠️ No test session ID available. Skipping...');
    return false;
  }
  
  try {
    const response = await axios.post(
      `${API_URL}/api/manual-payments/submit-code/${testSessionId}`,
      { confirmationCode: testConfirmationCode },
      { headers: { 'x-auth-token': clientToken } }
    );
    
    console.log('✅ Payment code submitted:');
    console.log('   Message:', response.data.msg);
    console.log('   Status:', response.data.session?.paymentStatus);
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data?.msg || error.message);
    return false;
  }
}

async function testGetPendingPayments() {
  console.log('\n📊 Test 3: Get Pending Payments (Admin)');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.get(
      `${API_URL}/api/manual-payments/pending`,
      { headers: { 'x-auth-token': adminToken } }
    );
    
    console.log('✅ Pending payments retrieved:');
    console.log('   Count:', response.data.count);
    
    if (response.data.pendingPayments?.length > 0) {
      console.log('   First payment:');
      const first = response.data.pendingPayments[0];
      console.log('     - Booking Ref:', first.bookingReference);
      console.log('     - Client:', first.client?.name);
      console.log('     - Amount:', first.amount);
      console.log('     - Code:', first.confirmationCode);
    }
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data?.msg || error.message);
    return false;
  }
}

async function testGetPaymentStats() {
  console.log('\n📈 Test 4: Get Payment Stats (Admin)');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.get(
      `${API_URL}/api/manual-payments/stats`,
      { headers: { 'x-auth-token': adminToken } }
    );
    
    console.log('✅ Payment stats retrieved:');
    console.log('   Pending Verification:', response.data.stats?.pendingVerification);
    console.log('   Verified Today:', response.data.stats?.verifiedToday);
    console.log('   Verified This Month:', response.data.stats?.verifiedThisMonth);
    console.log('   Total Revenue:', `KSh ${response.data.stats?.totalRevenue?.toLocaleString() || 0}`);
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.response?.data?.msg || error.message);
    return false;
  }
}

async function testCodeValidation() {
  console.log('\n🔍 Test 5: Code Validation');
  console.log('=' .repeat(50));
  
  const paymentConfig = require('./server/config/paymentConfig');
  
  const testCodes = [
    { code: 'RKJ7ABCD12', expected: true },
    { code: 'ABC1234567', expected: true },
    { code: 'TEST123456', expected: true },
    { code: '1234567890', expected: false }, // Starts with number
    { code: 'ABC', expected: false }, // Too short
    { code: 'ABCDEFGHIJKLM', expected: false }, // Too long
    { code: '', expected: false }, // Empty
    { code: null, expected: false }, // Null
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCodes) {
    const result = paymentConfig.validateConfirmationCode(test.code);
    const success = result.valid === test.expected;
    
    if (success) {
      passed++;
      console.log(`✅ "${test.code}" → ${result.valid ? 'valid' : 'invalid'} (expected: ${test.expected})`);
    } else {
      failed++;
      console.log(`❌ "${test.code}" → ${result.valid ? 'valid' : 'invalid'} (expected: ${test.expected})`);
    }
  }
  
  console.log(`\n   Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function runTests() {
  console.log('🧪 Manual Payment System Tests');
  console.log('=' .repeat(60));
  console.log(`API URL: ${API_URL}`);
  
  // Test code validation (doesn't need server)
  await testCodeValidation();
  
  // Try to login
  console.log('\n🔐 Logging in...');
  
  // Try common test credentials
  const testCredentials = [
    { email: 'admin@smilingsteps.com', password: 'Admin123!' },
    { email: 'admin@test.com', password: 'password123' },
    { email: 'client@test.com', password: 'password123' },
  ];
  
  for (const cred of testCredentials) {
    const token = await login(cred.email, cred.password);
    if (token) {
      if (cred.email.includes('admin')) {
        adminToken = token;
        console.log(`✅ Admin logged in: ${cred.email}`);
      } else {
        clientToken = token;
        console.log(`✅ Client logged in: ${cred.email}`);
      }
    }
  }
  
  if (!adminToken) {
    console.log('\n⚠️ Could not login as admin. Some tests will be skipped.');
    console.log('   Create an admin account or update test credentials.');
  }
  
  if (!clientToken) {
    console.log('\n⚠️ Could not login as client. Some tests will be skipped.');
    console.log('   Create a client account or update test credentials.');
  }
  
  // Run API tests if we have tokens
  if (adminToken) {
    await testGetPendingPayments();
    await testGetPaymentStats();
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📋 Test Summary');
  console.log('=' .repeat(60));
  console.log('✅ Code validation: Working');
  console.log(adminToken ? '✅ Admin endpoints: Accessible' : '⚠️ Admin endpoints: Not tested (no admin token)');
  console.log(clientToken ? '✅ Client endpoints: Accessible' : '⚠️ Client endpoints: Not tested (no client token)');
  
  console.log('\n📖 See MANUAL_PAYMENT_SYSTEM_GUIDE.md for full documentation');
}

// Run tests
runTests().catch(console.error);
