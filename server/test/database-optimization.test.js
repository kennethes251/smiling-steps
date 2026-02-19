/**
 * Database Optimization Tests
 * 
 * Tests for Task 22: Optimize Database Performance
 * Requirements: 8.5, 13.4
 * 
 * - Verify indexes are created correctly
 * - Verify query performance meets 2-second threshold
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import models to ensure indexes are created
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

// Import optimization utilities
const {
  INDEX_DEFINITIONS,
  verifyQueryPerformance,
  getIndexStats
} = require('../utils/databaseOptimization');

let mongoServer;

describe('Database Optimization - Task 22', () => {
  beforeAll(async () => {
    // Create in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Ensure indexes are created
    await Session.ensureIndexes();
    await AuditLog.ensureIndexes();
    await User.ensureIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('22.1 Database Indexes', () => {
    describe('Session Collection Indexes', () => {
      test('should have index on client and sessionDate', async () => {
        const indexes = await Session.collection.indexes();
        const indexNames = indexes.map(idx => idx.name);
        
        // Check for client-date compound index
        const hasClientDateIndex = indexes.some(idx => 
          idx.key && idx.key.client === 1 && idx.key.sessionDate !== undefined
        );
        
        expect(hasClientDateIndex).toBe(true);
      });

      test('should have index on psychologist and sessionDate', async () => {
        const indexes = await Session.collection.indexes();
        
        const hasPsychologistDateIndex = indexes.some(idx => 
          idx.key && idx.key.psychologist === 1 && idx.key.sessionDate !== undefined
        );
        
        expect(hasPsychologistDateIndex).toBe(true);
      });

      test('should have index on status and sessionDate', async () => {
        const indexes = await Session.collection.indexes();
        
        const hasStatusDateIndex = indexes.some(idx => 
          idx.key && idx.key.status === 1 && idx.key.sessionDate !== undefined
        );
        
        expect(hasStatusDateIndex).toBe(true);
      });

      test('should have index on paymentStatus', async () => {
        const indexes = await Session.collection.indexes();
        
        const hasPaymentStatusIndex = indexes.some(idx => 
          idx.key && idx.key.paymentStatus !== undefined
        );
        
        expect(hasPaymentStatusIndex).toBe(true);
      });

      test('should have index on bookingReference', async () => {
        const indexes = await Session.collection.indexes();
        
        const hasBookingRefIndex = indexes.some(idx => 
          idx.key && idx.key.bookingReference !== undefined
        );
        
        expect(hasBookingRefIndex).toBe(true);
      });

      test('should have reminder system indexes', async () => {
        const indexes = await Session.collection.indexes();
        
        const hasReminder24hIndex = indexes.some(idx => 
          idx.key && idx.key.reminder24HourSent !== undefined
        );
        
        const hasReminder1hIndex = indexes.some(idx => 
          idx.key && idx.key.reminder1HourSent !== undefined
        );
        
        expect(hasReminder24hIndex).toBe(true);
        expect(hasReminder1hIndex).toBe(true);
      });
    });

    describe('AuditLog Collection Indexes', () => {
      test('should have index on timestamp', async () => {
        const indexes = await AuditLog.collection.indexes();
        
        const hasTimestampIndex = indexes.some(idx => 
          idx.key && idx.key.timestamp !== undefined
        );
        
        expect(hasTimestampIndex).toBe(true);
      });

      test('should have index on userId and timestamp', async () => {
        const indexes = await AuditLog.collection.indexes();
        
        const hasUserTimestampIndex = indexes.some(idx => 
          idx.key && idx.key.userId === 1 && idx.key.timestamp !== undefined
        );
        
        expect(hasUserTimestampIndex).toBe(true);
      });

      test('should have index on actionType and timestamp', async () => {
        const indexes = await AuditLog.collection.indexes();
        
        const hasActionTypeIndex = indexes.some(idx => 
          idx.key && idx.key.actionType === 1 && idx.key.timestamp !== undefined
        );
        
        expect(hasActionTypeIndex).toBe(true);
      });

      test('should have index on sessionId', async () => {
        const indexes = await AuditLog.collection.indexes();
        
        const hasSessionIdIndex = indexes.some(idx => 
          idx.key && idx.key.sessionId !== undefined
        );
        
        expect(hasSessionIdIndex).toBe(true);
      });
    });

    describe('User Collection Indexes', () => {
      test('should have index on email', async () => {
        const indexes = await User.collection.indexes();
        
        const hasEmailIndex = indexes.some(idx => 
          idx.key && idx.key.email !== undefined
        );
        
        expect(hasEmailIndex).toBe(true);
      });

      test('should have index on role and status', async () => {
        const indexes = await User.collection.indexes();
        
        const hasRoleStatusIndex = indexes.some(idx => 
          idx.key && idx.key.role === 1 && idx.key.status !== undefined
        );
        
        expect(hasRoleStatusIndex).toBe(true);
      });

      test('should have index on role and approvalStatus', async () => {
        const indexes = await User.collection.indexes();
        
        const hasRoleApprovalIndex = indexes.some(idx => 
          idx.key && idx.key.role === 1 && idx.key.approvalStatus !== undefined
        );
        
        expect(hasRoleApprovalIndex).toBe(true);
      });
    });
  });

  describe('Query Performance Verification (Requirement 8.5)', () => {
    const PERFORMANCE_THRESHOLD_MS = 2000;

    beforeAll(async () => {
      // Create test data for performance testing
      const testClient = await User.create({
        name: 'Test Client',
        email: 'testclient@test.com',
        password: 'password123',
        role: 'client'
      });

      const testPsychologist = await User.create({
        name: 'Test Psychologist',
        email: 'testpsych@test.com',
        password: 'password123',
        role: 'psychologist',
        approvalStatus: 'approved'
      });

      // Create multiple sessions for testing
      const sessions = [];
      for (let i = 0; i < 100; i++) {
        sessions.push({
          client: testClient._id,
          psychologist: testPsychologist._id,
          sessionType: 'Individual',
          sessionDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          price: 2000,
          status: ['Pending', 'Approved', 'Confirmed', 'Completed'][i % 4],
          paymentStatus: ['Pending', 'Submitted', 'Verified', 'Paid'][i % 4]
        });
      }
      await Session.insertMany(sessions);

      // Create audit logs for testing
      const auditLogs = [];
      for (let i = 0; i < 100; i++) {
        auditLogs.push({
          timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
          actionType: ['SESSION_STATUS_CHANGE', 'PAYMENT_STATUS_CHANGE', 'USER_UPDATE'][i % 3],
          userId: testClient._id,
          action: `Test action ${i}`,
          logHash: `hash_${i}_${Date.now()}`
        });
      }
      await AuditLog.insertMany(auditLogs);
    });

    test('session queries by client should complete within 2 seconds', async () => {
      const startTime = Date.now();
      
      const sessions = await Session.find({ client: new mongoose.Types.ObjectId() })
        .sort({ sessionDate: -1 })
        .limit(100)
        .lean();
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    test('session queries by psychologist should complete within 2 seconds', async () => {
      const startTime = Date.now();
      
      const sessions = await Session.find({ psychologist: new mongoose.Types.ObjectId() })
        .sort({ sessionDate: -1 })
        .limit(100)
        .lean();
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    test('session queries by status should complete within 2 seconds', async () => {
      const startTime = Date.now();
      
      const sessions = await Session.find({ status: 'Confirmed' })
        .sort({ sessionDate: -1 })
        .limit(100)
        .lean();
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    test('payment status queries should complete within 2 seconds', async () => {
      const startTime = Date.now();
      
      const sessions = await Session.find({ paymentStatus: 'Pending' })
        .sort({ sessionDate: -1 })
        .limit(100)
        .lean();
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    test('audit log queries by date range (90 days) should complete within 2 seconds', async () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const now = new Date();
      
      const startTime = Date.now();
      
      const logs = await AuditLog.find({
        timestamp: { $gte: ninetyDaysAgo, $lte: now }
      })
        .sort({ timestamp: -1 })
        .limit(1000)
        .lean();
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    test('audit log queries by user should complete within 2 seconds', async () => {
      const startTime = Date.now();
      
      const logs = await AuditLog.find({ userId: new mongoose.Types.ObjectId() })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    test('audit log queries by action type should complete within 2 seconds', async () => {
      const startTime = Date.now();
      
      const logs = await AuditLog.find({ actionType: 'SESSION_STATUS_CHANGE' })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });

  describe('Index Definitions', () => {
    test('should have index definitions for sessions collection', () => {
      expect(INDEX_DEFINITIONS.sessions).toBeDefined();
      expect(INDEX_DEFINITIONS.sessions.length).toBeGreaterThan(0);
    });

    test('should have index definitions for auditlogs collection', () => {
      expect(INDEX_DEFINITIONS.auditlogs).toBeDefined();
      expect(INDEX_DEFINITIONS.auditlogs.length).toBeGreaterThan(0);
    });

    test('should have index definitions for users collection', () => {
      expect(INDEX_DEFINITIONS.users).toBeDefined();
      expect(INDEX_DEFINITIONS.users.length).toBeGreaterThan(0);
    });
  });
});
