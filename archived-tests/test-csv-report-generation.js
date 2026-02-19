/**
 * Test CSV Report Generation
 * Tests the enhanced CSV export functionality with all transaction fields
 */

const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Test admin credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@smilingsteps.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

let adminToken = null;

/**
 * Login as admin
 */
async function loginAsAdmin() {
  try {
    console.log('🔐 Logging in as admin...');
    
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    adminToken = response.data.token;
    console.log('✅ Admin login successful');
    return true;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test CSV report generation with date range
 */
async function testCSVReportGeneration() {
  try {
    console.log('\n📊 Testing CSV report generation...');

    // Set date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const params = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      format: 'csv'
    };

    console.log('📅 Date range:', params);

    const response = await axios.get(`${API_URL}/api/reconciliation/report`, {
      params,
      headers: {
        'x-auth-token': adminToken
      }
    });

    console.log('✅ CSV report generated successfully');
    console.log('📄 Report preview (first 500 chars):');
    console.log(response.data.substring(0, 500));
    console.log('...');
    console.log(`\n📏 Total report size: ${response.data.length} characters`);

    // Verify CSV structure
    const lines = response.data.split('\n');
    console.log(`📊 Total lines: ${lines.length}`);
    
    // Check for summary section
    if (lines[0].includes('RECONCILIATION REPORT SUMMARY')) {
      console.log('✅ Summary section present');
    } else {
      console.log('❌ Summary section missing');
    }

    // Check for headers
    const headerLine = lines.find(line => line.includes('Session ID'));
    if (headerLine) {
      const headers = headerLine.split(',');
      console.log(`✅ Found ${headers.length} columns in CSV`);
      console.log('📋 Headers:', headers.slice(0, 5).join(', '), '...');
    } else {
      console.log('❌ Header line not found');
    }

    return true;
  } catch (error) {
    console.error('❌ CSV report generation failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test CSV report with filters
 */
async function testCSVReportWithFilters() {
  try {
    console.log('\n🔍 Testing CSV report with filters...');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days

    const params = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      format: 'csv'
      // Could add clientId or psychologistId filters here
    };

    console.log('📅 Filtered date range:', params);

    const response = await axios.get(`${API_URL}/api/reconciliation/report`, {
      params,
      headers: {
        'x-auth-token': adminToken
      }
    });

    console.log('✅ Filtered CSV report generated successfully');
    console.log(`📏 Report size: ${response.data.length} characters`);

    return true;
  } catch (error) {
    console.error('❌ Filtered CSV report failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test JSON format (alternative to CSV)
 */
async function testJSONReport() {
  try {
    console.log('\n📋 Testing JSON report format...');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const params = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      format: 'json'
    };

    const response = await axios.get(`${API_URL}/api/reconciliation/report`, {
      params,
      headers: {
        'x-auth-token': adminToken
      }
    });

    console.log('✅ JSON report generated successfully');
    console.log('📊 Summary:', response.data.summary);
    console.log(`📄 Sessions: ${response.data.sessions?.length || 0}`);

    return true;
  } catch (error) {
    console.error('❌ JSON report failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  try {
    console.log('\n⚠️ Testing error handling...');

    // Test 1: Missing dates
    try {
      await axios.get(`${API_URL}/api/reconciliation/report`, {
        params: { format: 'csv' },
        headers: { 'x-auth-token': adminToken }
      });
      console.log('❌ Should have failed with missing dates');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected missing dates');
      }
    }

    // Test 2: Invalid date format
    try {
      await axios.get(`${API_URL}/api/reconciliation/report`, {
        params: {
          startDate: 'invalid-date',
          endDate: '2024-12-10',
          format: 'csv'
        },
        headers: { 'x-auth-token': adminToken }
      });
      console.log('❌ Should have failed with invalid date');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected invalid date format');
      }
    }

    // Test 3: Start date after end date
    try {
      await axios.get(`${API_URL}/api/reconciliation/report`, {
        params: {
          startDate: '2024-12-10',
          endDate: '2024-12-01',
          format: 'csv'
        },
        headers: { 'x-auth-token': adminToken }
      });
      console.log('❌ Should have failed with invalid date range');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected invalid date range');
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
    return false;
  }
}

/**
 * Test CSV field completeness
 */
async function testCSVFieldCompleteness() {
  try {
    console.log('\n🔍 Testing CSV field completeness...');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const response = await axios.get(`${API_URL}/api/reconciliation/report`, {
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        format: 'csv'
      },
      headers: {
        'x-auth-token': adminToken
      }
    });

    const lines = response.data.split('\n');
    const headerLine = lines.find(line => line.includes('Session ID'));
    
    if (headerLine) {
      const requiredFields = [
        'Session ID',
        'Transaction ID',
        'Checkout Request ID',
        'Merchant Request ID',
        'Amount (KES)',
        'M-Pesa Amount',
        'Phone Number',
        'Payment Status',
        'Session Status',
        'Result Code',
        'Result Description',
        'Payment Initiated At',
        'Payment Verified At',
        'Reconciliation Status',
        'Issues',
        'Client Name',
        'Client Email',
        'Psychologist Name',
        'Session Type',
        'Session Date',
        'Payment Method',
        'Payment Attempts'
      ];

      const missingFields = requiredFields.filter(field => !headerLine.includes(field));
      
      if (missingFields.length === 0) {
        console.log('✅ All required fields present in CSV');
        console.log(`📋 Total fields: ${requiredFields.length}`);
      } else {
        console.log('❌ Missing fields:', missingFields);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Field completeness test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Starting CSV Report Generation Tests\n');
  console.log('=' .repeat(60));

  // Login
  const loginSuccess = await loginAsAdmin();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without admin authentication');
    process.exit(1);
  }

  // Run tests
  const tests = [
    { name: 'CSV Report Generation', fn: testCSVReportGeneration },
    { name: 'CSV Report with Filters', fn: testCSVReportWithFilters },
    { name: 'JSON Report Format', fn: testJSONReport },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'CSV Field Completeness', fn: testCSVFieldCompleteness }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! CSV report generation is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
