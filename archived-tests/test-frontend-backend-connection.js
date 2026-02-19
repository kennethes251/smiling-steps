const axios = require('axios');

const testFrontendBackendConnection = async () => {
  try {
    console.log('🔗 Testing frontend-backend connection...');
    
    // Test the psychologists endpoint that the frontend tries to access
    console.log('📡 Testing psychologists endpoint...');
    const psychologistsResponse = await axios.get('https://smiling-steps.onrender.com/api/public/psychologists', {
      headers: {
        'Origin': 'https://smiling-steps-frontend.onrender.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    console.log('✅ Psychologists endpoint working');
    console.log('Status:', psychologistsResponse.status);
    console.log('CORS headers:', {
      'Access-Control-Allow-Origin': psychologistsResponse.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': psychologistsResponse.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': psychologistsResponse.headers['access-control-allow-headers']
    });
    
    // Test the login endpoint
    console.log('\n🔐 Testing login endpoint...');
    const loginResponse = await axios.post('https://smiling-steps.onrender.com/api/users/login', {
      email: 'nancy@gmail.com',
      password: 'password123'
    }, {
      headers: {
        'Origin': 'https://smiling-steps-frontend.onrender.com',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    console.log('✅ Login endpoint working');
    console.log('Status:', loginResponse.status);
    console.log('User:', loginResponse.data.user);
    console.log('Token received:', !!loginResponse.data.token);
    
    console.log('\n🎉 Frontend-backend connection test PASSED!');
    console.log('The frontend should now be able to connect successfully.');
    
  } catch (error) {
    console.error('❌ Frontend-backend connection test FAILED:');
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    
    if (error.message.includes('CORS')) {
      console.log('\n🔧 CORS Issue Detected:');
      console.log('- Check that the frontend origin is allowed in server CORS config');
      console.log('- Verify the backend URL is correct in frontend config');
    }
  }
};

testFrontendBackendConnection();