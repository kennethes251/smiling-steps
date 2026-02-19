/**
 * System Health Check
 * 
 * Comprehensive health check for the teletherapy booking system.
 * Verifies all critical components are operational and properly configured.
 */

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../index');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/encryption');

// Health check results
const healthResults = {
  timestamp: new Date().toISOString(),
  overall: 'UNKNOWN',
  checks: []
};

function addCheck(name, status, message, details = {}) {
  healthResults.checks.push({
    name,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  });
  
  console.log(`${status === 'PASS' ? '✅' : '❌'} ${name}: ${message}`);
}

async function checkDatabase() {
  console.log('\n🔍 Checking Database Connectivity...');
  
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI);
    }
    
    addCheck('Database Connection', 'PASS', 'MongoDB connected successfully', {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    });
    
    // Test database operations
    const testUser = await User.findOne().limit(1);
    addCheck('Database Operations', 'PASS', 'Database queries working', {
      sampleQuery: 'User.findOne() executed successfully'
    });
    
    // Check indexes
    const userIndexes = await User.collection.getIndexes();
    addCheck('Database Indexes', 'PASS', `Found ${Object.keys(userIndexes).length} indexes on User collection`, {
      indexes: Object.keys(userIndexes)
    });
    
  } catch (error) {
    addCheck('Database Connection', 'FAIL', `Database connection failed: ${error.message}`, {
      error: error.message
    });
  }
}

async function checkAPIEndpoints() {
  console.log('\n🔍 Checking API Endpoints...');
  
  const endpoints = [
    { method: 'GET', path: '/api/health', expectedStatus: 200, description: 'Health check endpoint' },
    { method: 'GET', path: '/api/public/psychologists', expectedStatus: 200, description: 'Public psychologists list' },
    { method: 'POST', path: '/api/auth/login', expectedStatus: 400, description: 'Login endpoint (without credentials)' },
    { method: 'POST', path: '/api/auth/register', expectedStatus: 400, description: 'Registration endpoint (without data)' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await request(app)[endpoint.method.toLowerCase()](endpoint.path);
      
      if (response.status === endpoint.expectedStatus) {
        addCheck(`API Endpoint ${endpoint.method} ${endpoint.path}`, 'PASS', endpoint.description, {
          status: response.status,
          responseTime: response.duration || 'N/A'
        });
      } else {
        addCheck(`API Endpoint ${endpoint.method} ${endpoint.path}`, 'FAIL', 
          `Expected status ${endpoint.expectedStatus}, got ${response.status}`, {
          expectedStatus: endpoint.expectedStatus,
          actualStatus: response.status
        });
      }
    } catch (error) {
      addCheck(`API Endpoint ${endpoint.method} ${endpoint.path}`, 'FAIL', 
        `Endpoint error: ${error.message}`, {
        error: error.message
      });
    }
  }
}

