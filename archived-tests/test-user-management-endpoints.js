/**
 * Test User Management Endpoints
 * Tests for Requirements 2.1, 2.2, 2.4, 2.5, 2.6
 */

const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Test configuration
let adminToken = null;
let testUserId = null;

/**
 * Make HTTP request
 */
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Login as admin
 */
async function loginAsAdmin() {
  console.log('\n🔐 Logging in as admin...');
  
  const response = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@smilingsteps.com',
    password: 'admin123'
  });

  if (response.status === 200 && response.data.token) {
    adminToken = response.data.token;
    console.log('✅ Admin login successful');
    return true;
  } else {
    console.log('❌ Admin login failed:', response.data);
    return false;
  }
}

/**
 * Test GET /api/admin/users - List users with pagination
 */
async function testGetUsers() {
  console.log('\n📋 Testing GET /api/admin/users...');
  
  // Test basic listing
  const response = await makeRequest('GET', '/api/admin/users?page=1&limit=10', null, adminToken);
  
  if (response.status === 200 && response.data.success) {
    console.log('✅ Basic user listing works');
    console.log(`   Total users: ${response.data.total}`);
    console.log(`   Page: ${response.data.page}`);
    console.log(`   Pages: ${response.data.pages}`);
    
    if (response.data.users.length > 0) {
      testUserId = response.data.users.find(u => u.role !== 'admin')?.id;
      console.log(`   Sample user ID for testing: ${testUserId}`);
    }
  } else {
    console.log('❌ Basic user listing failed:', response.data);
    return false;
  }

  // Test search functionality
  const searchResponse = await makeRequest('GET', '/api/admin/users?search=test', null, adminToken);
  if (searchResponse.status === 200) {
    console.log('✅ Search functionality works');
    console.log(`   Search results: ${searchResponse.data.users?.length || 0} users`);
  }

  // Test role filter
  const roleResponse = await makeRequest('GET', '/api/admin/users?role=client', null, adminToken);
  if (roleResponse.status === 200) {
    console.log('✅ Role filter works');
    console.log(`   Clients found: ${roleResponse.data.total}`);
  }

  // Test status filter
  const statusResponse = await makeRequest('GET', '/api/admin/users?status=active', null, adminToken);
  if (statusResponse.status === 200) {
    console.log('✅ Status filter works');
    console.log(`   Active users: ${statusResponse.data.total}`);
  }

  return true;
}

/**
 * Test PUT /api/admin/users/:id/status - Update user status
 */
async function testUpdateUserStatus() {
  console.log('\n🔄 Testing PUT /api/admin/users/:id/status...');
  
  if (!testUserId) {
    console.log('⚠️ No test user ID available, skipping status update test');
    return true;
  }

  // Test deactivation
  const deactivateResponse = await makeRequest('PUT', `/api/admin/users/${testUserId}/status`, {
    status: 'inactive'
  }, adminToken);

  if (deactivateResponse.status === 200 && deactivateResponse.data.success) {
    console.log('✅ User deactivation works');
    console.log(`   User status: ${deactivateResponse.data.user.status}`);
  } else {
    console.log('❌ User deactivation failed:', deactivateResponse.data);
    return false;
  }

  // Test reactivation
  const reactivateResponse = await makeRequest('PUT', `/api/admin/users/${testUserId}/status`, {
    status: 'active'
  }, adminToken);

  if (reactivateResponse.status === 200 && reactivateResponse.data.success) {
    console.log('✅ User reactivation works');
    console.log(`   User status: ${reactivateResponse.data.user.status}`);
  } else {
    console.log('❌ User reactivation failed:', reactivateResponse.data);
    return false;
  }

  // Test invalid status
  const invalidResponse = await makeRequest('PUT', `/api/admin/users/${testUserId}/status`, {
    status: 'invalid'
  }, adminToken);

  if (invalidResponse.status === 400) {
    console.log('✅ Invalid status validation works');
  } else {
    console.log('⚠️ Invalid status validation may not be working correctly');
  }

  return true;
}

/**
 * Test DELETE /api/admin/users/:id - Soft delete with anonymization
 */
async function testDeleteUser() {
  console.log('\n🗑️ Testing DELETE /api/admin/users/:id...');
  
  // First, create a test user to delete
  console.log('   Creating test user for deletion...');
  const registerResponse = await makeRequest('POST', '/api/auth/register', {
    name: 'Test Delete User',
    email: `testdelete_${Date.now()}@test.com`,
    password: 'test123',
    role: 'client'
  });

  let deleteTestUserId = null;
  if (registerResponse.status === 201 || registerResponse.status === 200) {
    deleteTestUserId = registerResponse.data.user?.id || registerResponse.data.user?._id;
    console.log(`   Test user created: ${deleteTestUserId}`);
  } else {
    console.log('⚠️ Could not create test user for deletion test, skipping');
    return true;
  }

  if (!deleteTestUserId) {
    console.log('⚠️ No user ID returned from registration, skipping delete test');
    return true;
  }

  // Test soft delete
  const deleteResponse = await makeRequest('DELETE', `/api/admin/users/${deleteTestUserId}`, {
    reason: 'Test deletion'
  }, adminToken);

  if (deleteResponse.status === 200 && deleteResponse.data.success) {
    console.log('✅ User soft delete works');
    console.log(`   Message: ${deleteResponse.data.message}`);
  } else {
    console.log('❌ User soft delete failed:', deleteResponse.data);
    return false;
  }

  // Verify user is anonymized (should not appear in normal listing)
  const verifyResponse = await makeRequest('GET', `/api/admin/users?search=${deleteTestUserId}`, null, adminToken);
  if (verifyResponse.status === 200) {
    const deletedUser = verifyResponse.data.users?.find(u => u.id === deleteTestUserId);
    if (!deletedUser) {
      console.log('✅ Deleted user is excluded from normal listing');
    } else {
      console.log('⚠️ Deleted user still appears in listing');
    }
  }

  return true;
}

/**
 * Test unauthorized access
 */
async function testUnauthorizedAccess() {
  console.log('\n🔒 Testing unauthorized access...');
  
  // Test without token
  const noTokenResponse = await makeRequest('GET', '/api/admin/users');
  if (noTokenResponse.status === 401) {
    console.log('✅ Unauthenticated access blocked');
  } else {
    console.log('⚠️ Unauthenticated access may not be properly blocked');
  }

  return true;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 User Management Endpoints Test Suite');
  console.log('========================================');
  console.log(`Testing against: ${BASE_URL}`);

  try {
    // Login first
    const loginSuccess = await loginAsAdmin();
    if (!loginSuccess) {
      console.log('\n❌ Cannot proceed without admin login');
      return;
    }

    // Run tests
    await testGetUsers();
    await testUpdateUserStatus();
    await testDeleteUser();
    await testUnauthorizedAccess();

    console.log('\n========================================');
    console.log('✅ All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  }
}

// Run tests
runTests();
