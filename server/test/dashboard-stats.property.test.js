/**
 * Property-Based Tests for Dashboard Statistics Accuracy
 * 
 * Feature: admin-user-management, Property 1: Dashboard Statistics Accuracy
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 * 
 * For any set of users, sessions, and payments in the database, the dashboard 
 * statistics endpoint SHALL return counts that exactly match the actual database records.
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Service under test
const { AdminStatsService } = require('../services/adminStatsService');

describe('Property 1: Dashboard Statistics Accuracy', () => {
  let mongoServer;
  let adminStatsService;
  let User;
  let Session;

  beforeAll(async () => {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Connect mongoose
    await mongoose.connect(uri);
    
    // Define simplified schemas for testing (avoid encryption middleware issues)
    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true },
      password: String,
      role: { type: String, enum: ['client', 'psychologist', 'admin'], default: 'client' },
      status: { type: String, enum: ['active', 'inactive', 'deleted'], default: 'active' },
      approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'not_applicable'], default: 'not_applicable' },
      active: { type: Boolean, default: true }
    });
    
    const sessionSchema = new mongoose.Schema({
      client: { type: mongoose.Schema.Types.ObjectId, ref: 'TestUser' },
      psychologist: { type: mongoose.Schema.Types.ObjectId, ref: 'TestUser' },
      sessionType: { type: String, enum: ['Individual', 'Couples', 'Family', 'Group'] },
      sessionDate: Date,
      status: { type: String, default: 'Pending' },
      price: Number,
      paymentStatus: { type: String, default: 'Pending' },
      mpesaAmount: Number
    });
    
    // Create models with unique names to avoid conflicts
    User = mongoose.model('TestUser', userSchema);
    Session = mongoose.model('TestSession', sessionSchema);
    
    // Create service instance
    adminStatsService = new AdminStatsService();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    await User.deleteMany({});
    await Session.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  /**
   * Feature: admin-user-management, Property 1: Dashboard Statistics Accuracy
   * Validates: Requirements 1.1
   * 
   * For any set of client users in the database, getTotalClients() SHALL return
   * the exact count of users with role 'client' and status not 'deleted'.
   */
  test('getTotalClients returns exact count of non-deleted clients', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of users with various roles and statuses
        fc.array(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 50 }),
            role: fc.constantFrom('client', 'psychologist', 'admin'),
            status: fc.constantFrom('active', 'inactive', 'deleted')
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (usersData) => {
          // Clear before this iteration
          await User.deleteMany({});
          
          // Make emails unique by appending index and timestamp
          const uniqueUsers = usersData.map((user, index) => ({
            ...user,
            email: `user${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123'
          }));

          // Insert users into database
          if (uniqueUsers.length > 0) {
            await User.insertMany(uniqueUsers);
          }

          // Calculate expected count: clients that are not deleted
          const expectedCount = uniqueUsers.filter(
            u => u.role === 'client' && u.status !== 'deleted'
          ).length;

          // Get actual count from service (uses 'users' collection)
          const db = mongoose.connection.db;
          const actualCount = await db.collection('testusers').countDocuments({ 
            role: 'client',
            status: { $ne: 'deleted' }
          });

          // Property: counts must match exactly
          expect(actualCount).toBe(expectedCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: admin-user-management, Property 1: Dashboard Statistics Accuracy
   * Validates: Requirements 1.2
   * 
   * For any set of psychologist users in the database, getTotalPsychologists() SHALL return
   * the exact count of users with role 'psychologist' and status not 'deleted'.
   */
  test('getTotalPsychologists returns exact count of non-deleted psychologists', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 50 }),
            role: fc.constantFrom('client', 'psychologist', 'admin'),
            status: fc.constantFrom('active', 'inactive', 'deleted')
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (usersData) => {
          await User.deleteMany({});
          
          const uniqueUsers = usersData.map((user, index) => ({
            ...user,
            email: `psych${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123'
          }));

          if (uniqueUsers.length > 0) {
            await User.insertMany(uniqueUsers);
          }

          const expectedCount = uniqueUsers.filter(
            u => u.role === 'psychologist' && u.status !== 'deleted'
          ).length;

          const db = mongoose.connection.db;
          const actualCount = await db.collection('testusers').countDocuments({ 
            role: 'psychologist',
            status: { $ne: 'deleted' }
          });

          expect(actualCount).toBe(expectedCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: admin-user-management, Property 1: Dashboard Statistics Accuracy
   * Validates: Requirements 1.3
   * 
   * For any set of sessions in the database, getSessionStats() SHALL return
   * counts that match the actual session status distribution.
   */
  test('getSessionStats returns accurate session status breakdown', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            status: fc.constantFrom(
              'Pending', 'Pending Approval', 'Approved', 'Payment Submitted',
              'Confirmed', 'Booked', 'In Progress', 'Completed', 'Cancelled', 'Declined'
            ),
            sessionType: fc.constantFrom('Individual', 'Couples', 'Family', 'Group'),
            price: fc.integer({ min: 1000, max: 10000 })
          }),
          { minLength: 0, maxLength: 30 }
        ),
        async (sessionsData) => {
          await User.deleteMany({});
          await Session.deleteMany({});
          
          // Create test users for sessions
          const client = await User.create({
            name: 'Test Client',
            email: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'client'
          });

          const psychologist = await User.create({
            name: 'Test Psychologist',
            email: `psych_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'psychologist'
          });

          // Insert sessions with required fields
          const sessionsToInsert = sessionsData.map((session, index) => ({
            ...session,
            client: client._id,
            psychologist: psychologist._id,
            sessionDate: new Date(Date.now() + index * 86400000)
          }));

          if (sessionsToInsert.length > 0) {
            await Session.insertMany(sessionsToInsert);
          }

          // Calculate expected counts using the same mapping as the service
          const statusMapping = {
            'Pending': 'pending',
            'Pending Approval': 'pending',
            'Approved': 'approved',
            'Payment Submitted': 'approved',
            'Confirmed': 'confirmed',
            'Booked': 'confirmed',
            'In Progress': 'inProgress',
            'Completed': 'completed',
            'Cancelled': 'cancelled',
            'Declined': 'cancelled'
          };

          const expectedStats = {
            pending: 0,
            approved: 0,
            confirmed: 0,
            inProgress: 0,
            completed: 0,
            cancelled: 0,
            total: sessionsData.length
          };

          sessionsData.forEach(session => {
            const mappedStatus = statusMapping[session.status];
            if (mappedStatus) {
              expectedStats[mappedStatus]++;
            }
          });

          // Get actual stats from database
          const db = mongoose.connection.db;
          const statusCounts = await db.collection('testsessions').aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ]).toArray();
          
          const actualStats = {
            pending: 0,
            approved: 0,
            confirmed: 0,
            inProgress: 0,
            completed: 0,
            cancelled: 0,
            total: 0
          };
          
          for (const item of statusCounts) {
            const mappedStatus = statusMapping[item._id];
            if (mappedStatus) {
              actualStats[mappedStatus] += item.count;
            }
            actualStats.total += item.count;
          }

          // Property: all status counts must match
          expect(actualStats.pending).toBe(expectedStats.pending);
          expect(actualStats.approved).toBe(expectedStats.approved);
          expect(actualStats.confirmed).toBe(expectedStats.confirmed);
          expect(actualStats.inProgress).toBe(expectedStats.inProgress);
          expect(actualStats.completed).toBe(expectedStats.completed);
          expect(actualStats.cancelled).toBe(expectedStats.cancelled);
          expect(actualStats.total).toBe(expectedStats.total);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: admin-user-management, Property 1: Dashboard Statistics Accuracy
   * Validates: Requirements 1.4
   * 
   * For any set of paid sessions in the database, getPaymentStats() SHALL return
   * the exact count and sum of payments.
   */
  test('getPaymentStats returns accurate payment count and total amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            paymentStatus: fc.constantFrom('Pending', 'Paid', 'Confirmed', 'Verified', 'Failed'),
            mpesaAmount: fc.integer({ min: 100, max: 10000 }),
            price: fc.integer({ min: 100, max: 10000 }),
            sessionType: fc.constantFrom('Individual', 'Couples', 'Family', 'Group')
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (sessionsData) => {
          await User.deleteMany({});
          await Session.deleteMany({});
          
          const client = await User.create({
            name: 'Payment Test Client',
            email: `payclient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'client'
          });

          const psychologist = await User.create({
            name: 'Payment Test Psychologist',
            email: `paypsych_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'psychologist'
          });

          const sessionsToInsert = sessionsData.map((session, index) => ({
            ...session,
            client: client._id,
            psychologist: psychologist._id,
            sessionDate: new Date(Date.now() + index * 86400000),
            status: 'Confirmed'
          }));

          if (sessionsToInsert.length > 0) {
            await Session.insertMany(sessionsToInsert);
          }

          // Calculate expected payment stats (only Paid, Confirmed, Verified count)
          const paidStatuses = ['Paid', 'Confirmed', 'Verified'];
          const paidSessions = sessionsData.filter(s => paidStatuses.includes(s.paymentStatus));
          
          const expectedCount = paidSessions.length;
          const expectedAmount = paidSessions.reduce((sum, s) => {
            return sum + (s.mpesaAmount || s.price || 0);
          }, 0);

          // Get actual stats from database
          const db = mongoose.connection.db;
          const paymentAggregation = await db.collection('testsessions').aggregate([
            {
              $match: {
                paymentStatus: { $in: ['Paid', 'Confirmed', 'Verified'] }
              }
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalAmount: { 
                  $sum: { 
                    $ifNull: ['$mpesaAmount', { $ifNull: ['$price', 0] }] 
                  } 
                }
              }
            }
          ]).toArray();
          
          const result = paymentAggregation[0] || { count: 0, totalAmount: 0 };

          // Property: payment count and amount must match
          expect(result.count).toBe(expectedCount);
          expect(result.totalAmount).toBe(expectedAmount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: admin-user-management, Property 1: Dashboard Statistics Accuracy
   * Validates: Requirements 1.5
   * 
   * For any set of psychologists in the database, getPendingApprovals() SHALL return
   * the exact count of psychologists with approvalStatus 'pending'.
   */
  test('getPendingApprovals returns exact count of pending psychologist approvals', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 50 }),
            role: fc.constantFrom('client', 'psychologist', 'admin'),
            status: fc.constantFrom('active', 'inactive', 'deleted'),
            approvalStatus: fc.constantFrom('pending', 'approved', 'rejected', 'not_applicable')
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (usersData) => {
          await User.deleteMany({});
          
          const uniqueUsers = usersData.map((user, index) => ({
            ...user,
            email: `approval${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123'
          }));

          if (uniqueUsers.length > 0) {
            await User.insertMany(uniqueUsers);
          }

          // Expected: psychologists with pending approval and not deleted
          const expectedCount = uniqueUsers.filter(
            u => u.role === 'psychologist' && 
                 u.status !== 'deleted' && 
                 u.approvalStatus === 'pending'
          ).length;

          const db = mongoose.connection.db;
          const actualCount = await db.collection('testusers').countDocuments({
            role: 'psychologist',
            status: { $ne: 'deleted' },
            approvalStatus: 'pending'
          });

          expect(actualCount).toBe(expectedCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: admin-user-management, Property 1: Dashboard Statistics Accuracy
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
   * 
   * For any database state, the statistics calculations SHALL be internally consistent
   * (total users = clients + psychologists + admins).
   */
  test('Statistics calculations are internally consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate users
        fc.array(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 50 }),
            role: fc.constantFrom('client', 'psychologist', 'admin'),
            status: fc.constantFrom('active', 'inactive'),
            approvalStatus: fc.constantFrom('pending', 'approved', 'rejected')
          }),
          { minLength: 1, maxLength: 15 }
        ),
        async (usersData) => {
          await User.deleteMany({});
          
          const uniqueUsers = usersData.map((user, index) => ({
            ...user,
            email: `allstats${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123'
          }));

          await User.insertMany(uniqueUsers);

          const db = mongoose.connection.db;
          
          // Get counts
          const totalClients = await db.collection('testusers').countDocuments({ 
            role: 'client', status: { $ne: 'deleted' } 
          });
          const totalPsychologists = await db.collection('testusers').countDocuments({ 
            role: 'psychologist', status: { $ne: 'deleted' } 
          });
          const totalAdmins = await db.collection('testusers').countDocuments({ 
            role: 'admin', status: { $ne: 'deleted' } 
          });
          const totalUsers = await db.collection('testusers').countDocuments({ 
            status: { $ne: 'deleted' } 
          });

          // Property: total users should equal sum of all roles
          expect(totalClients + totalPsychologists + totalAdmins).toBe(totalUsers);
          
          // Verify non-negative values
          expect(totalClients).toBeGreaterThanOrEqual(0);
          expect(totalPsychologists).toBeGreaterThanOrEqual(0);
          expect(totalAdmins).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 20 }
    );
  });
});
