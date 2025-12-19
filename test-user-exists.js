const axios = require('axios');

const testUserExists = async () => {
  try {
    console.log('🔍 Testing if test users exist...');
    
    const response = await axios.get('https://smiling-steps.onrender.com/api/users/debug/users', {
      timeout: 10000
    });
    
    console.log('✅ Users found:');
    console.log('Count:', response.data.count);
    console.log('Users:', response.data.users);
    
  } catch (error) {
    console.error('❌ Failed to fetch users:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
};

testUserExists();