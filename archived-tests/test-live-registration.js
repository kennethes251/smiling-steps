const axios = require('axios');

async function testLiveRegistration() {
  console.log('🧪 Testing Live Registration with Email Verification...\n');

  const baseURL = 'http://localhost:5000';
  const testEmail = 'kennethes251@gmail.com'; // Use your real email to test
  const testUser = {
    name: 'Test User',
    email: testEmail,
    password: 'TestPassword123!',
    role: 'client'
  };

  try {
    console.log('📝 Registering new user...');
    console.log('   Name:', testUser.name);
    console.log('   Email:', testUser.email);
    console.log('   Role:', testUser.role);
    console.log('');

    const response = await axios.post(`${baseURL}/api/auth/register`, testUser);
    
    console.log('✅ Registration Response:');
    console.log('   Success:', response.data.success);
    console.log('   Message:', response.data.message);
    console.log('   Requires Verification:', response.data.requiresVerification);
    console.log('');

    if (response.data.success) {
      console.log('🎉 Registration successful!');
      console.log('');
      console.log('📧 Next Steps:');
      console.log('1. Check your Gmail inbox (kennethes251@gmail.com)');
      console.log('2. Look for email from "Smiling Steps <hr@smilingsteps.com>"');
      console.log('3. Click the verification link in the email');
      console.log('4. Try logging in after verification');
      console.log('');
      console.log('🌐 Or visit: http://localhost:3000');
      console.log('   - Try to login with the test credentials');
      console.log('   - Should be redirected to email verification page');
    }

  } catch (error) {
    console.log('❌ Registration failed:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data.message || error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
    
    if (error.response?.data?.message?.includes('already exists')) {
      console.log('');
      console.log('ℹ️  User already exists. Try logging in instead:');
      console.log('   Email:', testEmail);
      console.log('   Password: TestPassword123!');
      console.log('   URL: http://localhost:3000');
    }
  }
}

testLiveRegistration().catch(console.error);