#!/usr/bin/env node

/**
 * Help find your Render app name for MPESA_CALLBACK_URL
 */

console.log('🔍 Finding Your Render App Name\n');

console.log('📋 Steps to find your Render app name:');
console.log('1. Go to your Render dashboard: https://render.com/dashboard');
console.log('2. Look at your service name or URL');
console.log('3. The URL format is: https://YOUR-APP-NAME.onrender.com');
console.log('');

console.log('🎯 Common Render app name patterns:');
console.log('- smiling-steps');
console.log('- smiling-steps-api');
console.log('- smiling-steps-backend');
console.log('- your-github-repo-name');
console.log('');

console.log('📝 Once you find it, update MPESA_CALLBACK_URL to:');
console.log('https://YOUR-ACTUAL-APP-NAME.onrender.com/api/mpesa/callback');
console.log('');

console.log('💡 Example:');
console.log('If your app URL is: https://smiling-steps-api.onrender.com');
console.log('Then MPESA_CALLBACK_URL should be: https://smiling-steps-api.onrender.com/api/mpesa/callback');
console.log('');

console.log('✅ After updating, your M-Pesa payments will work correctly!');

// Try to guess from package.json
const fs = require('fs');
const path = require('path');

try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.name) {
      console.log(`\n🤔 Based on your package.json, your app might be named: "${packageJson.name}"`);
      console.log(`So your callback URL might be: https://${packageJson.name}.onrender.com/api/mpesa/callback`);
    }
  }
} catch (error) {
  // Ignore errors
}

console.log('\n🚀 After setting the correct callback URL, redeploy your service!');