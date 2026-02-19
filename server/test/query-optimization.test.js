/**
 * Query Optimization Tests
 * 
 * Tests for Task 22.2: Implement query optimization
 * - Optimize session list queries
 * - Add pagination for large result sets
 * - Implement caching for frequently accessed data
 * 
 * Requirements: 13.4
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const Session = require('../models/Session');
const { 
  getSessionsWithCache, 
  parsePaginationParams,
  buildPaginationMeta,
  getSessionStats
} = require('../utils/optimizedQueries');
const { clearAllCaches, getAllCacheStats } = require('../utils/queryCache');

describe('Query Optimization', () => {
  let clientUser, psychologistUser, adminUser;
  let clientToken, psychologistToken, adminToken;
  let testSessions = [];

  beforeAll(async () => {
    // Clear cache before tests
    clearAllCaches();

    // Create test users
    clientUser = new User({
      name: 'Test Client',
      email: 'client@test.com',
      password: 'password123',
      role: 'client',
      isVerified: true
    });
    await clientUser.save();

    psychologistUser = new User({
      name: 'Test Psychologist',
      email: 'psychologist@test.com',
      password: 'password123',
      role: 'psychologist',
      isVerified: true,
      approvalStatus: 'approved'
    });
    await psychologistUser.save();

    adminUser = new User({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      isVerified: true
    });
    await adminUser.save();

    // Get auth tokens
    const clientLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'client@test.com', password: 'password123' });
    clientToken = clientLogin.body.token;

    const psychologistLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'psychologist@test.com', password: 'password123' });
    psychologistToken = psychologistLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.token;

    // Create test sessions for pagination testing
    const sessionPromises = [];
    for (let i = 0; i < 25; i++) {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() + i);
      
      const session = new Session({
        client: clientUser._id,
        psychologist: psychologistUser._id,
        sessionType: i % 2 === 0 ? 'Individual' : 'Couples',
        sessionDate,
        price: 2500,
        status: i < 10 ? 'Completed' : 'Confirmed',
        paymentStatus: i < 10 ? 'Verified' : 'Pending',
        meetingLink: `room-test-${i}`,
        isVideoCall: true
      });
      sessionPromises.push(session.save());
    }
    
    testSessions = await Promise.all(sessionPromises);
  });

  afterAll(async () => {
    // Clean up test data
    await Session.deleteMany({ client: clientUser._id });
    await User.deleteMany({ 
      email: { $in: ['client@test.com', 'psychologist@test.com', 'admin@test.com'] }
    });
    clearAllCaches();
  });

  describe('Pagination Parameters', () => {
    test('should parse pagination parameters correctly', () => {
      const query = {
        page: '2',
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'asc'
      };

      const result = parsePaginationParams(query);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(10);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe(1);
      expect(result.sort).toEqual({ createdAt: 1 });
    });

    test('should use default values for invalid parameters', () => {
      const query = {
        page: 'invalid',
        limit: '200', // exceeds max
        sortOrder: 'invalid'
      };

      const result = parsePaginationParams(query);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(100); // capped at max
      expect(result.sortOrder).toBe(-1); // defaults to desc
    });

    test('should build pagination metadata correctly', () => {
      const total = 25;
      const pagination = { page: 2, limit: 10 };

      const meta = buildPaginationMeta(total, pagination);

      expect(meta.total).toBe(25);
      expect(meta.totalPages).toBe(3);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPrevPage).toBe(true);
      expect(meta.nextPage).toBe(3);
      expect(meta.prevPage).toBe(1);
    });
  });

  describe('Optimized Session Queries', () => {
    test('should fetch client sessions with pagination', async () => {
      const options = { page: 1, limit: 10 };
      const result = await getSessionsWithCache('client', clientUser._id.toString(), options);

      expect(result.sessions).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.sessions.length).toBeLessThanOrEqual(10);
      expect(result.pagination.total).toBeGreaterThan(0);
    });

    test('should fetch psychologist sessions with pagination', async () => {
      const options = { page: 1, limit: 5 };
      const result = await getSessionsWithCache('psychologist', psychologistUser._id.toString(), options);

      expect(result.sessions).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.sessions.length).toBeLessThanOrEqual(5);
      expect(result.pagination.total).toBeGreaterThan(0);
    });

    test('should fetch admin sessions with pagination', async () => {
      const options = { page: 1, limit: 15 };
      const result = await getSessionsWithCache('admin', adminUser._id.toString(), options);

      expect(result.sessions).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.sessions.length).toBeLessThanOrEqual(15);
      expect(result.pagination.total).toBeGreaterThan(0);
    });

    test('should filter sessions by status', async () => {
      const options = { status: 'Completed', limit: 20 };
      const result = await getSessionsWithCache('client', clientUser._id.toString(), options);

      expect(result.sessions.every(session => session.status === 'Completed')).toBe(true);
    });

    test('should filter sessions by date range', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const options = {
        startDate: today.toISOString(),
        endDate: tomorrow.toISOString(),
        limit: 20
      };

      const result = await getSessionsWithCache('client', clientUser._id.toString(), options);

      expect(result.sessions.length).toBeGreaterThan(0);
      result.sessions.forEach(session => {
        const sessionDate = new Date(session.sessionDate);
        expect(sessionDate).toBeInstanceOf(Date);
      });
    });
  });

  describe('Session Statistics', () => {
    test('should calculate client session statistics', async () => {
      const stats = await getSessionStats(clientUser._id.toString(), 'client');

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('upcoming');
      expect(stats).toHaveProperty('cancelled');
      expect(stats).toHaveProperty('totalRevenue');
      expect(stats.total).toBeGreaterThan(0);
    });

    test('should calculate psychologist session statistics', async () => {
      const stats = await getSessionStats(psychologistUser._id.toString(), 'psychologist');

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('upcoming');
      expect(stats).toHaveProperty('cancelled');
      expect(stats).toHaveProperty('totalRevenue');
      expect(stats.total).toBeGreaterThan(0);
    });
  });

  describe('API Endpoints with Optimization', () => {
    test('GET /api/sessions should return paginated results', async () => {
      const response = await request(app)
        .get('/api/sessions?page=1&limit=5')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sessions).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.sessions.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    test('GET /api/sessions/stats should return cached statistics', async () => {
      const response = await request(app)
        .get('/api/sessions/stats')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats).toHaveProperty('total');
      expect(response.body.stats).toHaveProperty('completed');
      expect(response.body.stats).toHaveProperty('upcoming');
    });

    test('should handle filtering parameters', async () => {
      const response = await request(app)
        .get('/api/sessions?status=Completed&limit=10')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sessions.every(session => session.status === 'Completed')).toBe(true);
    });

    test('should handle sorting parameters', async () => {
      const response = await request(app)
        .get('/api/sessions?sortBy=sessionDate&sortOrder=asc&limit=5')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sessions.length).toBeGreaterThan(1);
      
      // Check if sorted by sessionDate ascending
      for (let i = 1; i < response.body.sessions.length; i++) {
        const prevDate = new Date(response.body.sessions[i - 1].sessionDate);
        const currDate = new Date(response.body.sessions[i].sessionDate);
        expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
      }
    });
  });

  describe('Caching Functionality', () => {
    test('should cache session queries', async () => {
      // Clear cache first
      clearAllCaches();
      
      // First request - should hit database
      const options = { page: 1, limit: 5 };
      const result1 = await getSessionsWithCache('client', clientUser._id.toString(), options);
      
      // Second request - should hit cache
      const result2 = await getSessionsWithCache('client', clientUser._id.toString(), options);
      
      expect(result1.sessions.length).toBe(result2.sessions.length);
      expect(result1.pagination.total).toBe(result2.pagination.total);
      
      // Check cache stats
      const cacheStats = getAllCacheStats();
      expect(cacheStats.sessions.hits).toBeGreaterThan(0);
    });

    test('should show cache statistics', async () => {
      const cacheStats = getAllCacheStats();
      
      expect(cacheStats).toHaveProperty('sessions');
      expect(cacheStats).toHaveProperty('users');
      expect(cacheStats).toHaveProperty('availability');
      expect(cacheStats).toHaveProperty('stats');
      
      expect(cacheStats.sessions).toHaveProperty('hits');
      expect(cacheStats.sessions).toHaveProperty('misses');
      expect(cacheStats.sessions).toHaveProperty('size');
      expect(cacheStats.sessions).toHaveProperty('hitRate');
    });
  });

  describe('Performance Requirements', () => {
    test('should complete session queries within 2 seconds (Requirement 8.5)', async () => {
      const startTime = Date.now();
      
      const result = await getSessionsWithCache('client', clientUser._id.toString(), { limit: 20 });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // 2 seconds
      expect(result.sessions).toBeDefined();
    });

    test('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      
      // Request maximum allowed limit
      const result = await getSessionsWithCache('admin', adminUser._id.toString(), { limit: 100 });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // 2 seconds
      expect(result.sessions.length).toBeLessThanOrEqual(100);
      expect(result.pagination).toBeDefined();
    });
  });
});