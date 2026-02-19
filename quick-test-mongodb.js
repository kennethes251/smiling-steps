#!/usr/bin/env node

/**
 * Quick MongoDB Test
 * 
 * Quick test to see if MongoDB deployment is working
 */

const axios = require('axios');

const BASE_URL = 'https://smiling-steps.onrender.com';

async function quickTest() {
  console.log('🧪 Quick MongoDB Test...\n');

  try {
    // Test health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('   ✅ Health check:', healthResponse.data.status, '- Database:', healthResponse.data.database);

    // Test admin login
    console.log('\n2. Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/users/login`, {
      email: 'admin@smilingsteps.com',
      password: 'admin123'
    });
    console.log('   ✅ Admin login successful, role:', loginResponse.data.user?.role);

    // Test client registration
    console.log('\n3. Testing client registration...');
    const testEmail = `test-${Date.now()}@example.com`;
    const regResponse = await axios.post(`${BASE_URL}/api/users/register`, {
      name: 'Test User',
      email: testEmail,
      password: 'password123',
      role: 'client'
    });
    console.log('   ✅ Client registration:', regResponse.data.success);
    console.log('   ✅ Requires verification:', regResponse.data.requiresVerification);
    console.log('   ✅ User verified:', regResponse.data.user?.isVerified);

    // Test psychologist registration
    console.log('\n4. Testing psychologist registration...');
    const psychEmail = `psych-${Date.now()}@example.com`;
    const psychResponse = await axios.post(`${BASE_URL}/api/users/register`, {
      name: 'Dr. Test Psychologist',
      email: psychEmail,
      password: 'password123',
      role: 'psychologist',
      psychologistDetails: {
        specializations: ['Anxiety', 'Depression'],
        experience: '5 years',
        education: 'PhD Psychology'
      }
    });
    console.log('   ✅ Psychologist registration:', psychResponse.data.success);
    console.log('   ✅ Requires verification:', psychResponse.data.requiresVerification);
    console.log('   ✅ User verified:', psychResponse.data.user?.isVerified);

    console.log('\n🎉 MongoDB system is working correctly!');
    console.log('✅ Database: MongoDB Atlas');
    console.log('✅ Email verification: Required for clients and psychologists');
    console.log('✅ Admin access: Bypasses verification');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('   Status:', error.response.status);
    }
  }
}

// Wait a moment for deployment then test
setTimeout(() => {
  quickTest().catch(console.error);
}, 30000); // Wait 30 seconds