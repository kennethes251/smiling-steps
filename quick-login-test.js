/**
 * Quick Login Test
 * Tests the login endpoint directly
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_EMAIL = process.argv[2] || 'kennethes251@gmail.com';
const TEST_PASSWORD = process.argv[3] || '33285322';

async function testLogin() {
  console.log('🔐 QUICK LOGIN TEST');
  console.log('='.repeat(50));
  console.log(`API URL: ${API_URL}`);
  console.log(`Email: ${TEST_EMAIL}`);
  console.log(`Password: ${TEST_PASSWORD.substring(0, 3)}***`);
  console.log('='.repeat(50));

  try {
    console.log('\n📤 Sending login request...');
    
    const response = await axios.post(`${API_URL}/api/users/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('\n✅ LOGIN SUCCESSFUL!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('\n❌ LOGIN FAILED!');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.log('Error: Server is not running at', API_URL);
      console.log('Start the server with: npm run dev');
    } else {
      console.log('Error:', error.message);
    }
  }
}

testLogin();
