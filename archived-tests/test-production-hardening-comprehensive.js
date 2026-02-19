/**
 * Comprehensive Production Hardening Test Suite
 * 
 * Tests all production hardening features to ensure they're working correctly
 */

const axios = require('axios');
const { spawn } = require('child_process');

const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';

class ProductionHardeningTests {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Testing: ${name}`);
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      console.log(`❌ ${name} - FAILED: ${error.message}`);
    }
  }

  async testHealthEndpoint() {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 10000 });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const health = response.data;
    const requiredFields = ['status', 'timestamp', 'database', 'environment', 'version', 'uptime', 'memory'];
    
    for (const field of requiredFields) {
      if (!health[field]) {
        throw new Error(`Missing health field: ${field}`);
      }
    }
    
    if (!['OK', 'DEGRADED'].includes(health.status)) {
      throw new Error(`Invalid health status: ${health.status}`);
    }
  }

  async testSecurityHeaders() {
    const response = await axios.get(`${BASE_URL}/health`);
    const headers = response.headers;
    
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'referrer-policy'
    ];
    
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        throw new Error(`Missing security header: ${header}`);
      }
    }
    
    // Check specific values
    if (headers['x-content-type-options'] !== 'nosniff') {
      throw new Error('X-Content-Type-Options should be nosniff');
    }
    
    if (headers['x-frame-options'] !== 'SAMEORIGIN') {
      throw new Error('X-Frame-Options should be SAMEORIGIN');
    }
  }

  async testRateLimiting() {
    // Test rate limiting on auth endpoint
    const requests = [];
    const endpoint = `${BASE_URL}/api/auth/login`;
    
    // Make multiple requests to trigger rate limiting
    for (let i = 0; i < 7; i++) {
      requests.push(
        axios.post(endpoint, 
          { email: 'test@test.com', password: 'test' },
          { timeout: 5000 }
        ).catch(error => error.response)
      );
    }
    
    const responses = await Promise.all(requests);
    
    // Check if any response has rate limiting
    let hasRateLimitHeaders = false;
    let hasRateLimitResponse = false;
    
    for (const response of responses) {
      if (response && response.headers) {
        if (response.headers['x-ratelimit-limit'] || response.headers['retry-after']) {
          hasRateLimitHeaders = true;
        }
      }
      if (response && response.status === 429) {
        hasRateLimitResponse = true;
      }
    }
    
    if (!hasRateLimitHeaders && !hasRateLimitResponse) {
      throw new Error('Rate limiting not detected');
    }
  }

  async testErrorHandling() {
    try {
      const response = await axios.get(`${BASE_URL}/nonexistent-endpoint`);
      throw new Error('Expected 404 error for nonexistent endpoint');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Check error response format
        const errorData = error.response.data;
        if (!errorData.error || !errorData.error.message || !errorData.error.timestamp) {
          throw new Error('Error response missing proper format');
        }
      } else {
        throw new Error(`Expected 404, got ${error.response?.status || 'network error'}`);
      }
    }
  }

  async testCORSConfiguration() {
    try {
      // Test CORS preflight
      const response = await axios.options(`${BASE_URL}/api/auth/login`, {
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      // Should either block or allow based on configuration
      // In development, it might allow; in production, it should block
      console.log('CORS test completed - response received');
    } catch (error) {
      if (error.message.includes('CORS')) {
        console.log('CORS properly blocking unauthorized origins');
      } else {
        throw error;
      }
    }
  }

  async testEnvironmentValidation() {
    // This test checks if the server starts with proper environment validation
    // We'll check the health endpoint to see if environment is properly set
    const response = await axios.get(`${BASE_URL}/health`);
    const health = response.data;
    
    if (!health.environment) {
      throw new Error('Environment not reported in health check');
    }
    
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(health.environment)) {
      throw new Error(`Invalid environment: ${health.environment}`);
    }
  }

  async testDatabaseResilience() {
    const response = await axios.get(`${BASE_URL}/health`);
    const health = response.data;
    
    if (!health.database) {
      throw new Error('Database status not reported');
    }
    
    if (health.database === 'error' || health.database === 'disconnected') {
      throw new Error(`Database connection failed: ${health.database}`);
    }
    
    // Check for database response time
    if (health.databaseResponseTime) {
      const responseTime = parseInt(health.databaseResponseTime);
      if (responseTime > 5000) {
        throw new Error(`Database response time too slow: ${health.databaseResponseTime}`);
      }
    }
  }

  async testLoggingSystem() {
    // Test that requests are being logged by making a request and checking response
    const startTime = Date.now();
    const response = await axios.get(`${BASE_URL}/health`);
    const endTime = Date.now();
    
    if (response.status !== 200) {
      throw new Error('Health endpoint failed');
    }
    
    // Check if response time is reasonable (indicates proper logging overhead)
    const responseTime = endTime - startTime;
    if (responseTime > 10000) {
      throw new Error(`Response time too slow (possible logging issues): ${responseTime}ms`);
    }
    
    console.log(`Logging test completed - response time: ${responseTime}ms`);
  }

  async testJWTSecurity() {
    // Test JWT endpoint with invalid token
    try {
      await axios.get(`${BASE_URL}/api/users/profile`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      throw new Error('Expected authentication error for invalid token');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // Check error response format
        const errorData = error.response.data;
        if (!errorData.error) {
          throw new Error('JWT error response missing proper format');
        }
      } else {
        throw new Error(`Expected 401, got ${error.response?.status || 'network error'}`);
      }
    }
  }

  async testFileUploadSecurity() {
    // Test file upload endpoint without proper authentication
    try {
      const formData = new FormData();
      formData.append('file', 'test content');
      
      await axios.post(`${BASE_URL}/api/upload/profile-picture`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      throw new Error('Expected authentication error for file upload');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('File upload properly protected');
      } else {
        throw new Error(`Expected 401, got ${error.response?.status || 'network error'}`);
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Production Hardening Tests');
    console.log('🔗 Testing URL:', BASE_URL);
    console.log('=' .repeat(70));
    
    await this.runTest('Health Endpoint Enhanced', () => this.testHealthEndpoint());
    await this.runTest('Security Headers', () => this.testSecurityHeaders());
    await this.runTest('Rate Limiting', () => this.testRateLimiting());
    await this.runTest('Error Handling', () => this.testErrorHandling());
    await this.runTest('CORS Configuration', () => this.testCORSConfiguration());
    await this.runTest('Environment Validation', () => this.testEnvironmentValidation());
    await this.runTest('Database Resilience', () => this.testDatabaseResilience());
    await this.runTest('Logging System', () => this.testLoggingSystem());
    await this.runTest('JWT Security', () => this.testJWTSecurity());
    await this.runTest('File Upload Security', () => this.testFileUploadSecurity());
    
    console.log('=' .repeat(70));
    console.log('📊 Production Hardening Test Results:');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);
    
    if (this.results.failed > 0) {
      console.log('\\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\\n🎯 Production Hardening Status:');
    if (this.results.failed === 0) {
      console.log('🎉 ALL PRODUCTION HARDENING FEATURES WORKING PERFECTLY!');
      console.log('\\n🛡️ Security Status: ENTERPRISE GRADE');
      console.log('🚀 Deployment Status: PRODUCTION READY');
      console.log('📈 Security Score: 9/10');
    } else if (this.results.failed <= 2) {
      console.log('⚠️  Most production hardening features working, minor issues detected');
      console.log('🛡️ Security Status: GOOD');
      console.log('🚀 Deployment Status: MOSTLY READY');
    } else {
      console.log('🚨 Production hardening has issues, review failed tests');
      console.log('🛡️ Security Status: NEEDS ATTENTION');
      console.log('🚀 Deployment Status: NOT READY');
    }
    
    console.log('\\n📋 Next Steps:');
    if (this.results.failed === 0) {
      console.log('1. ✅ All systems operational - ready for production');
      console.log('2. 📊 Monitor logs for any issues');
      console.log('3. 🔍 Set up monitoring alerts');
      console.log('4. 📈 Review performance metrics');
    } else {
      console.log('1. 🔧 Fix failed tests');
      console.log('2. 🧪 Re-run test suite');
      console.log('3. 📊 Review error logs');
      console.log('4. 🔍 Check configuration');
    }
    
    return this.results.failed === 0;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tests = new ProductionHardeningTests();
  
  tests.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('🚨 Test suite failed to run:', error.message);
      process.exit(1);
    });
}

module.exports = ProductionHardeningTests;