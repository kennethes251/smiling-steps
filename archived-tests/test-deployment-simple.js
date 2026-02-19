#!/usr/bin/env node

console.log('🚀 Starting simple deployment test...');

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('✅ Modules loaded successfully');
console.log('📋 Environment variables:');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('  - PORT:', process.env.PORT || 'not set');
console.log('  - MONGODB_URI:', process.env.MONGODB_URI ? 'configured' : 'not set');

console.log('📁 Checking key files...');
const keyFiles = [
  'server/index.js',
  'server/config/webrtc.js',
  'client/src/pages/VideoCallPageNew.js'
];

for (const file of keyFiles) {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}: Found`);
  } else {
    console.log(`  ❌ ${file}: Missing`);
  }
}

console.log('🎯 Simple test completed!');