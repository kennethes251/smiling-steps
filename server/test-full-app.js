const axios = require('axios');

const BASE_URL = 'https://smiling-steps.onrender.com';

async function testFullApplication() {
  console.log('🧪 Testing Full Application Flow...\n');
  
  let authToken = null;
  let adminUser = null;

  try {
    // Test 1: Basic connectivity
    console.log('1️⃣ Testing basic connectivity...');
    const healthResponse = await axios.get(`${BASE_URL}/api/test`);
    console.log('✅ Server is running:', healthResponse.data.message);
  } catch (error) {
    console.log('❌ Server connectivity failed:', error.message);
    return;
  }

  try {
    // Test 2: Admin login
    console.log('\n2️⃣ Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/users/login`, {
      email: 'smilingsteps@gmail.com',
      password: '33285322'
    });
    
    if (loginResponse.data.success && loginResponse.data.token) {
      authToken = loginResponse.data.token;
      adminUser = loginResponse.data.user;
      console.log('✅ Admin login successful');
      console.log('👤 User:', adminUser.name, '- Role:', adminUser.role);
      console.log('🔑 Token received (length):', authToken.length);
    } else {
      console.log('❌ Login failed:', loginResponse.data);
      return;
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
    return;
  }

  // Set up auth headers for subsequent requests
  const authConfig = {
    headers: {
      'x-auth-token': authToken
    }
  };

  try {
    // Test 3: Auth validation
    console.log('\n3️⃣ Testing auth validation...');
    const authResponse = await axios.get(`${BASE_URL}/api/auth`, authConfig);
    console.log('✅ Auth validation successful');
    console.log('👤 Authenticated user:', authResponse.data.name);
  } catch (error) {
    console.log('❌ Auth validation failed:', error.response?.status, error.response?.data);
  }

  try {
    // Test 4: Sessions endpoint
    console.log('\n4️⃣ Testing sessions endpoint...');
    const sessionsResponse = await axios.get(`${BASE_URL}/api/sessions`, authConfig);
    console.log('✅ Sessions endpoint working');
    console.log('📊 Sessions found:', sessionsResponse.data.length);
  } catch (error) {
    console.log('❌ Sessions endpoint failed:', error.response?.status, error.response?.data);
  }

  try {
    // Test 5: Admin stats
    console.log('\n5️⃣ Testing admin stats...');
    const statsResponse = await axios.get(`${BASE_URL}/api/admin/stats`, authConfig);
    console.log('✅ Admin stats working');
    console.log('📈 Stats:', {
      users: statsResponse.data.totalUsers,
      psychologists: statsResponse.data.totalPsychologists,
      sessions: statsResponse.data.totalSessions
    });
  } catch (error) {
    console.log('❌ Admin stats failed:', error.response?.status, error.response?.data);
  }

  try {
    // Test 6: Admin psychologists
    console.log('\n6️⃣ Testing admin psychologists endpoint...');
    const psychResponse = await axios.get(`${BASE_URL}/api/admin/psychologists`, authConfig);
    console.log('✅ Admin psychologists working');
    console.log('👨‍⚕️ Psychologists found:', psychResponse.data.length);
  } catch (error) {
    console.log('❌ Admin psychologists failed:', error.response?.status, error.response?.data);
  }

  try {
    // Test 7: User profile
    console.log('\n7️⃣ Testing user profile endpoint...');
    const profileResponse = await axios.get(`${BASE_URL}/api/users/profile`, authConfig);
    console.log('✅ User profile working');
    console.log('👤 Profile loaded for:', profileResponse.data.user?.name);
  } catch (error) {
    console.log('❌ User profile failed:', error.response?.status, error.response?.data);
  }

  try {
    // Test 8: Public psychologists (no auth needed)
    console.log('\n8️⃣ Testing public psychologists...');
    const publicPsychResponse = await axios.get(`${BASE_URL}/api/public/psychologists`);
    console.log('✅ Public psychologists working');
    console.log('👨‍⚕️ Public psychologists found:', publicPsychResponse.data.length);
  } catch (error) {
    console.log('❌ Public psychologists failed:', error.response?.status, error.response?.data);
  }

  try {
    // Test 9: Assessments (if they exist)
    console.log('\n9️⃣ Testing assessments endpoint...');
    const assessmentsResponse = await axios.get(`${BASE_URL}/api/assessments`, authConfig);
    console.log('✅ Assessments endpoint working');
    console.log('📝 Assessments found:', assessmentsResponse.data.length);
  } catch (error) {
    console.log('❌ Assessments failed:', error.response?.status, error.response?.data);
  }

  console.log('\n🏁 Test completed!');
}

testFullApplication().catch(console.error);