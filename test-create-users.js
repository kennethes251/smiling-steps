const axios = require('axios');

const createTestUsers = async () => {
  try {
    console.log('👥 Creating test users...');
    
    const response = await axios.get('https://smiling-steps.onrender.com/api/users/debug/create-test-users', {
      timeout: 15000
    });
    
    console.log('✅ Test users creation result:');
    console.log('Success:', response.data.success);
    console.log('Created:', response.data.created);
    console.log('Errors:', response.data.errors);
    console.log('Login credentials:', response.data.loginCredentials);
    
  } catch (error) {
    console.error('❌ Failed to create test users:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
};

createTestUsers();