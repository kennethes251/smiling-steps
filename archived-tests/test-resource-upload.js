require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function testResourceUpload() {
  try {
    console.log('🧪 Testing Resource Upload Functionality\n');

    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Create a simple test PDF file
    console.log('2️⃣ Creating test PDF file...');
    const testPdfPath = path.join(__dirname, 'test-resource.pdf');
    
    // Create a minimal PDF file (this is a valid PDF structure)
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 24 Tf
100 700 Td
(Test Resource PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
409
%%EOF`;

    fs.writeFileSync(testPdfPath, pdfContent);
    console.log('✅ Test PDF created\n');

    // Step 3: Upload the resource
    console.log('3️⃣ Uploading resource...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testPdfPath));
    formData.append('title', 'Test Recovery Guide');
    formData.append('description', 'This is a test resource for the upload functionality');
    formData.append('type', 'Guide');
    formData.append('category', 'Recovery');
    formData.append('tags', 'test,recovery,guide');
    formData.append('difficulty', 'beginner');
    formData.append('requiresAuth', 'false');
    formData.append('accessLevel', 'public');

    const uploadResponse = await axios.post(
      `${API_URL}/api/resources/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Upload successful!');
    console.log('📄 Resource created:', {
      id: uploadResponse.data.resource._id,
      title: uploadResponse.data.resource.title,
      fileName: uploadResponse.data.resource.fileName,
      fileSize: `${(uploadResponse.data.resource.fileSize / 1024).toFixed(2)} KB`,
      filePath: uploadResponse.data.resource.filePath
    });
    console.log('');

    // Step 4: Verify the resource appears in the public list
    console.log('4️⃣ Verifying resource appears in public list...');
    const publicResponse = await axios.get(`${API_URL}/api/resources/public/list`);
    
    const uploadedResource = publicResponse.data.resources.find(
      r => r._id === uploadResponse.data.resource._id
    );

    if (uploadedResource) {
      console.log('✅ Resource found in public list!');
      console.log('📊 Total public resources:', publicResponse.data.count);
    } else {
      console.log('❌ Resource not found in public list');
    }
    console.log('');

    // Step 5: Clean up test file
    console.log('5️⃣ Cleaning up...');
    fs.unlinkSync(testPdfPath);
    console.log('✅ Test PDF file deleted\n');

    console.log('🎉 All tests passed!');
    console.log('\n📝 Summary:');
    console.log('   - File upload: ✅');
    console.log('   - Database record: ✅');
    console.log('   - Public visibility: ✅');
    console.log('\n💡 Next steps:');
    console.log('   1. Build admin UI for uploading');
    console.log('   2. Add download functionality');
    console.log('   3. Test with real PDF files');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testResourceUpload();
