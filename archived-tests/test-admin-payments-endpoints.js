/**
 * Test Admin Payment Endpoints
 * Tests for GET /api/admin/payments and GET /api/admin/payments/export
 * Requirements: 10.1, 10.2, 10.4
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Test configuration
const config = {
  headers: {
    'Content-Type': 'application/json'
  }
};

// Helper to get admin token
async function getAdminToken() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@smilingsteps.com',
      password: 'admin123'
    });
    return response.data.token;
  } catch (error) {
    console.error('Failed to get admin token:', error.response?.data || error.message);
    return null;
  }
}

// Test GET /api/admin/payments endpoint
async function testGetPayments(token) {
  console.log('\n📋 Testing GET /api/admin/payments...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/payments`, {
      headers: { 'x-auth-token': token }
    });
    
    console.log('✅ GET /api/admin/payments - Success');
    console.log('   Response structure:', {
      success: response.data.success,
      transactionsCount: response.data.transactions?.length || 0,
      pagination: response.data.pagination
    });
    
    // Verify response structure
    if (!response.data.success) {
      console.log('❌ Response missing success field');
      return false;
    }
    
    if (!Array.isArray(response.data.transactions)) {
      console.log('❌ Response missing transactions array');
      return false;
    }
    
    if (!response.data.pagination) {
      console.log('❌ Response missing pagination object');
      return false;
    }
    
    // Check transaction structure if any exist
    if (response.data.transactions.length > 0) {
      const tx = response.data.transactions[0];
      const requiredFields = ['id', 'transactionID', 'amount', 'client', 'therapist', 'paymentStatus'];
      const missingFields = requiredFields.filter(f => !(f in tx));
      
      if (missingFields.length > 0) {
        console.log('❌ Transaction missing fields:', missingFields);
        return false;
      }
      
      // Check nested session details
      if (!tx.session) {
        console.log('⚠️ Transaction missing session details');
      }
      
      console.log('   Sample transaction:', {
        id: tx.id,
        transactionID: tx.transactionID,
        amount: tx.amount,
        clientName: tx.client?.name,
        therapistName: tx.therapist?.name,
        paymentStatus: tx.paymentStatus
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ GET /api/admin/payments - Failed');
    console.log('   Error:', error.response?.data || error.message);
    return false;
  }
}

// Test GET /api/admin/payments with filters
async function testGetPaymentsWithFilters(token) {
  console.log('\n📋 Testing GET /api/admin/payments with filters...');
  
  const testCases = [
    { name: 'Pagination', params: { page: 1, limit: 5 } },
    { name: 'Status filter', params: { status: 'Paid' } },
    { name: 'Date range', params: { startDate: '2024-01-01', endDate: '2025-12-31' } },
    { name: 'Search', params: { search: 'test' } }
  ];
  
  let allPassed = true;
  
  for (const testCase of testCases) {
    try {
      const queryString = new URLSearchParams(testCase.params).toString();
      const response = await axios.get(`${BASE_URL}/api/admin/payments?${queryString}`, {
        headers: { 'x-auth-token': token }
      });
      
      console.log(`✅ ${testCase.name} filter - Success (${response.data.transactions?.length || 0} results)`);
    } catch (error) {
      console.log(`❌ ${testCase.name} filter - Failed:`, error.response?.data?.message || error.message);
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Test GET /api/admin/payments/export endpoint
async function testExportPayments(token) {
  console.log('\n📋 Testing GET /api/admin/payments/export...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/payments/export`, {
      headers: { 'x-auth-token': token },
      responseType: 'text'
    });
    
    console.log('✅ GET /api/admin/payments/export - Success');
    
    // Verify CSV structure
    const lines = response.data.split('\n');
    const headers = lines[0];
    
    console.log('   Content-Type:', response.headers['content-type']);
    console.log('   CSV Headers:', headers.substring(0, 100) + '...');
    console.log('   Total rows:', lines.length - 1); // Minus header row
    
    // Verify expected headers are present
    const expectedHeaders = ['Date', 'Transaction ID', 'Client Name', 'Amount', 'Payment Status'];
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      console.log('⚠️ CSV missing expected headers:', missingHeaders);
    }
    
    return true;
  } catch (error) {
    console.log('❌ GET /api/admin/payments/export - Failed');
    console.log('   Error:', error.response?.data || error.message);
    return false;
  }
}

// Test GET /api/admin/payments/export with filters
async function testExportPaymentsWithFilters(token) {
  console.log('\n📋 Testing GET /api/admin/payments/export with filters...');
  
  try {
    const params = new URLSearchParams({
      status: 'Paid',
      startDate: '2024-01-01',
      endDate: '2025-12-31'
    });
    
    const response = await axios.get(`${BASE_URL}/api/admin/payments/export?${params}`, {
      headers: { 'x-auth-token': token },
      responseType: 'text'
    });
    
    console.log('✅ Export with filters - Success');
    const lines = response.data.split('\n');
    console.log('   Filtered rows:', lines.length - 1);
    
    return true;
  } catch (error) {
    console.log('❌ Export with filters - Failed');
    console.log('   Error:', error.response?.data || error.message);
    return false;
  }
}

// Test unauthorized access
async function testUnauthorizedAccess() {
  console.log('\n📋 Testing unauthorized access...');
  
  try {
    await axios.get(`${BASE_URL}/api/admin/payments`);
    console.log('❌ Should have rejected unauthorized request');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly rejected unauthorized request (401)');
      return true;
    }
    console.log('❌ Unexpected error:', error.response?.status, error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Admin Payment Endpoints Test Suite');
  console.log('=====================================');
  console.log(`Base URL: ${BASE_URL}`);
  
  // Get admin token
  console.log('\n🔐 Getting admin token...');
  const token = await getAdminToken();
  
  if (!token) {
    console.log('❌ Could not get admin token. Make sure the server is running and admin account exists.');
    console.log('\nTo create an admin account, run:');
    console.log('  node server/create-admin.js');
    return;
  }
  
  console.log('✅ Admin token obtained');
  
  // Run tests
  const results = {
    getPayments: await testGetPayments(token),
    getPaymentsWithFilters: await testGetPaymentsWithFilters(token),
    exportPayments: await testExportPayments(token),
    exportPaymentsWithFilters: await testExportPaymentsWithFilters(token),
    unauthorizedAccess: await testUnauthorizedAccess()
  };
  
  // Summary
  console.log('\n=====================================');
  console.log('📊 Test Results Summary');
  console.log('=====================================');
  
  let passed = 0;
  let failed = 0;
  
  for (const [test, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test}`);
    if (result) passed++;
    else failed++;
  }
  
  console.log('\n-------------------------------------');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the output above.');
  }
}

// Run tests
runTests().catch(console.error);
