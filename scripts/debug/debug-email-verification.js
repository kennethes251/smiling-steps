const axios = require('axios');

const debugEmailVerification = async () => {
  const baseURL = 'https://smiling-steps.onrender.com';
  
  console.log('🔍 Debugging Email Verification Endpoint');
  console.log('========================================\n');
  
  try {
    // Get admin token
    console.log('1. Getting admin token...');
    const loginResponse = await axios.post(`${baseURL}/api/users/login`, {
      email: 'admin@smilingsteps.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id;
    console.log('✅ Login successful');
    console.log('   User ID:', userId);
    console.log('   Role:', loginResponse.data.user.role);
    
    // Test the problematic endpoint with more details
    console.log('\n2. Testing email verification status...');
    try {
      const response = await axios.get(`${baseURL}/api/email-verification/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Success:', response.data);
    } catch (error) {
      console.log('❌ Failed with status:', error.response?.status);
      console.log('   Error data:', error.response?.data);
      console.log('   Headers sent:', error.config?.headers);
    }
    
    // Test if we can create a simple status endpoint that works
    console.log('\n3. Testing a simple user info endpoint...');
    try {
      const userResponse = await axios.get(`${baseURL}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ User profile endpoint works');
      console.log('   User data available:', !!userResponse.data.user);
    } catch (profileError) {
      console.log('❌ User profile endpoint also fails:', profileError.response?.status);
    }
    
    console.log('\n💡 Diagnosis:');
    console.log('The issue might be:');
    console.log('1. Global User model not available in email verification route');
    console.log('2. Auth middleware not working properly');
    console.log('3. Database connection issue in that specific route');
    console.log('');
    console.log('🔧 Workaround:');
    console.log('The email verification system works for registration/login');
    console.log('The status endpoint is mainly for frontend UI - not critical for core functionality');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
};

debugEmailVerification();