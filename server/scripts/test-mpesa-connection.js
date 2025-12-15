/**
 * M-Pesa Connection Test Script
 * 
 * This script tests the connection to M-Pesa Daraja API by:
 * 1. Validating credentials are configured
 * 2. Attempting to get an OAuth access token
 * 3. Verifying API connectivity
 * 
 * Usage: node server/scripts/test-mpesa-connection.js
 */

const path = require('path');
const fs = require('fs');

// Determine the correct .env path based on execution context
let envPath;
if (fs.existsSync(path.join(__dirname, '../.env'))) {
  // Running from server directory: node scripts/test-mpesa-connection.js
  envPath = path.join(__dirname, '../.env');
} else if (fs.existsSync(path.join(__dirname, '../../server/.env'))) {
  // Running from root directory: node server/scripts/test-mpesa-connection.js
  envPath = path.join(__dirname, '../../server/.env');
} else {
  console.error('❌ Could not find .env file. Please ensure server/.env exists.');
  process.exit(1);
}

require('dotenv').config({ path: envPath });
const axios = require('axios');

// M-Pesa API endpoints
const SANDBOX_BASE_URL = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE_URL = 'https://api.safaricom.co.ke';

/**
 * Get M-Pesa OAuth access token
 */
async function getAccessToken() {
  const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
  const baseUrl = environment === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
  const url = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
  
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  
  if (!consumerKey || !consumerSecret) {
    throw new Error('M-Pesa Consumer Key and Secret are required');
  }
  
  // Create Basic Auth token
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  
  try {
    console.log(`🔐 Requesting OAuth token from ${environment} environment...`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('No response from M-Pesa API. Check your internet connection.');
    } else {
      throw new Error(`Request Error: ${error.message}`);
    }
  }
}

/**
 * Test M-Pesa API connection
 */
async function testConnection() {
  console.log('🚀 M-Pesa Daraja API Connection Test\n');
  console.log('═'.repeat(60));
  
  // Step 1: Validate environment variables
  console.log('\n📋 Step 1: Validating Configuration...\n');
  
  const requiredVars = [
    'MPESA_ENVIRONMENT',
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_BUSINESS_SHORT_CODE',
    'MPESA_PASSKEY',
    'MPESA_CALLBACK_URL'
  ];
  
  let configValid = true;
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.includes('your-') || value.includes('YOUR_')) {
      console.log(`❌ ${varName}: Not configured`);
      configValid = false;
    } else {
      // Mask sensitive values
      const displayValue = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_PASSKEY'].includes(varName)
        ? `${value.substring(0, 8)}...`
        : value;
      console.log(`✅ ${varName}: ${displayValue}`);
    }
  });
  
  if (!configValid) {
    console.log('\n❌ Configuration validation failed!');
    console.log('Please run: node server/scripts/validate-mpesa-credentials.js');
    process.exit(1);
  }
  
  // Step 2: Test OAuth token generation
  console.log('\n📋 Step 2: Testing OAuth Token Generation...\n');
  
  try {
    const tokenData = await getAccessToken();
    
    if (tokenData.access_token) {
      console.log('✅ OAuth token generated successfully!');
      console.log(`   Token: ${tokenData.access_token.substring(0, 20)}...`);
      console.log(`   Expires in: ${tokenData.expires_in} seconds`);
    } else {
      console.log('❌ Failed to generate OAuth token');
      console.log('   Response:', JSON.stringify(tokenData, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ OAuth token generation failed!');
    console.log(`   Error: ${error.message}`);
    console.log('\n💡 Common issues:');
    console.log('   - Invalid Consumer Key or Secret');
    console.log('   - Network connectivity issues');
    console.log('   - Incorrect environment setting');
    process.exit(1);
  }
  
  // Step 3: Verify configuration
  console.log('\n📋 Step 3: Verifying Configuration...\n');
  
  const environment = process.env.MPESA_ENVIRONMENT;
  const shortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  
  console.log(`✅ Environment: ${environment}`);
  console.log(`✅ Business Short Code: ${shortCode}`);
  console.log(`✅ Callback URL: ${callbackUrl}`);
  
  // Warnings for common issues
  console.log('\n⚠️  Important Notes:\n');
  
  if (environment === 'sandbox') {
    console.log('📍 You are using SANDBOX mode');
    console.log('   - Use test phone numbers for testing');
    console.log('   - Test number: 254708374149');
    console.log('   - Test PIN: Any 4-digit number');
  } else {
    console.log('📍 You are using PRODUCTION mode');
    console.log('   - Real money will be transacted');
    console.log('   - Ensure you have Go Live approval');
    console.log('   - Use actual customer phone numbers');
  }
  
  if (callbackUrl.includes('localhost') || callbackUrl.includes('127.0.0.1')) {
    console.log('\n⚠️  Callback URL is localhost');
    console.log('   - M-Pesa cannot reach localhost directly');
    console.log('   - Use ngrok or similar tool for testing');
    console.log('   - Example: ngrok http 5000');
  }
  
  if (!callbackUrl.startsWith('https://') && environment === 'production') {
    console.log('\n⚠️  Callback URL is not HTTPS');
    console.log('   - Production requires HTTPS');
    console.log('   - Obtain SSL certificate for your domain');
  }
  
  // Success summary
  console.log('\n═'.repeat(60));
  console.log('✅ M-Pesa API Connection Test PASSED!');
  console.log('\n🎉 Your M-Pesa integration is ready for development!');
  console.log('\n📚 Next Steps:');
  console.log('   1. Implement payment routes (Task 2)');
  console.log('   2. Test STK Push functionality');
  console.log('   3. Implement callback handling');
  console.log('   4. Test end-to-end payment flow');
  console.log('═'.repeat(60));
}

// Run the test
testConnection().catch(error => {
  console.error('\n💥 Unexpected error:', error.message);
  process.exit(1);
});
