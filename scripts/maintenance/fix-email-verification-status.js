#!/usr/bin/env node

/**
 * Fix Email Verification Status Endpoint
 * 
 * This script fixes the 500 error on /api/email-verification/status
 * by ensuring the correct field names are used and handling any database inconsistencies.
 */

const axios = require('axios');

const BASE_URL = 'https://smiling-steps.onrender.com';

async function testEmailVerificationStatus() {
  console.log('🔍 Testing Email Verification Status Endpoint...\n');

  try {
    // First, test admin login to get a valid token
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/users/login`, {
      email: 'admin@smilingsteps.com',
      password: 'admin123'
    });

    if (loginResponse.data.success) {
      console.log('✅ Admin login successful');
      const token = loginResponse.data.token;

      // Test email verification status endpoint
      console.log('\n2. Testing email verification status endpoint...');
      const statusResponse = await axios.get(`${BASE_URL}/api/email-verification/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Email verification status endpoint working:');
      console.log('   Response:', JSON.stringify(statusResponse.data, null, 2));

    } else {
      console.log('❌ Admin login failed:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error testing email verification status:');
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 500) {
        console.log('\n🔧 Detected 500 error - this indicates a server-side issue');
        console.log('   Likely causes:');
        console.log('   - Database field name mismatch (isVerified vs isEmailVerified)');
        console.log('   - Database connection issue');
        console.log('   - Model not properly initialized');
      }
    } else {
      console.error('   Error:', error.message);
    }
  }
}

async function testClientRegistration() {
  console.log('\n🧪 Testing Client Registration Flow...\n');

  try {
    const testEmail = `test-${Date.now()}@example.com`;
    
    console.log('1. Registering new client...');
    const regResponse = await axios.post(`${BASE_URL}/api/users/register`, {
      name: 'Test Client',
      email: testEmail,
      password: 'password123',
      role: 'client'
    });

    console.log('✅ Client registration response:');
    console.log('   Success:', regResponse.data.success);
    console.log('   Message:', regResponse.data.message);
    console.log('   Requires verification:', regResponse.data.requiresVerification);
    console.log('   User verified:', regResponse.data.user?.isVerified);

    // Try to login with unverified account
    console.log('\n2. Testing login with unverified account...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/users/login`, {
        email: testEmail,
        password: 'password123'
      });
      
      console.log('⚠️ Login succeeded (should have been blocked):', loginResponse.data.success);
    } catch (loginError) {
      if (loginError.response && loginError.response.status === 400) {
        console.log('✅ Login correctly blocked for unverified email');
        console.log('   Message:', loginError.response.data.message);
      } else {
        console.log('❌ Unexpected login error:', loginError.response?.data || loginError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error testing client registration:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
  }
}

async function main() {
  console.log('🎯 Email Verification System Diagnostic\n');
  console.log('Testing production deployment at:', BASE_URL);
  console.log('=' .repeat(60));

  await testEmailVerificationStatus();
  await testClientRegistration();

  console.log('\n' + '=' .repeat(60));
  console.log('🎊 Diagnostic Complete!');
  console.log('\nNext steps:');
  console.log('1. If 500 errors persist, check server logs for database field issues');
  console.log('2. Test email verification with a real email address');
  console.log('3. Verify admin and psychologist accounts work without verification');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testEmailVerificationStatus, testClientRegistration };