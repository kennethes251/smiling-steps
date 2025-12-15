#!/usr/bin/env node

/**
 * Video Call Load Testing Utility
 * 
 * Standalone script for testing video call system under load.
 * Can be run independently to simulate real-world concurrent usage.
 * 
 * Usage:
 *   node test-video-call-load.js [options]
 * 
 * Options:
 *   --concurrent-sessions=N    Number of concurrent sessions (default: 10)
 *   --concurrent-users=N       Number of concurrent users (default: 20)
 *   --duration=N               Test duration in seconds (default: 60)
 *   --server-url=URL           Server URL (default: http://localhost:5000)
 *   --websocket-test           Include WebSocket load testing
 *   --stress-test              Run stress test mode
 *   --verbose                  Verbose output
 */

const axios = require('axios');
const io = require('socket.io-client');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  concurrentSessions: parseInt(args.find(arg => arg.startsWith('--concurrent-sessions='))?.split('=')[1]) || 10,
  concurrentUsers: parseInt(args.find(arg => arg.startsWith('--concurrent-users='))?.split('=')[1]) || 20,
  duration: parseInt(args.find(arg => arg.startsWith('--duration='))?.split('=')[1]) || 60,
  serverUrl: args.find(arg => arg.startsWith('--server-url='))?.split('=')[1] || 'http://localhost:5000',
  websocketTest: args.includes('--websocket-test'),
  stressTest: args.includes('--stress-test'),
  verbose: args.includes('--verbose')
};

console.log('🎥 Video Call Load Testing Utility');
console.log('=====================================');
console.log(`Server URL: ${config.serverUrl}`);
console.log(`Concurrent Sessions: ${config.concurrentSessions}`);
console.log(`Concurrent Users: ${config.concurrentUsers}`);
console.log(`Test Duration: ${config.duration}s`);
console.log(`WebSocket Testing: ${config.websocketTest ? 'Enabled' : 'Disabled'}`);
console.log(`Stress Testing: ${config.stressTest ? 'Enabled' : 'Disabled'}`);
console.log('=====================================\n');

// Test data
let testUsers = [];
let testSessions = [];
let authTokens = [];

// Statistics tracking
const stats = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    responseTimes: []
  },
  websockets: {
    connections: 0,
    successful: 0,
    failed: 0,
    connectionTimes: []
  },
  errors: []
};

// Utility functions
function log(message, force = false) {
  if (config.verbose || force) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

function generateTestData() {
  log('Generating test data...');
  
  // Generate test users
  for (let i = 0; i < config.concurrentUsers; i++) {
    const isClient = i % 2 === 0;
    testUsers.push({
      id: `test-user-${i}`,
      name: `Test ${isClient ? 'Client' : 'Psychologist'} ${i}`,
      email: `${isClient ? 'client' : 'psychologist'}${i}@loadtest.com`,
      role: isClient ? 'client' : 'psychologist'
    });
  }
  
  // Generate test sessions
  for (let i = 0; i < config.concurrentSessions; i++) {
    testSessions.push({
      id: `test-session-${i}`,
      clientId: testUsers[i * 2]?.id || testUsers[0].id,
      psychologistId: testUsers[i * 2 + 1]?.id || testUsers[1].id,
      meetingLink: `load-test-room-${i}`,
      sessionDate: new Date(Date.now() + 3600000).toISOString(),
      status: 'Confirmed',
      paymentStatus: 'Confirmed'
    });
  }
  
  log(`Generated ${testUsers.length} users and ${testSessions.length} sessions`);
}

async function makeRequest(method, endpoint, data = null, token = null) {
  const startTime = performance.now();
  stats.requests.total++;
  
  try {
    const config = {
      method,
      url: `${config.serverUrl}${endpoint}`,
      timeout: 10000,
      headers: {}
    };
    
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    
    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }
    
    const response = await axios(config);
    const responseTime = performance.now() - startTime;
    
    stats.requests.successful++;
    stats.requests.responseTimes.push(responseTime);
    
    log(`${method} ${endpoint} - ${response.status} (${responseTime.toFixed(2)}ms)`);
    return { success: true, data: response.data, responseTime };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    stats.requests.failed++;
    stats.errors.push({
      type: 'http',
      endpoint,
      error: error.message,
      responseTime
    });
    
    log(`${method} ${endpoint} - ERROR: ${error.message} (${responseTime.toFixed(2)}ms)`);
    return { success: false, error: error.message, responseTime };
  }
}

