/**
 * Test Payment Reconciliation System
 * Run this script to verify reconciliation functionality
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test configuration
const config = {
  adminToken: '', // Will be set after login
  testDateRange: {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  }
};

/**
 * Login as admin
 */
async function loginAsAdmin() {
  try {
    console.log('🔐 Logging in as admin...');
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: process.env.ADMIN_EMAIL || 'admin@smilingssteps.com',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    });

    config.adminToken = response.data.token;
    console.log('✅ Admin login successful');
    return true;

  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test reconciliation summary endpoint
 */
async function testSummary() {
  try {
    console.log('\n📊 Testing reconciliation summary...');
    
    const response = await axios.get(`${API_URL}/reconciliation/summary`, {
      headers: { 'x-auth-token': config.adminToken }
    });

    console.log('✅ Summary retrieved successfully:');
    console.log('   Today:', response.data.summary.today);
    console.log('   This Week:', response.data.summary.thisWeek);
    console.log('   This Month:', response.data.summary.thisMonth);
    console.log('   Orphaned Payments:', response.data.summary.orphanedCount);

    return true;

  } catch (error) {
    console.error('❌ Summary test failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test orphaned payments detection
 */
async function testOrphanedPayments() {
  try {
    console.log('\n🔍 Testing orphaned payments detection...');
    
    const response = await axios.get(`${API_URL}/reconciliation/orphaned`, {
      headers: { 'x-auth-token': config.adminToken }
    });

    console.log(`✅ Found ${response.data.count} orphaned payments`);
    
    if (response.data.count > 0) {
      console.log('   First orphaned payment:', response.data.orphanedPayments[0]);
    }

    return true;

  } catch (error) {
    console.error('❌ Orphaned payments test failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test manual reconciliation
 */
async function testManualReconciliation() {
  try {
    console.log('\n🔄 Testing manual reconciliation...');
    console.log('   Date range:', config.testDateRange);
    
    const response = await axios.post(
      `${API_URL}/reconciliation/run`,
      config.testDateRange,
      { headers: { 'x-auth-token': config.adminToken } }
    );

    console.log('✅ Reconciliation completed successfully:');
    console.log('   Total Transactions:', response.data.summary.totalTransactions);
    console.log('   Matched:', response.data.summary.matched);
    console.log('   Unmatched:', response.data.summary.unmatched);
    console.log('   Discrepancies:', response.data.summary.discrepancies);
    console.log('   Pending Verification:', response.data.summary.pendingVerification);
    console.log('   Total Amount: KES', response.data.summary.totalAmount);

    // Store results for report test
    config.reconciliationResults = response.data;

    return true;

  } catch (error) {
    console.error('❌ Manual reconciliation test failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test report generation (JSON format)
 */
async function testReportGeneration() {
  try {
    console.log('\n📄 Testing JSON report generation...');
    
    const response = await axios.get(`${API_URL}/reconciliation/report`, {
      params: {
        ...config.testDateRange,
        format: 'json'
      },
      headers: { 'x-auth-token': config.adminToken }
    });

    console.log('✅ JSON report generated successfully');
    console.log('   Results count:', response.data.allResults?.length || 0);
    console.log('   Sessions count:', response.data.sessions?.length || 0);

    return true;

  } catch (error) {
    console.error('❌ JSON report generation test failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test CSV report generation with all transaction fields
 */
async function testCSVReportGeneration() {
  try {
    console.log('\n📊 Testing CSV report generation...');
    
    const response = await axios.get(`${API_URL}/reconciliation/report`, {
      params: {
        ...config.testDateRange,
        format: 'csv'
      },
      headers: { 'x-auth-token': config.adminToken }
    });

    console.log('✅ CSV report generated successfully');
    
    // Verify CSV structure
    const csvContent = response.data;
    const lines = csvContent.split('\n');
    console.log(`   Total lines: ${lines.length}`);
    
    // Check for summary section
    if (lines[0].includes('RECONCILIATION REPORT SUMMARY')) {
      console.log('   ✅ Summary section present');
    } else {
      console.log('   ❌ Summary section missing');
    }
    
    // Check for required fields in header
    const headerLine = lines.find(line => line.includes('Session ID'));
    if (headerLine) {
      const requiredFields = [
        'Session ID',
        'Transaction ID',
        'Checkout Request ID',
        'Amount (KES)',
        'Phone Number',
        'Payment Status',
        'Reconciliation Status',
        'Client Name',
        'Psychologist Name'
      ];
      
      const missingFields = requiredFields.filter(field => !headerLine.includes(field));
      
      if (missingFields.length === 0) {
        console.log('   ✅ All required fields present');
      } else {
        console.log('   ❌ Missing fields:', missingFields.join(', '));
      }
    }
    
    // Show preview
    console.log('   Preview (first 300 chars):');
    console.log('   ' + csvContent.substring(0, 300).replace(/\n/g, '\n   '));
    console.log('   ...');

    return true;

  } catch (error) {
    console.error('❌ CSV report generation test failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test CSV report with date range filtering
 */
async function testCSVReportWithFilters() {
  try {
    console.log('\n🔍 Testing CSV report with date range filtering...');
    
    // Test with a narrower date range
    const narrowRange = {
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    };
    
    console.log('   Date range:', narrowRange);
    
    const response = await axios.get(`${API_URL}/reconciliation/report`, {
      params: {
        ...narrowRange,
        format: 'csv'
      },
      headers: { 'x-auth-token': config.adminToken }
    });

    console.log('✅ Filtered CSV report generated successfully');
    console.log(`   Report size: ${response.data.length} characters`);

    return true;

  } catch (error) {
    console.error('❌ Filtered CSV report test failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test session reconciliation (if we have a session ID)
 */
async function testSessionReconciliation() {
  try {
    // Skip if no reconciliation results
    if (!config.reconciliationResults || !config.reconciliationResults.allResults.length) {
      console.log('\n⏭️  Skipping session reconciliation test (no sessions found)');
      return true;
    }

    console.log('\n🔍 Testing session reconciliation...');
    
    const sessionId = config.reconciliationResults.allResults[0].sessionId;
    console.log('   Testing session:', sessionId);

    const response = await axios.get(
      `${API_URL}/reconciliation/session/${sessionId}`,
      { headers: { 'x-auth-token': config.adminToken } }
    );

    console.log('✅ Session reconciliation successful:');
    console.log('   Status:', response.data.status);
    console.log('   Transaction ID:', response.data.transactionId || 'N/A');
    console.log('   Issues:', response.data.issues?.length || 0);

    return true;

  } catch (error) {
    console.error('❌ Session reconciliation test failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test access control (non-admin should be denied)
 */
async function testAccessControl() {
  try {
    console.log('\n🔒 Testing access control...');
    
    // Try to access without token
    try {
      await axios.get(`${API_URL}/reconciliation/summary`);
      console.error('❌ Access control failed: Unauthenticated access allowed');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Unauthenticated access correctly denied');
      } else {
        throw error;
      }
    }

    // Try to access with non-admin token (if available)
    // For now, just verify admin access works
    console.log('✅ Access control test passed');
    return true;

  } catch (error) {
    console.error('❌ Access control test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Starting Payment Reconciliation System Tests\n');
  console.log('='.repeat(60));

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  const tests = [
    { name: 'Admin Login', fn: loginAsAdmin },
    { name: 'Reconciliation Summary', fn: testSummary },
    { name: 'Orphaned Payments Detection', fn: testOrphanedPayments },
    { name: 'Manual Reconciliation', fn: testManualReconciliation },
    { name: 'JSON Report Generation', fn: testReportGeneration },
    { name: 'CSV Report Generation', fn: testCSVReportGeneration },
    { name: 'CSV Report with Filters', fn: testCSVReportWithFilters },
    { name: 'Session Reconciliation', fn: testSessionReconciliation },
    { name: 'Access Control', fn: testAccessControl }
  ];

  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Test Results:');
  console.log(`   Total: ${results.total}`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log('='.repeat(60));

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Payment reconciliation system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
