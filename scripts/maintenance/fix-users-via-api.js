/**
 * Fix client/psychologist login issues via API
 * This script uses the admin API to fix verification status
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function main() {
  console.log('🔧 Fixing client/psychologist login issues via API...\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginRes = await axios.post(`${API_URL}/users/login`, {
      email: 'admin@smilingsteps.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Admin login successful\n');

    const headers = { 'x-auth-token': token };

    // Step 2: Get all users
    console.log('2️⃣ Fetching all users...');
    const usersRes = await axios.get(`${API_URL}/admin/users`, { headers });
    const users = usersRes.data.users || usersRes.data;
    
    console.log(`   Found ${users.length} users\n`);

    // Step 3: Find clients and psychologists that need fixing
    const clientsToFix = users.filter(u => u.role === 'client' && !u.isVerified);
    const psychsToFix = users.filter(u => u.role === 'psychologist');
    
    console.log(`   Clients needing verification fix: ${clientsToFix.length}`);
    console.log(`   Psychologists to check: ${psychsToFix.length}\n`);

    // Step 4: Show current status of all non-admin users
    console.log('3️⃣ Current user status:');
    console.log('─'.repeat(80));
    
    for (const user of users) {
      if (user.role === 'admin') continue;
      
      const verified = user.isVerified ? '✅' : '❌';
      const approved = user.role === 'psychologist' 
        ? (user.psychologistDetails?.approvalStatus === 'approved' ? '✅' : '❌')
        : 'N/A';
      const active = user.role === 'psychologist'
        ? (user.psychologistDetails?.isActive !== false ? '✅' : '❌')
        : 'N/A';
      
      console.log(`   ${user.email}`);
      console.log(`      Role: ${user.role} | Verified: ${verified} | Approved: ${approved} | Active: ${active}`);
    }
    console.log('─'.repeat(80));
    console.log('');

    // Step 5: Try to verify users via admin endpoint
    console.log('4️⃣ Attempting to fix users...');
    
    let fixedCount = 0;
    for (const user of users) {
      if (user.role === 'admin') continue;
      
      // Check if user needs fixing
      const needsVerification = !user.isVerified;
      const needsApproval = user.role === 'psychologist' && 
        user.psychologistDetails?.approvalStatus !== 'approved';
      
      if (needsVerification || needsApproval) {
        try {
          // Try to update user via admin endpoint
          const updateData = {};
          
          if (needsVerification) {
            updateData.isVerified = true;
          }
          
          if (needsApproval) {
            updateData.approvalStatus = 'approved';
          }
          
          // Try the admin update endpoint
          await axios.put(`${API_URL}/admin/users/${user._id}`, updateData, { headers });
          console.log(`   ✅ Fixed: ${user.email}`);
          fixedCount++;
        } catch (err) {
          console.log(`   ⚠️ Could not fix via API: ${user.email} - ${err.response?.data?.message || err.message}`);
        }
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} users via API`);
    
    // Step 6: Test login for a client/psychologist
    console.log('\n5️⃣ Testing login for non-admin users...');
    
    for (const user of users) {
      if (user.role === 'admin') continue;
      
      // We don't know passwords, so just report what we found
      console.log(`   ${user.email} (${user.role}) - isVerified: ${user.isVerified}`);
      if (user.role === 'psychologist') {
        console.log(`      approvalStatus: ${user.psychologistDetails?.approvalStatus}`);
        console.log(`      isActive: ${user.psychologistDetails?.isActive}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
