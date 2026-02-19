/**
 * Test script for Cancellation Policy System
 * 
 * Tests:
 * 1. Cancellation policy configuration
 * 2. Refund calculation logic
 * 3. API endpoints availability
 * 
 * Requirements: 9.3, 9.4, 9.5
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function testCancellationSystem() {
  console.log('🧪 Testing Cancellation Policy System\n');
  console.log('=' .repeat(50));

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Get cancellation policy (public endpoint)
  try {
    console.log('\n📋 Test 1: Get Cancellation Policy');
    const response = await axios.get(`${BASE_URL}/api/cancellations/policy`);
    
    const policy = response.data;
    console.log('  ✅ Policy endpoint accessible');
    console.log(`  - Full refund hours: ${policy.fullRefundHours}`);
    console.log(`  - Refund tiers: ${policy.refundTiers?.length || 0}`);
    console.log(`  - Valid reasons: ${policy.validReasons?.length || 0}`);
    
    // Verify policy structure
    if (policy.fullRefundHours === 48 && 
        policy.refundTiers?.length === 5 &&
        policy.validReasons?.length >= 7) {
      console.log('  ✅ Policy structure correct');
      results.passed++;
      results.tests.push({ name: 'Get Cancellation Policy', status: 'passed' });
    } else {
      console.log('  ❌ Policy structure incomplete');
      results.failed++;
      results.tests.push({ name: 'Get Cancellation Policy', status: 'failed', reason: 'Incomplete structure' });
    }
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Get Cancellation Policy', status: 'failed', reason: error.message });
  }

  // Test 2: Verify refund tiers
  try {
    console.log('\n📊 Test 2: Verify Refund Tiers');
    const response = await axios.get(`${BASE_URL}/api/cancellations/policy`);
    const tiers = response.data.refundTiers;
    
    const expectedTiers = [
      { hours: 48, percentage: 100 },
      { hours: 24, percentage: 75 },
      { hours: 12, percentage: 50 },
      { hours: 6, percentage: 25 },
      { hours: 0, percentage: 0 }
    ];
    
    let tiersCorrect = true;
    for (let i = 0; i < expectedTiers.length; i++) {
      const tier = tiers[i];
      const expected = expectedTiers[i];
      if (tier.hoursBeforeSession !== expected.hours || tier.refundPercentage !== expected.percentage) {
        tiersCorrect = false;
        console.log(`  ❌ Tier ${i + 1} mismatch: expected ${expected.hours}h/${expected.percentage}%, got ${tier.hoursBeforeSession}h/${tier.refundPercentage}%`);
      }
    }
    
    if (tiersCorrect) {
      console.log('  ✅ All refund tiers correct:');
      tiers.forEach(t => console.log(`    - ${t.hoursBeforeSession}+ hours: ${t.refundPercentage}% refund`));
      results.passed++;
      results.tests.push({ name: 'Verify Refund Tiers', status: 'passed' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Verify Refund Tiers', status: 'failed', reason: 'Tier mismatch' });
    }
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Verify Refund Tiers', status: 'failed', reason: error.message });
  }

  // Test 3: Verify cancellation reasons
  try {
    console.log('\n📝 Test 3: Verify Cancellation Reasons');
    const response = await axios.get(`${BASE_URL}/api/cancellations/policy`);
    const reasons = response.data.validReasons;
    
    const requiredReasons = ['schedule_conflict', 'emergency', 'illness', 'therapist_unavailable', 'technical_issues', 'financial_reasons', 'other'];
    const missingReasons = requiredReasons.filter(r => !reasons.includes(r));
    
    if (missingReasons.length === 0) {
      console.log('  ✅ All required cancellation reasons present:');
      reasons.forEach(r => console.log(`    - ${r}`));
      results.passed++;
      results.tests.push({ name: 'Verify Cancellation Reasons', status: 'passed' });
    } else {
      console.log(`  ❌ Missing reasons: ${missingReasons.join(', ')}`);
      results.failed++;
      results.tests.push({ name: 'Verify Cancellation Reasons', status: 'failed', reason: `Missing: ${missingReasons.join(', ')}` });
    }
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Verify Cancellation Reasons', status: 'failed', reason: error.message });
  }

  // Test 4: Check protected endpoints require auth
  try {
    console.log('\n🔒 Test 4: Protected Endpoints Require Auth');
    
    // Try to access cancellation history without auth
    try {
      await axios.get(`${BASE_URL}/api/cancellations/history`);
      console.log('  ❌ History endpoint should require auth');
      results.failed++;
      results.tests.push({ name: 'Protected Endpoints', status: 'failed', reason: 'No auth required' });
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('  ✅ History endpoint correctly requires authentication');
        results.passed++;
        results.tests.push({ name: 'Protected Endpoints', status: 'passed' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Protected Endpoints', status: 'failed', reason: error.message });
  }

  // Test 5: Check admin endpoints require admin role
  try {
    console.log('\n👮 Test 5: Admin Endpoints Require Admin Role');
    
    try {
      await axios.get(`${BASE_URL}/api/admin/refunds/pending`);
      console.log('  ❌ Admin endpoint should require auth');
      results.failed++;
      results.tests.push({ name: 'Admin Endpoints', status: 'failed', reason: 'No auth required' });
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('  ✅ Admin endpoint correctly requires authentication');
        results.passed++;
        results.tests.push({ name: 'Admin Endpoints', status: 'passed' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Admin Endpoints', status: 'failed', reason: error.message });
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round(results.passed / (results.passed + results.failed) * 100)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`  - ${t.name}: ${t.reason}`);
    });
  }

  return results;
}

// Run tests
testCancellationSystem()
  .then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
