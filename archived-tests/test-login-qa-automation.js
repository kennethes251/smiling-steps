/**
 * Automated QA Testing Suite for Login Feature
 * 
 * This script performs comprehensive testing of the login functionality
 * including security, performance, and user experience aspects.
 * 
 * Usage: node test-login-qa-automation.js
 */

const axios = require('axios');
const chalk = require('chalk');

// Configuration
const CONFIG = {
  baseURL: process.env.API_URL || 'http://localhost:5000',
  testUsers: {
    admin: {
      email: 'admin@example.com',
      password: 'Admin123!',
      expectedRole: 'admin',
      expectedRedirect: '/admin-dashboard'
    },
    psychologist: {
      email: 'psychologist@example.com',
      password: 'Psych123!',
      expectedRole: 'psychologist',
      expectedRedirect: '/psychologist-dashboard'
    },
    client: {
      email: 'client@example.com',
      password: 'Client123!',
      expectedRole: 'client',
      expectedRedirect: '/client-dashboard'
    }
  }
};

// Test Results Tracker
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Utility Functions
function logTest(name, status, message = '', duration = 0) {
  const statusSymbol = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⚠';
  const statusColor = status === 'pass' ? chalk.green : status === 'fail' ? chalk.red : chalk.yellow;
  
  console.log(statusColor(`${statusSymbol} ${name}`) + (message ? ` - ${message}` : '') + (duration ? chalk.gray(` (${duration}ms)`) : ''));
  
  results.tests.push({ name, status, message, duration });
  if (status === 'pass') results.passed++;
  else if (status === 'fail') results.failed++;
  else results.warnings++;
}

function logSection(title) {
  console.log('\n' + chalk.bold.cyan(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`));
}

// Test Functions

async function testBasicConnectivity() {
  logSection('1. BASIC CONNECTIVITY TESTS');
  
  try {
    const start = Date.now();
    const response = await axios.get(`${CONFIG.baseURL}/api/health`, { timeout: 5000 });
    const duration = Date.now() - start;
    
    if (response.status === 200) {
      logTest('Server is reachable', 'pass', '', duration);
    } else {
      logTest('Server is reachable', 'fail', `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    logTest('Server is reachable', 'fail', error.message);
  }
}

async function testSuccessfulLogin(userType) {
  const user = CONFIG.testUsers[userType];
  
  try {
    const start = Date.now();
    const response = await axios.post(`${CONFIG.baseURL}/api/auth/login`, {
      email: user.email,
      password: user.password
    });
    const duration = Date.now() - start;
    
    // Check response status
    if (response.status !== 200) {
      logTest(`${userType} login - Status code`, 'fail', `Expected 200, got ${response.status}`);
      return null;
    }
    logTest(`${userType} login - Status code`, 'pass', '', duration);
    
    // Check token presence
    if (response.data.token) {
      logTest(`${userType} login - JWT token received`, 'pass');
    } else {
      logTest(`${userType} login - JWT token received`, 'fail', 'No token in response');
    }
    
    // Check user data
    if (response.data.user) {
      logTest(`${userType} login - User data received`, 'pass');
      
      // Check role
      if (response.data.user.role === user.expectedRole) {
        logTest(`${userType} login - Correct role`, 'pass', `Role: ${response.data.user.role}`);
      } else {
        logTest(`${userType} login - Correct role`, 'fail', `Expected ${user.expectedRole}, got ${response.data.user.role}`);
      }
    } else {
      logTest(`${userType} login - User data received`, 'fail', 'No user data in response');
    }
    
    // Check performance
    if (duration < 2000) {
      logTest(`${userType} login - Performance`, 'pass', `${duration}ms < 2000ms`);
    } else {
      logTest(`${userType} login - Performance`, 'warn', `${duration}ms exceeds 2000ms threshold`);
    }
    
    return response.data.token;
    
  } catch (error) {
    logTest(`${userType} login - Request`, 'fail', error.message);
    return null;
  }
}

async function testFailedLoginScenarios() {
  logSection('3. FAILED LOGIN SCENARIOS');
  
  // Test 1: Invalid email
  try {
    await axios.post(`${CONFIG.baseURL}/api/auth/login`, {
      email: 'nonexistent@example.com',
      password: 'SomePassword123!'
    });
    logTest('Invalid email - Error handling', 'fail', 'Should have returned error');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logTest('Invalid email - Error handling', 'pass', 'Returns 401 as expected');
    } else {
      logTest('Invalid email - Error handling', 'fail', `Unexpected error: ${error.message}`);
    }
  }
  
  // Test 2: Invalid password
  try {
    await axios.post(`${CONFIG.baseURL}/api/auth/login`, {
      email: CONFIG.testUsers.client.email,
      password: 'WrongPassword123!'
    });
    logTest('Invalid password - Error handling', 'fail', 'Should have returned error');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logTest('Invalid password - Error handling', 'pass', 'Returns 401 as expected');
    } else {
      logTest('Invalid password - Error handling', 'fail', `Unexpected error: ${error.message}`);
    }
  }
  
  // Test 3: Empty credentials
  try {
    await axios.post(`${CONFIG.baseURL}/api/auth/login`, {
      email: '',
      password: ''
    });
    logTest('Empty credentials - Validation', 'fail', 'Should have returned validation error');
  } catch (error) {
    if (error.response && (error.response.status === 400 || error.response.status === 422)) {
      logTest('Empty credentials - Validation', 'pass', 'Returns validation error as expected');
    } else {
      logTest('Empty credentials - Validation', 'fail', `Unexpected error: ${error.message}`);
    }
  }
  
  // Test 4: Malformed email
  try {
    await axios.post(`${CONFIG.baseURL}/api/auth/login`, {
      email: 'not-an-email',
      password: 'SomePassword123!'
    });
    logTest('Malformed email - Validation', 'fail', 'Should have returned validation error');
  } catch (error) {
    if (error.response && (error.response.status === 400 || error.response.status === 422)) {
      logTest('Malformed email - Validation', 'pass', 'Returns validation error as expected');
    } else {
      logTest('Malformed email - Validation', 'warn', `Unexpected error: ${error.message}`);
    }
  }
}

