/**
 * Test login for kennethes251@gmail.com with actual password
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function main() {
  console.log('🔐 Testing login for kennethes251@gmail.com\n');

  try {
    const res = await axios.post(`${API_URL}/users/login`, {
      email: 'kennethes251@gmail.com',
      password: '33285322'
    });

    console.log('✅ LOGIN SUCCESSFUL!');
    console.log('   User:', res.data.user?.name || res.data.user?.email);
    console.log('   Role:', res.data.user?.role);
    console.log('   Token:', res.data.token ? 'Yes' : 'No');
    
  } catch (error) {
    console.log('❌ LOGIN FAILED');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.message || error.message);
    
    if (error.response?.data?.message === 'Email not verified') {
      console.log('\n⚠️ User needs email verification fix');
      console.log('   Run: node fix-verification-direct.js');
    } else if (error.response?.data?.message?.includes('Authentication failed') || 
               error.response?.data?.message?.includes('Invalid credentials')) {
      console.log('\n⚠️ Password mismatch - the stored hash doesn\'t match');
      console.log('   This could mean the password was hashed differently or changed');
    }
  }
}

main();
