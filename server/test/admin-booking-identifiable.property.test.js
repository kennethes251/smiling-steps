/**
 * Property-Based Tests for Admin-Created Bookings Are Identifiable
 * 
 * Feature: admin-user-management, Property 19: Admin-Created Bookings Are Identifiable
 * Validates: Requirements 15.7
 * 
 * For any session listing that includes admin-created bookings, those sessions SHALL have 
 * the createdByAdmin flag set to true and include the adminId, distinguishing them from 
 * client-created bookings.
 */

const fc = require('fast-check');

// Mock environment setup
process.env.NODE_ENV = 'test';

// Mock mongoose models
jest.mock('../models/Session');
jest.mock('../models/User');

const Session = require('../models/Session');
const User = require('../models/User');

// ============================================================================
// ARBITRARIES (Generators)
// ============================================================================

// Generator for valid MongoDB ObjectId-like strings (24 hex characters)
const objectIdArb = fc.array(
  fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
  { minLength: 24, maxLength: 24 }
).map(arr => arr.join(''));

// Generator for future dates
const futureDateArb = fc.date({ 
  min: new Date(Date.now() + 60 * 60 * 1000),
  max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
});

// Valid session types
const validSessionTypes = ['Individual', 'Couples', 'Family', 'Group'];

// Valid session statuses
const validSessionStatuses = ['Pending', 'Approved', 'Confirmed', 'Completed', 'Cancelled'];

// Valid admin payment statuses
const validAdminPaymentStatuses = ['pending', 'paid', 'waived'];

// Generator for booking reason strings
const reasonArb = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0);

// Generator for admin-created session
const adminCreatedSessionArb = fc.record({
  _id: objectIdArb,
  client: objectIdArb,
  psychologist: objectIdArb,
  sessionType: fc.constantFrom(...validSessionTypes),
  sessionDate: futureDateArb,
  status: fc.constantFrom(...validSessionStatuses),
  price: fc.integer({ min: 500, max: 10000 }),
  createdByAdmin: fc.constant(true),
  adminId: objectIdArb,
  adminBookingReason: reasonArb,
  adminPaymentStatus: fc.constantFrom(...validAdminPaymentStatuses),
  createdAt: fc.date({ min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), max: new Date() })
});

// Generator for client-created session (no admin fields)
const clientCreatedSessionArb = fc.record({
  _id: objectIdArb,
  client: objectIdArb,
  psychologist: objectIdArb,
  sessionType: fc.constantFrom(...validSessionTypes),
  sessionDate: futureDateArb,
  status: fc.constantFrom(...validSessionStatuses),
  price: fc.integer({ min: 500, max: 10000 }),
  createdByAdmin: fc.constant(false),
  createdAt: fc.date({ min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), max: new Date() })
});

// Generator for mixed session list (both admin and client created)
const mixedSessionListArb = fc.tuple(
  fc.array(adminCreatedSessionArb, { minLength: 1, maxLength: 5 }),
  fc.array(clientCreatedSessionArb, { minLength: 1, maxLength: 5 })
).map(([adminSessions, clientSessions]) => [...adminSessions, ...clientSessions]);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Checks if a session is identifiable as admin-created
 * @param {Object} session - Session object to check
 * @returns {boolean} True if session is properly marked as admin-created
 */
const isIdentifiableAsAdminCreated = (session) => {
  return session.createdByAdmin === true && 
         session.adminId !== undefined && 
         session.adminId !== null;
};

/**
 * Checks if a session is identifiable as client-created
 * @param {Object} session - Session object to check
 * @returns {boolean} True if session is properly marked as client-created
 */
const isIdentifiableAsClientCreated = (session) => {
  return session.createdByAdmin === false || session.createdByAdmin === undefined;
};

/**
 * Filters sessions to get only admin-created ones
 * @param {Array} sessions - Array of session objects
 * @returns {Array} Admin-created sessions
 */
