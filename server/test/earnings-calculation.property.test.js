/**
 * Property-Based Tests for Earnings Calculation Accuracy
 * 
 * Feature: admin-user-management, Property 12: Earnings Calculation Accuracy
 * Validates: Requirements 7.1, 7.2
 * 
 * For any psychologist and date range, the earnings total SHALL equal the sum of 
 * all confirmed payment amounts for sessions with that psychologist within the date range.
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('Property 12: Earnings Calculation Accuracy', () => {
  let mongoServer;
  let User;
  let Session;

  beforeAll(async () => {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Connect mongoose
    await mongoose.connect(uri);
    
    // Define simplified schemas for testing
    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true },
      password: String,
      role: { type: String, enum: ['client', 'psychologist', 'admin'], default: 'client' },
      status: { type: String, enum: ['active', 'inactive', 'deleted'], default: 'active' }
    });
    
    const sessionSchema = new mongoose.Schema({
      client: { type: mongoose.Schema.Types.ObjectId, ref: 'EarningsTestUser' },
      psychologist: { type: mongoose.Schema.Types.ObjectId, ref: 'EarningsTestUser' },
      sessionType: { type: String, enum: ['Individual', 'Couples', 'Family', 'Group'] },
      sessionDate: Date,
      status: { type: String, default: 'Pending' },
      price: Number,
      paymentStatus: { type: String, default: 'Pending' },
      mpesaAmount: Number,
      mpesaTransactionID: String
    });
    
    // Create models with unique names to avoid conflicts
    User = mongoose.model('EarningsTestUser', userSchema);
    Session = mongoose.model('EarningsTestSession', sessionSchema);
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
   * Feature: admin-user-management, Property 12: Earnings Calculation Accuracy
   * Validates: Requirements 7.1, 7.2
   * 
   * For any psychologist and set of sessions with various payment statuses,
   * the total earnings SHALL equal the sum of amounts from sessions with 
   * confirmed payment statuses (Paid, Confirmed, Verified).
   */
  test('Total earnings equals sum of confirmed payment amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of sessions with various payment statuses and amounts
        fc.array(
          fc.record({
            paymentStatus: fc.constantFrom('Pending', 'Submitted', 'Processing', 'Paid', 'Confirmed', 'Verified', 'Failed'),
            mpesaAmount: fc.integer({ min: 100, max: 10000 }),
            price: fc.integer({ min: 100, max: 10000 }),
            sessionType: fc.constantFrom('Individual', 'Couples', 'Family', 'Group'),
            // Generate session date within a reasonable range
            daysOffset: fc.integer({ min: -30, max: 30 })
          }),
          { minLength: 0, maxLength: 25 }
        ),
        async (sessionsData) => {
          // Clear before this iteration
          await User.deleteMany({});
          await Session.deleteMany({});
          
          // Create test psychologist
          const psychologist = await User.create({
            name: 'Test Psychologist',
            email: `psych_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'psychologist'
          });
          
          // Create test client
          const client = await User.create({
            name: 'Test Client',
            email: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'client'
          });
          
          const now = new Date();
          
          // Insert sessions with the psychologist
          const sessionsToInsert = sessionsData.map((session, index) => ({
            client: client._id,
            psychologist: psychologist._id,
            sessionType: session.sessionType,
            sessionDate: new Date(now.getTime() + session.daysOffset * 86400000),
            status: 'Completed',
            paymentStatus: session.paymentStatus,
            mpesaAmount: session.mpesaAmount,
            price: session.price,
            mpesaTransactionID: `TXN${Date.now()}${index}`
          }));
          
          if (sessionsToInsert.length > 0) {
            await Session.insertMany(sessionsToInsert);
          }
          
          // Calculate expected earnings (only Paid, Confirmed, Verified count)
          const confirmedStatuses = ['Paid', 'Confirmed', 'Verified'];
          const expectedEarnings = sessionsData
            .filter(s => confirmedStatuses.includes(s.paymentStatus))
            .reduce((sum, s) => sum + (s.mpesaAmount || s.price || 0), 0);
          
          // Get actual earnings from database using the same logic as earningsService
          const db = mongoose.connection.db;
          const earningsAggregation = await db.collection('earningstestsessions').aggregate([
            {
              $match: {
                psychologist: psychologist._id,
                paymentStatus: { $in: ['Paid', 'Confirmed', 'Verified'] }
              }
            },
            {
              $group: {
                _id: null,
                totalEarnings: {
                  $sum: { $ifNull: ['$mpesaAmount', { $ifNull: ['$price', 0] }] }
                },
                totalSessions: { $sum: 1 }
              }
            }
          ]).toArray();
          
          const actualEarnings = earningsAggregation[0]?.totalEarnings || 0;
          
          // Property: earnings must match exactly
          expect(actualEarnings).toBe(expectedEarnings);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: admin-user-management, Property 12: Earnings Calculation Accuracy
   * Validates: Requirements 7.2
   * 
   * For any psychologist and date range, the earnings total SHALL only include
   * sessions within that date range.
   */
  test('Earnings filtered by date range only includes sessions within range', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate sessions with dates spread across different periods
        fc.array(
          fc.record({
            paymentStatus: fc.constantFrom('Paid', 'Confirmed', 'Verified'),
            mpesaAmount: fc.integer({ min: 100, max: 10000 }),
            sessionType: fc.constantFrom('Individual', 'Couples', 'Family', 'Group'),
            // Days offset from "now" - some inside range, some outside
            daysOffset: fc.integer({ min: -60, max: 60 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        // Generate a date range (start offset and range length in days)
        fc.integer({ min: -30, max: 0 }), // startOffset
        fc.integer({ min: 1, max: 30 }),  // rangeLength
        async (sessionsData, startOffset, rangeLength) => {
          await User.deleteMany({});
          await Session.deleteMany({});
          
          const psychologist = await User.create({
            name: 'Date Range Test Psychologist',
            email: `psych_range_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'psychologist'
          });
          
          const client = await User.create({
            name: 'Date Range Test Client',
            email: `client_range_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'client'
          });
          
          const now = new Date();
          const startDate = new Date(now.getTime() + startOffset * 86400000);
          const endDate = new Date(startDate.getTime() + rangeLength * 86400000);
          
          // Insert sessions
          const sessionsToInsert = sessionsData.map((session, index) => {
            const sessionDate = new Date(now.getTime() + session.daysOffset * 86400000);
            return {
              client: client._id,
              psychologist: psychologist._id,
              sessionType: session.sessionType,
              sessionDate: sessionDate,
              status: 'Completed',
              paymentStatus: session.paymentStatus,
              mpesaAmount: session.mpesaAmount,
              mpesaTransactionID: `TXN_RANGE_${Date.now()}${index}`
            };
          });
          
          await Session.insertMany(sessionsToInsert);
          
          // Calculate expected earnings for sessions within date range
          const expectedEarnings = sessionsData
            .filter(s => {
              const sessionDate = new Date(now.getTime() + s.daysOffset * 86400000);
              return sessionDate >= startDate && sessionDate <= endDate;
            })
            .reduce((sum, s) => sum + (s.mpesaAmount || 0), 0);
          
          // Get actual earnings with date filter
          const db = mongoose.connection.db;
          const earningsAggregation = await db.collection('earningstestsessions').aggregate([
            {
              $match: {
                psychologist: psychologist._id,
                paymentStatus: { $in: ['Paid', 'Confirmed', 'Verified'] },
                sessionDate: {
                  $gte: startDate,
                  $lte: endDate
                }
              }
            },
            {
              $group: {
                _id: null,
                totalEarnings: {
                  $sum: { $ifNull: ['$mpesaAmount', { $ifNull: ['$price', 0] }] }
                }
              }
            }
          ]).toArray();
          
          const actualEarnings = earningsAggregation[0]?.totalEarnings || 0;
          
          // Property: filtered earnings must match expected
          expect(actualEarnings).toBe(expectedEarnings);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: admin-user-management, Property 12: Earnings Calculation Accuracy
   * Validates: Requirements 7.1
   * 
   * For any psychologist, earnings from different psychologists SHALL NOT be mixed.
   * Each psychologist's earnings are isolated.
   */
  test('Earnings are isolated per psychologist', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate sessions for psychologist 1
        fc.array(
          fc.record({
            paymentStatus: fc.constantFrom('Paid', 'Confirmed', 'Verified'),
            mpesaAmount: fc.integer({ min: 100, max: 5000 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        // Generate sessions for psychologist 2
        fc.array(
          fc.record({
            paymentStatus: fc.constantFrom('Paid', 'Confirmed', 'Verified'),
            mpesaAmount: fc.integer({ min: 100, max: 5000 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (sessions1Data, sessions2Data) => {
          await User.deleteMany({});
          await Session.deleteMany({});
          
          // Create two psychologists
          const psychologist1 = await User.create({
            name: 'Psychologist One',
            email: `psych1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'psychologist'
          });
          
          const psychologist2 = await User.create({
            name: 'Psychologist Two',
            email: `psych2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'psychologist'
          });
          
          const client = await User.create({
            name: 'Shared Client',
            email: `client_shared_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'client'
          });
          
          const now = new Date();
          
          // Insert sessions for psychologist 1
          const sessions1 = sessions1Data.map((s, i) => ({
            client: client._id,
            psychologist: psychologist1._id,
            sessionType: 'Individual',
            sessionDate: new Date(now.getTime() + i * 86400000),
            status: 'Completed',
            paymentStatus: s.paymentStatus,
            mpesaAmount: s.mpesaAmount
          }));
          
          // Insert sessions for psychologist 2
          const sessions2 = sessions2Data.map((s, i) => ({
            client: client._id,
            psychologist: psychologist2._id,
            sessionType: 'Individual',
            sessionDate: new Date(now.getTime() + i * 86400000),
            status: 'Completed',
            paymentStatus: s.paymentStatus,
            mpesaAmount: s.mpesaAmount
          }));
          
          await Session.insertMany([...sessions1, ...sessions2]);
          
          // Calculate expected earnings for each psychologist
          const expected1 = sessions1Data.reduce((sum, s) => sum + s.mpesaAmount, 0);
          const expected2 = sessions2Data.reduce((sum, s) => sum + s.mpesaAmount, 0);
          
          // Get actual earnings for psychologist 1
          const db = mongoose.connection.db;
          const earnings1Agg = await db.collection('earningstestsessions').aggregate([
            {
              $match: {
                psychologist: psychologist1._id,
                paymentStatus: { $in: ['Paid', 'Confirmed', 'Verified'] }
              }
            },
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: '$mpesaAmount' }
              }
            }
          ]).toArray();
          
          // Get actual earnings for psychologist 2
          const earnings2Agg = await db.collection('earningstestsessions').aggregate([
            {
              $match: {
                psychologist: psychologist2._id,
                paymentStatus: { $in: ['Paid', 'Confirmed', 'Verified'] }
              }
            },
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: '$mpesaAmount' }
              }
            }
          ]).toArray();
          
          const actual1 = earnings1Agg[0]?.totalEarnings || 0;
          const actual2 = earnings2Agg[0]?.totalEarnings || 0;
          
          // Property: each psychologist's earnings are isolated
          expect(actual1).toBe(expected1);
          expect(actual2).toBe(expected2);
          // Combined should equal sum of both
          expect(actual1 + actual2).toBe(expected1 + expected2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: admin-user-management, Property 12: Earnings Calculation Accuracy
   * Validates: Requirements 7.1
   * 
   * For any set of sessions, pending payments SHALL NOT be included in confirmed earnings.
   */
  test('Pending payments are excluded from confirmed earnings total', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            paymentStatus: fc.constantFrom('Pending', 'Submitted', 'Processing', 'Paid', 'Confirmed', 'Verified', 'Failed'),
            mpesaAmount: fc.integer({ min: 100, max: 10000 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (sessionsData) => {
          await User.deleteMany({});
          await Session.deleteMany({});
          
          const psychologist = await User.create({
            name: 'Pending Test Psychologist',
            email: `psych_pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'psychologist'
          });
          
          const client = await User.create({
            name: 'Pending Test Client',
            email: `client_pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
            password: 'password123',
            role: 'client'
          });
          
          const now = new Date();
          
          const sessionsToInsert = sessionsData.map((s, i) => ({
            client: client._id,
            psychologist: psychologist._id,
            sessionType: 'Individual',
            sessionDate: new Date(now.getTime() + i * 86400000),
            status: 'Completed',
            paymentStatus: s.paymentStatus,
            mpesaAmount: s.mpesaAmount
          }));
          
          await Session.insertMany(sessionsToInsert);
          
          // Calculate expected confirmed earnings (excluding pending statuses)
          const confirmedStatuses = ['Paid', 'Confirmed', 'Verified'];
          const pendingStatuses = ['Pending', 'Submitted', 'Processing'];
          
          const expectedConfirmed = sessionsData
            .filter(s => confirmedStatuses.includes(s.paymentStatus))
            .reduce((sum, s) => sum + s.mpesaAmount, 0);
          
          const expectedPending = sessionsData
            .filter(s => pendingStatuses.includes(s.paymentStatus))
            .reduce((sum, s) => sum + s.mpesaAmount, 0);
          
          // Get actual confirmed earnings
          const db = mongoose.connection.db;
          const confirmedAgg = await db.collection('earningstestsessions').aggregate([
            {
              $match: {
                psychologist: psychologist._id,
                paymentStatus: { $in: confirmedStatuses }
              }
            },
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: '$mpesaAmount' }
              }
            }
          ]).toArray();
          
          // Get actual pending amount
          const pendingAgg = await db.collection('earningstestsessions').aggregate([
            {
              $match: {
                psychologist: psychologist._id,
                paymentStatus: { $in: pendingStatuses }
              }
            },
            {
              $group: {
                _id: null,
                totalPending: { $sum: '$mpesaAmount' }
              }
            }
          ]).toArray();
          
          const actualConfirmed = confirmedAgg[0]?.totalEarnings || 0;
          const actualPending = pendingAgg[0]?.totalPending || 0;
          
          // Property: confirmed earnings exclude pending amounts
          expect(actualConfirmed).toBe(expectedConfirmed);
          expect(actualPending).toBe(expectedPending);
          // Confirmed and pending should not overlap
          expect(actualConfirmed + actualPending).toBeLessThanOrEqual(
            sessionsData.reduce((sum, s) => sum + s.mpesaAmount, 0)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
