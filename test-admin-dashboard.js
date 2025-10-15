const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'https://smiling-steps.onrender.com';
const ADMIN_EMAIL = 'smilingsteps@gmail.com';
const ADMIN_PASSWORD = 'admin123'; // Update with actual password

async function testAdminDashboard() {
  console.log('🧪 Testing Admin Dashboard Endpoints\n');
  console.log('API URL:', API_URL);
  console.log('Admin Email:', ADMIN_EMAIL);
  console.log('─'.repeat(50));

  try {
    // Step 1: Login as admin
    console.log('\n1️⃣  Logging in as admin...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    const token = loginRes.data.token;
    const user = loginRes.data.user;
    
    console.log('✅ Login successful');
    console.log('   User:', user.name);
    console.log('   Role:', user.role);
    console.log('   Token:', token.substring(0, 20) + '...');

    if (user.role !== 'admin') {
      console.log('❌ User is not an admin!');
      return;
    }

    const config = {
      headers: { 'x-auth-token': token }
    };

    // Step 2: Test stats endpoint
    console.log('\n2️⃣  Fetching dashboard statistics...');
    const statsRes = await axios.get(`${API_URL}/api/admin/stats`, config);
    console.log('✅ Stats retrieved:');
    console.log('   Total Clients:', statsRes.data.totalClients);
    console.log('   Total Psychologists:', statsRes.data.totalPsychologists);
    console.log('   Total Sessions:', statsRes.data.totalSessions);
    console.log('   New Clients (30 days):', statsRes.data.recent.newClients);

    // Step 3: Test psychologists endpoint
    console.log('\n3️⃣  Fetching psychologists list...');
    const psychRes = await axios.get(`${API_URL}/api/admin/psychologists`, config);
    console.log('✅ Psychologists retrieved:', psychRes.data.count);
    if (psychRes.data.psychologists.length > 0) {
      console.log('   First psychologist:', psychRes.data.psychologists[0].name);
    }

    // Step 4: Test clients endpoint
    console.log('\n4️⃣  Fetching clients list...');
    const clientsRes = await axios.get(`${API_URL}/api/admin/clients`, config);
    console.log('✅ Clients retrieved:', clientsRes.data.count);
    if (clientsRes.data.clients.length > 0) {
      console.log('   First client:', clientsRes.data.clients[0].name);
    }

    // Step 5: Test activity endpoint
    console.log('\n5️⃣  Fetching recent activity...');
    const activityRes = await axios.get(`${API_URL}/api/admin/activity`, config);
    console.log('✅ Activity items retrieved:', activityRes.data.length);
    if (activityRes.data.length > 0) {
      console.log('   Latest activity:', activityRes.data[0].description);
    }

    console.log('\n' + '─'.repeat(50));
    console.log('🎉 All admin dashboard endpoints working correctly!');
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testAdminDashboard();
