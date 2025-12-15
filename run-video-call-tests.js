#!/usr/bin/env node
/**
 * Simple Video Call Test Runner
 * 
 * Runs the most critical video call tests to verify system functionality
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 Running Video Call Test Suite\n');

const tests = [
  {
    name: 'API Tests',
    command: 'node test-video-call-api.js',
    critical: true
  },
  {
    name: 'Server Unit Tests',
    command: 'cd server && npm test -- --testPathPattern="videoCall" --runInBand',
    critical: true
  },
  {
    name: 'Client Component Tests',
    command: 'cd client && npm test -- --testPathPattern="VideoCall" --watchAll=false',
    critical: true
  },
  {
    name: 'Security Tests',
    command: 'node test-video-call-security-comprehensive.js',
    critical: false
  },
  {
    name: 'Load Tests',
    command: 'node test-video-call-load.js --quick',
    critical: false
  }
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  console.log(`🔍 Running: ${test.name}`);
  
  try {
    execSync(test.command, { 
      stdio: 'pipe',
      timeout: 30000
    });
    console.log(`✅ PASSED: ${test.name}\n`);
    passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${test.name}`);
    if (test.critical) {
      console.log(`   Critical test failed: ${error.message.slice(0, 100)}\n`);
      failed++;
    } else {
      console.log(`   Non-critical test failed, continuing...\n`);
    }
  }
}

console.log('📊 Test Results:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log('\n❌ Some critical tests failed. Please review and fix before deployment.');
  process.exit(1);
} else {
  console.log('\n✅ All critical tests passed! Video call system is functional.');
}