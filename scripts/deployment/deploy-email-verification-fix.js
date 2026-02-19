#!/usr/bin/env node

/**
 * Deploy Email Verification Fix
 * 
 * This script deploys the updated email verification system where:
 * - Admin users: No email verification required
 * - Psychologist users: Email verification required
 * - Client users: Email verification required
 */

const { execSync } = require('child_process');
const axios = require('axios');

const BASE_URL = 'https://smiling-steps.onrender.com';

async function deployChanges() {
  console.log('🚀 Deploying Email Verification Updates...\n');

  try {
    console.log('1. Committing changes to Git...');
    execSync('git add server/routes/users.js', { stdio: 'inherit' });
    execSync('git commit -m "Fix: Psychologists now require email verification\n\n- Both clients and psychologists require email verification\n- Only admin users bypass email verification\n- Updated registration and login logic"', { stdio: 'inherit' });
    
    console.log('✅ Changes committed to Git\n');

    console.log('2. Pushing to GitHub (triggers auto-deployment)...');
    execSync('git push origin main', { stdio: 'inherit' });
    
    console.log('✅ Changes pushed to GitHub\n');

    console.log('3. Waiting for deployment to complete...');
    console.log('   This may take 2-3 minutes...\n');
    
    // Wait for deployment
    await new Promise(resolve => setTimeout(resolve, 180000)); // 3 minutes

    console.log('4. Testing updated email verification system...\n');
    await testEmailVerificationRules();

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

async function testEmailVerificationRules() {
  console.log('🧪 Testing Email Verification Rules...\n');

  const tests = [
    {
      name: 'Admin Login (Should bypass email verification)',
      test: async () => {
        const response = await axios.post(`${BASE_URL}/api/users/login`, {
          email: 'admin@smilingsteps.com',
          password: 'admin123'
        });
        return { 
          success: response.data.success, 
          data: `Admin login: ${response.data.success ? 'SUCCESS' : 'FAILED'}` 
        };
      }
    },
    {
      name: 'Client Registration (Should require email verification)',
      test: async () => {
        const testEmail = `test-client-${Date.now()}@example.com`;
        const response = await axios.post(`${BASE_URL}/api/users/register`, {
          name: 'Test Client',
          email: testEmail,
          password: 'password123',
          role: 'client'
        });
        
        return { 
          success: response.data.success && response.data.requiresVerification === true,
          data: `Client requires verification: ${response.data.requiresVerification}, User verified: ${response.data.user?.isVerified}` 
        };
      }
    },
    {
      name: 'Psychologist Registration (Should require email verification)',
      test: async () => {
        const testEmail = `test-psych-${Date.now()}@example.com`;
        const response = await axios.post(`${BASE_URL}/api/users/register`, {
          name: 'Dr. Test Psychologist',
          email: testEmail,
          password: 'password123',
          role: 'psychologist',
          psychologistDetails: {
            specializations: ['Test Therapy'],
            experience: '5 years',
            education: 'PhD Psychology'
          }
        });
        
        return { 
          success: response.data.success && response.data.requiresVerification === true,
          data: `Psychologist requires verification: ${response.data.requiresVerification}, User verified: ${response.data.user?.isVerified}` 
        };
      }
    },
    {
      name: 'Unverified Client Login (Should be blocked)',
      test: async () => {
        const testEmail = `test-client-login-${Date.now()}@example.com`;
        
        // First register
        await axios.post(`${BASE_URL}/api/users/register`, {
          name: 'Test Client Login',
          email: testEmail,
          password: 'password123',
          role: 'client'
        });
        
        // Then try to login
        try {
          await axios.post(`${BASE_URL}/api/users/login`, {
            email: testEmail,
            password: 'password123'
          });
          return { success: false, data: 'Login should have been blocked but succeeded' };
        } catch (error) {
          if (error.response?.status === 400 && error.response?.data?.message === 'Email not verified') {
            return { success: true, data: 'Login correctly blocked for unverified client' };
          }
          return { success: false, data: `Unexpected error: ${error.response?.data?.message || error.message}` };
        }
      }
    }
  ];

  console.log('Running tests...\n');

  for (const test of tests) {
    try {
      console.log(`🧪 ${test.name}...`);
      const result = await test.test();
      
      if (result.success) {
        console.log(`   ✅ PASS - ${result.data}`);
      } else {
        console.log(`   ❌ FAIL - ${result.data}`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.response?.data?.message || error.message}`);
    }
    console.log('');
  }

  console.log('🎊 Email Verification Testing Complete!\n');
  
  console.log('📋 Updated Email Verification Rules:');
  console.log('✅ Admin users: No email verification required');
  console.log('✅ Psychologist users: Email verification required');
  console.log('✅ Client users: Email verification required');
  
  console.log('\n🎯 Ready for Production Testing:');
  console.log('1. Register as a psychologist with your real email');
  console.log('2. Check your email for verification link');
  console.log('3. Verify that you cannot login until email is verified');
  console.log('4. Click verification link and then login successfully');
}

if (require.main === module) {
  deployChanges().catch(console.error);
}