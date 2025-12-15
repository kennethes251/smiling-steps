const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

// Test credentials - update with your admin credentials
const ADMIN_EMAIL = 'admin@smilingsteps.com';
const ADMIN_PASSWORD = 'admin123';

let adminToken = '';

async function loginAsAdmin() {
  try {
    console.log('🔐 Logging in as admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    adminToken = response.data.token;
    console.log('✅ Admin logged in successfully');
    return true;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testResourceUpload() {
  try {
    console.log('\n📤 Testing resource upload...');
    
    // Create a test PDF file if it doesn't exist
    const testPdfPath = path.join(__dirname, 'test-resource.pdf');
    if (!fs.existsSync(testPdfPath)) {
      console.log('Creating test PDF file...');
      fs.writeFileSync(testPdfPath, '%PDF-1.4\n%Test PDF\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Test Resource) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000015 00000 n\n0000000074 00000 n\n0000000133 00000 n\n0000000321 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n415\n%%EOF');
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(testPdfPath));
    formData.append('title', 'Test Anxiety Management Guide');
    formData.append('description', 'A comprehensive guide to managing anxiety with practical exercises and techniques.');
    formData.append('type', 'guide');
    formData.append('category', 'Anxiety');
    formData.append('tags', 'anxiety, coping, mindfulness, breathing');
    formData.append('difficulty', 'beginner');
    formData.append('requiresAuth', 'false');
    formData.append('accessLevel', 'client');

    const response = await axios.post(`${BASE_URL}/resources/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'x-auth-token': adminToken
      }
    });

    console.log('✅ Resource uploaded successfully');
    console.log('Resource ID:', response.data.resource._id);
    return response.data.resource;
  } catch (error) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetResources() {
  try {
    console.log('\n📋 Testing get all resources (admin)...');
    const response = await axios.get(`${BASE_URL}/resources`, {
      headers: { 'x-auth-token': adminToken }
    });
    console.log(`✅ Found ${response.data.count} resources`);
    return response.data.resources;
  } catch (error) {
    console.error('❌ Get resources failed:', error.response?.data || error.message);
    return [];
  }
}

async function testGetPublicResources() {
  try {
    console.log('\n🌐 Testing get public resources (no auth)...');
    const response = await axios.get(`${BASE_URL}/resources/public/list`);
    console.log(`✅ Found ${response.data.count} public resources`);
    return response.data.resources;
  } catch (error) {
    console.error('❌ Get public resources failed:', error.response?.data || error.message);
    return [];
  }
}

async function testDownloadResource(resourceId) {
  try {
    console.log('\n📥 Testing resource download...');
    const response = await axios.get(`${BASE_URL}/resources/${resourceId}/download`, {
      responseType: 'arraybuffer'
    });
    console.log('✅ Resource downloaded successfully');
    console.log('File size:', response.data.byteLength, 'bytes');
    return true;
  } catch (error) {
    console.error('❌ Download failed:', error.response?.data || error.message);
    return false;
  }
}

async function testViewResource(resourceId) {
  try {
    console.log('\n👁️ Testing resource view...');
    const response = await axios.get(`${BASE_URL}/resources/${resourceId}/view`, {
      responseType: 'arraybuffer'
    });
    console.log('✅ Resource viewed successfully');
    console.log('File size:', response.data.byteLength, 'bytes');
    return true;
  } catch (error) {
    console.error('❌ View failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUpdateResource(resourceId) {
  try {
    console.log('\n✏️ Testing resource update...');
    const response = await axios.put(`${BASE_URL}/resources/${resourceId}`, {
      title: 'Updated Anxiety Management Guide',
      description: 'An updated comprehensive guide with new techniques.',
      tags: ['anxiety', 'coping', 'mindfulness', 'breathing', 'updated']
    }, {
      headers: { 'x-auth-token': adminToken }
    });
    console.log('✅ Resource updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Update failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDeleteResource(resourceId) {
  try {
    console.log('\n🗑️ Testing resource deletion...');
    const response = await axios.delete(`${BASE_URL}/resources/${resourceId}`, {
      headers: { 'x-auth-token': adminToken }
    });
    console.log('✅ Resource deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Delete failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting Resource System Tests\n');
  console.log('='.repeat(50));

  // Login
  const loginSuccess = await loginAsAdmin();
  if (!loginSuccess) {
    console.log('\n❌ Tests aborted - admin login failed');
    return;
  }

  // Upload resource
  const uploadedResource = await testResourceUpload();
  if (!uploadedResource) {
    console.log('\n❌ Tests aborted - upload failed');
    return;
  }

  const resourceId = uploadedResource._id;

  // Get all resources (admin)
  await testGetResources();

  // Get public resources
  await testGetPublicResources();

  // Download resource
  await testDownloadResource(resourceId);

  // View resource
  await testViewResource(resourceId);

  // Update resource
  await testUpdateResource(resourceId);

  // Delete resource
  await testDeleteResource(resourceId);

  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests completed!');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
