const https = require('https');

function testRegistration() {
  const postData = JSON.stringify({
    name: "Test Streamlined User",
    email: `test.streamlined.${Date.now()}@example.com`,
    password: "password123",
    role: "client",
    skipVerification: true
  });

  const options = {
    hostname: 'smiling-steps.onrender.com',
    port: 443,
    path: '/api/users/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🧪 Testing streamlined registration...');
  console.log('📝 Request data:', JSON.parse(postData));

  const req = https.request(options, (res) => {
    console.log(`📊 Status: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ Response received:');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.requiresVerification === false && response.token) {
          console.log('🎉 Streamlined registration working correctly!');
        } else if (response.requiresVerification === true) {
          console.log('⚠️ Still requiring verification - backend changes may not be deployed');
        }
      } catch (error) {
        console.error('❌ Error parsing response:', error);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error);
  });

  req.write(postData);
  req.end();
}

testRegistration();