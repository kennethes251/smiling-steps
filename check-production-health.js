const axios = require('axios');

const checkProductionHealth = async () => {
  const baseURL = 'https://smiling-steps.onrender.com';
  
  console.log('🔍 Checking Production Health...');
  console.log('================================');
  
  try {
    // Check main API
    console.log('\n1. 🌐 Checking main API...');
    const healthResponse = await axios.get(`${baseURL}/`);
    console.log('✅ Main API:', healthResponse.status, healthResponse.statusText);
    
    // Check psychologists endpoint
    console.log('\n2. 👨‍⚕️ Checking psychologists endpoint...');
    try {
      const psychResponse = await axios.get(`${baseURL}/api/public/psychologists`);
      console.log('✅ Psychologists API:', psychResponse.status, 'Found:', psychResponse.data.length, 'psychologists');
    } catch (error) {
      console.log('❌ Psychologists API:', error.response?.status || 'Network Error');
    }
    
    // Test admin login
    console.log('\n3. 🔑 Testing admin login...');
    try {
      const loginResponse = await axios.post(`${baseURL}/api/users/login`, {
        email: 'admin@smilingsteps.com',
        password: 'admin123'
      });
      console.log('✅ Admin login successful!');
      console.log('   Token received:', loginResponse.data.token ? 'Yes' : 'No');
      console.log('   User role:', loginResponse.data.user?.role);
    } catch (error) {
      console.log('❌ Admin login failed:', error.response?.status, error.response?.data?.message);
    }
    
    console.log('\n🎉 Production Health Check Complete!');
    console.log('=====================================');
    console.log('\n📧 Ready for Email Verification Testing:');
    console.log('1. Go to: https://smiling-steps.onrender.com');
    console.log('2. Register with your real email address');
    console.log('3. Check your email for verification link');
    console.log('4. Click link to verify account');
    console.log('5. Login with verified account');
    console.log('\n👑 Admin Access: admin@smilingsteps.com / admin123');
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('\n⏰ If deployment is still in progress, wait 2-3 minutes and try again.');
  }
};

checkProductionHealth();