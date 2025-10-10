const axios = require('axios');

async function testAuth() {
  const API_BASE = 'https://smiling-steps.onrender.com';
  
  console.log('🧪 Testing authentication endpoints...');
  
  // Test 1: Registration
  try {
    console.log('\n1️⃣ Testing Registration...');
    const regData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'client'
    };
    
    const regResponse = await axios.post(`${API_BASE}/api/users/register`, regData);
    console.log('✅ Registration successful:', regResponse.status);
    console.log('Response:', regResponse.data);
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.status);
    console.log('Error details:', error.response?.data);
  }

  // Test 2: Login with existing user
  try {
    console.log('\n2️⃣ Testing Login with existing admin...');
    const loginData = {
      email: 'smilingsteps@gmail.com',
      password: '33285322'
    };
    
    const loginResponse = await axios.post(`${API_BASE}/api/users/login`, loginData);
    console.log('✅ Login successful:', loginResponse.status);
    console.log('Response:', loginResponse.data);
  } catch (error) {
    console.log('❌ Login failed:', error.response?.status);
    console.log('Error details:', error.response?.data);
  }

  // Test 3: Check if backend is responding
  try {
    console.log('\n3️⃣ Testing backend health...');
    const healthResponse = await axios.get(`${API_BASE}/api/test`);
    console.log('✅ Backend healthy:', healthResponse.status);
    console.log('Response:', healthResponse.data);
  } catch (error) {
    console.log('❌ Backend health check failed:', error.response?.status);
    console.log('Error details:', error.response?.data);
  }
}

testAuth();