async function testWebSocketConnection(token, roomId, sessionId) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    stats.websockets.connections++;
    
    const socket = io(config.serverUrl, {
      auth: { token },
      timeout: 10000
    });
    
    let resolved = false;
    
    socket.on('connect', () => {
      if (resolved) return;
      resolved = true;
      
      const connectionTime = performance.now() - startTime;
      stats.websockets.successful++;
      stats.websockets.connectionTimes.push(connectionTime);
      
      log(`WebSocket connected (${connectionTime.toFixed(2)}ms)`);
      
      // Test room join
      socket.emit('join-room', { roomId, sessionId });
      
      socket.on('join-success', () => {
        log(`Joined room ${roomId}`);
        socket.disconnect();
        resolve({ success: true, connectionTime });
      });
      
      socket.on('join-error', (error) => {
        log(`Join error: ${error.error}`);
        socket.disconnect();
        resolve({ success: false, error: error.error, connectionTime });
      });
      
      // Timeout for join
      setTimeout(() => {
        if (!resolved) {
          socket.disconnect();
          resolve({ success: false, error: 'Join timeout', connectionTime });
        }
      }, 5000);
    });
    
    socket.on('connect_error', (error) => {
      if (resolved) return;
      resolved = true;
      
      const connectionTime = performance.now() - startTime;
      stats.websockets.failed++;
      stats.errors.push({
        type: 'websocket',
        error: error.message,
        connectionTime
      });
      
      log(`WebSocket connection failed: ${error.message} (${connectionTime.toFixed(2)}ms)`);
      resolve({ success: false, error: error.message, connectionTime });
    });
    
    // Overall timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        stats.websockets.failed++;
        socket.disconnect();
        resolve({ success: false, error: 'Connection timeout' });
      }
    }, 10000);
  });
}

async function runAPILoadTest() {
  console.log('🚀 Starting API Load Test...\n');
  
  const tests = [
    {
      name: 'WebRTC Config',
      endpoint: '/api/video-calls/config',
      method: 'GET',
      concurrent: config.concurrentUsers
    },
    {
      name: 'Can Join Check',
      endpoint: (i) => `/api/video-calls/can-join/test-session-${i % config.concurrentSessions}`,
      method: 'GET',
      concurrent: config.concurrentUsers,
      requiresAuth: true
    },
    {
      name: 'Room Generation',
      endpoint: (i) => `/api/video-calls/generate-room/test-session-${i % config.concurrentSessions}`,
      method: 'POST',
      concurrent: Math.min(config.concurrentSessions, 10), // Limit to avoid too many rooms
      requiresAuth: true
    }
  ];
  
  for (const test of tests) {
    console.log(`📊 Testing: ${test.name}`);
    const promises = [];
    const startTime = performance.now();
    
    for (let i = 0; i < test.concurrent; i++) {
      const endpoint = typeof test.endpoint === 'function' ? test.endpoint(i) : test.endpoint;
      const token = test.requiresAuth ? `fake-token-${i}` : null; // Using fake tokens for load test
      
      promises.push(makeRequest(test.method, endpoint, null, token));
    }
    
    const results = await Promise.all(promises);
    const totalTime = performance.now() - startTime;
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    
    console.log(`  Concurrent requests: ${test.concurrent}`);
    console.log(`  Successful: ${successful}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Success rate: ${((successful / test.concurrent) * 100).toFixed(2)}%`);
    console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Total time: ${totalTime.toFixed(2)}ms\n`);
  }
}

async function runWebSocketLoadTest() {
  if (!config.websocketTest) {
    return;
  }
  
  console.log('🔌 Starting WebSocket Load Test...\n');
  
  const concurrentConnections = Math.min(config.concurrentUsers, 10);
  const promises = [];
  
  for (let i = 0; i < concurrentConnections; i++) {
    const token = `fake-token-${i}`;
    const roomId = `load-test-room-${i % config.concurrentSessions}`;
    const sessionId = `test-session-${i % config.concurrentSessions}`;
    
    promises.push(testWebSocketConnection(token, roomId, sessionId));
  }
  
  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`📊 WebSocket Load Test Results:`);
  console.log(`  Concurrent connections: ${concurrentConnections}`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Success rate: ${((successful / concurrentConnections) * 100).toFixed(2)}%`);
  
  if (stats.websockets.connectionTimes.length > 0) {
    const avgConnectionTime = stats.websockets.connectionTimes.reduce((a, b) => a + b, 0) / stats.websockets.connectionTimes.length;
    console.log(`  Average connection time: ${avgConnectionTime.toFixed(2)}ms`);
  }
  
  console.log('');
}

