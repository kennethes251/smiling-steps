#!/usr/bin/env node

/**
 * Debug Local Server
 * 
 * Quick debug script to check what's working locally
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function debugServer() {
  console.log('🔍 Debugging Local Server...\n');

  const tests = [
    {
      name: 'Root endpoint',
      url: '/',
      method: 'GET'
    },
    {
      name: 'Health endpoint',
      url: '/health',
      method: 'GET'
    },
    {
      name: 'API root',
      url: '/api',
      method: 'GET'
    },
    {
      name: 'Users login endpoint',
      url: '/api/users/login',
      method: 'POST',
      data: { email: 'admin@smilingsteps.com', password: 'admin123' }
    },
    {
      name: 'Public psychologists',
      url: '/api/public/psychologists',
      method: 'GET'
    },
    {
      name: 'Test registration',
      url: '/api/users/register',
      method: 'POST',
      data: {
        name: 'Debug User',
        email: `debug-${Date.now()}@example.com`,
        password: 'password123',
        role: 'client'
      }
    }
  ];

  for (const test of tests) {
    try {
      console.log(`🧪 Testing ${test.name}...`);
      
      let response;
      if (test.method === 'POST') {
        response = await axios.post(`${BASE_URL}${test.url}`, test.data);
      } else {
        response = await axios.get(`${BASE_URL}${test.url}`);
      }
      
      console.log(`   ✅ SUCCESS - Status: ${response.status}`);
      if (test.name === 'Test registration') {
        console.log(`      Registration success: ${response.data.success}`);
        console.log(`      Requires verification: ${response.data.requiresVerification}`);
        console.log(`      User verified: ${response.data.user?.isVerified}`);
        console.log(`      User has isEmailVerified: ${response.data.user?.hasOwnProperty('isEmailVerified')}`);
      }
      if (test.name === 'Public psychologists') {
        console.log(`      Found ${response.data.data?.length || 0} psychologists`);
      }
    } catch (error) {
      console.log(`   ❌ FAILED - Status: ${error.response?.status || 'No response'}`);
      console.log(`      Error: ${error.response?.data?.message || error.message}`);
    }
    console.log('');
  }
}

if (require.main === module) {
  debugServer().catch(console.error);
}