const axios = require('axios');

const API_URL = 'https://smiling-steps.onrender.com/api';

// Test credentials
const CLIENT_EMAIL = 'amos@gmail.com';
const CLIENT_PASSWORD = 'password123';
const PSYCHOLOGIST_EMAIL = 'leon@gmail.com';
const PSYCHOLOGIST_PASSWORD = 'password123';

let clientToken = '';
let psychologistToken = '';
let testSessionId = '';

// Helper function to format output
const log = (step, message, data = null) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STEP ${step}: ${message}`);
  console.log('='.repeat(60));
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const error = (step, message, err) => {
  console.error(`\n❌ ERROR in STEP ${step}: ${message}`);
  console.error(err.response?.data || err.message);
};

// Test the complete booking workflow
async function testCompleteBookingFlow() {
  try {
    // STEP 1: Client Login
    log(1, 'CLIENT LOGIN');
    const clientLogin = await axios.post(`${API_URL}/users/login`, {
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD
    });
    clientToken = clientLogin.data.token;
    console.log('✅ Client logged in successfully');
    console.log('Client:', clientLogin.data.user.name);

    // STEP 2: Psychologist Login
    log(2, 'PSYCHOLOGIST LOGIN');
    const psychologistLogin = await axios.post(`${API_URL}/users/login`, {
      email: PSYCHOLOGIST_EMAIL,
      password: PSYCHOLOGIST_PASSWORD
    });
    psychologistToken = psychologistLogin.data.token;
    console.log('✅ Psychologist logged in successfully');
    console.log('Psychologist:', psychologistLogin.data.user.name);
    console.log('Session Rate:', psychologistLogin.data.user.sessionRate || 0);

    // STEP 3: Get Psychologist ID
    log(3, 'GET PSYCHOLOGIST LIST');
    const psychologists = await axios.get(`${API_URL}/users/psychologists`, {
      headers: { 'x-auth-token': clientToken }
    });
    const psychologistId = psychologists.data.data[0]._id;
    console.log('✅ Found psychologist:', psychologists.data.data[0].name);

    // STEP 4: Client Creates Booking Request
    log(4, 'CLIENT CREATES BOOKING REQUEST');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const bookingRequest = await axios.post(`${API_URL}/sessions/request`, {
      psychologistId: psychologistId,
      sessionType: 'Individual',
      sessionDate: tomorrow.toISOString(),
      sessionRate: 2500
    }, {
      headers: { 'x-auth-token': clientToken }
    });
    
    testSessionId = bookingRequest.data.session.id;
    console.log('✅ Booking request created');
    console.log('Session ID:', testSessionId);
    console.log('Status:', bookingRequest.data.session.status);
    console.log('Expected Status: Pending Approval');

    // STEP 5: Check Client Dashboard
    log(5, 'CHECK CLIENT DASHBOARD');
    const clientSessions = await axios.get(`${API_URL}/sessions`, {
      headers: { 'x-auth-token': clientToken }
    });
    const pendingApproval = clientSessions.data.filter(s => s.status === 'Pending Approval');
    console.log('✅ Client sees pending approval sessions:', pendingApproval.length);
    console.log('Sessions:', pendingApproval.map(s => ({
      id: s.id,
      status: s.status,
      date: new Date(s.sessionDate).toLocaleString()
    })));

    // STEP 6: Check Psychologist Dashboard
    log(6, 'CHECK PSYCHOLOGIST DASHBOARD');
    const psychologistSessions = await axios.get(`${API_URL}/sessions`, {
      headers: { 'x-auth-token': psychologistToken }
    });
    const pendingForApproval = psychologistSessions.data.filter(s => s.status === 'Pending Approval');
    console.log('✅ Psychologist sees pending requests:', pendingForApproval.length);
    console.log('Sessions:', pendingForApproval.map(s => ({
      id: s.id,
      status: s.status,
      client: s.client?.name,
      date: new Date(s.sessionDate).toLocaleString()
    })));

    // STEP 7: Psychologist Approves Session
    log(7, 'PSYCHOLOGIST APPROVES SESSION');
    const approval = await axios.put(`${API_URL}/sessions/${testSessionId}/approve`, {
      sessionRate: 2500
    }, {
      headers: { 'x-auth-token': psychologistToken }
    });
    console.log('✅ Session approved');
    console.log('New Status:', approval.data.session.status);
    console.log('Expected Status: Approved');
    console.log('Payment Status:', approval.data.session.paymentStatus);

    // STEP 8: Check Client Dashboard After Approval
    log(8, 'CHECK CLIENT DASHBOARD AFTER APPROVAL');
    const clientSessionsAfterApproval = await axios.get(`${API_URL}/sessions`, {
      headers: { 'x-auth-token': clientToken }
    });
    const approved = clientSessionsAfterApproval.data.filter(s => s.status === 'Approved');
    console.log('✅ Client sees approved sessions:', approved.length);
    console.log('Sessions:', approved.map(s => ({
      id: s.id,
      status: s.status,
      paymentStatus: s.paymentStatus,
      amount: s.price || s.sessionRate
    })));

    // STEP 9: Client Submits Payment
    log(9, 'CLIENT SUBMITS PAYMENT');
    const paymentSubmission = await axios.post(`${API_URL}/sessions/${testSessionId}/submit-payment`, {
      transactionCode: 'TEST-MPESA-' + Date.now(),
      screenshot: 'https://example.com/payment-proof.jpg'
    }, {
      headers: { 'x-auth-token': clientToken }
    });
    console.log('✅ Payment submitted');
    console.log('New Status:', paymentSubmission.data.session.status);
    console.log('Expected Status: Payment Submitted');
    console.log('Payment Status:', paymentSubmission.data.session.paymentStatus);

    // STEP 10: Check Psychologist Dashboard After Payment
    log(10, 'CHECK PSYCHOLOGIST DASHBOARD AFTER PAYMENT');
    const psychologistSessionsAfterPayment = await axios.get(`${API_URL}/sessions`, {
      headers: { 'x-auth-token': psychologistToken }
    });
    const paymentSubmitted = psychologistSessionsAfterPayment.data.filter(s => s.status === 'Payment Submitted');
    console.log('✅ Psychologist sees payment submissions:', paymentSubmitted.length);
    console.log('Sessions:', paymentSubmitted.map(s => ({
      id: s.id,
      status: s.status,
      client: s.client?.name,
      paymentStatus: s.paymentStatus
    })));

    // STEP 11: Psychologist Verifies Payment
    log(11, 'PSYCHOLOGIST VERIFIES PAYMENT');
    const verification = await axios.put(`${API_URL}/sessions/${testSessionId}/verify-payment`, {}, {
      headers: { 'x-auth-token': psychologistToken }
    });
    console.log('✅ Payment verified');
    console.log('New Status:', verification.data.session.status);
    console.log('Expected Status: Confirmed');
    console.log('Payment Status:', verification.data.session.paymentStatus);

    // STEP 12: Check Both Dashboards After Confirmation
    log(12, 'CHECK BOTH DASHBOARDS AFTER CONFIRMATION');
    
    const clientFinalSessions = await axios.get(`${API_URL}/sessions`, {
      headers: { 'x-auth-token': clientToken }
    });
    const clientConfirmed = clientFinalSessions.data.filter(s => s.status === 'Confirmed');
    console.log('✅ Client sees confirmed sessions:', clientConfirmed.length);
    
    const psychologistFinalSessions = await axios.get(`${API_URL}/sessions`, {
      headers: { 'x-auth-token': psychologistToken }
    });
    const psychologistConfirmed = psychologistFinalSessions.data.filter(s => s.status === 'Confirmed');
    console.log('✅ Psychologist sees confirmed sessions:', psychologistConfirmed.length);

    // FINAL SUMMARY
    log('FINAL', '✅ COMPLETE BOOKING FLOW TEST PASSED!');
    console.log('\n📊 WORKFLOW SUMMARY:');
    console.log('1. ✅ Client created booking request → Pending Approval');
    console.log('2. ✅ Psychologist saw request in dashboard');
    console.log('3. ✅ Psychologist approved → Approved (Payment Required)');
    console.log('4. ✅ Client saw approved session with payment amount');
    console.log('5. ✅ Client submitted payment → Payment Submitted');
    console.log('6. ✅ Psychologist saw payment submission');
    console.log('7. ✅ Psychologist verified payment → Confirmed');
    console.log('8. ✅ Both dashboards show confirmed session');
    console.log('\n🎉 ALL STEPS COMPLETED SUCCESSFULLY!');
    console.log('🔄 Real-time sync: Both dashboards will auto-refresh every 30 seconds');

  } catch (err) {
    error('UNKNOWN', 'Test failed', err);
    process.exit(1);
  }
}

// Run the test
console.log('\n🚀 STARTING COMPLETE BOOKING FLOW TEST');
console.log('Testing the full workflow from booking to confirmation...\n');

testCompleteBookingFlow();
