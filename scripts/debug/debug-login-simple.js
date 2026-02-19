const axios = require('axios');

const API_BASE_URL = 'https://smiling-steps-backend.onrender.com';

async function testLogin() {
  try {
    console.log('🔐 Testing login with detailed error info...');
    
    const response = await axios.post(`${API_BASE_URL}/api/users/login`, {
      email: 'nancy@gmail.com',
      password: 'password123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Login successful!');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    
  } catch (error) {
    console.log('❌ Login failed:');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Data:', error.response?.data);
    console.log('Full Error:', error.message);
    
    if (error.response?.data) {
      console.log('Response Headers:', error.response.headers);
    }
  }
}

testLogin();