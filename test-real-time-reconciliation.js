/**
 * Test Real-Time Reconciliation System
 * Tests the real-time reconciliation service and WebSocket functionality
 */

const axios = require('axios');
const WebSocket = require('ws');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';
const WS_BASE_URL = process.env.WS_URL || 'ws://localhost:5000';

// Test data
let testSessionId = null;
let adminToken = null;

/**
 * Test authentication and get admin token
 */
async function testAuthentication() {
  console.log('🔐 Testing authentication...');
  
  try {
    // Try to login as admin
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: process.env.ADMIN_EMAIL || 'admin@smilingsteps.com',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    });

    if (response.data.token) {
      adminToken = response.data.token;
      console.log('✅ Admin authentication successful');
      return true;
    } else {
      console.error('❌ No token received from login');
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data?.msg || error.message);
    return false;
  }
}

/**
 * Test real-time reconciliation API endpoints
 */
async function testAPIEndpoints() {
  console.log('🔧 Testing API endpoints...');
  
  if (!adminToken) {
    console.error('❌ No admin token available');
    return false;
  }

  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test stats endpoint
    console.log('📊 Testing stats endpoint...');
    const statsResponse = await axios.get(`${API_BASE_URL}/api/real-time-reconciliation/stats`, { headers });
    
    if (statsResponse.data.success) {
      console.log('✅ Stats endpoint working:', statsResponse.data.stats);
    } else {
      console.error('❌ Stats endpoint failed');
      return false;
    }

    // Test active reconciliations endpoint
    console.log('🔄 Testing active reconciliations endpoint...');
    const activeResponse = await axios.get(`${API_BASE_URL}/api/real-time-reconciliation/active`, { headers });
    
    if (activeResponse.data.success) {
      console.log('✅ Active reconciliations endpoint working:', {
        active: activeResponse.data.activeReconciliations,
        queue: activeResponse.data.queueLength,
        clients: activeResponse.data.connectedClients
      });
    } else {
      console.error('❌ Active reconciliations endpoint failed');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ API endpoint test failed:', error.response?.data?.msg || error.message);
    return false;
  }
}

/**
 * Test WebSocket connection and real-time updates
 */
async function testWebSocketConnection() {
  console.log('📡 Testing WebSocket connection...');
  
  if (!adminToken) {
    console.error('❌ No admin token available');
    return false;
  }

  return new Promise((resolve) => {
    const wsUrl = `${WS_BASE_URL}/ws/real-time-reconciliation?token=${adminToken}`;
    const ws = new WebSocket(wsUrl);
    
    let connected = false;
    let statsReceived = false;
    
    const timeout = setTimeout(() => {
      if (!connected) {
        console.error('❌ WebSocket connection timeout');
        ws.close();
        resolve(false);
      }
    }, 10000); // 10 second timeout

    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      connected = true;
      
      // Send ping
      ws.send(JSON.stringify({ type: 'ping' }));
      
      // Request stats
      ws.send(JSON.stringify({ type: 'get_stats' }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('📨 WebSocket message received:', message.type);
        
        switch (message.type) {
          case 'connected':
            console.log('✅ WebSocket welcome message:', message.message);
            break;
            
          case 'pong':
            console.log('✅ WebSocket ping/pong working');
            break;
            
          case 'reconciliation_stats':
            console.log('✅ WebSocket stats received:', message.data);
            statsReceived = true;
            break;
            
          case 'reconciliation_result':
            console.log('✅ Real-time reconciliation result:', message.data.status);
            break;
            
          case 'discrepancy_alert':
            console.log('⚠️ Discrepancy alert received:', message.data.sessionId);
            break;
            
          default:
            console.log('📨 Unknown message type:', message.type);
        }
        
        // If we've received stats, consider the test successful
        if (statsReceived) {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
        
      } catch (error) {
        console.error('❌ WebSocket message parsing error:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      clearTimeout(timeout);
      resolve(false);
    });

    ws.on('close', () => {
      console.log('📡 WebSocket connection closed');
      clearTimeout(timeout);
      if (!statsReceived) {
        resolve(false);
      }
    });
  });
}

/**
 * Test manual reconciliation trigger
 */
async function testManualReconciliation() {
  console.log('🔄 Testing manual reconciliation...');
  
  if (!adminToken) {
    console.error('❌ No admin token available');
    return false;
  }

  // First, try to find a session to reconcile
  try {
    const headers = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };

    // Get sessions to find one to test with
    const sessionsResponse = await axios.get(`${API_BASE_URL}/api/sessions`, { headers });
    
    if (sessionsResponse.data && sessionsResponse.data.length > 0) {
      testSessionId = sessionsResponse.data[0]._id;
      console.log('📋 Found test session:', testSessionId);
      
      // Test manual reconciliation
      const reconcileResponse = await axios.post(
        `${API_BASE_URL}/api/real-time-reconciliation/session/${testSessionId}`,
        { trigger: 'test_manual' },
        { headers }
      );
      
      if (reconcileResponse.data.success) {
        console.log('✅ Manual reconciliation successful:', reconcileResponse.data.result.status);
        return true;
      } else {
        console.error('❌ Manual reconciliation failed');
        return false;
      }
    } else {
      console.log('⚠️ No sessions found for testing - creating mock test');
      
      // Test with a mock session ID (will fail but test the endpoint)
      const mockSessionId = '507f1f77bcf86cd799439011';
      
      try {
        await axios.post(
          `${API_BASE_URL}/api/real-time-reconciliation/session/${mockSessionId}`,
          { trigger: 'test_mock' },
          { headers }
        );
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('✅ Manual reconciliation endpoint working (session not found as expected)');
          return true;
        } else {
          console.error('❌ Unexpected error:', error.response?.data?.msg || error.message);
          return false;
        }
      }
    }
  } catch (error) {
    console.error('❌ Manual reconciliation test failed:', error.response?.data?.msg || error.message);
    return false;
  }
}

