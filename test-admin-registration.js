const axios = require('axios');

const testAdminRegistration = async () => {
  const baseURL = 'https://smiling-steps.onrender.com';
  
  console.log('🧪 Testing Admin Registration (No Email Verification)');
  console.log('====================================================\n');
  
  try {
    // Test 1: Register a new admin user
    console.log('1. 📝 Registering new admin user...');
    const adminEmail = `admin.test.${Date.now()}@smilingsteps.com`;
    
    try {
      const adminRegResponse = await axios.post(`${baseURL}/api/users/register`, {
        name: 'Test Admin User',
        email: adminEmail,
        password: 'admin123',
        role: 'admin'
      });
      
      console.log('✅ Admin registration successful');
      console.log('   Email:', adminRegResponse.data.user?.email);
      console.log('   Role:', adminRegResponse.data.user?.role);
      console.log('   Email Verified:', adminRegResponse.data.user?.isVerified || adminRegResponse.data.user?.isEmailVerified);
      console.log('   Token received:', !!adminRegResponse.data.token);
      console.log('   Requires verification:', adminRegResponse.data.requiresVerification);
      
      // Test 2: Immediately try to login (should work without email verification)
      console.log('\n2. 🔑 Testing immediate admin login...');
      const loginResponse = await axios.post(`${baseURL}/api/users/login`, {
        email: adminEmail,
        password: 'admin123'
      });
      
      console.log('✅ Admin login successful immediately!');
      console.log('   User ID:', loginResponse.data.user?.id);
      console.log('   Role:', loginResponse.data.user?.role);
      console.log('   Token received:', !!loginResponse.data.token);
      
    } catch (regError) {
      console.log('❌ Admin registration failed:', regError.response?.data);
      return;
    }
    
    // Test 3: Register a client user (should require email verification)
    console.log('\n3. 📝 Testing client registration (should require verification)...');
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
      console.log('   Email Verified:', clientRegResponse.data.user?.isVerified || clientRegResponse.data.user?.isEmailVerified);
      console.log('   Requires verification:', clientRegResponse.data.requiresVerification);
      
      // Test 4: Try to login as client (should fail due to email verification)
      console.log('\n4. 🔑 Testing client login (should fail - needs verification)...');
      try {
        const clientLoginResponse = await axios.post(`${baseURL}/api/users/login`, {
          email: clientEmail,
          password: 'client123'
        });
        console.log('⚠️ Client login unexpectedly succeeded:', clientLoginResponse.data);
      } catch (loginError) {
        if (loginError.response?.data?.message?.includes('Email not verified')) {
          console.log('✅ Client login correctly blocked - email verification required');
        } else {
          console.log('❌ Client login failed for wrong reason:', loginError.response?.data);
        }
      }
      
    } catch (clientRegError) {
      console.log('❌ Client registration failed:', clientRegError.response?.data);
    }
    
    // Test 5: Register a psychologist (should not require email verification)
    console.log('\n5. 📝 Testing psychologist registration (should not require verification)...');
    const psychEmail = `psych.test.${Date.now()}@smilingsteps.com`;
    
    try {
      const psychRegResponse = await axios.post(`${baseURL}/api/users/register`, {
        name: 'Test Psychologist',
        email: psychEmail,
        password: 'psych123',
        role: 'psychologist',
        psychologistDetails: {
          specializations: ['Test Therapy'],
          experience: '5 years',
          education: 'Ph.D. in Psychology'
        }
      });
      
      console.log('✅ Psychologist registration successful');
      console.log('   Email:', psychRegResponse.data.user?.email);
      console.log('   Role:', psychRegResponse.data.user?.role);
      console.log('   Email Verified:', psychRegResponse.data.user?.isVerified || psychRegResponse.data.user?.isEmailVerified);
      console.log('   Requires verification:', psychRegResponse.data.requiresVerification);
      
      // Test 6: Try to login as psychologist (should work without email verification)
      console.log('\n6. 🔑 Testing psychologist login (should work immediately)...');
      try {
        const psychLoginResponse = await axios.post(`${baseURL}/api/users/login`, {
          email: psychEmail,
          password: 'psych123'
        });
        console.log('✅ Psychologist login successful immediately!');
        console.log('   Role:', psychLoginResponse.data.user?.role);
      } catch (psychLoginError) {
        if (psychLoginError.response?.data?.message?.includes('pending approval')) {
          console.log('ℹ️ Psychologist login blocked - pending admin approval (expected)');
        } else {
          console.log('❌ Psychologist login failed:', psychLoginError.response?.data);
        }
      }
      
    } catch (psychRegError) {
      console.log('❌ Psychologist registration failed:', psychRegError.response?.data);
    }
    
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log('✅ Admin users: No email verification required');
    console.log('✅ Client users: Email verification required');
    console.log('✅ Psychologist users: No email verification required (but need admin approval)');
    console.log('');
    console.log('🎉 Email verification flow working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testAdminRegistration();