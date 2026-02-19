const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testRegistrationOnly() {
  console.log('🔍 Testing Registration Only...\n');

  try {
    const registerData = {
      name: 'Debug User',
      email: `debug${Date.now()}@example.com`,
      password: 'password123',
      role: 'client',
      skipVerification: true
    };

    console.log('📝 Sending registration data:', registerData);

    const registerResponse = await axios.post(`${API_BASE}/users/register`, registerData);
    console.log('✅ Registration response:', JSON.stringify(registerResponse.data, null, 2));

    // Now try to login immediately with the same credentials
    console.log('\n🔐 Attempting immediate login...');
    const loginData = {
      email: registerData.email,
      password: registerData.password
    };

    const loginResponse = await axios.post(`${API_BASE}/users/login`, loginData);
    console.log('✅ Login successful:', JSON.stringify(loginResponse.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.log('❌ Error response:', {
        status: error.response.status,
        data: error.response.data
      });
    } else {
      console.error('❌ Network error:', error.message);
    }
  }
}

testRegistrationOnly();