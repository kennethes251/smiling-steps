const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testEmailVerificationFlow() {
  console.log('🧪 Testing Email Verification Flow\n');

  try {
    // Step 1: Register a new user
    console.log('1️⃣ Registering new user...');
    const testEmail = `test-${Date.now()}@example.com`;
    const registerResponse = await axios.post(`${API_BASE}/users/register`, {
      name: 'Test User',
      email: testEmail,
      password: 'password123',
      role: 'client',
      skipVerification: false
    });

    console.log('✅ Registration successful:', {
      success: registerResponse.data.success,
      message: registerResponse.data.message,
      requiresVerification: registerResponse.data.requiresVerification
    });

    if (!registerResponse.data.requiresVerification) {
      console.log('❌ Expected requiresVerification to be true');
      return;
    }

    // Step 2: Try to login without verification (should fail)
    console.log('\n2️⃣ Attempting login without verification...');
    try {
      await axios.post(`${API_BASE}/users/login`, {
        email: testEmail,
        password: 'password123'
      });
      console.log('❌ Login should have failed for unverified user');
    } catch (error) {
      if (error.response?.data?.requiresVerification) {
        console.log('✅ Login correctly rejected for unverified user');
      } else {
        console.log('❌ Unexpected login error:', error.response?.data?.message);
      }
    }

    // Step 3: Test resend verification email
    console.log('\n3️⃣ Testing resend verification email...');
    const resendResponse = await axios.post(`${API_BASE}/email-verification/resend`, {
      email: testEmail
    });

    console.log('✅ Resend verification:', {
      success: resendResponse.data.success,
      message: resendResponse.data.message
    });

    // Step 4: Test verification with invalid token
    console.log('\n4️⃣ Testing verification with invalid token...');
    try {
      await axios.post(`${API_BASE}/email-verification/verify`, {
        token: 'invalid-token'
      });
      console.log('❌ Verification should have failed with invalid token');
    } catch (error) {
      console.log('✅ Verification correctly failed with invalid token:', error.response?.data?.message);
    }

    console.log('\n🎉 Email verification flow test completed!');
    console.log(`\n📧 Check your email service logs for verification emails sent to ${testEmail}`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testEmailVerificationFlow();