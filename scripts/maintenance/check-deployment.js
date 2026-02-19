const https = require('https');

function checkDeployment() {
  const postData = JSON.stringify({
    name: "Deployment Test User",
    email: `deployment.test.${Date.now()}@example.com`,
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

  console.log('🔍 Checking deployment status...');

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (response.requiresVerification === false && response.token) {
          console.log('🎉 DEPLOYMENT SUCCESSFUL! Streamlined registration is working!');
          console.log('✅ Response:', {
            success: response.success,
            message: response.message,
            requiresVerification: response.requiresVerification,
            hasToken: !!response.token,
            userVerified: response.user?.isVerified
          });
          return true;
        } else if (response.requiresVerification === true) {
          console.log('⏳ Deployment still in progress... (old code still running)');
          return false;
        }
      } catch (error) {
        console.log('❌ Error checking deployment:', error.message);
        return false;
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Request failed:', error.message);
  });

  req.write(postData);
  req.end();
}

// Check deployment status
console.log('🚀 Monitoring deployment...');
console.log('📝 This will test the streamlined registration endpoint every 30 seconds');
console.log('⏹️  Press Ctrl+C to stop monitoring\n');

// Check immediately
checkDeployment();

// Then check every 30 seconds
const interval = setInterval(() => {
  checkDeployment();
}, 30000);