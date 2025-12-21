#!/usr/bin/env node

/**
 * Test Psychologist Email Verification
 * 
 * This script tests that psychologists now require email verification
 */

const axios = require('axios');

const BASE_URL = 'https://smiling-steps.onrender.com';

async function testPsychologistVerification() {
  console.log('🧪 Testing Psychologist Email Verification Requirement\n');

  try {
    // Test 1: Register a psychologist
    const testEmail = `test-psych-${Date.now()}@example.com`;
    
    console.log('1. Registering psychologist...');
    const regResponse = await axios.post(`${BASE_URL}/api/users/register`, {
      name: 'Dr. Test Psychologist',
      email: testEmail,
      password: 'password123',
      role: 'psychologist',
      psychologistDetails: {
        specializations: ['Anxiety', 'Depression'],
        experience: '5 years',
        education: 'PhD in Psychology'
      }
    });

    console.log('✅ Registration response:');
    console.log('   Success:', regResponse.data.success);
    console.log('   Message:', regResponse.data.message);
    console.log('   Requires verification:', regResponse.data.requiresVerification);
    console.log('   User verified:', regResponse.data.user?.isVerified);

    if (regResponse.data.requiresVerification === true && regResponse.data.user?.isVerified === false) {
      console.log('✅ CORRECT: Psychologist requires email verification');
    } else {
      console.log('❌ INCORRECT: Psychologist should require email verification');
    }

    // Test 2: Try to login with unverified psychologist account
    console.log('\n2. Testing login with unverified psychologist account...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/users/login`, {
        email: testEmail,
        password: 'password123'
      });
      
      console.log('❌ INCORRECT: Login should have been blocked but succeeded');
      console.log('   Response:', loginResponse.data);
    } catch (loginError) {
      if (loginError.response && loginError.response.status === 400) {
        const errorData = loginError.response.data;
        if (errorData.message === 'Email not verified') {
          console.log('✅ CORRECT: Login blocked for unverified psychologist');
          console.log('   Message:', errorData.message);
        } else {
          console.log('❌ UNEXPECTED: Different error than expected');
          console.log('   Message:', errorData.message);
        }
      } else {
        console.log('❌ UNEXPECTED: Unexpected error type');
        console.log('   Error:', loginError.response?.data || loginError.message);
      }
    }

    // Test 3: Verify admin still bypasses verification
    console.log('\n3. Testing admin login (should bypass verification)...');
    try {
      const adminResponse = await axios.post(`${BASE_URL}/api/users/login`, {
        email: 'admin@smilingsteps.com',
        password: 'admin123'
      });
      
      if (adminResponse.data.success) {
        console.log('✅ CORRECT: Admin login bypasses email verification');
        console.log('   Admin role:', adminResponse.data.user?.role);
      } else {
        console.log('❌ INCORRECT: Admin login failed');
      }
    } catch (adminError) {
      console.log('❌ UNEXPECTED: Admin login error');
      console.log('   Error:', adminError.response?.data || adminError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎊 Psychologist Verification Test Complete!');
  console.log('\n📋 Expected Behavior:');
  console.log('✅ Psychologists require email verification');
  console.log('✅ Psychologists cannot login until verified');
  console.log('✅ Admin users bypass email verification');
  console.log('✅ Client users require email verification');
}

if (require.main === module) {
  // Wait a moment for deployment to complete
  console.log('⏳ Waiting for deployment to complete...\n');
  setTimeout(() => {
    testPsychologistVerification().catch(console.error);
  }, 30000); // Wait 30 seconds
}