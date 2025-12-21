#!/usr/bin/env node

/**
 * Wait for Deployment and Test System
 * 
 * This script waits for the deployment to complete and then runs comprehensive tests
 */

const { SystemTester } = require('./comprehensive-system-test');

async function waitAndTest() {
  console.log('⏳ Waiting for MongoDB deployment to complete...');
  console.log('   This typically takes 2-3 minutes on Render...\n');
  
  // Wait for deployment
  await new Promise(resolve => setTimeout(resolve, 180000)); // 3 minutes
  
  console.log('🚀 Starting comprehensive system test...\n');
  
  const tester = new SystemTester();
  await tester.runAllTests();
}

if (require.main === module) {
  waitAndTest().catch(console.error);
}