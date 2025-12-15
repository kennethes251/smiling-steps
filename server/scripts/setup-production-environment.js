/**
 * Production Environment Setup Script
 * 
 * This script helps configure the production environment for M-Pesa payment integration.
 * It validates credentials, tests connectivity, and ensures all required configurations are in place.
 * 
 * Usage: node scripts/setup-production-environment.js
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

/**
 * Check if all required environment variables are set
 */
function checkEnvironmentVariables() {
  logSection('1. Checking Environment Variables');
  
  const required = [
    'MPESA_ENVIRONMENT',
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_BUSINESS_SHORT_CODE',
    'MPESA_PASSKEY',
    'MPESA_CALLBACK_URL',
    'DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'NODE_ENV'
  ];
  
  const optional = [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'AFRICASTALKING_USERNAME',
    'AFRICASTALKING_API_KEY'
  ];
  
  let allPresent = true;
  
  // Check required variables
  log('Required Variables:', 'bright');
  required.forEach(varName => {
    if (process.env[varName]) {
      logSuccess(`${varName}: Set`);
    } else {
      logError(`${varName}: Missing`);
      allPresent = false;
    }
  });
  
  // Check optional variables
  log('\nOptional Variables:', 'bright');
  optional.forEach(varName => {
    if (process.env[varName]) {
      logSuccess(`${varName}: Set`);
    } else {
      logWarning(`${varName}: Not set (optional)`);
    }
  });
  
  return allPresent;
}

/**
 * Validate M-Pesa environment configuration
 */
function validateMpesaConfig() {
  logSection('2. Validating M-Pesa Configuration');
  
  const environment = process.env.MPESA_ENVIRONMENT;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  
  // Check environment
  if (environment === 'production') {
    logSuccess('Environment: Production');
    logWarning('⚠️  PRODUCTION MODE - Real money will be processed!');
  } else if (environment === 'sandbox') {
    logInfo('Environment: Sandbox (Test Mode)');
  } else {
    logError(`Invalid environment: ${environment}`);
    return false;
  }
  
  // Check callback URL
  if (callbackUrl) {
    if (callbackUrl.startsWith('https://')) {
      logSuccess(`Callback URL: ${callbackUrl}`);
      
      if (environment === 'production' && callbackUrl.includes('localhost')) {
        logError('Production environment cannot use localhost callback URL');
        return false;
      }
    } else {
      logError('Callback URL must use HTTPS');
      return false;
    }
  }
  
  // Check credentials format
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
  const passkey = process.env.MPESA_PASSKEY;
  
  if (consumerKey && consumerKey.length > 20) {
    logSuccess('Consumer Key: Valid format');
  } else {
    logError('Consumer Key: Invalid format');
    return false;
  }
  
  if (consumerSecret && consumerSecret.length > 20) {
    logSuccess('Consumer Secret: Valid format');
  } else {
    logError('Consumer Secret: Invalid format');
    return false;
  }
  
  if (shortCode && /^\d+$/.test(shortCode)) {
    logSuccess(`Business Short Code: ${shortCode}`);
  } else {
    logError('Business Short Code: Invalid format (must be numeric)');
    return false;
  }
  
  if (passkey && passkey.length > 20) {
    logSuccess('Passkey: Valid format');
  } else {
    logError('Passkey: Invalid format');
    return false;
  }
  
  return true;
}

/**
 * Test M-Pesa API connectivity
 */
async function testMpesaConnectivity() {
  logSection('3. Testing M-Pesa API Connectivity');
  
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const environment = process.env.MPESA_ENVIRONMENT;
    
    const baseURL = environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    
    logInfo(`Testing connection to ${baseURL}...`);
    
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    const response = await axios.get(
      `${baseURL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`
        },
        timeout: 10000
      }
    );
    
    if (response.data.access_token) {
      logSuccess('M-Pesa API connection successful');
      logSuccess(`Access token received (expires in ${response.data.expires_in} seconds)`);
      return true;
    } else {
      logError('Failed to obtain access token');
      return false;
    }
  } catch (error) {
    logError('M-Pesa API connection failed');
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Message: ${JSON.stringify(error.response.data)}`);
    } else {
      logError(`Error: ${error.message}`);
    }
    return false;
  }
}

/**
 * Test database connectivity
 */
async function testDatabaseConnectivity() {
  logSection('4. Testing Database Connectivity');
  
  try {
    const { Sequelize } = require('sequelize');
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      logError('DATABASE_URL not set');
      return false;
    }
    
    logInfo('Connecting to database...');
    
    const sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });
    
    await sequelize.authenticate();
    logSuccess('Database connection successful');
    
    // Check if Session table exists
    const [results] = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Sessions')"
    );
    
    if (results[0].exists) {
      logSuccess('Session table exists');
    } else {
      logWarning('Session table not found - migration may be needed');
    }
    
    await sequelize.close();
    return true;
  } catch (error) {
    logError('Database connection failed');
    logError(`Error: ${error.message}`);
    return false;
  }
}

/**
 * Check SSL certificate for callback URL
 */
async function checkSSLCertificate() {
  logSection('5. Checking SSL Certificate');
  
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  
  if (!callbackUrl || !callbackUrl.startsWith('https://')) {
    logWarning('Callback URL not using HTTPS - skipping SSL check');
    return true;
  }
  
  try {
    const url = new URL(callbackUrl);
    logInfo(`Checking SSL certificate for ${url.hostname}...`);
    
    const response = await axios.get(`https://${url.hostname}`, {
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    
    logSuccess('SSL certificate is valid');
    return true;
  } catch (error) {
    if (error.code === 'CERT_HAS_EXPIRED') {
      logError('SSL certificate has expired');
    } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      logError('SSL certificate cannot be verified');
    } else {
      logWarning(`Could not verify SSL: ${error.message}`);
    }
    return false;
  }
}