async function testSecurityFeatures() {
  logSection('4. SECURITY TESTS');
  
  // Test 1: SQL Injection attempt
  try {
    await axios.post(`${CONFIG.baseURL}/api/auth/login`, {
      email: "admin@example.com' OR '1'='1",
      password: "password' OR '1'='1"
    });
    logTest('SQL Injection protection', 'fail', 'Injection attempt succeeded');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logTest('SQL Injection protection', 'pass', 'Injection attempt blocked');
    } else {
      logTest('SQL Injection protection', 'warn', 'Unexpected response');
    }
  }
  
  // Test 2: XSS attempt
  try {
    await axios.post(`${CONFIG.baseURL}/api/auth/login`, {
      email: '<script>alert("XSS")</script>@example.com',
      password: 'password'
    });
    logTest('XSS protection', 'fail', 'XSS attempt succeeded');
  } catch (error) {
    if (error.response) {
      const responseText = JSON.stringify(error.response.data);
      if (responseText.includes('<script>')) {
        logTest('XSS protection', 'fail', 'Script tag not sanitized');
      } else {
        logTest('XSS protection', 'pass', 'XSS attempt sanitized');
      }
    } else {
      logTest('XSS protection', 'warn', 'Could not verify XSS protection');
    }
  }
  
  // Test 3: Rate limiting (multiple rapid requests)
  logTest('Rate limiting', 'warn', 'Manual verification recommended');
}

async function testAuthenticatedRequests(token) {
  logSection('5. AUTHENTICATED REQUEST TESTS');
  
  if (!token) {
    logTest('Authenticated requests', 'fail', 'No token available for testing');
    return;
  }
  
  try {
    const response = await axios.get(`${CONFIG.baseURL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.status === 200 && response.data.user) {
      logTest('Token authentication', 'pass', 'Token accepted and user data returned');
    } else {
      logTest('Token authentication', 'fail', 'Unexpected response');
    }
  } catch (error) {
    logTest('Token authentication', 'fail', error.message);
  }
  
  // Test with invalid token
  try {
    await axios.get(`${CONFIG.baseURL}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid-token-12345' }
    });
    logTest('Invalid token rejection', 'fail', 'Invalid token was accepted');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logTest('Invalid token rejection', 'pass', 'Invalid token rejected');
    } else {
      logTest('Invalid token rejection', 'warn', 'Unexpected error response');
    }
  }
}