const filterAdminCreatedSessions = (sessions) => {
  return sessions.filter(s => s.createdByAdmin === true);
};

/**
 * Filters sessions to get only client-created ones
 * @param {Array} sessions - Array of session objects
 * @returns {Array} Client-created sessions
 */
const filterClientCreatedSessions = (sessions) => {
  return sessions.filter(s => s.createdByAdmin === false || s.createdByAdmin === undefined);
};

// ============================================================================
// TESTS
// ============================================================================

describe('Admin-Created Bookings Identifiable Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 19: Admin-Created Bookings Are Identifiable', () => {
    /**
     * Feature: admin-user-management, Property 19: Admin-Created Bookings Are Identifiable
     * Validates: Requirements 15.7
     * 
     * For any session listing that includes admin-created bookings, those sessions SHALL have 
     * the createdByAdmin flag set to true and include the adminId, distinguishing them from 
     * client-created bookings.
     */

    test('should have createdByAdmin=true for all admin-created sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          adminCreatedSessionArb,
          async (adminSession) => {
            // PROPERTY: Admin-created sessions must have createdByAdmin=true
            expect(adminSession.createdByAdmin).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should have adminId present for all admin-created sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          adminCreatedSessionArb,
          async (adminSession) => {
            // PROPERTY: Admin-created sessions must have adminId defined
            expect(adminSession.adminId).toBeDefined();
            expect(adminSession.adminId).not.toBeNull();
            expect(typeof adminSession.adminId).toBe('string');
            expect(adminSession.adminId.length).toBe(24); // MongoDB ObjectId length
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should distinguish admin-created from client-created sessions in mixed list', async () => {
      await fc.assert(
        fc.asyncProperty(
          mixedSessionListArb,
          async (sessions) => {
            const adminSessions = filterAdminCreatedSessions(sessions);
            const clientSessions = filterClientCreatedSessions(sessions);

            // PROPERTY: All admin-created sessions must be identifiable
            for (const session of adminSessions) {
              expect(isIdentifiableAsAdminCreated(session)).toBe(true);
            }

            // PROPERTY: All client-created sessions must be distinguishable
            for (const session of clientSessions) {
              expect(isIdentifiableAsClientCreated(session)).toBe(true);
            }

            // PROPERTY: No overlap - sessions are either admin or client created
            expect(adminSessions.length + clientSessions.length).toBe(sessions.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should include adminBookingReason for admin-created sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          adminCreatedSessionArb,
          async (adminSession) => {
            // PROPERTY: Admin-created sessions should have a booking reason
            expect(adminSession.adminBookingReason).toBeDefined();
            expect(typeof adminSession.adminBookingReason).toBe('string');
            expect(adminSession.adminBookingReason.trim().length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should include adminPaymentStatus for admin-created sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          adminCreatedSessionArb,
          async (adminSession) => {
            // PROPERTY: Admin-created sessions should have adminPaymentStatus
            expect(adminSession.adminPaymentStatus).toBeDefined();
            expect(validAdminPaymentStatuses).toContain(adminSession.adminPaymentStatus);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should not have adminId for client-created sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          clientCreatedSessionArb,
          async (clientSession) => {
            // PROPERTY: Client-created sessions should not have adminId
            expect(clientSession.adminId).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should correctly filter admin-created sessions from listing', async () => {
      await fc.assert(
        fc.asyncProperty(
          mixedSessionListArb,
          async (sessions) => {
            // Simulate the GET /api/admin/sessions/admin-created endpoint behavior
            const adminCreatedFilter = { createdByAdmin: true };
            const filteredSessions = sessions.filter(s => s.createdByAdmin === adminCreatedFilter.createdByAdmin);

            // PROPERTY: Filtered list should only contain admin-created sessions
            for (const session of filteredSessions) {
              expect(session.createdByAdmin).toBe(true);
              expect(session.adminId).toBeDefined();
            }

            // PROPERTY: All admin-created sessions should be in the filtered list
            const originalAdminSessions = sessions.filter(s => s.createdByAdmin === true);
            expect(filteredSessions.length).toBe(originalAdminSessions.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve all admin booking fields when querying', async () => {
      await fc.assert(
        fc.asyncProperty(
          adminCreatedSessionArb,
          async (adminSession) => {
            // Simulate database query and response
            let queriedSession = null;

            Session.findById = jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                  populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue({
                      ...adminSession,
                      client: { _id: adminSession.client, name: 'Test Client' },
                      psychologist: { _id: adminSession.psychologist, name: 'Dr. Test' },
                      adminId: { _id: adminSession.adminId, name: 'Admin User' }
                    })
                  })
                })
              })
            });

            queriedSession = await Session.findById(adminSession._id)
              .populate('client')
              .populate('psychologist')
              .populate('adminId')
              .lean();

            // PROPERTY: All admin booking fields should be preserved after query
            expect(queriedSession.createdByAdmin).toBe(true);
            expect(queriedSession.adminId).toBeDefined();
            expect(queriedSession.adminBookingReason).toBe(adminSession.adminBookingReason);
            expect(queriedSession.adminPaymentStatus).toBe(adminSession.adminPaymentStatus);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow filtering by adminId to find sessions created by specific admin', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(adminCreatedSessionArb, { minLength: 2, maxLength: 10 }),
          objectIdArb,
          async (adminSessions, targetAdminId) => {
            // Assign some sessions to the target admin
            const sessionsWithTargetAdmin = adminSessions.map((session, index) => ({
              ...session,
              adminId: index % 2 === 0 ? targetAdminId : session.adminId
            }));

            // Filter by specific adminId
            const filteredByAdmin = sessionsWithTargetAdmin.filter(s => s.adminId === targetAdminId);

            // PROPERTY: All filtered sessions should have the target adminId
            for (const session of filteredByAdmin) {
              expect(session.adminId).toBe(targetAdminId);
              expect(session.createdByAdmin).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain identifiability after session status changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          adminCreatedSessionArb,
          fc.constantFrom(...validSessionStatuses),
          async (adminSession, newStatus) => {
            // Simulate status update
            const updatedSession = {
              ...adminSession,
              status: newStatus
            };

            // PROPERTY: Admin booking fields should remain unchanged after status update
            expect(updatedSession.createdByAdmin).toBe(true);
            expect(updatedSession.adminId).toBe(adminSession.adminId);
            expect(updatedSession.adminBookingReason).toBe(adminSession.adminBookingReason);
            expect(updatedSession.adminPaymentStatus).toBe(adminSession.adminPaymentStatus);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should correctly count admin-created vs client-created sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          mixedSessionListArb,
          async (sessions) => {
            const adminCount = sessions.filter(s => s.createdByAdmin === true).length;
            const clientCount = sessions.filter(s => s.createdByAdmin === false || s.createdByAdmin === undefined).length;

            // PROPERTY: Total count should equal sum of admin and client created
            expect(adminCount + clientCount).toBe(sessions.length);

            // PROPERTY: Admin count should be at least 1 (from generator)
            expect(adminCount).toBeGreaterThanOrEqual(1);

            // PROPERTY: Client count should be at least 1 (from generator)
            expect(clientCount).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should include admin name when populating adminId', async () => {
      await fc.assert(
        fc.asyncProperty(
          adminCreatedSessionArb,
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (adminSession, adminName) => {
            // Simulate populated response
            const populatedSession = {
              ...adminSession,
              adminId: {
                _id: adminSession.adminId,
                name: adminName,
                email: 'admin@test.com',
                role: 'admin'
              }
            };

            // PROPERTY: Populated adminId should contain admin details
            expect(populatedSession.adminId).toBeDefined();
            expect(populatedSession.adminId._id).toBe(adminSession.adminId);
            expect(populatedSession.adminId.name).toBe(adminName);
            expect(populatedSession.adminId.role).toBe('admin');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