async function checkEncryption() {
  console.log('\n🔍 Checking Encryption System...');
  
  try {
    const testData = 'Sensitive patient information for testing';
    
    // Test encryption
    const encrypted = encrypt(testData);
    if (encrypted === testData) {
      addCheck('Data Encryption', 'FAIL', 'Encryption not working - data returned unchanged');
      return;
    }
    
    // Test decryption
    const decrypted = decrypt(encrypted);
    if (decrypted !== testData) {
      addCheck('Data Encryption', 'FAIL', 'Decryption failed - data corrupted');
      return;
    }
    
    // Test encryption uniqueness (IV randomization)
    const encrypted2 = encrypt(testData);
    if (encrypted === encrypted2) {
      addCheck('Data Encryption', 'FAIL', 'Encryption not using random IV - security risk');
      return;
    }
    
    addCheck('Data Encryption', 'PASS', 'Encryption/decryption working correctly', {
      originalLength: testData.length,
      encryptedLength: encrypted.length,
      uniqueEncryption: encrypted !== encrypted2
    });
    
  } catch (error) {
    addCheck('Data Encryption', 'FAIL', `Encryption system error: ${error.message}`, {
      error: error.message
    });
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Configuration...');
  
  const requiredVars = [
    { name: 'JWT_SECRET', required: true, description: 'JWT token signing secret' },
    { name: 'ENCRYPTION_KEY', required: true, description: 'Data encryption key' },
    { name: 'MONGODB_URI', required: true, description: 'MongoDB connection string' },
    { name: 'EMAIL_USER', required: false, description: 'SMTP email user' },
    { name: 'EMAIL_PASSWORD', required: false, description: 'SMTP email password' },
    { name: 'MPESA_CONSUMER_KEY', required: false, description: 'M-Pesa API consumer key' },
    { name: 'MPESA_CONSUMER_SECRET', required: false, description: 'M-Pesa API consumer secret' }
  ];
  
  let missingRequired = 0;
  let missingOptional = 0;
  
  for (const envVar of requiredVars) {
    const value = process.env[envVar.name];
    
    if (!value) {
      if (envVar.required) {
        missingRequired++;
        addCheck(`Environment Variable ${envVar.name}`, 'FAIL', 
          `Required variable missing: ${envVar.description}`);
      } else {
        missingOptional++;
        addCheck(`Environment Variable ${envVar.name}`, 'WARN', 
          `Optional variable missing: ${envVar.description}`);
      }
    } else {
      addCheck(`Environment Variable ${envVar.name}`, 'PASS', 
        `Variable configured: ${envVar.description}`, {
        length: value.length,
        hasValue: true
      });
    }
  }
  
  if (missingRequired === 0) {
    addCheck('Environment Configuration', 'PASS', 
      `All required variables present. ${missingOptional} optional variables missing.`);
  } else {
    addCheck('Environment Configuration', 'FAIL', 
      `${missingRequired} required variables missing, ${missingOptional} optional variables missing`);
  }
}

async function checkSecurity() {
  console.log('\n🔍 Checking Security Configuration...');
  
  try {
    // Check JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      addCheck('JWT Security', 'FAIL', 'JWT secret too short (should be at least 32 characters)', {
        currentLength: jwtSecret.length,
        recommendedLength: 32
      });
    } else if (jwtSecret) {
      addCheck('JWT Security', 'PASS', 'JWT secret has adequate length', {
        length: jwtSecret.length
      });
    }
    
    // Check encryption key
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (encryptionKey && encryptionKey.length < 32) {
      addCheck('Encryption Key Security', 'FAIL', 'Encryption key too short', {
        currentLength: encryptionKey.length,
        recommendedLength: 32
      });
    } else if (encryptionKey) {
      addCheck('Encryption Key Security', 'PASS', 'Encryption key has adequate length', {
        length: encryptionKey.length
      });
    }
    
    // Check for development/test secrets in production
    if (process.env.NODE_ENV === 'production') {
      const testSecrets = ['test', 'development', 'dev', 'secret', 'password'];
      const hasTestSecret = testSecrets.some(test => 
        (jwtSecret && jwtSecret.toLowerCase().includes(test)) ||
        (encryptionKey && encryptionKey.toLowerCase().includes(test))
      );
      
      if (hasTestSecret) {
        addCheck('Production Security', 'FAIL', 'Test/development secrets detected in production');
      } else {
        addCheck('Production Security', 'PASS', 'No test secrets detected in production');
      }
    }
    
  } catch (error) {
    addCheck('Security Configuration', 'FAIL', `Security check error: ${error.message}`, {
      error: error.message
    });
  }
}

async function checkPerformance() {
  console.log('\n🔍 Checking Performance...');
  
  try {
    // Test API response times
    const startTime = Date.now();
    
    await request(app)
      .get('/api/public/psychologists')
      .expect(200);
    
    const responseTime = Date.now() - startTime;
    
    if (responseTime < 2000) {
      addCheck('API Response Time', 'PASS', `Response time within limits: ${responseTime}ms`, {
        responseTime,
        limit: 2000
      });
    } else {
      addCheck('API Response Time', 'FAIL', `Response time too slow: ${responseTime}ms (limit: 2000ms)`, {
        responseTime,
        limit: 2000
      });
    }
    
    // Test database query performance
    const dbStartTime = Date.now();
    await User.findOne().limit(1);
    const dbResponseTime = Date.now() - dbStartTime;
    
    if (dbResponseTime < 1000) {
      addCheck('Database Query Performance', 'PASS', `Query time acceptable: ${dbResponseTime}ms`, {
        queryTime: dbResponseTime,
        limit: 1000
      });
    } else {
      addCheck('Database Query Performance', 'FAIL', `Query time too slow: ${dbResponseTime}ms`, {
        queryTime: dbResponseTime,
        limit: 1000
      });
    }
    
  } catch (error) {
    addCheck('Performance Check', 'FAIL', `Performance check error: ${error.message}`, {
      error: error.message
    });
  }
}

