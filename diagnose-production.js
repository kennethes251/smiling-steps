const axios = require('axios');

const diagnoseProduction = async () => {
  const baseURL = 'https://smiling-steps.onrender.com';
  
  console.log('🔍 Detailed Production Diagnosis');
  console.log('=================================\n');
  
  try {
    // 1. Check main API and database type
    console.log('1. 🌐 Checking API and database type...');
    const healthResponse = await axios.get(`${baseURL}/`);
    console.log('✅ API Response:', healthResponse.data);
    console.log('   Database:', healthResponse.data.database || 'Not specified');
    console.log('   Version:', healthResponse.data.version || 'Not specified');
    
    // 2. Check psychologists endpoint
    console.log('\n2. 👨‍⚕️ Checking psychologists endpoint...');
    const psychResponse = await axios.get(`${baseURL}/api/public/psychologists`);
    console.log('✅ Psychologists found:', psychResponse.data.length);
    if (psychResponse.data.length > 0) {
      console.log('   First psychologist:', psychResponse.data[0].name);
    }
    
    // 3. Test login with detailed error
    console.log('\n3. 🔑 Testing admin login...');
    try {
      const loginResponse = await axios.post(`${baseURL}/api/users/login`, {
        email: 'admin@smilingsteps.com',
        password: 'admin123'
      });
      console.log('✅ Login successful!');
      console.log('   Token received:', !!loginResponse.data.token);
      console.log('   User:', loginResponse.data.user);
    } catch (loginError) {
      console.log('❌ Login failed');
      console.log('   Status:', loginError.response?.status);
      console.log('   Error:', loginError.response?.data);
    }
    
    // 4. Try to register a test user
    console.log('\n4. 📝 Testing registration endpoint...');
    try {
      const testEmail = `test${Date.now()}@test.com`;
      const regResponse = await axios.post(`${baseURL}/api/users/register`, {
        name: 'Test User',
        email: testEmail,
        password: 'test123',
        role: 'client',
        skipVerification: true
      });
      console.log('✅ Registration successful');
      console.log('   User created:', regResponse.data.user?.email);
      console.log('   Token received:', !!regResponse.data.token);
    } catch (regError) {
      console.log('❌ Registration failed');
      console.log('   Status:', regError.response?.status);
      console.log('   Error:', regError.response?.data);
    }
    
    console.log('\n📊 Diagnosis Summary');
    console.log('====================');
    console.log('The psychologists endpoint is working, which means:');
    console.log('- ✅ Server is running');
    console.log('- ✅ Database connection is working');
    console.log('- ✅ Routes are loading');
    console.log('');
    console.log('If login is failing, it could be:');
    console.log('- ⚠️ Password hashing mismatch');
    console.log('- ⚠️ User not found in database');
    console.log('- ⚠️ Database not synced yet');
    console.log('');
    console.log('💡 Recommendation: Wait 5 more minutes for full deployment');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
};

diagnoseProduction();