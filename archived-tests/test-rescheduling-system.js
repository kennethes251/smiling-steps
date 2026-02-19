/**
 * Test script for the Rescheduling System
 * 
 * Tests the rescheduling API endpoints and service logic.
 * Requirements: 9.1, 9.2, 9.5
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function testReschedulingSystem() {
  console.log('🧪 Testing Rescheduling System\n');
  console.log('API URL:', API_BASE_URL);
  console.log('='.repeat(50));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Get reschedule policy (no auth required)
  try {
    console.log('\n📋 Test 1: Get Reschedule Policy');
    const response = await axios.get(`${API_BASE_URL}/api/reschedule/policy`);
    
    if (response.data && response.data.autoApproveHours && response.data.validReasons) {
      console.log('✅ Policy retrieved successfully');
      console.log('   Auto-approve hours:', response.data.autoApproveHours);
      console.log('   Max reschedules:', response.data.maxReschedulesPerSession);
      console.log('   Valid reasons:', response.data.validReasons.length);
      results.passed++;
      results.tests.push({ name: 'Get Reschedule Policy', status: 'passed' });
    } else {
      throw new Error('Invalid policy response');
    }
  } catch (error) {
    console.log('❌ Failed:', error.response?.data?.error || error.message);
    results.failed++;
    results.tests.push({ name: 'Get Reschedule Policy', status: 'failed', error: error.message });
  }

  // Test 2: Check eligibility without auth (should fail)
  try {
    console.log('\n🔒 Test 2: Check Eligibility Without Auth');
    await axios.get(`${API_BASE_URL}/api/sessions/test123/reschedule-eligibility`);
    console.log('❌ Should have required authentication');
    results.failed++;
    results.tests.push({ name: 'Auth Required for Eligibility', status: 'failed' });
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly requires authentication');
      results.passed++;
      results.tests.push({ name: 'Auth Required for Eligibility', status: 'passed' });
    } else {
      console.log('❌ Unexpected error:', error.response?.status, error.message);
      results.failed++;
      results.tests.push({ name: 'Auth Required for Eligibility', status: 'failed', error: error.message });
    }
  }

  // Test 3: Reschedule without auth (should fail)
  try {
    console.log('\n🔒 Test 3: Reschedule Without Auth');
    await axios.post(`${API_BASE_URL}/api/sessions/test123/reschedule`, {
      newDate: new Date(Date.now() + 86400000).toISOString(),
      reason: 'schedule_conflict'
    });
    console.log('❌ Should have required authentication');
    results.failed++;
    results.tests.push({ name: 'Auth Required for Reschedule', status: 'failed' });
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly requires authentication');
      results.passed++;
      results.tests.push({ name: 'Auth Required for Reschedule', status: 'passed' });
    } else {
      console.log('❌ Unexpected error:', error.response?.status, error.message);
      results.failed++;
      results.tests.push({ name: 'Auth Required for Reschedule', status: 'failed', error: error.message });
    }
  }

  // Test 4: Pending requests without auth (should fail)
  try {
    console.log('\n🔒 Test 4: Pending Requests Without Auth');
    await axios.get(`${API_BASE_URL}/api/reschedule/pending`);
    console.log('❌ Should have required authentication');
    results.failed++;
    results.tests.push({ name: 'Auth Required for Pending', status: 'failed' });
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly requires authentication');
      results.passed++;
      results.tests.push({ name: 'Auth Required for Pending', status: 'passed' });
    } else {
      console.log('❌ Unexpected error:', error.response?.status, error.message);
      results.failed++;
      results.tests.push({ name: 'Auth Required for Pending', status: 'failed', error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total: ${results.passed + results.failed}`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Check the output above.');
  }

  return results;
}

// Run tests
testReschedulingSystem()
  .then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
