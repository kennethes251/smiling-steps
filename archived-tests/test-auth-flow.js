const https = require('https');

// Test both registration and login flow
async function testAuthFlow() {
  console.log('🧪 Testing Complete Authentication Flow\n');
  
  const testUser = {
    name: "Test Auth User",
    email: `test.auth.${Date.now()}@example.com`,
    password: "password123",
    role: "client",
    skipVerification: true
  };

  console.log('👤 Test User:', {
    name: testUser.name,
    email: testUser.email,
    role: testUser.role,
    skipVerification: testUser.skipVerification
  });

  // Test 1: Registration
  console.log('\n📝 Step 1: Testing Registration...');
  const registrationResult = await testRegistration(testUser);
  
  if (!registrationResult.success) {
    console.log('❌ Registration failed, stopping test');
    return;
  }

  // Test 2: Login
  console.log('\n🔐 Step 2: Testing Login...');
  const loginResult = await testLogin(testUser.email, testUser.password);
  
  if (loginResult.success) {
    console.log('🎉 Complete authentication flow working!');
  } else {
    console.log('❌ Login failed');
  }
}

function testRegistration(userData) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(userData);

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

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('📊 Registration Response:', {
            status: res.statusCode,
            success: response.success,
            message: response.message,
            requiresVerification: response.requiresVerification,
            hasToken: !!response.token,
            userVerified: response.user?.isVerified
          });
          
          if (response.success && !response.requiresVerification && response.token) {
            console.log('✅ Registration successful with streamlined flow!');
            resolve({ success: true, token: response.token, user: response.user });
          } else if (response.success && response.requiresVerification) {
            console.log('⚠️ Registration successful but requires verification (old flow)');
            resolve({ success: false, reason: 'requires_verification' });
          } else {
            console.log('❌ Registration failed:', response.message);
            resolve({ success: false, reason: response.message });
          }
        } catch (error) {
          console.log('❌ Registration error:', error.message);
          resolve({ success: false, reason: 'parse_error' });
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Registration request error:', error.message);
      resolve({ success: false, reason: 'network_error' });
    });

    req.write(postData);
    req.end();
  });
}

function testLogin(email, password) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ email, password });

    const options = {
      hostname: 'smiling-steps.onrender.com',
      port: 443,
      path: '/api/users/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('📊 Login Response:', {
            status: res.statusCode,
            success: response.success,
            hasToken: !!response.token,
            user: response.user ? {
              id: response.user.id,
              name: response.user.name,
              email: response.user.email,
              role: response.user.role
            } : null
          });
          
          if (response.success && response.token) {
            console.log('✅ Login successful!');
            resolve({ success: true, token: response.token, user: response.user });
          } else {
            console.log('❌ Login failed:', response.message || 'Unknown error');
            resolve({ success: false, reason: response.message });
          }
        } catch (error) {
          console.log('❌ Login parse error:', error.message);
          console.log('Raw response:', data);
          resolve({ success: false, reason: 'parse_error' });
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Login request error:', error.message);
      resolve({ success: false, reason: 'network_error' });
    });

    req.write(postData);
    req.end();
  });
}

// Run the test
testAuthFlow();