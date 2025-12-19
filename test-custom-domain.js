// Custom Domain Testing Script
// Run this after DNS propagation (6-24 hours)

const https = require('https');
const http = require('http');

const domains = [
  'https://smillingsteps.com',
  'https://www.smillingsteps.com',
  'https://smiling-steps-frontend.onrender.com' // fallback
];

async function testDomain(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      console.log(`✅ ${url}: Status ${res.statusCode}`);
      console.log(`   SSL: ${res.socket.encrypted ? 'Secured' : 'Not secured'}`);
      console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
      resolve({ url, status: res.statusCode, ssl: res.socket.encrypted });
    });

    req.on('error', (err) => {
      console.log(`❌ ${url}: ${err.message}`);
      resolve({ url, error: err.message });
    });

    req.setTimeout(10000, () => {
      console.log(`⏰ ${url}: Timeout`);
      req.destroy();
      resolve({ url, error: 'Timeout' });
    });
  });
}

async function testAllDomains() {
  console.log('🔍 Testing Custom Domain Setup...\n');
  
  for (const domain of domains) {
    await testDomain(domain);
    console.log('---');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. If domains show SSL errors: Wait 2-6 more hours');
  console.log('2. If domains timeout: Check DNS propagation');
  console.log('3. If working: Test login, booking, video calls');
}

testAllDomains().catch(console.error);