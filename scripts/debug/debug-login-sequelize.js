const axios = require('axios');

const debugLogin = async () => {
  console.log('🔍 Debugging login issue...');
  
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'smilingsteps@gmail.com',
      password: '33285322'
    }, {
      validateStatus: () => true // Don't throw on error status
    });
    
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
    if (response.status !== 200) {
      console.log('\n🔍 Let me check the server logs...');
    }
    
  } catch (error) {
    console.error('Request error:', error.message);
  }
};

debugLogin();