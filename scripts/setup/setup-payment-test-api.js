/**
 * Setup Script for Manual Payment System Testing (via API)
 * 
 * Creates test users via the API endpoints
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function setup() {
  console.log('🚀 Setting up Manual Payment System Test Environment (via API)');
  console.log('=' .repeat(60));
  
  const testPassword = 'Test123!';
  let adminToken = null;
  let clientToken = null;
  let psychologistId = null;
  let clientId = null;
  
  // 1. Try to login as existing admin
  console.log('\n🔐 Checking for existing admin...');
  try {
    const loginRes = await axios.post(`${API_URL}/api/users/login`, {
      email: 'admin@smilingsteps.com',
      password: 'Admin123!'
    });
    adminToken = loginRes.data.token;
    console.log('✅ Logged in as existing admin');
  } catch (e) {
    console.log('   No existing admin found, will try to create one');
  }
  
  // Try alternate admin credentials
  if (!adminToken) {
    try {
      const loginRes = await axios.post(`${API_URL}/api/users/login`, {
        email: 'admin@test.com',
        password: testPassword
      });
      adminToken = loginRes.data.token;
      console.log('✅ Logged in as test admin');
    } catch (e) {
      console.log('   Test admin not found either');
    }
  }
  
  // 2. Try to login or register client
  console.log('\n👤 Setting up client user...');
  try {
    const loginRes = await axios.post(`${API_URL}/api/users/login`, {
      email: 'client@test.com',
      password: testPassword
    });
    clientToken = loginRes.data.token;
    clientId = loginRes.data.user?.id;
    console.log('✅ Client exists and logged in');
  } catch (e) {
    // Try to register
    try {
      const regRes = await axios.post(`${API_URL}/api/users/register`, {
        name: 'Test Client',
        email: 'client@test.com',
        password: testPassword,
        role: 'client'
      });
      console.log('✅ Client registered (may need email verification)');
      clientId = regRes.data.user?.id;
    } catch (regErr) {
      console.log('⚠️ Could not register client:', regErr.response?.data?.msg || regErr.message);
    }
  }
  
  // 3. Check for psychologist
  console.log('\n👨‍⚕️ Checking for psychologist...');
  try {
    const psychRes = await axios.get(`${API_URL}/api/public/psychologists`);
    if (psychRes.data.length > 0) {
      psychologistId = psychRes.data[0]._id;
      console.log('✅ Found psychologist:', psychRes.data[0].name);
    } else {
      console.log('⚠️ No psychologists found in system');
    }
  } catch (e) {
    console.log('⚠️ Could not fetch psychologists:', e.message);
  }
  
  // 4. Check for existing sessions
  console.log('\n📅 Checking for existing sessions...');
  if (clientToken) {
    try {
      const sessionsRes = await axios.get(`${API_URL}/api/sessions/my-sessions`, {
        headers: { 'x-auth-token': clientToken }
      });
      const approvedSessions = sessionsRes.data.filter(s => s.status === 'Approved');
      if (approvedSessions.length > 0) {
        console.log('✅ Found approved session:', approvedSessions[0].bookingReference || approvedSessions[0]._id);
        console.log('   Session ID:', approvedSessions[0]._id);
      } else {
        console.log('⚠️ No approved sessions found');
        console.log('   You need to book a session and have it approved first');
      }
    } catch (e) {
      console.log('⚠️ Could not fetch sessions:', e.response?.data?.msg || e.message);
    }
  }
  
  // 5. Test the manual payment endpoints
  console.log('\n🧪 Testing manual payment endpoints...');
  
  if (adminToken) {
    try {
      const statsRes = await axios.get(`${API_URL}/api/manual-payments/stats`, {
        headers: { 'x-auth-token': adminToken }
      });
      console.log('✅ Payment stats endpoint working:');
      console.log('   Pending:', statsRes.data.stats?.pendingVerification || 0);
      console.log('   Verified today:', statsRes.data.stats?.verifiedToday || 0);
    } catch (e) {
      console.log('❌ Stats endpoint failed:', e.response?.data?.msg || e.message);
    }
    
    try {
      const pendingRes = await axios.get(`${API_URL}/api/manual-payments/pending`, {
        headers: { 'x-auth-token': adminToken }
      });
      console.log('✅ Pending payments endpoint working:');
      console.log('   Count:', pendingRes.data.count || 0);
    } catch (e) {
      console.log('❌ Pending endpoint failed:', e.response?.data?.msg || e.message);
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📋 MANUAL TESTING INSTRUCTIONS');
  console.log('=' .repeat(60));
  
  console.log('\n1. OPEN THE FRONTEND:');
  console.log('   cd client && npm start');
  console.log('   Then go to http://localhost:3000');
  
  console.log('\n2. LOGIN AS CLIENT:');
  console.log('   Email: client@test.com');
  console.log('   Password: Test123!');
  console.log('   (If not registered, register first)');
  
  console.log('\n3. BOOK A SESSION:');
  console.log('   - Go to Therapists page');
  console.log('   - Select a psychologist');
  console.log('   - Book a session');
  
  console.log('\n4. WAIT FOR APPROVAL:');
  console.log('   - Login as psychologist or admin');
  console.log('   - Approve the session');
  
  console.log('\n5. PAY FOR SESSION:');
  console.log('   - Login as client');
  console.log('   - Go to dashboard');
  console.log('   - Click "Pay Now" on approved session');
  console.log('   - Enter test code: TEST123456');
  
  console.log('\n6. VERIFY PAYMENT (ADMIN):');
  console.log('   - Login as admin');
  console.log('   - Go to Admin Dashboard');
  console.log('   - Find Payment Verification panel');
  console.log('   - Verify or reject the payment');
  
  console.log('\n📖 Full documentation: MANUAL_PAYMENT_SYSTEM_GUIDE.md');
}

setup().catch(console.error);
