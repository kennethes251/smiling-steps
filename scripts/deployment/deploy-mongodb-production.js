#!/usr/bin/env node

/**
 * Production Deployment Script - MongoDB Only
 * This script helps deploy to Render using MongoDB instead of PostgreSQL
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up MongoDB-only production deployment...\n');

// Check if MongoDB server file exists
const mongoServerPath = path.join(__dirname, 'server', 'index-mongodb.js');
const packageJsonPath = path.join(__dirname, 'package.json');

if (fs.existsSync(mongoServerPath)) {
  console.log('✅ MongoDB server file found');
  
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Update start script to use MongoDB version
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.start = 'cd server && node index-mongodb.js';
  
  // Write updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log('✅ Updated package.json start script to use MongoDB server');
  console.log('📝 Start script now: cd server && node index-mongodb.js');
  
} else {
  console.log('❌ MongoDB server file not found');
  console.log('💡 Using regular server with MongoDB environment variables should work');
}

// Create render.yaml for MongoDB deployment
const renderConfig = `services:
  - type: web
    name: smiling-steps-api
    env: node
    plan: free
    buildCommand: cd server && npm install
    startCommand: cd server && node index-mongodb.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: ENCRYPTION_KEY
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: MPESA_CONSUMER_KEY
        sync: false
      - key: MPESA_CONSUMER_SECRET
        sync: false
      - key: MPESA_BUSINESS_SHORT_CODE
        sync: false
      - key: MPESA_PASSKEY
        sync: false
      - key: MPESA_CALLBACK_URL
        sync: false
      - key: MPESA_ENVIRONMENT
        value: sandbox
`;

fs.writeFileSync('render.yaml', renderConfig);
console.log('✅ Created render.yaml for MongoDB deployment');

console.log('\n📋 Next Steps:');
console.log('1. Run: node generate-production-env.js');
console.log('2. Copy the environment variables to Render dashboard');
console.log('3. Update MPESA_CALLBACK_URL with your Render app URL');
console.log('4. Commit and push changes to trigger deployment');

console.log('\n🔧 Environment Variables Needed:');
console.log('- MONGODB_URI (your MongoDB connection string)');
console.log('- ENCRYPTION_KEY (32-character random string)');
console.log('- JWT_SECRET (64-character random string)');
console.log('- All MPESA_* variables from your .env file');

console.log('\n✅ This should resolve the PostgreSQL connection issues!');