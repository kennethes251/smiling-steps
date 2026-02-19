/**
 * Test script to verify approvalStatus is correctly returned in login and auth responses
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'omusekennethesilo@gmail.com';
const TEST_PASSWORD = process.argv[2] || 'Test123!'; // Pass password as argument

async function testLoginApprovalStatus() {
  console.log('🧪 Testing Login and Auth ApprovalStatus Flow\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Test Login
    console.log('\n📝 Step 1: Testing Login Endpoint...');
    console.log(`   Email: ${TEST_EMAIL}`);
    
    const loginResponse = await axios.post(`${BASE_URL}/api/users/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    console.log('\n✅ Login Response:');
    console.log('   Success:', loginResponse.data.success);
    console.log('   User ID:', loginResponse.data.user?.id);
    console.log('   Role:', loginResponse.data.user?.role);
    console.log('   ApprovalStatus:', loginResponse.data.user?.approvalStatus);
    console.log('   isVerified:', loginResponse.data.user?.isVerified);
    console.log('   Token received:', !!loginResponse.data.token);
    
    const token = loginResponse.data.token;
    
    // Step 2: Test /api/auth (user load on refresh)
    console.log('\n📝 Step 2: Testing /api/auth Endpoint (simulates page refresh)...');
    
    const authResponse = await axios.get(`${BASE_URL}/api/auth`, {
      headers: {
        'x-auth-token': token,
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n✅ Auth Response:');
    console.log('   User ID:', authResponse.data.id);
    console.log('   Role:', authResponse.data.role);
    console.log('   ApprovalStatus:', authResponse.data.approvalStatus);
    console.log('   isVerified:', authResponse.data.isVerified);
    
    // Step 3: Verify consistency
    console.log('\n📝 Step 3: Checking Consistency...');
    
    const loginApproval = loginResponse.data.user?.approvalStatus;
    const authApproval = authResponse.data.approvalStatus;
    
    if (loginApproval === authApproval) {
      console.log(`   ✅ ApprovalStatus is consistent: "${loginApproval}"`);
    } else {
      console.log(`   ❌ ApprovalStatus MISMATCH!`);
      console.log(`      Login returned: "${loginApproval}"`);
      console.log(`      Auth returned: "${authApproval}"`);
    }
    
    // Step 4: Check if RoleGuard would show pending page
    console.log('\n📝 Step 4: Simulating RoleGuard Check...');
    
    const role = authResponse.data.role;
    const approvalStatus = authResponse.data.approvalStatus;
    
    if (role === 'psychologist' && approvalStatus !== 'approved') {
      console.log(`   ⚠️ RoleGuard WOULD show "Pending Approval" page`);
      console.log(`      Role: ${role}, ApprovalStatus: ${approvalStatus}`);
    } else if (role === 'psychologist' && approvalStatus === 'approved') {
      console.log(`   ✅ RoleGuard would allow access to dashboard`);
      console.log(`      Role: ${role}, ApprovalStatus: ${approvalStatus}`);
    } else {
      console.log(`   ℹ️ Not a psychologist, approval check not applicable`);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Test Complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('\n💡 Possible issues:');
      console.log('   - Wrong password (pass correct password as argument)');
      console.log('   - Email not verified');
      console.log('   Usage: node test-login-approval-status.js YOUR_PASSWORD');
    }
    
    if (error.response?.status === 403) {
      console.log('\n💡 Account status issue:');
      console.log('   - Account may be pending approval');
      console.log('   - Account may be rejected');
    }
  }
}

testLoginApprovalStatus();
