require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function testLogin() {
  console.log('\n🧪 Testing Simple Login Flow\n');
  
  // Test 1: Login as psychologist
  console.log('1️⃣ Testing psychologist login...');
  try {
    const response = await axios.post(`${API_URL}/api/users/login`, {
      email: 'dr.sarah@example.com',
      password: 'password123'
    });
    
    console.log('✅ Login successful!');
    console.log('   Role:', response.data.user.role);
    console.log('   Name:', response.data.user.name);
    console.log('   Token:', response.data.token ? 'Received' : 'Missing');
    
    if (response.data.user.role === 'psychologist') {
      console.log('   ✅ Correctly identified as psychologist');
    } else {
      console.log('   ❌ Wrong role:', response.data.user.role);
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.msg || error.message);
  }
  
  console.log('\n2️⃣ Testing client login...');
  try {
    const response = await axios.post(`${API_URL}/api/users/login`, {
      email: 'client@test.com',
      password: 'password123'
    });
    
    console.log('✅ Login successful!');
    console.log('   Role:', response.data.user.role);
    console.log('   Name:', response.data.user.name);
    console.log('   Token:', response.data.token ? 'Received' : 'Missing');
    
    if (response.data.user.role === 'client') {
      console.log('   ✅ Correctly identified as client');
    } else {
      console.log('   ❌ Wrong role:', response.data.user.role);
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.msg || error.message);
  }
  
  console.log('\n✅ Test complete!\n');
  console.log('📋 Summary:');
  console.log('   - Same login endpoint for all users');
  console.log('   - Backend returns user with role');
  console.log('   - Frontend routes based on role');
  console.log('   - Simple and clean!\n');
}

testLogin();
