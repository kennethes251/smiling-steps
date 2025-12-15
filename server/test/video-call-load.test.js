/**
 * Video Call Load Testing - Concurrent Sessions
 * 
 * Tests the video call system's ability to handle multiple concurrent sessions,
 * WebSocket connections, signaling server performance, and resource management.
 * 
 * Requirements: Video Call Feature - Task 11 (Load Testing)
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const io = require('socket.io-client');
const { performance } = require('perf_hooks');

// Set up test environment
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';

// Mock external dependencies
jest.mock('axios');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Session = require('../models/Session');

let mongoServer;
let app;
let server;
let testUsers = [];
let testSessions = [];
let baseURL;

// Test configuration
const LOAD_TEST_CONFIG = {
  CONCURRENT_SESSIONS: 10,
  CONCURRENT_USERS: 20,
  MAX_RESPONSE_TIME: 5000, // 5 seconds
  MAX_CONNECTION_TIME: 3000, // 3 seconds
  STRESS_TEST_DURATION: 30000, // 30 seconds
  WEBSOCKET_TIMEOUT: 10000 // 10 seconds
};

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  // Import app and start server
  app = require('../index-mongodb');
  server = app.listen(0); // Use random port
  const port = server.address().port;
  baseURL = `http://localhost:${port}`;
  
  console.log(`🧪 Load test server started on port ${port}`);
  
  // Create test users (clients and psychologists)
  for (let i = 0; i < LOAD_TEST_CONFIG.CONCURRENT_USERS; i++) {
    const isClient = i % 2 === 0;
    const user = await User.create({
      name: `Test ${isClient ? 'Client' : 'Psychologist'} ${i}`,
      email: `${isClient ? 'client' : 'psychologist'}${i}@loadtest.com`,
      password: 'hashedpassword123',
      role: isClient ? 'client' : 'psychologist',
      emailVerified: true,
      approved: !isClient || true // Psychologists need approval
    });
    
    testUsers.push({
      user,
      token: jwt.sign(
        { user: { id: user._id }, id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      )
    });
  }
  
  // Create test sessions
  for (let i = 0; i < LOAD_TEST_CONFIG.CONCURRENT_SESSIONS; i++) {
    const clientIndex = i * 2; // Even indices are clients
    const psychologistIndex = i * 2 + 1; // Odd indices are psychologists
    
    const session = await Session.create({
      client: testUsers[clientIndex].user._id,
      psychologist: testUsers[psychologistIndex].user._id,
      sessionType: 'individual',
      sessionDate: new Date(Date.now() + 3600000), // 1 hour from now
      price: 5000,
      status: 'Confirmed',
      paymentStatus: 'Confirmed',
      meetingLink: `load-test-room-${i}`
    });
    
    testSessions.push(session);
  }
  
  console.log(`🧪 Created ${testUsers.length} test users and ${testSessions.length} test sessions`);
}, 30000);

afterAll(async () => {
  if (server) {
    server.close();
  }
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
}, 10000);

describe('Video Call Load Testing - Concurrent Sessions', () => {
  
  describe('API Load Testing', () => {
    
    test('should handle concurrent room generation requests', async () => {
      const concurrentRequests = LOAD_TEST_CONFIG.CONCURRENT_SESSIONS;
      const requests = [];
      const startTime = performance.now();
      
      // Create concurrent room generation requests
      for (let i = 0; i < concurrentRequests; i++) {
        const userIndex = i * 2; // Use client users
        requests.push(
          request(app)
            .post(`/api/video-calls/generate-room/${testSessions[i]._id}`)
            .set('x-auth-token', testUsers[userIndex].token)
        );
      }
      
      const responses = await Promise.all(requests);
      const totalTime = performance.now() - startTime;
      
      // Analyze results
      const successfulResponses = responses.filter(r => r.status === 200);
      const failedResponses = responses.filter(r => r.status !== 200);
      
      console.log(`🎥 Room Generation Load Test Results:`);
      console.log(`  Concurrent requests: ${concurrentRequests}`);
      console.log(`  Successful: ${successfulResponses.length}`);
      console.log(`  Failed: ${failedResponses.length}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average time per request: ${(totalTime / concurrentRequests).toFixed(2)}ms`);
      
      // Assertions
      expect(successfulResponses.length).toBeGreaterThan(concurrentRequests * 0.9); // 90% success rate
      expect(totalTime).toBeLessThan(LOAD_TEST_CONFIG.MAX_RESPONSE_TIME * 2); // Allow some overhead
      
      // Verify unique room IDs
      const roomIds = successfulResponses.map(r => r.body.roomId);
      const uniqueRoomIds = new Set(roomIds);
      expect(uniqueRoomIds.size).toBe(roomIds.length);
    });
    
    test('should handle concurrent can-join checks', async () => {
      const concurrentRequests = LOAD_TEST_CONFIG.CONCURRENT_SESSIONS;
      const requests = [];
      const startTime = performance.now();
      
      // Create concurrent can-join requests
      for (let i = 0; i < concurrentRequests; i++) {
        const userIndex = i * 2; // Use client users
        requests.push(
          request(app)
            .get(`/api/video-calls/can-join/${testSessions[i]._id}`)
            .set('x-auth-token', testUsers[userIndex].token)
        );
      }
      
      const responses = await Promise.all(requests);
      const totalTime = performance.now() - startTime;
      
      const successfulResponses = responses.filter(r => r.status === 200);
      
      console.log(`🔍 Can-Join Check Load Test Results:`);
      console.log(`  Concurrent requests: ${concurrentRequests}`);
      console.log(`  Successful: ${successfulResponses.length}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average time per request: ${(totalTime / concurrentRequests).toFixed(2)}ms`);
      
      expect(successfulResponses.length).toBeGreaterThan(concurrentRequests * 0.95); // 95% success rate
      expect(totalTime).toBeLessThan(LOAD_TEST_CONFIG.MAX_RESPONSE_TIME);
    });
    
    test('should handle concurrent call start/end operations', async () => {
      const concurrentOperations = Math.min(5, LOAD_TEST_CONFIG.CONCURRENT_SESSIONS);
      const startRequests = [];
      const endRequests = [];
      
      // Start calls concurrently
      const startTime = performance.now();
      for (let i = 0; i < concurrentOperations; i++) {
        const userIndex = i * 2; // Use client users
        startRequests.push(
          request(app)
            .post(`/api/video-calls/start/${testSessions[i]._id}`)
            .set('x-auth-token', testUsers[userIndex].token)
        );
      }
      
      const startResponses = await Promise.all(startRequests);
      const startTime_end = performance.now();
      
      // Wait a moment, then end calls concurrently
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      for (let i = 0; i < concurrentOperations; i++) {
        const userIndex = i * 2; // Use client users
        endRequests.push(
          request(app)
            .post(`/api/video-calls/end/${testSessions[i]._id}`)
            .set('x-auth-token', testUsers[userIndex].token)
        );
      }
      
      const endResponses = await Promise.all(endRequests);
      const totalTime = performance.now() - startTime;
      
      const successfulStarts = startResponses.filter(r => r.status === 200);
      const successfulEnds = endResponses.filter(r => r.status === 200);
      
      console.log(`⏱️ Call Start/End Load Test Results:`);
      console.log(`  Concurrent operations: ${concurrentOperations}`);
      console.log(`  Successful starts: ${successfulStarts.length}`);
      console.log(`  Successful ends: ${successfulEnds.length}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      
      expect(successfulStarts.length).toBeGreaterThan(concurrentOperations * 0.8); // 80% success rate
      expect(successfulEnds.length).toBeGreaterThan(concurrentOperations * 0.8);
    });
  });
  
  describe('WebSocket Load Testing', () => {
    
    test('should handle concurrent WebSocket connections', async () => {
      const concurrentConnections = Math.min(10, LOAD_TEST_CONFIG.CONCURRENT_USERS);
      const connections = [];
      const connectionTimes = [];
      const connectionPromises = [];
      
      // Create concurrent WebSocket connections
      for (let i = 0; i < concurrentConnections; i++) {
        const connectionPromise = new Promise((resolve, reject) => {
          const startTime = performance.now();
          const socket = io(baseURL, {
            auth: {
              token: testUsers[i].token
            },
            timeout: LOAD_TEST_CONFIG.WEBSOCKET_TIMEOUT
          });
          
          socket.on('connect', () => {
            const connectionTime = performance.now() - startTime;
            connectionTimes.push(connectionTime);
            connections.push(socket);
            resolve({ socket, connectionTime });
          });
          
          socket.on('connect_error', (error) => {
            reject(error);
          });
          
          // Timeout fallback
          setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, LOAD_TEST_CONFIG.WEBSOCKET_TIMEOUT);
        });
        
        connectionPromises.push(connectionPromise);
      }
      
      const results = await Promise.allSettled(connectionPromises);
      const successfulConnections = results.filter(r => r.status === 'fulfilled');
      const failedConnections = results.filter(r => r.status === 'rejected');
      
      console.log(`🔌 WebSocket Connection Load Test Results:`);
      console.log(`  Attempted connections: ${concurrentConnections}`);
      console.log(`  Successful: ${successfulConnections.length}`);
      console.log(`  Failed: ${failedConnections.length}`);
      
      if (connectionTimes.length > 0) {
        const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
        const maxConnectionTime = Math.max(...connectionTimes);
        console.log(`  Average connection time: ${avgConnectionTime.toFixed(2)}ms`);
        console.log(`  Max connection time: ${maxConnectionTime.toFixed(2)}ms`);
        
        expect(avgConnectionTime).toBeLessThan(LOAD_TEST_CONFIG.MAX_CONNECTION_TIME);
      }
      
      expect(successfulConnections.length).toBeGreaterThan(concurrentConnections * 0.8); // 80% success rate
      
      // Clean up connections
      connections.forEach(socket => {
        if (socket.connected) {
          socket.disconnect();
        }
      });
    }, 30000);
    
    test('should handle concurrent room joins', async () => {
      const concurrentJoins = Math.min(6, LOAD_TEST_CONFIG.CONCURRENT_SESSIONS);
      const sockets = [];
      const joinPromises = [];
      
      // Create WebSocket connections first
      for (let i = 0; i < concurrentJoins; i++) {
        const socket = io(baseURL, {
          auth: {
            token: testUsers[i].token
          }
        });
        sockets.push(socket);
        
        await new Promise((resolve) => {
          socket.on('connect', resolve);
        });
      }
      
      // Join rooms concurrently
      const startTime = performance.now();
      for (let i = 0; i < concurrentJoins; i++) {
        const sessionIndex = Math.floor(i / 2); // Multiple users per session
        const joinPromise = new Promise((resolve, reject) => {
          const socket = sockets[i];
          
          socket.emit('join-room', {
            roomId: testSessions[sessionIndex].meetingLink,
            sessionId: testSessions[sessionIndex]._id.toString()
          });
          
          socket.on('join-success', (data) => {
            resolve(data);
          });
          
          socket.on('join-error', (error) => {
            reject(error);
          });
          
          // Timeout
          setTimeout(() => {
            reject(new Error('Join timeout'));
          }, 5000);
        });
        
        joinPromises.push(joinPromise);
      }
      
      const results = await Promise.allSettled(joinPromises);
      const totalTime = performance.now() - startTime;
      
      const successfulJoins = results.filter(r => r.status === 'fulfilled');
      const failedJoins = results.filter(r => r.status === 'rejected');
      
      console.log(`🚪 Room Join Load Test Results:`);
      console.log(`  Concurrent joins: ${concurrentJoins}`);
      console.log(`  Successful: ${successfulJoins.length}`);
      console.log(`  Failed: ${failedJoins.length}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      
      expect(successfulJoins.length).toBeGreaterThan(concurrentJoins * 0.7); // 70% success rate
      
      // Clean up
      sockets.forEach(socket => {
        if (socket.connected) {
          socket.disconnect();
        }
      });
    }, 30000);
    
    test('should handle concurrent signaling messages', async () => {
      const concurrentSignaling = 4;
      const sockets = [];
      const signalingPromises = [];
      
      // Create and connect sockets
      for (let i = 0; i < concurrentSignaling; i++) {
        const socket = io(baseURL, {
          auth: {
            token: testUsers[i].token
          }
        });
        sockets.push(socket);
        
        await new Promise((resolve) => {
          socket.on('connect', resolve);
        });
      }
      
      // Join same room
      const roomId = testSessions[0].meetingLink;
      const sessionId = testSessions[0]._id.toString();
      
      for (let i = 0; i < concurrentSignaling; i++) {
        sockets[i].emit('join-room', { roomId, sessionId });
        await new Promise((resolve) => {
          sockets[i].on('join-success', resolve);
        });
      }
      
      // Send concurrent signaling messages
      const startTime = performance.now();
      for (let i = 0; i < concurrentSignaling - 1; i++) {
        const fromSocket = sockets[i];
        const toSocket = sockets[i + 1];
        
        const signalingPromise = new Promise((resolve) => {
          toSocket.on('offer', (data) => {
            resolve(data);
          });
          
          fromSocket.emit('offer', {
            offer: {
              type: 'offer',
              sdp: 'fake-sdp-data-for-testing'
            },
            to: toSocket.id,
            roomId
          });
        });
        
        signalingPromises.push(signalingPromise);
      }
      
      const results = await Promise.allSettled(signalingPromises);
      const totalTime = performance.now() - startTime;
      
      const successfulSignaling = results.filter(r => r.status === 'fulfilled');
      
      console.log(`📡 Signaling Load Test Results:`);
      console.log(`  Concurrent signaling messages: ${signalingPromises.length}`);
      console.log(`  Successful: ${successfulSignaling.length}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      
      expect(successfulSignaling.length).toBeGreaterThan(signalingPromises.length * 0.8);
      
      // Clean up
      sockets.forEach(socket => {
        if (socket.connected) {
          socket.disconnect();
        }
      });
    }, 30000);
  });
  
  describe('Resource Management Under Load', () => {
    
    test('should manage memory efficiently with multiple sessions', async () => {
      const initialMemory = process.memoryUsage();
      const sessionCount = 20;
      const operations = [];
      
      // Perform many video call operations
      for (let i = 0; i < sessionCount; i++) {
        const sessionIndex = i % testSessions.length;
        const userIndex = (i * 2) % testUsers.length;
        
        operations.push(
          request(app)
            .post(`/api/video-calls/generate-room/${testSessions[sessionIndex]._id}`)
            .set('x-auth-token', testUsers[userIndex].token)
        );
      }
      
      await Promise.all(operations);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`💾 Memory Usage Test Results:`);
      console.log(`  Operations performed: ${sessionCount}`);
      console.log(`  Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Heap used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory increase should be reasonable (less than 50MB for test operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
    
    test('should handle database connections efficiently under load', async () => {
      const queryCount = 100;
      const queries = [];
      const startTime = performance.now();
      
      // Perform many concurrent database queries
      for (let i = 0; i < queryCount; i++) {
        const sessionIndex = i % testSessions.length;
        queries.push(
          Session.findById(testSessions[sessionIndex]._id)
            .populate('client', 'name email')
            .populate('psychologist', 'name email')
        );
      }
      
      const results = await Promise.all(queries);
      const totalTime = performance.now() - startTime;
      
      const successfulQueries = results.filter(r => r !== null);
      
      console.log(`🗄️ Database Load Test Results:`);
      console.log(`  Concurrent queries: ${queryCount}`);
      console.log(`  Successful: ${successfulQueries.length}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average time per query: ${(totalTime / queryCount).toFixed(2)}ms`);
      
      expect(successfulQueries.length).toBe(queryCount);
      expect(totalTime / queryCount).toBeLessThan(100); // Average < 100ms per query
    });
  });
  
  describe('Stress Testing', () => {
    
    test('should maintain performance under sustained load', async () => {
      const duration = 10000; // 10 seconds (reduced for test speed)
      const requestInterval = 200; // Request every 200ms
      const startTime = performance.now();
      const results = [];
      
      console.log(`🔥 Starting stress test for ${duration}ms...`);
      
      const stressTest = async () => {
        while (performance.now() - startTime < duration) {
          const sessionIndex = Math.floor(Math.random() * testSessions.length);
          const userIndex = Math.floor(Math.random() * testUsers.length);
          
          try {
            const requestStart = performance.now();
            const response = await request(app)
              .get(`/api/video-calls/can-join/${testSessions[sessionIndex]._id}`)
              .set('x-auth-token', testUsers[userIndex].token);
            
            const requestTime = performance.now() - requestStart;
            results.push({
              status: response.status,
              time: requestTime,
              timestamp: performance.now() - startTime
            });
          } catch (error) {
            results.push({
              status: 'error',
              time: 0,
              timestamp: performance.now() - startTime,
              error: error.message
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, requestInterval));
        }
      };
      
      await stressTest();
      
      const totalTime = performance.now() - startTime;
      const successfulRequests = results.filter(r => r.status === 200);
      const failedRequests = results.filter(r => r.status !== 200);
      const avgResponseTime = successfulRequests.length > 0 
        ? successfulRequests.reduce((sum, r) => sum + r.time, 0) / successfulRequests.length 
        : 0;
      
      console.log(`🔥 Stress Test Results:`);
      console.log(`  Duration: ${totalTime.toFixed(2)}ms`);
      console.log(`  Total requests: ${results.length}`);
      console.log(`  Successful: ${successfulRequests.length}`);
      console.log(`  Failed: ${failedRequests.length}`);
      console.log(`  Success rate: ${((successfulRequests.length / results.length) * 100).toFixed(2)}%`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
      
      // Assertions for stress test
      expect(results.length).toBeGreaterThan(10); // Should have made multiple requests
      expect(successfulRequests.length / results.length).toBeGreaterThan(0.8); // 80% success rate
      if (avgResponseTime > 0) {
        expect(avgResponseTime).toBeLessThan(LOAD_TEST_CONFIG.MAX_RESPONSE_TIME);
      }
    }, 15000);
  });
  
  describe('Performance Benchmarks', () => {
    
    test('should meet performance benchmarks for video call operations', async () => {
      const benchmarks = {
        roomGeneration: { target: 1000, results: [] },
        canJoinCheck: { target: 500, results: [] },
        callStart: { target: 2000, results: [] },
        sessionQuery: { target: 100, results: [] }
      };
      
      const iterations = 10;
      
      // Room generation benchmark
      for (let i = 0; i < iterations; i++) {
        const sessionIndex = i % testSessions.length;
        const userIndex = (i * 2) % testUsers.length;
        const startTime = performance.now();
        
        await request(app)
          .post(`/api/video-calls/generate-room/${testSessions[sessionIndex]._id}`)
          .set('x-auth-token', testUsers[userIndex].token);
        
        benchmarks.roomGeneration.results.push(performance.now() - startTime);
      }
      
      // Can-join check benchmark
      for (let i = 0; i < iterations; i++) {
        const sessionIndex = i % testSessions.length;
        const userIndex = (i * 2) % testUsers.length;
        const startTime = performance.now();
        
        await request(app)
          .get(`/api/video-calls/can-join/${testSessions[sessionIndex]._id}`)
          .set('x-auth-token', testUsers[userIndex].token);
        
        benchmarks.canJoinCheck.results.push(performance.now() - startTime);
      }
      
      // Call start benchmark
      for (let i = 0; i < Math.min(5, iterations); i++) {
        const sessionIndex = i % testSessions.length;
        const userIndex = (i * 2) % testUsers.length;
        const startTime = performance.now();
        
        await request(app)
          .post(`/api/video-calls/start/${testSessions[sessionIndex]._id}`)
          .set('x-auth-token', testUsers[userIndex].token);
        
        benchmarks.callStart.results.push(performance.now() - startTime);
      }
      
      // Session query benchmark
      for (let i = 0; i < iterations; i++) {
        const sessionIndex = i % testSessions.length;
        const startTime = performance.now();
        
        await Session.findById(testSessions[sessionIndex]._id);
        
        benchmarks.sessionQuery.results.push(performance.now() - startTime);
      }
      
      // Analyze and report benchmarks
      console.log(`📊 Performance Benchmarks:`);
      
      Object.entries(benchmarks).forEach(([operation, data]) => {
        const avg = data.results.reduce((a, b) => a + b, 0) / data.results.length;
        const min = Math.min(...data.results);
        const max = Math.max(...data.results);
        const p95 = data.results.sort((a, b) => a - b)[Math.floor(data.results.length * 0.95)];
        
        console.log(`  ${operation}:`);
        console.log(`    Target: <${data.target}ms`);
        console.log(`    Average: ${avg.toFixed(2)}ms`);
        console.log(`    Min: ${min.toFixed(2)}ms`);
        console.log(`    Max: ${max.toFixed(2)}ms`);
        console.log(`    95th percentile: ${p95.toFixed(2)}ms`);
        console.log(`    Status: ${avg < data.target ? '✅ PASS' : '❌ FAIL'}`);
        
        // Assert benchmark targets
        expect(avg).toBeLessThan(data.target);
        expect(p95).toBeLessThan(data.target * 1.5); // Allow 50% overhead for 95th percentile
      });
    });
  });
});

console.log('✅ Video call load tests created successfully');