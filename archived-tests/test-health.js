const axios = require('axios');

async function testHealth() {
  try {
    const response = await axios.get('http://localhost:5000/health');
    console.log('✅ Health endpoint working!');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
    console.log('Status:', error.response?.status);
  }
}

testHealth();