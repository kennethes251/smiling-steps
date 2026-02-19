/**
 * Test login for psychologists and clients after verification fix
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const testAccounts = [
  // Psychologists - try different passwords
  { email: 'sarah.johnson@smilingsteps.com', passwords: ['secure123', 'psych123', 'therapist123', 'psychologist123'] },
  { email: 'james.wilson@smilingsteps.com', passwords: ['secure123', 'psych123', 'therapist123', 'psychologist123'] },
  // Client
  { email: 'kennethes251@gmail.com', passwords: ['test123', 'password123', 'client123'] },
];

async function testLogin(email, password) {
  try {
    const res = await axios.post(`${API_URL}/users/login`, { email, password });
    return { success: true, data: res.data };
  } catch (error) {
    return { 
      success: false, 
      status: error.response?.status,
      message: error.response?.data?.message || error.message 
    };
  }
}

async function main() {
  console.log('🔐 Testing Login for Clients and Psychologists\n');
  console.log('═'.repeat(60));

  for (const account of testAccounts) {
    console.log(`\n📧 ${account.email}`);
    console.log('─'.repeat(50));
    
    let loginSuccess = false;
    
    for (const password of account.passwords) {
      const result = await testLogin(account.email, password);
      
      if (result.success) {
        console.log(`   ✅ SUCCESS with password: ${password}`);
        console.log(`      Role: ${result.data.user?.role}`);
        console.log(`      Token: ${result.data.token ? 'Yes' : 'No'}`);
        loginSuccess = true;
        break;
      } else {
        console.log(`   ❌ Failed with "${password}": ${result.message}`);
      }
    }
    
    if (!loginSuccess) {
      console.log(`   ⚠️ Could not login - password unknown or account issue`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n📝 Summary:');
  console.log('   - If login fails with "Email not verified", run: node fix-verification-direct.js');
  console.log('   - If login fails with "Invalid credentials", the password is wrong');
  console.log('   - If login fails with "Account not approved", psychologist needs admin approval');
}

main();
