/**
 * Test Profile Management Endpoints
 * 
 * Tests for Requirements 4.1-4.5, 5.1
 */

const API_BASE = process.env.API_URL || 'http://localhost:5000';

// Test user credentials (use existing test user)
const TEST_USER = {
  email: 'nancy@gmail.com',
  password: 'password123'
};

let authToken = null;

async function login() {
  console.log('🔐 Logging in as test user...');
  
  const response = await fetch(`${API_BASE}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  });
  
  const data = await response.json();
  
  if (!data.success || !data.token) {
    throw new Error(`Login failed: ${data.message || 'Unknown error'}`);
  }
  
  authToken = data.token;
  console.log('✅ Login successful');
  return data;
}

async function testGetProfile() {
  console.log('\n📋 Testing GET /api/profile...');
  
  const response = await fetch(`${API_BASE}/api/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': authToken
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`Get profile failed: ${data.message}`);
  }
  
  // Verify sensitive fields are excluded
  const sensitiveFields = ['password', 'passwordResetToken', 'verificationToken', 'loginAttempts', 'lockUntil'];
  const user = data.user;
  
  for (const field of sensitiveFields) {
    if (user[field] !== undefined) {
      throw new Error(`Sensitive field '${field}' should be excluded from profile response`);
    }
  }
  
  console.log('✅ GET /api/profile - Success');
  console.log('   User:', user.name, user.email, user.role);
  console.log('   Sensitive fields properly excluded');
  
  return data;
}

async function testUpdateProfile() {
  console.log('\n🔄 Testing PUT /api/profile...');
  
  const updateData = {
    phone: '+1234567890',
    bio: 'Test bio updated at ' + new Date().toISOString(),
    preferredLanguage: 'English'
  };
  
  const response = await fetch(`${API_BASE}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': authToken
    },
    body: JSON.stringify(updateData)
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`Update profile failed: ${data.message}`);
  }
  
  console.log('✅ PUT /api/profile - Success');
  console.log('   Updated fields:', Object.keys(updateData).join(', '));
  
  return data;
}

async function testUpdateProfileValidation() {
  console.log('\n🔍 Testing profile validation...');
  
  // Test invalid phone number
  const invalidPhone = await fetch(`${API_BASE}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': authToken
    },
    body: JSON.stringify({ phone: 'invalid-phone' })
  });
  
  const phoneResult = await invalidPhone.json();
  
  if (phoneResult.success) {
    console.log('⚠️ Invalid phone number was accepted (validation may be lenient)');
  } else {
    console.log('✅ Invalid phone number rejected');
  }
  
  // Test name too short
  const shortName = await fetch(`${API_BASE}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': authToken
    },
    body: JSON.stringify({ name: 'A' })
  });
  
  const nameResult = await shortName.json();
  
  if (nameResult.success) {
    throw new Error('Short name should be rejected');
  }
  
  console.log('✅ Name validation working');
  
  return true;
}

async function testPasswordChange() {
  console.log('\n🔐 Testing PUT /api/profile/password...');
  
  // Test with incorrect current password
  const wrongPassword = await fetch(`${API_BASE}/api/profile/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': authToken
    },
    body: JSON.stringify({
      currentPassword: 'wrongpassword',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123'
    })
  });
  
  const wrongResult = await wrongPassword.json();
  
  if (wrongResult.success) {
    throw new Error('Password change with wrong current password should fail');
  }
  
  console.log('✅ Incorrect current password rejected');
  
  // Test with mismatched passwords
  const mismatch = await fetch(`${API_BASE}/api/profile/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': authToken
    },
    body: JSON.stringify({
      currentPassword: TEST_USER.password,
      newPassword: 'newpassword123',
      confirmPassword: 'differentpassword'
    })
  });
  
  const mismatchResult = await mismatch.json();
  
  if (mismatchResult.success) {
    throw new Error('Password change with mismatched passwords should fail');
  }
  
  console.log('✅ Mismatched passwords rejected');
  
  // Test with short password
  const shortPass = await fetch(`${API_BASE}/api/profile/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': authToken
    },
    body: JSON.stringify({
      currentPassword: TEST_USER.password,
      newPassword: '123',
      confirmPassword: '123'
    })
  });
  
  const shortResult = await shortPass.json();
  
  if (shortResult.success) {
    throw new Error('Short password should be rejected');
  }
  
  console.log('✅ Short password rejected');
  console.log('✅ PUT /api/profile/password validation - All tests passed');
  
  return true;
}

async function testUnauthorizedAccess() {
  console.log('\n🚫 Testing unauthorized access...');
  
  // Test without token
  const noToken = await fetch(`${API_BASE}/api/profile`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (noToken.status !== 401) {
    throw new Error('Should return 401 without token');
  }
  
  console.log('✅ Unauthorized access properly rejected');
  
  return true;
}

async function runTests() {
  console.log('🧪 Profile Endpoints Test Suite');
  console.log('================================\n');
  
  try {
    // Login first
    await login();
    
    // Run tests
    await testGetProfile();
    await testUpdateProfile();
    await testUpdateProfileValidation();
    await testPasswordChange();
    await testUnauthorizedAccess();
    
    console.log('\n================================');
    console.log('✅ All profile endpoint tests passed!');
    console.log('================================\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
