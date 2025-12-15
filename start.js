#!/usr/bin/env node

// Simple start script to ensure MongoDB version is used
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Smiling Steps with MongoDB...');

const serverPath = path.join(__dirname, 'server');
const child = spawn('node', ['index-mongodb.js'], {
  cwd: serverPath,
  stdio: 'inherit'
});

child.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});