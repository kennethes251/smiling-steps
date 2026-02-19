const axios = require('axios');

const testLogin = async () => {
  try {
    console.log('🔐 Testing login...');
    
    const response = await axios.post('https://smiling-steps.onrender.com/api/users/login', {
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
    console.error('❌ Login failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
};

testLogin();