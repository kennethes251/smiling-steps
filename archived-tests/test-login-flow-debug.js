/**
 * Login Flow Debug & Test Script
 * Tests the complete authentication flow for Smiling Steps
 * 
 * Run: node test-login-flow-debug.js
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_USER = {
  name: 'Test User',
  email: `testuser_${Date.now()}@example.com`,
  password: 'TestPass123!',
  role: 'client'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60));
}

// HTTP request helper
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testServerHealth() {
  logSection('1. Server Health Check');
  
  try {
    const response = await makeRequest('GET', '/health');
    
    if (response.status === 200) {
      log('✅ Server is running and healthy', 'green');
      log(`   Status: ${response.status}`, 'blue');
      if (response.data.database) {
        log(`   Database: ${response.data.database}`, 'blue');
      }
      return true;
    } else {
      log(`⚠️ Server responded with status ${response.status}`, 'yellow');
      return true; // Server is reachable
    }
  } catch (err) {
    log('❌ Server is not reachable', 'red');
    log(`   Error: ${err.message}`, 'red');
    log('\n   Make sure to start the server first:', 'yellow');
    log('   npm run dev', 'cyan');
    return false;
  }
}

async function testRegistration() {
  logSection('2. User Registration Test');
  
  try {
    log(`   Registering: ${TEST_USER.email}`, 'blue');
    
    const response = await makeRequest('POST', '/api/users/register', {
      ...TEST_USER,
      skipVerification: true // Skip email verification for testing
    });
    
    log(`   Status: ${response.status}`, 'blue');
    
    if (response.status === 201 || response.status === 200) {
      log('✅ Registration successful', 'green');
      if (response.data.token) {
        log('   Token received: Yes', 'green');
      }
      if (response.data.user) {
        log(`   User ID: ${response.data.user.id}`, 'blue');
        log(`   Role: ${response.data.user.role}`, 'blue');
        log(`   Verified: ${response.data.user.isVerified}`, 'blue');
      }
      return { success: true, data: response.data };
    } else if (response.status === 400 && response.data.message?.includes('already exists')) {
      log('⚠️ User already exists (this is OK for testing)', 'yellow');
      return { success: true, exists: true };
    } else {
      log('❌ Registration failed', 'red');
      log(`   Message: ${response.data.message || 'Unknown error'}`, 'red');
      if (response.data.errors) {
        response.data.errors.forEach(err => log(`   - ${err}`, 'red'));
      }
      return { success: false, data: response.data };
    }
  } catch (err) {
    log('❌ Registration request failed', 'red');
    log(`   Error: ${err.message}`, 'red');
    return { success: false, error: err.message };
  }
}

async function testLogin(email, password) {
  logSection('3. Login Test');
  
  try {
    log(`   Logging in as: ${email}`, 'blue');
    
    const response = await makeRequest('POST', '/api/users/login', {
      email,
      password
    });
    
    log(`   Status: ${response.status}`, 'blue');
    
    if (response.status === 200 && response.data.success) {
      log('✅ Login successful', 'green');
      log(`   Token received: ${response.data.token ? 'Yes' : 'No'}`, 'green');
      if (response.data.user) {
        log(`   User: ${response.data.user.name}`, 'blue');
        log(`   Role: ${response.data.user.role}`, 'blue');
        log(`   Email: ${response.data.user.email}`, 'blue');
      }
      return { success: true, token: response.data.token, user: response.data.user };
    } else {
      log('❌ Login failed', 'red');
      log(`   Message: ${response.data.message || 'Unknown error'}`, 'red');
      if (response.data.errors) {
        response.data.errors.forEach(err => log(`   - ${err}`, 'red'));
      }
      if (response.data.requiresVerification) {
        log('\n   ⚠️ Email verification required!', 'yellow');
        log('   The user needs to verify their email before logging in.', 'yellow');
      }
      return { success: false, data: response.data };
    }
  } catch (err) {
    log('❌ Login request failed', 'red');
    log(`   Error: ${err.message}`, 'red');
    return { success: false, error: err.message };
  }
}

async function testAuthenticatedEndpoint(token) {
  logSection('4. Authenticated Endpoint Test');
  
  if (!token) {
    log('⚠️ Skipping - no token available', 'yellow');
    return { success: false };
  }
  
  try {
    const response = await makeRequest('GET', '/api/auth', null, token);
    
    log(`   Status: ${response.status}`, 'blue');
    
    if (response.status === 200) {
      log('✅ Token is valid - authenticated request successful', 'green');
      if (response.data.name) {
        log(`   User: ${response.data.name}`, 'blue');
      }
      return { success: true, user: response.data };
    } else {
      log('❌ Token validation failed', 'red');
      log(`   Message: ${response.data.message || response.data.msg || 'Unknown error'}`, 'red');
      return { success: false };
    }
  } catch (err) {
    log('❌ Auth check request failed', 'red');
    log(`   Error: ${err.message}`, 'red');
    return { success: false, error: err.message };
  }
}

async function testExistingUsers() {
  logSection('5. Test with Known Credentials');
  
  // Test common admin credentials
  const testCredentials = [
    { email: 'admin@smilingsteps.com', password: 'admin123', role: 'admin' },
    { email: 'admin@example.com', password: 'admin123', role: 'admin' },
    { email: 'test@example.com', password: 'password123', role: 'client' }
  ];
  
  for (const cred of testCredentials) {
    log(`\n   Testing: ${cred.email}`, 'blue');
    
    try {
      const response = await makeRequest('POST', '/api/users/login', {
        email: cred.email,
        password: cred.password
      });
      
      if (response.status === 200 && response.data.success) {
        log(`   ✅ Login successful for ${cred.email}`, 'green');
        log(`      Role: ${response.data.user?.role}`, 'blue');
        return { success: true, email: cred.email, token: response.data.token };
      } else {
        log(`   ❌ Failed: ${response.data.message || 'Invalid credentials'}`, 'yellow');
      }
    } catch (err) {
      log(`   ❌ Error: ${err.message}`, 'red');
    }
  }
  
  return { success: false };
}

async function listUsers() {
  logSection('6. Database User Check');
  
  log('   Checking if we can list users (requires admin)...', 'blue');
  
  // This would require admin access, so we'll just note it
  log('   ⚠️ To check users in database, run:', 'yellow');
  log('   node -e "require(\'./server/models/User\').find({}).select(\'email role isVerified\').then(u => console.log(u)).catch(console.error)"', 'cyan');
}

// Main execution
async function runTests() {
  console.log('\n');
  log('🔍 SMILING STEPS - LOGIN FLOW DEBUG SCRIPT', 'cyan');
  log(`   Target: ${BASE_URL}`, 'blue');
  log(`   Time: ${new Date().toISOString()}`, 'blue');
  
  // Test 1: Server health
  const serverOk = await testServerHealth();
  if (!serverOk) {
    log('\n❌ Cannot proceed - server is not running', 'red');
    log('\nTo start the server:', 'yellow');
    log('  npm run dev', 'cyan');
    process.exit(1);
  }
  
  // Test 2: Registration
  const regResult = await testRegistration();
  
  // Test 3: Login with new user
  let loginResult;
  if (regResult.success) {
    loginResult = await testLogin(TEST_USER.email, TEST_USER.password);
  }
  
  // Test 4: Authenticated endpoint
  if (loginResult?.success) {
    await testAuthenticatedEndpoint(loginResult.token);
  }
  
  // Test 5: Try known credentials
  const knownResult = await testExistingUsers();
  
  // Test 6: Database check hint
  await listUsers();
  
  // Summary
  logSection('SUMMARY');
  
  const results = {
    'Server Health': serverOk,
    'Registration': regResult?.success,
    'Login (new user)': loginResult?.success,
    'Known Credentials': knownResult?.success
  };
  
  let allPassed = true;
  for (const [test, passed] of Object.entries(results)) {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${test}`, color);
    if (!passed) allPassed = false;
  }
  
  if (!allPassed) {
    log('\n📋 TROUBLESHOOTING TIPS:', 'yellow');
    log('1. Make sure MongoDB is running and MONGODB_URI is set in .env', 'blue');
    log('2. Check server logs for detailed error messages', 'blue');
    log('3. Verify JWT_SECRET is set in .env', 'blue');
    log('4. If email verification is required, use skipVerification: true', 'blue');
  }
  
  console.log('\n');
}

runTests().catch(err => {
  log(`\n❌ Script error: ${err.message}`, 'red');
  process.exit(1);
});
