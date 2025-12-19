const axios = require('axios');

const testLoginEndpoint = async () => {
  try {
    console.log('🌐 Testing login endpoint...');
    
    const backendUrl = 'https://smiling-steps.onrender.com';
    
    // Test health check first
    console.log('🏥 Testing health check...');
    try {
      const healthResponse = await axios.get(`${backendUrl}/health`);
      console.log('✅ Health check successful:', healthResponse.data);
    } catch (healthError) {
      console.log('❌ Health check failed:', healthError.message);
    }
    
    // Test login endpoint
    console.log('🔐 Testing login endpoint...');
    const loginData = {
      email: 'nancy@gmail.com',
      password: 'password123'
    };
    
    const response = await axios.post(`${backendUrl}/api/users/login`, loginData, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://smiling-steps-frontend.onrender.com'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('📊 Response status:', response.status);
    console.log('👤 User data:', response.data.user);
    console.log('🔑 Token received:', !!response.data.token);
    
  } catch (error) {
    console.error('❌ Login test failed:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message || error.message);
    console.error('Errors:', error.response?.data?.errors);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🚨 Server is not running or not accessible');
    }
  }
};

testLoginEndpoint();