async function checkModels() {
  console.log('\n🔍 Checking Data Models...');
  
  const models = [
    'User', 'Session', 'AuditLog', 'ConfidentialityAgreement', 
    'IntakeForm', 'SessionRate', 'AvailabilityWindow'
  ];
  
  for (const modelName of models) {
    try {
      const Model = require(`../models/${modelName}`);
      
      // Check if model is properly defined
      if (Model && Model.schema) {
        addCheck(`Model ${modelName}`, 'PASS', `Model properly defined with schema`, {
          paths: Object.keys(Model.schema.paths).length,
          indexes: Model.schema.indexes().length
        });
      } else {
        addCheck(`Model ${modelName}`, 'FAIL', `Model not properly defined`);
      }
      
    } catch (error) {
      addCheck(`Model ${modelName}`, 'FAIL', `Model loading error: ${error.message}`, {
        error: error.message
      });
    }
  }
}

function calculateOverallHealth() {
  const totalChecks = healthResults.checks.length;
  const passedChecks = healthResults.checks.filter(c => c.status === 'PASS').length;
  const failedChecks = healthResults.checks.filter(c => c.status === 'FAIL').length;
  const warnChecks = healthResults.checks.filter(c => c.status === 'WARN').length;
  
  healthResults.summary = {
    total: totalChecks,
    passed: passedChecks,
    failed: failedChecks,
    warnings: warnChecks,
    successRate: totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(1) : 0
  };
  
  if (failedChecks === 0) {
    healthResults.overall = 'HEALTHY';
  } else if (failedChecks <= 2) {
    healthResults.overall = 'DEGRADED';
  } else {
    healthResults.overall = 'UNHEALTHY';
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('SYSTEM HEALTH CHECK SUMMARY');
  console.log('='.repeat(80));
  
  const { summary } = healthResults;
  
  console.log(`Total Checks: ${summary.total}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⚠️  Warnings: ${summary.warnings}`);
  console.log(`Success Rate: ${summary.successRate}%`);
  
  console.log(`\nOverall Status: ${healthResults.overall}`);
  
  if (healthResults.overall === 'HEALTHY') {
    console.log('🎉 System is healthy and ready for operation!');
  } else if (healthResults.overall === 'DEGRADED') {
    console.log('⚠️  System has minor issues but is operational.');
  } else {
    console.log('❌ System has critical issues that need attention.');
  }
  
  console.log('='.repeat(80));
}

async function runHealthCheck() {
  console.log('🏥 TELETHERAPY BOOKING SYSTEM - HEALTH CHECK');
  console.log('='.repeat(80));
  
  try {
    await checkDatabase();
    await checkAPIEndpoints();
    await checkEncryption();
    await checkEnvironmentVariables();
    await checkSecurity();
    await checkPerformance();
    await checkModels();
    
    calculateOverallHealth();
    printSummary();
    
    // Save results to file
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, '..', 'health-check-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(healthResults, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return healthResults;
    
  } catch (error) {
    console.error(`❌ Health check failed: ${error.message}`);
    healthResults.overall = 'UNHEALTHY';
    healthResults.error = error.message;
    return healthResults;
  }
}

// Run health check if called directly
if (require.main === module) {
  runHealthCheck()
    .then(results => {
      process.exit(results.overall === 'HEALTHY' ? 0 : 1);
    })
    .catch(error => {
      console.error(`Fatal error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  runHealthCheck,
  healthResults
};