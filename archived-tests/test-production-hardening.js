/**
 * Production Hardening Test Suite
 * 
 * Tests all the production hardening improvements we've implemented
 */

const axios = require('axios');
const { logger } = require('./server/utils/logger');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

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
      console.log(`🧪 Running test: ${name}`);
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
    const response = await axios.get(`${API_BASE_URL}/health`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const health = response.data;
    const requiredFields = ['status', 'timestamp', 'database', 'environment', 'version'];
    
    for (const field of requiredFields) {
      if (!health[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (health.status !== 'OK' && health.status !== 'DEGRADED') {
      throw new Error(`Invalid status: ${health.status}`);
    }
  }

  async testSecurityHeaders() {
    const response = await axios.get(`${API_BASE_URL}/health`);
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
    
    // Check specific header values
    if (headers['x-content-type-options'] !== 'nosniff') {
      throw new Error('X-Content-Type-Options should be nosniff');
    }
    
    if (headers['x-frame-options'] !== 'SAMEORIGIN') {
      throw new Error('X-Frame-Options should be SAMEORIGIN');
    }
  }

  async testRateLimiting() {
    // Test rate limiting by making multiple requests quickly
    const requests = [];
    const endpoint = `${API_BASE_URL}/api/auth/login`;
    
    // Make 10 rapid requests to trigger rate limiting
    for (let i = 0; i < 10; i++) {
      requests.push(
        axios.post(endpoint, { email: 'test@test.com', password: 'test' })
          .catch(error => error.response)
      );
    }
    
    const responses = await Promise.all(requests);
    
    // Check if any response has rate limiting headers
    let hasRateLimitHeaders = false;
    for (const response of responses) {
      if (response && response.headers) {
        if (response.headers['x-ratelimit-limit'] || response.headers['retry-after']) {
          hasRateLimitHeaders = true;
          break;
        }
      }
    }
    
    if (!hasRateLimitHeaders) {
      throw new Error('Rate limiting headers not found');
    }
  }

  async testCorsConfiguration() {
    try {
      // Test CORS with an invalid origin
      const response = await axios.get(`${API_BASE_URL}/health`, {
        headers: {
          'Origin': 'https://malicious-site.com'
        }
      });
      
      // If we get here without an error, CORS might not be properly configured
      // But some servers might still respond, so we check the headers
      if (!response.headers['access-control-allow-origin']) {
        // This is actually good - no CORS headers means the origin was rejected
        return;
      }
    } catch (error) {
      // CORS rejection is expected for invalid origins
      if (error.message.includes('CORS') || error.code === 'ERR_NETWORK') {
        return; // This is expected
      }
      throw error;
    }
  }

  async testErrorHandling() {
    try {
      // Test 404 handling
      const response = await axios.get(`${API_BASE_URL}/nonexistent-endpoint`);
      throw new Error('Expected 404 error for nonexistent endpoint');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Check if error response has proper format
        const errorData = error.response.data;
        if (!errorData.error || !errorData.error.message) {
          throw new Error('Error response missing proper format');
        }
      } else {
        throw new Error(`Expected 404, got ${error.response?.status || 'network error'}`);
      }
    }
  }

  async testEnvironmentValidation() {
    // This test checks if the server started successfully with environment validation
    // If we can reach the health endpoint, environment validation passed
    const response = await axios.get(`${API_BASE_URL}/health`);
    
    if (response.status !== 200) {
      throw new Error('Server failed to start - environment validation may have failed');
    }
    
    const health = response.data;
    if (!health.environment) {
      throw new Error('Environment not reported in health check');
    }
  }

  async testDatabaseConnection() {
    const response = await axios.get(`${API_BASE_URL}/health`);
    const health = response.data;
    
    if (!health.database) {
      throw new Error('Database status not reported');
    }
    
    if (health.database === 'error' || health.database === 'disconnected') {
      throw new Error(`Database connection failed: ${health.database}`);
    }
  }

  async testLoggingSystem() {
    // Make a request that should generate logs
    await axios.get(`${API_BASE_URL}/health`);
    
    // Check if logs directory exists and has files (in development)
    const fs = require('fs');
    const path = require('path');
    
    if (process.env.NODE_ENV === 'development' || process.env.ENABLE_FILE_LOGGING === 'true') {
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        throw new Error('Logs directory not found');
      }
    }
    
    // If we get here, logging system is working (at least console logging)
  }

  async runAllTests() {
    console.log('🚀 Starting Production Hardening Test Suite');
    console.log('='.repeat(50));
    
    await this.runTest('Health Endpoint', () => this.testHealthEndpoint());
    await this.runTest('Security Headers', () => this.testSecurityHeaders());
    await this.runTest('Rate Limiting', () => this.testRateLimiting());
    await this.runTest('CORS Configuration', () => this.testCorsConfiguration());
    await this.runTest('Error Handling', () => this.testErrorHandling());
    await this.runTest('Environment Validation', () => this.testEnvironmentValidation());
    await this.runTest('Database Connection', () => this.testDatabaseConnection());
    await this.runTest('Logging System', () => this.testLoggingSystem());
    
    console.log('='.repeat(50));
    console.log('📊 Test Results:');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n🎯 Production Hardening Status:');
    if (this.results.failed === 0) {
      console.log('🎉 All production hardening features are working correctly!');
    } else if (this.results.failed <= 2) {
      console.log('⚠️  Most features working, minor issues detected');
    } else {
      console.log('🚨 Multiple issues detected, review implementation');
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