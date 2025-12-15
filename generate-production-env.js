#!/usr/bin/env node

/**
 * Generate Production Environment Variables for Render Deployment
 * Run this script to get the exact environment variables needed for Render
 */

const crypto = require('crypto');

console.log('🔐 Generating Production Environment Variables for Render\n');

// Generate secure encryption key
const encryptionKey = crypto.randomBytes(32).toString('hex');
const jwtSecret = crypto.randomBytes(64).toString('hex');

console.log('📋 Copy these environment variables to your Render dashboard:\n');
console.log('='.repeat(60));

const envVars = {
  // Database - Using MongoDB (working locally)
  MONGODB_URI: "mongodb+srv://KennethEsilo:9213@cluster0.m7v7wpi.mongodb.net/smiling-steps?retryWrites=true&w=majority&appName=Cluster0",
  
  // Security (Generated)
  ENCRYPTION_KEY: encryptionKey,
  JWT_SECRET: jwtSecret,
  
  // Node Environment
  NODE_ENV: "production",
  
  // M-Pesa Configuration (From your .env)
  MPESA_CONSUMER_KEY: "HgkrKo6yLdRcXsTOnaDXTAqZAGPRpArcd96OsoiUQrAb7jVd",
  MPESA_CONSUMER_SECRET: "QcgGt7P0i6rvXKanPzAdGmDQvUX2wz4Mb4BynF9yMXrcoXenFSqV31qOilAeFsLE",
  MPESA_BUSINESS_SHORT_CODE: "174379",
  MPESA_PASSKEY: "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
  MPESA_CALLBACK_URL: "https://YOUR_RENDER_APP_NAME.onrender.com/api/mpesa/callback",
  MPESA_ENVIRONMENT: "sandbox"
};

// Display in Render-friendly format
Object.entries(envVars).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('='.repeat(60));
console.log('\n📝 Instructions:');
console.log('1. Go to your Render dashboard');
console.log('2. Select your service');
console.log('3. Go to Environment tab');
console.log('4. Add each variable above');
console.log('5. Replace YOUR_RENDER_APP_NAME with your actual app name');
console.log('6. Save and redeploy');

console.log('\n🔄 Alternative: Use MongoDB-only Configuration');
console.log('Your app can run with MongoDB only. This avoids PostgreSQL connection issues.');

console.log('\n✅ After setting these variables, your deployment should succeed!');