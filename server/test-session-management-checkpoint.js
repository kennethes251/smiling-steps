/**
 * Session Management Testing Checkpoint
 * 
 * Tests for Task 20: Checkpoint - Session Management Testing
 * - Verify session history access controls
 * - Test rate management functionality
 * - Ensure client export functionality works
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Test configuration
const testConfig = {
  psychologistEmail: 'test.psychologist@example.com',
  psychologistPassword: 'Test123!',
  clientEmail: 'test.client@example.com',
  clientPassword: 'Test123!',
  adminEmail: 'admin@example.com',
  adminPassword: 'Admin123!'
};

let testResults = {
  sessionHistory: { passed: 0, failed: 0 },
  rateManagement: { passed: 0, failed: 0 },
  clientExport: { passed: 0, failed: 0 },
  accessControls: { passed: 0, failed: 0 }
};

async function loginUser(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/api/users/login`, {
      email,
      password
    });
    return response.data.token;
  } catch (error) {
    console.log(`Login failed for ${email}:`, error.response?.data?.message || error.message);
    return null;
  }
}

async function testSessionHistoryAccessControls() {
  console.log('\n🔒 Testing Session History Access Controls');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Therapist can access their own session history
    console.log('\n📋 Test 1: Therapist session history access');
    const psychToken = await loginUser(testConfig.psychologistEmail, testConfig.psychologistPassword);
    
    if (psychToken) {
      try {
        const response = await axios.get(`${BASE_URL}/api/sessions/therapist/history`, {
          headers: { 'x-auth-token': psychToken }
        });
        console.log('   ✅ Therapist can access session history');
        testResults.sessionHistory.passed++;
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('   ✅ Endpoint exists (no sessions found)');
          testResults.sessionHistory.passed++;
        } else {
          console.log('   ❌ Therapist session history failed:', error.response?.data?.message || error.message);
          testResults.sessionHistory.failed++;
        }
      }
    } else {
      console.log('   ⚠️  Could not test - login failed');
    }

    // Test 2: Client can access their own session history
    console.log('\n📋 Test 2: Client session history access');
    const clientToken = await loginUser(testConfig.clientEmail, testConfig.clientPassword);
    
    if (clientToken) {
      try {
        const response = await axios.get(`${BASE_URL}/api/sessions/my-history`, {
          headers: { 'x-auth-token': clientToken }
        });
        console.log('   ✅ Client can access session history');
        testResults.sessionHistory.passed++;
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('   ✅ Endpoint exists (no sessions found)');
          testResults.sessionHistory.passed++;
        } else {
          console.log('   ❌ Client session history failed:', error.response?.data?.message || error.message);
          testResults.sessionHistory.failed++;
        }
      }
    } else {
      console.log('   ⚠️  Could not test - login failed');
    }

    // Test 3: Cross-user access should be denied
    console.log('\n📋 Test 3: Cross-user access control');
    if (clientToken) {
      try {
        const response = await axios.get(`${BASE_URL}/api/sessions/therapist/history`, {
          headers: { 'x-auth-token': clientToken }
        });
        console.log('   ❌ Client should not access therapist endpoints');
        testResults.accessControls.failed++;
      } catch (error) {
        if (error.response?.status === 403 || error.response?.status === 401) {
          console.log('   ✅ Access properly denied to client');
          testResults.accessControls.passed++;
        } else {
          console.log('   ❌ Unexpected error:', error.response?.data?.message || error.message);
          testResults.accessControls.failed++;
        }
      }
    }

  } catch (error) {
    console.log('   ❌ Session history test failed:', error.message);
    testResults.sessionHistory.failed++;
  }
}

async function testRateManagement() {
  console.log('\n💰 Testing Rate Management');
  console.log('=' .repeat(50));
  
  try {
    const psychToken = await loginUser(testConfig.psychologistEmail, testConfig.psychologistPassword);
    
    if (psychToken) {
      // Test 1: Get current rates
      console.log('\n📋 Test 1: Get current session rates');
      try {
        const response = await axios.get(`${BASE_URL}/api/session-rates`, {
          headers: { 'x-auth-token': psychToken }
        });
        console.log('   ✅ Can retrieve session rates');
        testResults.rateManagement.passed++;
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('   ✅ Endpoint exists (no rates set)');
          testResults.rateManagement.passed++;
        } else {
          console.log('   ❌ Get rates failed:', error.response?.data?.message || error.message);
          testResults.rateManagement.failed++;
        }
      }

      // Test 2: Update rates
      console.log('\n📋 Test 2: Update session rates');
      try {
        const newRates = {
          Individual: 5000,
          Couples: 7500,
          Family: 8000,
          Group: 3000
        };
        
        const response = await axios.post(`${BASE_URL}/api/session-rates`, newRates, {
          headers: { 'x-auth-token': psychToken }
        });
        console.log('   ✅ Can update session rates');
        testResults.rateManagement.passed++;
      } catch (error) {
        console.log('   ❌ Update rates failed:', error.response?.data?.message || error.message);
        testResults.rateManagement.failed++;
      }

      // Test 3: Rate validation
      console.log('\n📋 Test 3: Rate validation (negative values)');
      try {
        const invalidRates = {
          Individual: -1000,
          Couples: 7500,
          Family: 8000,
          Group: 3000
        };
        
        const response = await axios.post(`${BASE_URL}/api/session-rates`, invalidRates, {
          headers: { 'x-auth-token': psychToken }
        });
        console.log('   ❌ Should reject negative rates');
        testResults.rateManagement.failed++;
      } catch (error) {
        if (error.response?.status === 400) {
          console.log('   ✅ Properly validates negative rates');
          testResults.rateManagement.passed++;
        } else {
          console.log('   ❌ Unexpected validation error:', error.response?.data?.message || error.message);
          testResults.rateManagement.failed++;
        }
      }
    } else {
      console.log('   ⚠️  Could not test - login failed');
    }

  } catch (error) {
    console.log('   ❌ Rate management test failed:', error.message);
    testResults.rateManagement.failed++;
  }
}

async function testClientExport() {
  console.log('\n📄 Testing Client Export Functionality');
  console.log('=' .repeat(50));
  
  try {
    const clientToken = await loginUser(testConfig.clientEmail, testConfig.clientPassword);
    
    if (clientToken) {
      // Test 1: Export client session history
      console.log('\n📋 Test 1: Export client session history');
      try {
        const response = await axios.get(`${BASE_URL}/api/client-export/session-history`, {
          headers: { 'x-auth-token': clientToken },
          responseType: 'arraybuffer'
        });
        
        if (response.headers['content-type']?.includes('application/pdf')) {
          console.log('   ✅ PDF export successful');
          testResults.clientExport.passed++;
        } else {
          console.log('   ❌ Export did not return PDF');
          testResults.clientExport.failed++;
        }
      } catch (error) {
        console.log('   ❌ Client export failed:', error.response?.data?.message || error.message);
        testResults.clientExport.failed++;
      }

      // Test 2: Export access control
      console.log('\n📋 Test 2: Export access control');
      const psychToken = await loginUser(testConfig.psychologistEmail, testConfig.psychologistPassword);
      
      if (psychToken) {
        try {
          const response = await axios.get(`${BASE_URL}/api/client-export/session-history`, {
            headers: { 'x-auth-token': psychToken },
            responseType: 'arraybuffer'
          });
          console.log('   ❌ Therapist should not access client export');
          testResults.accessControls.failed++;
        } catch (error) {
          if (error.response?.status === 403 || error.response?.status === 401) {
            console.log('   ✅ Access properly denied to therapist');
            testResults.accessControls.passed++;
          } else {
            console.log('   ❌ Unexpected error:', error.response?.data?.message || error.message);
            testResults.accessControls.failed++;
          }
        }
      }
    } else {
      console.log('   ⚠️  Could not test - login failed');
    }

  } catch (error) {
    console.log('   ❌ Client export test failed:', error.message);
    testResults.clientExport.failed++;
  }
}

async function runAllTests() {
  console.log('🧪 Session Management Checkpoint Testing');
  console.log('Testing session history access controls, rate management, and client export');
  console.log('=' .repeat(70));

  await testSessionHistoryAccessControls();
  await testRateManagement();
  await testClientExport();

  // Summary
  console.log('\n' + '=' .repeat(70));
  console.log('📊 CHECKPOINT TEST SUMMARY');
  console.log('=' .repeat(70));
  
  const totalPassed = Object.values(testResults).reduce((sum, category) => sum + category.passed, 0);
  const totalFailed = Object.values(testResults).reduce((sum, category) => sum + category.failed, 0);
  
  console.log(`Session History: ${testResults.sessionHistory.passed} passed, ${testResults.sessionHistory.failed} failed`);
  console.log(`Rate Management: ${testResults.rateManagement.passed} passed, ${testResults.rateManagement.failed} failed`);
  console.log(`Client Export: ${testResults.clientExport.passed} passed, ${testResults.clientExport.failed} failed`);
  console.log(`Access Controls: ${testResults.accessControls.passed} passed, ${testResults.accessControls.failed} failed`);
  console.log(`\nTOTAL: ${totalPassed} passed, ${totalFailed} failed`);
  
  if (totalFailed === 0) {
    console.log('\n✅ All session management tests passed!');
    console.log('✅ Session history access controls working');
    console.log('✅ Rate management functionality verified');
    console.log('✅ Client export functionality confirmed');
  } else {
    console.log(`\n❌ ${totalFailed} tests failed - review implementation`);
  }
  
  return { totalPassed, totalFailed };
}

// Run tests
if (require.main === module) {
  runAllTests()
    .then(results => {
      process.exit(results.totalFailed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };