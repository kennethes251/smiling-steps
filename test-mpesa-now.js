/**
 * Quick M-Pesa Connection Test
 * Run: node test-mpesa-now.js
 */

require('dotenv').config();
const mpesaAPI = require('./server/config/mpesa');

async function testMpesaConnection() {
  console.log('\n🧪 Testing M-Pesa Connection...\n');
  console.log('='.repeat(60));
  
  console.log('\n📋 Your Configuration:');
  console.log(`Environment: ${process.env.MPESA_ENVIRONMENT}`);
  console.log(`Short Code: ${process.env.MPESA_BUSINESS_SHORT_CODE}`);
  console.log(`Consumer Key: ${process.env.MPESA_CONSUMER_KEY?.substring(0, 20)}...`);
  console.log(`Passkey: ${process.env.MPESA_PASSKEY?.substring(0, 20)}...`);
  
  console.log('\n🔐 Testing OAuth Token Generation...');
  
  try {
    const token = await mpesaAPI.getAccessToken();
    
    if (token) {
      console.log('✅ SUCCESS! M-Pesa API connection working!');
      console.log(`✅ Access Token received: ${token.substring(0, 30)}...`);
      console.log('\n' + '='.repeat(60));
      console.log('\n🎉 Your M-Pesa integration is ready!');
      console.log('\n📱 Next Steps:');
      console.log('   1. Set up ngrok for callback URL (see below)');
      console.log('   2. Try a test payment with sandbox number: 254708374149');
      console.log('   3. Integrate MpesaPayment component into your booking flow');
      console.log('\n🌐 Setting up ngrok:');
      console.log('   npm install -g ngrok');
      console.log('   ngrok http 5000');
      console.log('   Then update MPESA_CALLBACK_URL in .env with ngrok URL');
      console.log('\n' + '='.repeat(60));
    }
  } catch (error) {
    console.error('\n❌ Connection Failed!');
    console.error('Error:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Check your Consumer Key and Secret are correct');
    console.log('   2. Verify you copied them without extra spaces');
    console.log('   3. Make sure you\'re using sandbox credentials');
    console.log('   4. Try regenerating credentials in Daraja portal');
    console.log('\n📞 Need help? Contact: apisupport@safaricom.co.ke');
    console.log('='.repeat(60));
  }
}

// Run the test
testMpesaConnection();
