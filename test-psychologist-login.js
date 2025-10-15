const axios = require('axios');

const API_URL = 'https://smiling-steps.onrender.com';

async function testPsychologistLogin() {
  console.log('🧪 Testing Psychologist Login\n');
  
  // Test credentials - update these with actual psychologist credentials
  const credentials = {
    email: 'sarah.johnson@smilingsteps.com', // Update with actual email
    password: 'secure123' // Update with actual password
  };

  console.log('📧 Testing login with:', credentials.email);
  console.log('─'.repeat(50));

  try {
    const response = await axios.post(`${API_URL}/api/users/login`, credentials);
    
    console.log('✅ Login successful!');
    console.log('User:', response.data.user);
    console.log('Token:', response.data.token.substring(0, 20) + '...');
    
  } catch (error) {
    console.log('❌ Login failed!');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
    
    if (error.response?.status === 400) {
      console.log('\n💡 Possible reasons:');
      console.log('   - Wrong email or password');
      console.log('   - User doesn\'t exist in database');
      console.log('   - Account is locked');
      console.log('   - Backend deployment not complete');
    }
  }
}

// Also test if we can reach the API
async function testAPIConnection() {
  console.log('\n🔌 Testing API Connection...');
  try {
    const response = await axios.get(API_URL);
    console.log('✅ API is reachable');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('❌ Cannot reach API');
    console.log('Error:', error.message);
  }
}

async function runTests() {
  await testAPIConnection();
  await testPsychologistLogin();
}

runTests();
