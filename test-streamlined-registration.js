const axios = require('axios');

// Test streamlined registration endpoint
async function testStreamlinedRegistration() {
  try {
    console.log('🧪 Testing streamlined registration...');
    
    const testUser = {
      name: 'Test User Streamlined',
      email: `test.streamlined.${Date.now()}@example.com`,
      password: 'password123',
      role: 'client',
      skipVerification: true
    };
    
    console.log('📝 Sending registration request:', {
      name: testUser.name,
      email: testUser.email,
      role: testUser.role,
      skipVerification: testUser.skipVerification
    });
    
    const response = await axios.post(
      'https://smiling-steps.onrender.com/api/users/register',
      testUser,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Registration successful!');
    console.log('📊 Response:', {
      success: response.data.success,
      message: response.data.message,
      requiresVerification: response.data.requiresVerification,
      hasToken: !!response.data.token,
      user: {
        id: response.data.user?.id,
        name: response.data.user?.name,
        email: response.data.user?.email,
        role: response.data.user?.role,
        isVerified: response.data.user?.isVerified
      }
    });
    
    // Test login with the same user
    if (response.data.token) {
      console.log('\n🔐 Testing login with streamlined user...');
      
      const loginResponse = await axios.post(
        'https://smiling-steps.onrender.com/api/users/login',
        {
          email: testUser.email,
          password: testUser.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Login successful!');
      console.log('📊 Login Response:', {
        success: loginResponse.data.success,
        hasToken: !!loginResponse.data.token,
        user: {
          id: loginResponse.data.user?.id,
          name: loginResponse.data.user?.name,
          email: loginResponse.data.user?.email,
          role: loginResponse.data.user?.role
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message,
      errors: error.response?.data?.errors,
      url: error.config?.url,
      data: error.config?.data
    });
  }
}

// Run the test
testStreamlinedRegistration();