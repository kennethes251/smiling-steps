const axios = require('axios');

const testServerStatus = async () => {
  const backendUrl = 'https://smiling-steps.onrender.com';
  
  console.log('🌐 Testing server accessibility...');
  
  try {
    // Test basic connectivity
    console.log('📡 Testing basic connectivity...');
    const response = await axios.get(backendUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Test-Script'
      }
    });
    
    console.log('✅ Server is accessible');
    console.log('📊 Status:', response.status);
    console.log('📄 Response:', response.data);
    
  } catch (error) {
    console.error('❌ Server test failed:');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🚨 Connection refused - server is not running');
    } else if (error.code === 'ENOTFOUND') {
      console.log('🚨 DNS resolution failed - domain not found');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('🚨 Connection timeout - server is slow or unresponsive');
    } else {
      console.log('Status:', error.response?.status);
      console.log('Message:', error.message);
      console.log('Data:', error.response?.data);
    }
  }
  
  // Test specific endpoints
  const endpoints = [
    '/',
    '/health',
    '/api/users/login',
    '/api/public/psychologists'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing ${endpoint}...`);
      const response = await axios.get(`${backendUrl}${endpoint}`, {
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      if (response.status === 200) {
        console.log(`📄 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
};

testServerStatus();