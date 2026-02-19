/**
 * Test script for earnings endpoints
 * 
 * Tests:
 * - GET /api/users/earnings - Get psychologist earnings
 * - GET /api/users/earnings/export - Export earnings as CSV
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

// Test credentials - use a psychologist account
const TEST_PSYCHOLOGIST = {
  email: process.env.TEST_PSYCHOLOGIST_EMAIL || 'psychologist@test.com',
  password: process.env.TEST_PSYCHOLOGIST_PASSWORD || 'password123'
};

let authToken = null;

async function login() {
  console.log('\n🔐 Logging in as psychologist...');
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_PSYCHOLOGIST)
    });
    
    const data = await response.json();
    
    if (data.token) {
      authToken = data.token;
      console.log('✅ Login successful');
      console.log('   User role:', data.user?.role);
      return true;
    } else {
      console.log('❌ Login failed:', data.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
}

async function testGetEarnings() {
  console.log('\n📊 Testing GET /api/users/earnings...');
  
  try {
    // Test 1: Get current month earnings (default)
    console.log('\n  Test 1: Get current month earnings (default)');
    const response1 = await fetch(`${API_BASE}/api/users/earnings`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data1 = await response1.json();
    console.log('  Status:', response1.status);
    console.log('  Success:', data1.success);
    
    if (data1.success) {
      console.log('  ✅ Earnings fetched successfully');
      console.log('     Total Earnings:', data1.totals?.totalEarnings || 0, 'KES');
      console.log('     Total Sessions:', data1.totals?.totalSessions || 0);
      console.log('     Pending Amount:', data1.totals?.pendingAmount || 0, 'KES');
      console.log('     Pending Count:', data1.totals?.pendingCount || 0);
      console.log('     Payments returned:', data1.payments?.length || 0);
      console.log('     Date Range:', data1.dateRange?.startDate, 'to', data1.dateRange?.endDate);
    } else {
      console.log('  ❌ Failed:', data1.message);
    }
    
    // Test 2: Get earnings with date range filter
    console.log('\n  Test 2: Get earnings with date range filter');
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    const endDate = new Date();
    
    const response2 = await fetch(
      `${API_BASE}/api/users/earnings?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data2 = await response2.json();
    console.log('  Status:', response2.status);
    console.log('  Success:', data2.success);
    
    if (data2.success) {
      console.log('  ✅ Filtered earnings fetched successfully');
      console.log('     Total Earnings:', data2.totals?.totalEarnings || 0, 'KES');
      console.log('     Payments returned:', data2.payments?.length || 0);
    } else {
      console.log('  ❌ Failed:', data2.message);
    }
    
    // Test 3: Get earnings with pagination
    console.log('\n  Test 3: Get earnings with pagination');
    const response3 = await fetch(
      `${API_BASE}/api/users/earnings?page=1&limit=5`,
      {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data3 = await response3.json();
    console.log('  Status:', response3.status);
    console.log('  Success:', data3.success);
    
    if (data3.success) {
      console.log('  ✅ Paginated earnings fetched successfully');
      console.log('     Page:', data3.pagination?.page);
      console.log('     Limit:', data3.pagination?.limit);
      console.log('     Total:', data3.pagination?.total);
      console.log('     Pages:', data3.pagination?.pages);
    } else {
      console.log('  ❌ Failed:', data3.message);
    }
    
    return data1.success;
  } catch (error) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

async function testExportEarnings() {
  console.log('\n📥 Testing GET /api/users/earnings/export...');
  
  try {
    const response = await fetch(`${API_BASE}/api/users/earnings/export`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('  Status:', response.status);
    console.log('  Content-Type:', response.headers.get('content-type'));
    console.log('  Content-Disposition:', response.headers.get('content-disposition'));
    
    if (response.status === 200) {
      const csvContent = await response.text();
      const lines = csvContent.split('\n');
      console.log('  ✅ CSV export successful');
      console.log('     Header:', lines[0]);
      console.log('     Total rows:', lines.length - 1, '(excluding header)');
      
      if (lines.length > 1) {
        console.log('     First data row:', lines[1]);
      }
      return true;
    } else {
      const data = await response.json();
      console.log('  ❌ Failed:', data.message);
      return false;
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

async function testAccessControl() {
  console.log('\n🔒 Testing access control...');
  
  // Test without auth token
  console.log('\n  Test 1: Access without authentication');
  try {
    const response = await fetch(`${API_BASE}/api/users/earnings`);
    console.log('  Status:', response.status);
    console.log('  Expected: 401 (Unauthorized)');
    console.log('  Result:', response.status === 401 ? '✅ Correct' : '❌ Incorrect');
  } catch (error) {
    console.log('  ❌ Error:', error.message);
  }
  
  // Test with client account (if available)
  console.log('\n  Test 2: Access as non-psychologist (requires client account)');
  console.log('  Skipping - would need separate client credentials');
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('EARNINGS ENDPOINTS TEST SUITE');
  console.log('Requirements: 7.1, 7.2, 7.3, 7.4');
  console.log('='.repeat(60));
  
  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Cannot proceed without authentication');
    console.log('   Please ensure a psychologist account exists with:');
    console.log(`   Email: ${TEST_PSYCHOLOGIST.email}`);
    console.log(`   Password: ${TEST_PSYCHOLOGIST.password}`);
    return;
  }
  
  // Run tests
  await testGetEarnings();
  await testExportEarnings();
  await testAccessControl();
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUITE COMPLETE');
  console.log('='.repeat(60));
}

runTests().catch(console.error);
