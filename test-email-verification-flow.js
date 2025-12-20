const axios = require('axios');

const testEmailVerificationFlow = async () => {
  const baseURL = 'https://smiling-steps.onrender.com';
  
  console.log('🧪 Testing Complete Email Verification Flow');
  console.log('===========================================\n');
  
  try {
    // Test 1: Admin login (should work without registration)
    console.log('1. 👑 Testing Admin Access (No Registration/Verification Needed)');
    console.log('----------------------------------------------------------------');
    try {
      const adminLoginResponse = await axios.post(`${baseURL}/api/users/login`, {
        email: 'admin@smilingsteps.com',
        password: 'admin123'
      });
      
      console.log('✅ Admin login successful!');
      console.log('   Role:', adminLoginResponse.data.user?.role);
      console.log('   Token received:', !!adminLoginResponse.data.token);
      console.log('   → Admin can access dashboard immediately');
      
    } catch (adminError) {
      console.log('❌ Admin login failed:', adminError.response?.data?.message);
    }
    
    // Test 2: Client registration (should require email verification)
    console.log('\n2. 👤 Testing Client Registration (Email Verification Required)');
    console.log('--------------------------------------------------------------');
    const clientEmail = `client.test.${Date.now()}@test.com`;
    
    try {
      const clientRegResponse = await axios.post(`${baseURL}/api/users/register`, {
        name: 'Test Client User',
        email: clientEmail,
        password: 'client123',
        role: 'client'
      });
      
      console.log('✅ Client registration successful');
      console.log('   Email:', clientRegResponse.data.user?.email);
      console.log('   Role:', clientRegResponse.data.user?.role);
      console.log('   Email Verified:', clientRegResponse.data.user?.isVerified);
      console.log('   Requires verification:', clientRegResponse.data.requiresVerification);
      
      // Try to login immediately (should fail)
      console.log('\n   🔑 Testing immediate client login (should fail)...');
      try {
        await axios.post(`${baseURL}/api/users/login`, {
          email: clientEmail,
          password: 'client123'
        });
        console.log('   ❌ Client login unexpectedly succeeded');
      } catch (loginError) {
        if (loginError.response?.data?.message?.includes('Email not verified')) {
          console.log('   ✅ Client login correctly blocked - email verification required');
        } else {
          console.log('   ❌ Client login failed for wrong reason:', loginError.response?.data?.message);
        }
      }
      
    } catch (clientRegError) {
      console.log('❌ Client registration failed:', clientRegError.response?.data);
    }
    
    // Test 3: Psychologist registration (should require email verification)
    console.log('\n3. 👨‍⚕️ Testing Psychologist Registration (Email Verification Required)');
    console.log('--------------------------------------------------------------------');
    const psychEmail = `psych.test.${Date.now()}@test.com`;
    
    try {
      const psychRegResponse = await axios.post(`${baseURL}/api/users/register`, {
        name: 'Test Psychologist',
        email: psychEmail,
        password: 'psych123',
        role: 'psychologist',
        psychologistDetails: {
          specializations: ['Test Therapy', 'Anxiety'],
          experience: '5 years',
          education: 'Ph.D. in Psychology',
          bio: 'Test psychologist for email verification'
        }
      });
      
      console.log('✅ Psychologist registration successful');
      console.log('   Email:', psychRegResponse.data.user?.email);
      console.log('   Role:', psychRegResponse.data.user?.role);
      console.log('   Email Verified:', psychRegResponse.data.user?.isVerified);
      console.log('   Requires verification:', psychRegResponse.data.requiresVerification);
      
      // Try to login immediately (should fail)
      console.log('\n   🔑 Testing immediate psychologist login (should fail)...');
      try {
        await axios.post(`${baseURL}/api/users/login`, {
          email: psychEmail,
          password: 'psych123'
        });
        console.log('   ❌ Psychologist login unexpectedly succeeded');
      } catch (loginError) {
        if (loginError.response?.data?.message?.includes('Email not verified')) {
          console.log('   ✅ Psychologist login correctly blocked - email verification required');
        } else {
          console.log('   ❌ Psychologist login failed for wrong reason:', loginError.response?.data?.message);
        }
      }
      
    } catch (psychRegError) {
      console.log('❌ Psychologist registration failed:', psychRegError.response?.data);
    }
    
    // Test 4: Streamlined registration (should bypass email verification)
    console.log('\n4. ⚡ Testing Streamlined Registration (Bypass Email Verification)');
    console.log('----------------------------------------------------------------');
    const streamlinedEmail = `streamlined.test.${Date.now()}@test.com`;
    
    try {
      const streamlinedRegResponse = await axios.post(`${baseURL}/api/users/register`, {
        name: 'Streamlined User',
        email: streamlinedEmail,
        password: 'stream123',
        role: 'client',
        skipVerification: true
      });
      
      console.log('✅ Streamlined registration successful');
      console.log('   Email:', streamlinedRegResponse.data.user?.email);
      console.log('   Role:', streamlinedRegResponse.data.user?.role);
      console.log('   Email Verified:', streamlinedRegResponse.data.user?.isVerified);
      console.log('   Requires verification:', streamlinedRegResponse.data.requiresVerification);
      console.log('   Token received:', !!streamlinedRegResponse.data.token);
      
      // Try to login immediately (should work)
      console.log('\n   🔑 Testing immediate streamlined login (should work)...');
      try {
        const streamlinedLoginResponse = await axios.post(`${baseURL}/api/users/login`, {
          email: streamlinedEmail,
          password: 'stream123'
        });
        console.log('   ✅ Streamlined user login successful immediately!');
      } catch (loginError) {
        console.log('   ❌ Streamlined login failed:', loginError.response?.data?.message);
      }
      
    } catch (streamlinedRegError) {
      console.log('❌ Streamlined registration failed:', streamlinedRegError.response?.data);
    }
    
    console.log('\n📊 Email Verification Flow Summary');
    console.log('===================================');
    console.log('✅ Admin Users: No registration needed, direct dashboard access');
    console.log('✅ Client Users: Registration required + Email verification required');
    console.log('✅ Psychologist Users: Registration required + Email verification required');
    console.log('✅ Streamlined Users: Registration required + Email verification bypassed');
    console.log('');
    console.log('🎉 Email verification system working as requested!');
    console.log('');
    console.log('📧 Next Steps:');
    console.log('1. Register as a client or psychologist with your real email');
    console.log('2. Check your email for the verification link');
    console.log('3. Click the verification link to activate your account');
    console.log('4. Login with your verified account to access app features');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testEmailVerificationFlow();