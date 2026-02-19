const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testLoginRegistration() {
  console.log('🔍 Testing Login and Registration Endpoints...\n');

  try {
    // Test 1: Try to register a new user
    console.log('1. Testing Registration...');
    const registerData = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      role: 'client',
      skipVerification: true
    };

    try {
      const registerResponse = await axios.post(`${API_BASE}/users/register`, registerData);
      console.log('✅ Registration successful:', registerResponse.data);
      
      // Test 2: Try to login with the new user
      console.log('\n2. Testing Login...');
      const loginData = {
        email: registerData.email,
        password: registerData.password
      };

      const loginResponse = await axios.post(`${API_BASE}/users/login`, loginData);
      console.log('✅ Login successful:', loginResponse.data);

    } catch (registerError) {
      console.log('❌ Registration failed:');
      console.log('Status:', registerError.response?.status);
      console.log('Data:', registerError.response?.data);
      
      // If registration failed due to existing user, try login with a known user
      console.log('\n2. Testing Login with existing credentials...');
      try {
        const loginData = {
          email: 'admin@example.com', // Try with admin
          password: 'admin123'
        };

        const loginResponse = await axios.post(`${API_BASE}/users/login`, loginData);
        console.log('✅ Login successful:', loginResponse.data);
      } catch (loginError) {
        console.log('❌ Login also failed:');
        console.log('Status:', loginError.response?.status);
        console.log('Data:', loginError.response?.data);
      }
    }

    // Test 3: Check server health
    console.log('\n3. Testing Server Health...');
    const healthResponse = await axios.get('http://localhost:5000/health');
    console.log('✅ Server health:', healthResponse.data);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Server might not be running on localhost:5000');
    }
  }
}

testLoginRegistration();