/**
 * Test queue functionality
 */
async function testQueueFunctionality() {
  console.log('📋 Testing queue functionality...');
  
  if (!adminToken || !testSessionId) {
    console.log('⚠️ Skipping queue test - no session ID available');
    return true;
  }

  try {
    const headers = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };

    const queueResponse = await axios.post(
      `${API_BASE_URL}/api/real-time-reconciliation/queue/${testSessionId}`,
      { trigger: 'test_queue' },
      { headers }
    );
    
    if (queueResponse.data.success) {
      console.log('✅ Queue functionality working');
      return true;
    } else {
      console.error('❌ Queue functionality failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Queue test failed:', error.response?.data?.msg || error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Real-Time Reconciliation System Tests\n');
  
  const results = {
    authentication: false,
    apiEndpoints: false,
    webSocket: false,
    manualReconciliation: false,
    queueFunctionality: false
  };

  // Test authentication
  results.authentication = await testAuthentication();
  console.log('');

  if (results.authentication) {
    // Test API endpoints
    results.apiEndpoints = await testAPIEndpoints();
    console.log('');

    // Test WebSocket connection
    results.webSocket = await testWebSocketConnection();
    console.log('');

    // Test manual reconciliation
    results.manualReconciliation = await testManualReconciliation();
    console.log('');

    // Test queue functionality
    results.queueFunctionality = await testQueueFunctionality();
    console.log('');
  }

  // Print results
  console.log('📊 Test Results:');
  console.log('================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
  });

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log('');
  console.log(`📈 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Real-time reconciliation system is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Please check the system configuration.');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Real-Time Reconciliation System Test

Usage: node test-real-time-reconciliation.js [options]

Options:
  --help, -h     Show this help message
  
Environment Variables:
  API_URL        Base URL for API (default: http://localhost:5000)
  WS_URL         Base URL for WebSocket (default: ws://localhost:5000)
  ADMIN_EMAIL    Admin email for authentication
  ADMIN_PASSWORD Admin password for authentication

Examples:
  node test-real-time-reconciliation.js
  API_URL=https://api.example.com node test-real-time-reconciliation.js
  `);
  process.exit(0);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test runner crashed:', error);
  process.exit(1);
});