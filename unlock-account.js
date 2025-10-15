const axios = require('axios');

const API_URL = 'https://smiling-steps.onrender.com';

// This requires direct database access or an admin endpoint
// For now, let's create a simple admin endpoint to unlock accounts

async function unlockAccount(email) {
  console.log(`🔓 Attempting to unlock account: ${email}\n`);
  
  // First, login as admin
  const adminEmail = 'smilingsteps@gmail.com';
  const adminPassword = 'admin123'; // Update with actual admin password
  
  try {
    console.log('1️⃣  Logging in as admin...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });
    
    const token = loginRes.data.token;
    console.log('✅ Admin login successful\n');
    
    // Note: We need to create an admin endpoint to unlock accounts
    // For now, this is a placeholder
    console.log('⚠️  Admin unlock endpoint not yet implemented');
    console.log('💡 The account will auto-unlock in 15 minutes');
    console.log('💡 Or wait for backend deployment to complete (~3-5 minutes)');
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'nancy@gmail.com';
unlockAccount(email);
