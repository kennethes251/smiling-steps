/**
 * M-Pesa Credentials Validation Script
 * 
 * This script validates that all required M-Pesa Daraja API credentials
 * are properly configured in the environment variables.
 * 
 * Usage: node server/scripts/validate-mpesa-credentials.js
 */

const path = require('path');
const fs = require('fs');

// Determine the correct .env path based on execution context
let envPath;
if (fs.existsSync(path.join(__dirname, '../.env'))) {
  // Running from server directory: node scripts/validate-mpesa-credentials.js
  envPath = path.join(__dirname, '../.env');
} else if (fs.existsSync(path.join(__dirname, '../../server/.env'))) {
  // Running from root directory: node server/scripts/validate-mpesa-credentials.js
  envPath = path.join(__dirname, '../../server/.env');
} else {
  console.error('❌ Could not find .env file. Please ensure server/.env exists.');
  process.exit(1);
}

require('dotenv').config({ path: envPath });

const REQUIRED_CREDENTIALS = [
  'MPESA_ENVIRONMENT',
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_BUSINESS_SHORT_CODE',
  'MPESA_PASSKEY',
  'MPESA_CALLBACK_URL'
];

const VALID_ENVIRONMENTS = ['sandbox', 'production'];

/**
 * Validates that all required M-Pesa credentials are present
 */
function validateCredentials() {
  console.log('🔍 Validating M-Pesa Daraja API Credentials...\n');
  
  let isValid = true;
  const missingCredentials = [];
  const invalidCredentials = [];
  
  // Check for missing credentials
  REQUIRED_CREDENTIALS.forEach(credential => {
    const value = process.env[credential];
    
    if (!value || value.trim() === '') {
      missingCredentials.push(credential);
      isValid = false;
      console.log(`❌ ${credential}: Missing`);
    } else if (value.includes('your-') || value.includes('YOUR_')) {
      invalidCredentials.push(credential);
      isValid = false;
      console.log(`⚠️  ${credential}: Not configured (placeholder value detected)`);
    } else {
      console.log(`✅ ${credential}: Configured`);
    }
  });
  
  console.log('\n');
  
  // Validate environment value
  const environment = process.env.MPESA_ENVIRONMENT;
  if (environment && !VALID_ENVIRONMENTS.includes(environment.toLowerCase())) {
    console.log(`❌ MPESA_ENVIRONMENT must be either 'sandbox' or 'production', got: '${environment}'`);
    isValid = false;
  }
  
  // Validate business short code format
  const shortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
  if (shortCode && !/^\d+$/.test(shortCode)) {
    console.log(`❌ MPESA_BUSINESS_SHORT_CODE must be numeric, got: '${shortCode}'`);
    isValid = false;
  }
  
  // Validate callback URL format
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (callbackUrl && !callbackUrl.startsWith('http')) {
    console.log(`❌ MPESA_CALLBACK_URL must be a valid URL starting with http:// or https://`);
    isValid = false;
  }
  
  // Display summary
  console.log('═'.repeat(60));
  
  if (isValid) {
    console.log('✅ All M-Pesa credentials are properly configured!');
    console.log(`\n📍 Environment: ${environment}`);
    console.log(`📍 Business Short Code: ${shortCode}`);
    console.log(`📍 Callback URL: ${callbackUrl}`);
    console.log('\n✨ You can now proceed with M-Pesa integration testing.');
  } else {
    console.log('❌ M-Pesa credentials validation failed!\n');
    
    if (missingCredentials.length > 0) {
      console.log('Missing credentials:');
      missingCredentials.forEach(cred => console.log(`  - ${cred}`));
      console.log('');
    }
    
    if (invalidCredentials.length > 0) {
      console.log('Credentials with placeholder values:');
      invalidCredentials.forEach(cred => console.log(`  - ${cred}`));
      console.log('');
    }
    
    console.log('📖 Please update your server/.env file with valid M-Pesa credentials.');
    console.log('📖 Refer to MPESA_CREDENTIALS_GUIDE.md for instructions on obtaining credentials.');
  }
  
  console.log('═'.repeat(60));
  
  return isValid;
}

/**
 * Display credential configuration guide
 */
function displayGuide() {
  console.log('\n📚 M-Pesa Credentials Configuration Guide\n');
  console.log('To obtain M-Pesa Daraja API credentials:');
  console.log('');
  console.log('1. Visit: https://developer.safaricom.co.ke/');
  console.log('2. Create an account or log in');
  console.log('3. Create a new app in the Daraja portal');
  console.log('4. Select "Lipa Na M-Pesa Online" API');
  console.log('5. Copy the Consumer Key and Consumer Secret');
  console.log('6. For sandbox testing, use the test credentials provided');
  console.log('7. For production, apply for Go Live approval');
  console.log('');
  console.log('Sandbox Test Credentials:');
  console.log('  Business Short Code: 174379');
  console.log('  Passkey: Available in Daraja portal under test credentials');
  console.log('');
  console.log('For detailed instructions, see: MPESA_CREDENTIALS_GUIDE.md');
  console.log('');
}

// Run validation
const isValid = validateCredentials();

// Show guide if validation fails
if (!isValid) {
  displayGuide();
}

// Exit with appropriate code
process.exit(isValid ? 0 : 1);
