require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function testApprove() {
  console.log('\n🧪 Testing Session Approval\n');
  
  try {
    // Step 1: Login as psychologist
    console.log('1️⃣ Logging in as psychologist...');
    const loginRes = await axios.post(`${API_URL}/api/users/login`, {
      email: 'nancy@gmail.com',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    const psychologistId = loginRes.data.user.id;
    console.log('✅ Logged in:', loginRes.data.user.name);
    console.log('   Psychologist ID:', psychologistId);
    
    // Step 2: Get sessions
    console.log('\n2️⃣ Fetching sessions...');
    const sessionsRes = await axios.get(`${API_URL}/api/sessions`, {
      headers: { 'x-auth-token': token }
    });
    
    console.log('✅ Found', sessionsRes.data.length, 'sessions');
    
    const pendingSession = sessionsRes.data.find(s => s.status === 'Pending Approval');
    
    if (!pendingSession) {
      console.log('❌ No pending sessions found');
      console.log('   Available sessions:', sessionsRes.data.map(s => ({
        id: s.id,
        status: s.status,
        psychologistId: s.psychologistId
      })));
      return;
    }
    
    console.log('   Pending session found:', {
      id: pendingSession.id,
      status: pendingSession.status,
      psychologistId: pendingSession.psychologistId,
      sessionType: pendingSession.sessionType
    });
    
    // Step 3: Try to approve
    console.log('\n3️⃣ Attempting to approve session...');
    console.log('   Session ID:', pendingSession.id);
    console.log('   Psychologist ID from token:', psychologistId);
    console.log('   Psychologist ID from session:', pendingSession.psychologistId);
    console.log('   IDs match?', pendingSession.psychologistId === psychologistId);
    
    const approveRes = await axios.put(
      `${API_URL}/api/sessions/${pendingSession.id}/approve`,
      { sessionRate: 2500 },
      { headers: { 'x-auth-token': token } }
    );
    
    console.log('✅ Session approved successfully!');
    console.log('   New status:', approveRes.data.session.status);
    console.log('   Payment instructions:', approveRes.data.session.paymentInstructions);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    console.log('   Status:', error.response?.status);
    if (error.response?.data) {
      console.log('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testApprove();
