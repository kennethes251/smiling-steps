/**
 * M-Pesa Integration Test Script
 * 
 * This script tests the M-Pesa STK Push integration
 * Run with: node test-mpesa-integration.js
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

// Test credentials (you'll need to login first to get a token)
let authToken = '';

async function testMpesaIntegration() {
  console.log('🧪 Testing M-Pesa Integration\n');
  console.log('='.repeat(50));

  // Step 1: Test M-Pesa API Connection (Admin only)
  console.log('\n📡 Step 1: Testing M-Pesa API Connection...');
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/mpesa/test-connection`,
      {},
      {
        headers: { 'x-auth-token': authToken }
      }
    );
    console.log('✅ M-Pesa API Connection:', response.data);
  } catch (error) {
    console.error('❌ Connection Test Failed:', error.response?.data || error.message);
    console.log('\n⚠️  Make sure you:');
    console.log('   1. Have valid M-Pesa credentials in .env');
    console.log('   2. Are logged in as admin');
    console.log('   3. Server is running');
    return;
  }

  // Step 2: Initiate STK Push
  console.log('\n💳 Step 2: Initiating STK Push...');
  const testData = {
    sessionId: 'YOUR_SESSION_ID_HERE', // Replace with actual session ID
    phoneNumber: '254712345678' // Replace with test phone number
  };

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/mpesa/initiate`,
      testData,
      {
        headers: { 'x-auth-token': authToken }
      }
    );
    console.log('✅ STK Push Initiated:', response.data);
    console.log('\n📱 Check your phone for M-Pesa prompt!');
    
    const checkoutRequestID = response.data.checkoutRequestID;

    // Step 3: Poll for payment status
    console.log('\n⏳ Step 3: Checking payment status...');
    let attempts = 0;
    const maxAttempts = 20;

    const checkStatus = setInterval(async () => {
      attempts++;
      try {
        const statusResponse = await axios.get(
          `${API_BASE_URL}/api/mpesa/status/${testData.sessionId}`,
          {
            headers: { 'x-auth-token': authToken }
          }
        );

        console.log(`   Attempt ${attempts}: ${statusResponse.data.paymentStatus}`);

        if (statusResponse.data.paymentStatus === 'Paid') {
          console.log('\n✅ Payment Successful!');
          console.log('   Transaction ID:', statusResponse.data.mpesaTransactionID);
          clearInterval(checkStatus);
        } else if (statusResponse.data.paymentStatus === 'Failed') {
          console.log('\n❌ Payment Failed');
          console.log('   Reason:', statusResponse.data.mpesaResultDesc);
          clearInterval(checkStatus);
        } else if (attempts >= maxAttempts) {
          console.log('\n⏱️  Timeout: Payment status still pending');
          clearInterval(checkStatus);
        }
      } catch (error) {
        console.error('   Status check error:', error.message);
      }
    }, 3000);

  } catch (error) {
    console.error('❌ STK Push Failed:', error.response?.data || error.message);
  }
}

// Instructions
console.log('\n📋 M-Pesa Integration Test Instructions:');
console.log('='.repeat(50));
console.log('\n1. Make sure your server is running (npm start)');
console.log('2. Login to get an auth token');
console.log('3. Update authToken variable in this script');
console.log('4. Update sessionId with a valid approved session');
console.log('5. Update phoneNumber with your test number');
console.log('6. Run: node test-mpesa-integration.js');
console.log('\n⚠️  For Sandbox Testing:');
console.log('   - Use Safaricom test credentials from Daraja portal');
console.log('   - Test phone: 254708374149 (Sandbox test number)');
console.log('   - No real money will be charged in sandbox mode');
console.log('\n='.repeat(50));

// Uncomment to run the test
// testMpesaIntegration();

console.log('\n💡 Tip: Uncomment the last line to run the test');
