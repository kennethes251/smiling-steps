/**
 * Login Debug Test
 * Tests the login endpoint to debug the 400 error
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testLogin() {
  console.log('🧪 Testing Login Endpoint...\n');
  
  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    try {
      const healthCheck = await axios.get(`${API_BASE}/api/auth`, { timeout: 5000 });
      console.log('✅ Server is running');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Server is not running on port 5000');
        console.log('💡 Please start the server with: npm start (in server directory)');
        return;
      } else if (error.response?.status === 401) {
        console.log('✅ Server is running (401 expected for auth endpoint without token)');
      } else {
        console.log('⚠️ Server responded with:', error.response?.status || error.message);
      }
    }
    
    // Test 2: Check login endpoint with missing data
    console.log('\n2. Testing login with missing data...');
    try {
      const response = await axios.post(`${API_BASE}/api/users/login`, {});
      console.log('Unexpected success:', response.data);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly returns 400 for missing data');
        console.log('Response:', error.response.data);
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }
    
    // Test 3: Check login with test credentials
    console.log('\n3. Testing login with test credentials...');
    const testCredentials = [
      { email: 'nancy@gmail.com', password: 'password123' },
      { email: 'client@test.com', password: 'password123' },
      { email: 'test@example.com', password: 'password123' }
    ];
    
    for (const creds of testCredentials) {
      try {
        console.log(`\nTrying: ${creds.email}`);
        const response = await axios.post(`${API_BASE}/api/users/login`, creds);
        console.log('✅ Login successful!');
        console.log('User:', response.data.user?.name, response.data.user?.role);
        console.log('Token received:', !!response.data.token);
        break; // Stop on first successful login
      } catch (error) {
        if (error.response?.status === 400) {
          console.log('❌ Login failed:', error.response.data.message);
          if (error.response.data.errors) {
            console.log('Errors:', error.response.data.errors);
          }
        } else {
          console.log('❌ Unexpected error:', error.response?.status, error.response?.data?.message);
        }
      }
    }
    
    // Test 4: Check if there are any users in the database
    console.log('\n4. Checking for existing users...');
    try {
      const response = await axios.get(`${API_BASE}/api/users/debug/users`);
      console.log('✅ Users in database:', response.data.count);
      if (response.data.users && response.data.users.length > 0) {
        console.log('Sample users:');
        response.data.users.slice(0, 3).forEach(user => {
          console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
        });
      }
    } catch (error) {
      console.log('⚠️ Could not fetch users:', error.response?.status, error.response?.data?.message);
    }
    
    // Test 5: Create a test user if none exist
    console.log('\n5. Creating test users if needed...');
    try {
      const response = await axios.get(`${API_BASE}/api/users/debug/create-test-users`);
      console.log('✅ Test users created:', response.data.message);
    } catch (error) {
      console.log('⚠️ Could not create test users:', error.response?.status, error.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLogin().catch(console.error);