/**
 * Verify webhook endpoint accessibility
 */
async function verifyWebhookEndpoint() {
  logSection('6. Verifying Webhook Endpoint');
  
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  
  if (!callbackUrl) {
    logError('Callback URL not set');
    return false;
  }
  
  try {
    logInfo(`Testing webhook endpoint: ${callbackUrl}`);
    
    const response = await axios.post(callbackUrl, {
      test: 'connectivity'
    }, {
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    
    if (response.status === 200 || response.status === 400) {
      logSuccess('Webhook endpoint is accessible');
      logInfo(`Response status: ${response.status}`);
      return true;
    } else {
      logWarning(`Webhook returned status ${response.status}`);
      return true; // Still accessible, just different status
    }
  } catch (error) {
    logError('Webhook endpoint is not accessible');
    logError(`Error: ${error.message}`);
    logWarning('Ensure your server is running and the URL is publicly accessible');
    return false;
  }
}

/**
 * Generate production environment template
 */
function generateEnvTemplate() {
  logSection('7. Generating Environment Template');
  
  const template = `# M-Pesa Production Environment Configuration
# Generated on ${new Date().toISOString()}

# ============================================
# M-Pesa Configuration
# ============================================
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=your_production_consumer_key
MPESA_CONSUMER_SECRET=your_production_consumer_secret
MPESA_BUSINESS_SHORT_CODE=your_production_shortcode
MPESA_PASSKEY=your_production_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_WEBHOOK_SECRET=your_secure_webhook_secret

# ============================================
# Database Configuration
# ============================================
DATABASE_URL=postgresql://user:password@host:5432/database

# ============================================
# Security
# ============================================
JWT_SECRET=your_production_jwt_secret
ENCRYPTION_KEY=your_production_encryption_key
NODE_ENV=production

# ============================================
# Email Configuration
# ============================================
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=your_email_password
EMAIL_FROM=Smiling Steps <noreply@yourdomain.com>

# ============================================
# SMS Configuration (Optional)
# ============================================
AFRICASTALKING_USERNAME=your_username
AFRICASTALKING_API_KEY=your_api_key
SMS_SENDER_ID=SmilingSteps

# ============================================
# Server Configuration
# ============================================
PORT=5000
`;
  
  const templatePath = path.join(__dirname, '..', '.env.production.template');
  
  try {
    fs.writeFileSync(templatePath, template);
    logSuccess(`Environment template created: ${templatePath}`);
    logInfo('Copy this template and fill in your production values');
    return true;
  } catch (error) {
    logError(`Failed to create template: ${error.message}`);
    return false;
  }
}

/**
 * Main setup function
 */
async function setupProductionEnvironment() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   M-Pesa Payment Integration - Production Setup           ║', 'cyan');
  log('║   Smiling Steps Teletherapy Platform                      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');
  
  const results = {
    envVars: false,
    mpesaConfig: false,
    mpesaConnectivity: false,
    database: false,
    ssl: false,
    webhook: false
  };
  
  // Run all checks
  results.envVars = checkEnvironmentVariables();
  
  if (results.envVars) {
    results.mpesaConfig = validateMpesaConfig();
    
    if (results.mpesaConfig) {
      results.mpesaConnectivity = await testMpesaConnectivity();
    }
    
    results.database = await testDatabaseConnectivity();
    results.ssl = await checkSSLCertificate();
    results.webhook = await verifyWebhookEndpoint();
  }
  
  // Generate template
  generateEnvTemplate();
  
  // Summary
  logSection('Setup Summary');
  
  const checks = [
    { name: 'Environment Variables', status: results.envVars },
    { name: 'M-Pesa Configuration', status: results.mpesaConfig },
    { name: 'M-Pesa API Connectivity', status: results.mpesaConnectivity },
    { name: 'Database Connectivity', status: results.database },
    { name: 'SSL Certificate', status: results.ssl },
    { name: 'Webhook Endpoint', status: results.webhook }
  ];
  
  checks.forEach(check => {
    if (check.status) {
      logSuccess(check.name);
    } else {
      logError(check.name);
    }
  });
  
  const allPassed = Object.values(results).every(r => r === true);
  
  console.log('\n');
  if (allPassed) {
    log('╔════════════════════════════════════════════════════════════╗', 'green');
    log('║   ✅ Production Environment Ready for Deployment          ║', 'green');
    log('╚════════════════════════════════════════════════════════════╝', 'green');
    console.log('\n');
    logInfo('Next steps:');
    logInfo('1. Run database migration: node scripts/migrate-mpesa-fields.js');
    logInfo('2. Deploy backend and frontend');
    logInfo('3. Test payment flow with small amount');
    logInfo('4. Monitor logs and metrics');
  } else {
    log('╔════════════════════════════════════════════════════════════╗', 'red');
    log('║   ❌ Production Environment Not Ready                     ║', 'red');
    log('╚════════════════════════════════════════════════════════════╝', 'red');
    console.log('\n');
    logError('Please fix the issues above before deploying to production');
    logInfo('Refer to MPESA_PRODUCTION_DEPLOYMENT_GUIDE.md for detailed instructions');
  }
  
  console.log('\n');
  process.exit(allPassed ? 0 : 1);
}

// Run setup
setupProductionEnvironment().catch(error => {
  logError(`Setup failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
