const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:5000/api';

// Test credentials (you'll need to update these with actual test accounts)
const CLIENT_EMAIL = 'client@test.com';
const CLIENT_PASSWORD = 'password123';

async function testBookingFlow() {
  console.log('🧪 Testing Session Booking Flow\n');
  
  try {
    // Step 1: Login as client
    console.log('1️⃣ Logging in as client...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD
    });
    
    const token = loginRes.data.token;
    console.log('✅ Login successful');
    console.log('   Token:', token.substring(0, 20) + '...\n');
    
    // Step 2: Get list of psychologists
    console.log('2️⃣ Fetching psychologists...');
    const psychRes = await axios.get(`${API_BASE}/users/psychologists`, {
      headers: { 'x-auth-token': token }
    });
    
    if (!psychRes.data.success || psychRes.data.data.length === 0) {
      console.log('❌ No psychologists found');
      return;
    }
    
    const psychologist = psychRes.data.data[0];
    console.log('✅ Found psychologists:', psychRes.data.data.length);
    console.log('   Using:', psychologist.name, `(${psychologist._id})\n`);
    
    // Step 3: Create booking request
    console.log('3️⃣ Creating booking request...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow
    
    const bookingData = {
      psychologistId: psychologist._id,
      sessionType: 'Individual',
      sessionDate: tomorrow.toISOString(),
      sessionRate: 2500,
      price: 2500
    };
    
    console.log('   Booking data:', JSON.stringify(bookingData, null, 2));
    
    const bookingRes = await axios.post(`${API_BASE}/sessions/request`, bookingData, {
      headers: { 'x-auth-token': token }
    });
    
    if (bookingRes.data.success) {
      console.log('✅ Booking request created successfully');
      console.log('   Session ID:', bookingRes.data.session.id);
      console.log('   Status:', bookingRes.data.session.status);
      console.log('   Payment Status:', bookingRes.data.session.paymentStatus);
      console.log('   Date:', new Date(bookingRes.data.session.sessionDate).toLocaleString());
      console.log('   Price: KSh', bookingRes.data.session.price);
    } else {
      console.log('❌ Booking failed:', bookingRes.data.msg);
    }
    
    // Step 4: Verify session was created
    console.log('\n4️⃣ Verifying session in database...');
    const sessionsRes = await axios.get(`${API_BASE}/sessions`, {
      headers: { 'x-auth-token': token }
    });
    
    console.log('✅ Found', sessionsRes.data.length, 'sessions for this client');
    
    const newSession = sessionsRes.data.find(s => s.id === bookingRes.data.session.id);
    if (newSession) {
      console.log('✅ New session verified in database');
      console.log('   Status:', newSession.status);
      console.log('   Psychologist:', newSession.psychologist?.name || 'Not populated');
    }
    
    console.log('\n✅ Booking flow test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testBookingFlow();