async function runStressTest() {
  if (!config.stressTest) {
    return;
  }
  
  console.log('🔥 Starting Stress Test...\n');
  
  const duration = config.duration * 1000; // Convert to milliseconds
  const startTime = performance.now();
  const requestInterval = 100; // Request every 100ms
  
  console.log(`Running stress test for ${config.duration} seconds...`);
  
  const stressTestPromise = new Promise((resolve) => {
    const interval = setInterval(async () => {
      if (performance.now() - startTime >= duration) {
        clearInterval(interval);
        resolve();
        return;
      }
      
      // Random API call
      const randomEndpoint = [
        '/api/video-calls/config',
        `/api/video-calls/can-join/test-session-${Math.floor(Math.random() * config.concurrentSessions)}`,
      ][Math.floor(Math.random() * 2)];
      
      const token = randomEndpoint.includes('can-join') ? `fake-token-${Math.floor(Math.random() * config.concurrentUsers)}` : null;
      
      makeRequest('GET', randomEndpoint, null, token).catch(() => {
        // Ignore errors in stress test
      });
    }, requestInterval);
  });
  
  await stressTestPromise;
  
  const totalTime = performance.now() - startTime;
  console.log(`🔥 Stress Test Completed in ${(totalTime / 1000).toFixed(2)}s\n`);
}

function printFinalReport() {
  console.log('📈 Final Load Test Report');
  console.log('=========================');
  
  // HTTP Requests
  console.log(`HTTP Requests:`);
  console.log(`  Total: ${stats.requests.total}`);
  console.log(`  Successful: ${stats.requests.successful}`);
  console.log(`  Failed: ${stats.requests.failed}`);
  console.log(`  Success Rate: ${((stats.requests.successful / stats.requests.total) * 100).toFixed(2)}%`);
  
  if (stats.requests.responseTimes.length > 0) {
    const avgResponseTime = stats.requests.responseTimes.reduce((a, b) => a + b, 0) / stats.requests.responseTimes.length;
    const minResponseTime = Math.min(...stats.requests.responseTimes);
    const maxResponseTime = Math.max(...stats.requests.responseTimes);
    const p95ResponseTime = stats.requests.responseTimes.sort((a, b) => a - b)[Math.floor(stats.requests.responseTimes.length * 0.95)];
    
    console.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    console.log(`  Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
    console.log(`  95th Percentile: ${p95ResponseTime.toFixed(2)}ms`);
  }
  
  // WebSocket Connections
  if (config.websocketTest && stats.websockets.connections > 0) {
    console.log(`\nWebSocket Connections:`);
    console.log(`  Total: ${stats.websockets.connections}`);
    console.log(`  Successful: ${stats.websockets.successful}`);
    console.log(`  Failed: ${stats.websockets.failed}`);
    console.log(`  Success Rate: ${((stats.websockets.successful / stats.websockets.connections) * 100).toFixed(2)}%`);
    
    if (stats.websockets.connectionTimes.length > 0) {
      const avgConnectionTime = stats.websockets.connectionTimes.reduce((a, b) => a + b, 0) / stats.websockets.connectionTimes.length;
      console.log(`  Average Connection Time: ${avgConnectionTime.toFixed(2)}ms`);
    }
  }
  
  // Errors
  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length} total):`);
    const errorCounts = {};
    stats.errors.forEach(error => {
      const key = `${error.type}: ${error.error}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`  ${error}: ${count}`);
    });
  }
  
  // Performance Assessment
  console.log(`\nPerformance Assessment:`);
  const overallSuccessRate = (stats.requests.successful / stats.requests.total) * 100;
  const avgResponseTime = stats.requests.responseTimes.length > 0 
    ? stats.requests.responseTimes.reduce((a, b) => a + b, 0) / stats.requests.responseTimes.length 
    : 0;
  
  console.log(`  Overall Success Rate: ${overallSuccessRate.toFixed(2)}% ${overallSuccessRate >= 95 ? '✅' : overallSuccessRate >= 90 ? '⚠️' : '❌'}`);
  console.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms ${avgResponseTime <= 1000 ? '✅' : avgResponseTime <= 3000 ? '⚠️' : '❌'}`);
  
  if (config.websocketTest && stats.websockets.connections > 0) {
    const wsSuccessRate = (stats.websockets.successful / stats.websockets.connections) * 100;
    console.log(`  WebSocket Success Rate: ${wsSuccessRate.toFixed(2)}% ${wsSuccessRate >= 90 ? '✅' : wsSuccessRate >= 80 ? '⚠️' : '❌'}`);
  }
  
  console.log('\n=========================');
}

async function main() {
  try {
    generateTestData();
    
    await runAPILoadTest();
    await runWebSocketLoadTest();
    await runStressTest();
    
    printFinalReport();
    
    console.log('✅ Load testing completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Load testing failed:', error.message);
    if (config.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Load test interrupted by user');
  printFinalReport();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ Load test terminated');
  printFinalReport();
  process.exit(0);
});

// Run the load test
main();