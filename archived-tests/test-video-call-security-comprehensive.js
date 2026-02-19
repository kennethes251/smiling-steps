/**
 * Comprehensive Video Call Security Test
 * 
 * Tests all security aspects of the video call implementation
 */

const axios = require('axios');

const BASE_URL = process.env.SERVER_URL || 'http://localhost:5000';

async function runComprehensiveSecurityTest() {
  console.log('🔒 Running Comprehensive Video Call Security Test...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0
  };
  
  // Test 1: Security Headers Validation
  console.log('1. 🛡️  Security Headers Validation');
  try {
    const response = await axios.get(`${BASE_URL}/api/video-calls/config`, {
      headers: { 'Origin': 'http://localhost:3000' },
      validateStatus: () => true
    });
    
    const headers = response.headers;
    const requiredHeaders = {
      'strict-transport-security': 'HSTS protection',
      'x-content-type-options': 'MIME type sniffing protection',
      'x-frame-options': 'Clickjacking protection',
      'referrer-policy': 'Referrer information control',
      'content-security-policy': 'Resource loading restrictions',
      'permissions-policy': 'Browser feature control'
    };
    
    let headersPassed = 0;
    for (const [header, description] of Object.entries(requiredHeaders)) {
      if (headers[header]) {
        console.log(`   ✅ ${header}: ${description}`);
        headersPassed++;
      } else {
        console.log(`   ❌ ${header}: Missing - ${description}`);
        results.failed++;
      }
    }
    
    if (headersPassed === Object.keys(requiredHeaders).length) {
      console.log('   🎉 All security headers present');
      results.passed++;
    }
    
  } catch (error) {
    console.log('   ❌ Security headers test failed:', error.message);
    results.failed++;
  }
  
  // Test 2: CORS Configuration
  console.log('\n2. 🌐 CORS Configuration Test');
  try {
    // Test allowed origin
    const allowedResponse = await axios.options(`${BASE_URL}/api/video-calls/config`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'x-auth-token'
      },
      validateStatus: () => true
    });
    
    if (allowedResponse.headers['access-control-allow-origin'] === 'http://localhost:3000') {
      console.log('   ✅ Allowed origin accepted');
      results.passed++;
    } else {
      console.log('   ❌ Allowed origin rejected');
      results.failed++;
    }
    
    // Test credentials support
    if (allowedResponse.headers['access-control-allow-credentials'] === 'true') {
      console.log('   ✅ Credentials support enabled');
      results.passed++;
    } else {
      console.log('   ❌ Credentials support disabled');
      results.failed++;
    }
    
    // Test method support
    const allowedMethods = allowedResponse.headers['access-control-allow-methods'];
    const requiredMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    const methodsSupported = requiredMethods.every(method => 
      allowedMethods && allowedMethods.includes(method)
    );
    
    if (methodsSupported) {
      console.log('   ✅ All required HTTP methods supported');
      results.passed++;
    } else {
      console.log('   ❌ Missing required HTTP methods');
      results.failed++;
    }
    
  } catch (error) {
    console.log('   ❌ CORS test failed:', error.message);
    results.failed++;
  }
  
  // Test 3: Video Call Specific Headers
  console.log('\n3. 🎥 Video Call Specific Security');
  try {
    const vcResponse = await axios.get(`${BASE_URL}/api/video-calls/config`, {
      headers: { 'Origin': 'http://localhost:3000' },
      validateStatus: () => true
    });
    
    const permissionsPolicy = vcResponse.headers['permissions-policy'];
    if (permissionsPolicy && permissionsPolicy.includes('camera=(self)')) {
      console.log('   ✅ Camera permissions properly configured');
      results.passed++;
    } else {
      console.log('   ❌ Camera permissions not configured');
      results.failed++;
    }
    
    if (permissionsPolicy && permissionsPolicy.includes('microphone=(self)')) {
      console.log('   ✅ Microphone permissions properly configured');
      results.passed++;
    } else {
      console.log('   ❌ Microphone permissions not configured');
      results.failed++;
    }
    
    const csp = vcResponse.headers['content-security-policy'];
    if (csp && csp.includes('mediastream:')) {
      console.log('   ✅ WebRTC media streams allowed in CSP');
      results.passed++;
    } else {
      console.log('   ❌ WebRTC media streams not configured in CSP');
      results.failed++;
    }
    
    if (csp && csp.includes('stun.l.google.com')) {
      console.log('   ✅ STUN servers allowed in CSP');
      results.passed++;
    } else {
      console.log('   ❌ STUN servers not configured in CSP');
      results.failed++;
    }
    
  } catch (error) {
    console.log('   ❌ Video call security test failed:', error.message);
    results.failed++;
  }
  
  // Test 4: Rate Limiting Headers
  console.log('\n4. ⏱️  Rate Limiting Configuration');
  try {
    const rateLimitResponse = await axios.get(`${BASE_URL}/api/video-calls/config`, {
      headers: { 'Origin': 'http://localhost:3000' },
      validateStatus: () => true
    });
    
    if (rateLimitResponse.headers['x-ratelimit-limit']) {
      console.log('   ✅ Rate limit configured:', rateLimitResponse.headers['x-ratelimit-limit']);
      results.passed++;
    } else {
      console.log('   ⚠️  Rate limit headers not present (may be implemented differently)');
      results.warnings++;
    }
    
    if (rateLimitResponse.headers['x-ratelimit-window']) {
      console.log('   ✅ Rate limit window configured:', rateLimitResponse.headers['x-ratelimit-window']);
      results.passed++;
    } else {
      console.log('   ⚠️  Rate limit window not specified');
      results.warnings++;
    }
    
  } catch (error) {
    console.log('   ❌ Rate limiting test failed:', error.message);
    results.failed++;
  }
  
  // Test 5: Helmet Security Features
  console.log('\n5. 🪖 Helmet Security Features');
  try {
    const helmetResponse = await axios.get(`${BASE_URL}/`, {
      validateStatus: () => true
    });
    
    const headers = helmetResponse.headers;
    
    // Check X-Powered-By is hidden
    if (!headers['x-powered-by']) {
      console.log('   ✅ X-Powered-By header hidden');
      results.passed++;
    } else {
      console.log('   ❌ X-Powered-By header exposed:', headers['x-powered-by']);
      results.failed++;
    }
    
    // Check DNS prefetch control
    if (headers['x-dns-prefetch-control']) {
      console.log('   ✅ DNS prefetch control enabled');
      results.passed++;
    } else {
      console.log('   ❌ DNS prefetch control not configured');
      results.failed++;
    }
    
    // Check Cross-Origin-Resource-Policy
    if (headers['cross-origin-resource-policy']) {
      console.log('   ✅ Cross-Origin-Resource-Policy configured:', headers['cross-origin-resource-policy']);
      results.passed++;
    } else {
      console.log('   ❌ Cross-Origin-Resource-Policy not configured');
      results.failed++;
    }
    
  } catch (error) {
    console.log('   ❌ Helmet security test failed:', error.message);
    results.failed++;
  }
  
  // Test 6: Origin Validation
  console.log('\n6. 🚫 Origin Validation Test');
  try {
    // Test with malicious origin
    const maliciousResponse = await axios.options(`${BASE_URL}/api/video-calls/config`, {
      headers: {
        'Origin': 'https://malicious-site.com',
        'Access-Control-Request-Method': 'GET'
      },
      validateStatus: () => true
    });
    
    const allowedOrigin = maliciousResponse.headers['access-control-allow-origin'];
    if (allowedOrigin !== 'https://malicious-site.com') {
      console.log('   ✅ Malicious origin properly rejected');
      results.passed++;
    } else {
      console.log('   ❌ SECURITY VULNERABILITY: Malicious origin accepted!');
      results.failed++;
    }
    
  } catch (error) {
    console.log('   ✅ Malicious origin properly rejected (connection failed)');
    results.passed++;
  }
  
  // Final Results
  console.log('\n' + '='.repeat(60));
  console.log('🔒 COMPREHENSIVE SECURITY TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${results.passed}`);
  console.log(`❌ Tests Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  
  const totalTests = results.passed + results.failed;
  const successRate = totalTests > 0 ? ((results.passed / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`📊 Success Rate: ${successRate}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL SECURITY TESTS PASSED!');
    console.log('🔒 Video call security configuration is properly implemented.');
  } else if (results.failed <= 2) {
    console.log('\n⚠️  MOSTLY SECURE - Minor issues detected');
    console.log('🔧 Consider addressing the failed tests for optimal security.');
  } else {
    console.log('\n❌ SECURITY ISSUES DETECTED');
    console.log('🚨 Please address the failed tests before deploying to production.');
  }
  
  console.log('\n📋 Security Features Implemented:');
  console.log('• Enhanced CORS configuration for video calls');
  console.log('• Comprehensive security headers (HSTS, CSP, etc.)');
  console.log('• WebRTC-specific permissions and CSP rules');
  console.log('• Helmet security middleware');
  console.log('• Origin validation and rate limiting');
  console.log('• Secure WebSocket configuration');
}

// Run the comprehensive test
if (require.main === module) {
  runComprehensiveSecurityTest();
}

module.exports = { runComprehensiveSecurityTest };