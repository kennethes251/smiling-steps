/**
 * Test script for Psychologist Approval Workflow
 * Tests the endpoints:
 * - GET /api/admin/psychologists/pending
 * - PUT /api/admin/psychologists/:id/approve
 * - PUT /api/admin/psychologists/:id/reject
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Test credentials - update these with valid admin credentials
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || 'admin@smilingsteps.com',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

let adminToken = null;
let testPsychologistId = null;

async function login(credentials) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials);
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetPendingPsychologists() {
  console.log('\n📋 Testing GET /api/admin/psychologists/pending...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/psychologists/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Success:', response.data.success);
    console.log('✅ Total pending:', response.data.total);
    
    if (response.data.psychologists && response.data.psychologists.length > 0) {
      const first = response.data.psychologists[0];
      console.log('✅ First pending psychologist:');
      console.log('   - ID:', first.id);
      console.log('   - Name:', first.name);
      console.log('   - Email:', first.email);
      console.log('   - Approval Status:', first.approvalStatus);
      console.log('   - Profile:', JSON.stringify(first.profile, null, 2).substring(0, 200));
      
      // Store for later tests
      testPsychologistId = first.id;
    } else {
      console.log('ℹ️ No pending psychologists found');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    return null;
  }
}

async function testApprovePsychologist(psychologistId) {
  console.log('\n✅ Testing PUT /api/admin/psychologists/:id/approve...');
  
  if (!psychologistId) {
    console.log('⚠️ No psychologist ID provided, skipping approve test');
    return null;
  }
  
  try {
    const response = await axios.put(
      `${BASE_URL}/api/admin/psychologists/${psychologistId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Success:', response.data.success);
    console.log('✅ Message:', response.data.message);
    console.log('✅ Psychologist:', JSON.stringify(response.data.psychologist, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    return null;
  }
}

async function testRejectPsychologist(psychologistId, reason) {
  console.log('\n❌ Testing PUT /api/admin/psychologists/:id/reject...');
  
  if (!psychologistId) {
    console.log('⚠️ No psychologist ID provided, skipping reject test');
    return null;
  }
  
  try {
    const response = await axios.put(
      `${BASE_URL}/api/admin/psychologists/${psychologistId}/reject`,
      { reason: reason || 'Test rejection - credentials need verification' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Success:', response.data.success);
    console.log('✅ Message:', response.data.message);
    console.log('✅ Psychologist:', JSON.stringify(response.data.psychologist, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    return null;
  }
}

async function testAlreadyApproved(psychologistId) {
  console.log('\n🔄 Testing approve on already approved psychologist...');
  
  if (!psychologistId) {
    console.log('⚠️ No psychologist ID provided, skipping test');
    return null;
  }
  
  try {
    const response = await axios.put(
      `${BASE_URL}/api/admin/psychologists/${psychologistId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    console.log('⚠️ Unexpected success - should have returned error');
    return response.data;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.code === 'ALREADY_APPROVED') {
      console.log('✅ Correctly returned ALREADY_APPROVED error');
      return error.response.data;
    }
    console.error('❌ Unexpected error:', error.response?.data || error.message);
    return null;
  }
}

async function testNotFound() {
  console.log('\n🔍 Testing with non-existent psychologist ID...');
  
  const fakeId = '507f1f77bcf86cd799439011'; // Valid MongoDB ObjectId format but doesn't exist
  
  try {
    const response = await axios.put(
      `${BASE_URL}/api/admin/psychologists/${fakeId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    console.log('⚠️ Unexpected success - should have returned 404');
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Correctly returned 404 NOT_FOUND');
      return error.response.data;
    }
    console.error('❌ Unexpected error:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Psychologist Approval Workflow Tests');
  console.log('=====================================');
  console.log('Base URL:', BASE_URL);
  
  // Login as admin
  console.log('\n🔐 Logging in as admin...');
  adminToken = await login(ADMIN_CREDENTIALS);
  
  if (!adminToken) {
    console.error('❌ Failed to login as admin. Tests cannot continue.');
    console.log('\nMake sure:');
    console.log('1. The server is running');
    console.log('2. Admin credentials are correct');
    console.log('3. Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables if needed');
    return;
  }
  
  console.log('✅ Admin login successful');
  
  // Test 1: Get pending psychologists
  await testGetPendingPsychologists();
  
  // Test 2: Test not found error
  await testNotFound();
  
  // If we have a pending psychologist, test approve/reject
  if (testPsychologistId) {
    // Test 3: Approve psychologist
    await testApprovePsychologist(testPsychologistId);
    
    // Test 4: Try to approve again (should fail)
    await testAlreadyApproved(testPsychologistId);
  } else {
    console.log('\n⚠️ No pending psychologists to test approve/reject functionality');
    console.log('Create a pending psychologist account to fully test the workflow');
  }
  
  console.log('\n=====================================');
  console.log('🧪 Tests completed');
}

runTests().catch(console.error);