async function testResponseFormat() {
  logSection('6. RESPONSE FORMAT TESTS');
  
  try {
    const response = await axios.post(`${CONFIG.baseURL}/api/auth/login`, {
      email: CONFIG.testUsers.client.email,
      password: CONFIG.testUsers.client.password
    });
    
    // Check response structure
    const hasToken = 'token' in response.data;
    const hasUser = 'user' in response.data;
    const hasMessage = 'message' in response.data;
    
    logTest('Response has token field', hasToken ? 'pass' : 'fail');
    logTest('Response has user field', hasUser ? 'pass' : 'fail');
    logTest('Response has message field', hasMessage ? 'pass' : 'warn', 'Optional field');
    
    // Check user object structure
    if (hasUser) {
      const user = response.data.user;
      logTest('User has id field', 'id' in user ? 'pass' : 'fail');
      logTest('User has email field', 'email' in user ? 'pass' : 'fail');
      logTest('User has role field', 'role' in user ? 'pass' : 'fail');
      logTest('User password not exposed', !('password' in user) ? 'pass' : 'fail', 'Security issue!');
    }
    
  } catch (error) {
    logTest('Response format test', 'fail', error.message);
  }
}

async function testErrorMessages() {
  logSection('7. ERROR MESSAGE TESTS');
  
  try {
    await axios.post(`${CONFIG.baseURL}/api/auth/login`, {
      email: 'wrong@example.com',
      password: 'wrongpassword'
    });
  } catch (error) {
    if (error.response && error.response.data) {
      const errorMessage = error.response.data.message || error.response.data.error;
      
      // Check if error message is user-friendly
      const isGeneric = errorMessage && (
        errorMessage.toLowerCase().includes('invalid') ||
        errorMessage.toLowerCase().includes('incorrect')
      );
      
      // Check if error message doesn't reveal too much
      const isSafe = errorMessage && !(
        errorMessage.toLowerCase().includes('user not found') ||
        errorMessage.toLowerCase().includes('email does not exist')
      );
      
      logTest('Error message is user-friendly', isGeneric ? 'pass' : 'warn', errorMessage);
      logTest('Error message is secure', isSafe ? 'pass' : 'fail', 'Should not reveal if user exists');
    }
  }
}

// Main Test Runner
async function runAllTests() {
  console.log(chalk.bold.blue('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║        LOGIN FEATURE QA AUTOMATION TEST SUITE             ║'));
  console.log(chalk.bold.blue('╚════════════════════════════════════════════════════════════╝\n'));
  
  console.log(chalk.gray(`Testing against: ${CONFIG.baseURL}`));
  console.log(chalk.gray(`Start time: ${new Date().toLocaleString()}\n`));
  
  // Run all test suites
  await testBasicConnectivity();
  
  logSection('2. SUCCESSFUL LOGIN TESTS');
  const adminToken = await testSuccessfulLogin('admin');
  const psychToken = await testSuccessfulLogin('psychologist');
  const clientToken = await testSuccessfulLogin('client');
  
  await testFailedLoginScenarios();
  await testSecurityFeatures();
  await testAuthenticatedRequests(clientToken);
  await testResponseFormat();
  await testErrorMessages();
  
  // Print Summary
  logSection('TEST SUMMARY');
  console.log(chalk.green(`✓ Passed: ${results.passed}`));
  console.log(chalk.red(`✗ Failed: ${results.failed}`));
  console.log(chalk.yellow(`⚠ Warnings: ${results.warnings}`));
  console.log(chalk.gray(`Total Tests: ${results.tests.length}`));
  
  const passRate = ((results.passed / results.tests.length) * 100).toFixed(1);
  console.log(chalk.bold(`\nPass Rate: ${passRate}%`));
  
  if (results.failed === 0) {
    console.log(chalk.bold.green('\n✓ ALL CRITICAL TESTS PASSED!\n'));
  } else {
    console.log(chalk.bold.red('\n✗ SOME TESTS FAILED - REVIEW REQUIRED\n'));
  }
  
  // Generate report file
  const report = {
    timestamp: new Date().toISOString(),
    baseURL: CONFIG.baseURL,
    summary: {
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings,
      total: results.tests.length,
      passRate: passRate + '%'
    },
    tests: results.tests
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    `qa-login-report-${Date.now()}.json`,
    JSON.stringify(report, null, 2)
  );
  
  console.log(chalk.gray(`Report saved to: qa-login-report-${Date.now()}.json\n`));
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error(chalk.red('\n✗ Test suite failed with error:'), error);
  process.exit(1);
});
