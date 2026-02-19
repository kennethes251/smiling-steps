/**
 * Property-Based Tests for Admin Booking Prevents Double-Booking
 * 
 * Feature: admin-user-management, Property 17: Admin Booking Prevents Double-Booking
 * Validates: Requirements 15.3
 * 
 * For any time slot that already has a confirmed session, an admin booking attempt 
 * for the same psychologist and time slot SHALL be rejected, and no duplicate 
 * session SHALL be created.
 */

const fc = require('fast-check');

// Import shared booking validation utilities
const {
  checkForDoubleBooking,
  SESSION_DURATION_MS,
  VALID_SESSION_TYPES,
  VALID_PAYMENT_STATUSES,
  ACTIVE_SESSION_STATUSES,
  CANCELLED_SESSION_STATUSES
} = require('../utils/bookingValidation');

// Mock environment setup
process.env.NODE_ENV = 'test';

// Mock mongoose models
jest.mock('../models/Session');
jest.mock('../models/User');
jest.mock('../models/AuditLog');

const Session = require('../models/Session');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// ============================================================================
// ARBITRARIES (Generators)
// ============================================================================

// Generator for valid MongoDB ObjectId-like strings (24 hex characters)
const hexChars = '0123456789abcdef';
const objectIdArb = fc.array(
  fc.integer({ min: 0, max: 15 }),
  { minLength: 24, maxLength: 24 }
).map(arr => arr.map(n => hexChars[n]).join(''));

// Generator for future dates (sessions must be in the future)
const futureDateArb = fc.date({ 
  min: new Date(Date.now() + SESSION_DURATION_MS), // At least 1 session duration in the future
  max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Up to 1 year in the future
});

// Generator for time offsets within the session duration window (0-59 minutes)
const timeOffsetArb = fc.integer({ min: 0, max: 59 }).map(minutes => minutes * 60 * 1000);

// ============================================================================
// FACTORY HELPERS
// ============================================================================

/**
 * Creates an existing session object for testing
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Session object
 */
const createExistingSession = (overrides = {}) => ({
  _id: overrides._id || 'existing-session-id',
  psychologist: overrides.psychologist || 'default-psychologist-id',
  client: overrides.client || 'default-client-id',
  sessionDate: overrides.sessionDate || new Date(),
  sessionType: overrides.sessionType || 'Individual',
  status: overrides.status || 'Confirmed',
  paymentStatus: overrides.paymentStatus || 'Pending',
  ...overrides
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Wrapper to check double booking using the shared utility
 * Returns true if booking should be rejected (conflict exists)
 */
const hasBookingConflict = (psychologistId, sessionDate, existingSession) => {
  // Handle invalid dates
  if (!sessionDate || isNaN(new Date(sessionDate).getTime())) {
    return false;
  }
  
  const result = checkForDoubleBooking(existingSession, sessionDate, psychologistId);
  return result.isConflict;
};

// ============================================================================
// TESTS
// ============================================================================

describe('Admin Booking Double-Booking Prevention Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 17: Admin Booking Prevents Double-Booking', () => {
    /**
     * Feature: admin-user-management, Property 17: Admin Booking Prevents Double-Booking
     * Validates: Requirements 15.3
     */

    describe('Conflict Detection', () => {
      test('should reject booking when exact same time slot is already booked', async () => {
        await fc.assert(
          fc.asyncProperty(
            objectIdArb,
            objectIdArb,
            futureDateArb,
            fc.constantFrom(...VALID_SESSION_TYPES),
            fc.constantFrom(...ACTIVE_SESSION_STATUSES),
            async (psychologistId, clientId, sessionDate, sessionType, existingStatus) => {
              // Skip invalid dates
              fc.pre(sessionDate instanceof Date && !isNaN(sessionDate.getTime()));
              
              const existingSession = createExistingSession({
                psychologist: psychologistId,
                client: clientId,
                sessionDate,
                sessionType,
                status: existingStatus
              });

              const hasConflict = hasBookingConflict(psychologistId, sessionDate, existingSession);

              // PROPERTY: When a session exists at the exact same time, booking should be rejected
              expect(hasConflict).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should reject booking when time slot overlaps within session duration', async () => {
        await fc.assert(
          fc.asyncProperty(
            objectIdArb,
            objectIdArb,
            futureDateArb,
            fc.integer({ min: 1, max: 59 }).map(minutes => minutes * 60 * 1000), // 1-59 minutes offset
            fc.constantFrom(...ACTIVE_SESSION_STATUSES),
            async (psychologistId, clientId, baseDate, offsetMs, existingStatus) => {
              fc.pre(baseDate instanceof Date && !isNaN(baseDate.getTime()));
              
              const existingSessionDate = new Date(baseDate);
              const newBookingDate = new Date(existingSessionDate.getTime() + offsetMs);

              const existingSession = createExistingSession({
                psychologist: psychologistId,
                client: clientId,
                sessionDate: existingSessionDate,
                status: existingStatus
              });

              const hasConflict = hasBookingConflict(psychologistId, newBookingDate, existingSession);

              // PROPERTY: When new booking overlaps with existing session duration, it should be rejected
              expect(hasConflict).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Non-Blocking Scenarios', () => {
      test('should allow booking when cancelled session exists at same time', async () => {
        await fc.assert(
          fc.asyncProperty(
            objectIdArb,
            objectIdArb,
            futureDateArb,
            fc.constantFrom(...VALID_SESSION_TYPES),
            fc.constantFrom(...CANCELLED_SESSION_STATUSES),
            async (psychologistId, clientId, sessionDate, sessionType, cancelledStatus) => {
              const existingSession = createExistingSession({
                psychologist: psychologistId,
                client: clientId,
                sessionDate,
                sessionType,
                status: cancelledStatus
              });

              const hasConflict = hasBookingConflict(psychologistId, sessionDate, existingSession);

              // PROPERTY: Cancelled/Declined sessions should NOT block new bookings
              expect(hasConflict).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should allow booking for different psychologist at same time', async () => {
        await fc.assert(
          fc.asyncProperty(
            objectIdArb,
            objectIdArb,
            objectIdArb,
            futureDateArb,
            fc.constantFrom(...ACTIVE_SESSION_STATUSES),
            async (psychologistId1, psychologistId2, clientId, sessionDate, existingStatus) => {
              fc.pre(psychologistId1 !== psychologistId2);

              const existingSession = createExistingSession({
                psychologist: psychologistId1,
                client: clientId,
                sessionDate,
                status: existingStatus
              });

              const hasConflict = hasBookingConflict(psychologistId2, sessionDate, existingSession);

              // PROPERTY: Different psychologists can have sessions at the same time
              expect(hasConflict).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should allow booking when time slot is sufficiently separated (more than 2 hours)', async () => {
        await fc.assert(
          fc.asyncProperty(
            objectIdArb,
            objectIdArb,
            futureDateArb,
            fc.integer({ min: 121, max: 300 }), // 121-300 minutes separation (more than 2 hours)
            fc.constantFrom(...ACTIVE_SESSION_STATUSES),
            async (psychologistId, clientId, baseDate, separationMinutes, existingStatus) => {
              fc.pre(baseDate instanceof Date && !isNaN(baseDate.getTime()));
              
              const existingSessionDate = new Date(baseDate);
              const newBookingDate = new Date(existingSessionDate.getTime() + separationMinutes * 60 * 1000);

              const existingSession = createExistingSession({
                psychologist: psychologistId,
                client: clientId,
                sessionDate: existingSessionDate,
                status: existingStatus
              });

              const hasConflict = hasBookingConflict(psychologistId, newBookingDate, existingSession);

              // PROPERTY: Sessions with sufficient time separation (>2 hours) should be allowed
              expect(hasConflict).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Session Creation Invariants', () => {
      test('should not create duplicate session when conflict is detected', async () => {
        await fc.assert(
          fc.asyncProperty(
            objectIdArb,
            objectIdArb,
            objectIdArb,
            futureDateArb,
            fc.constantFrom(...VALID_SESSION_TYPES),
            fc.constantFrom(...VALID_PAYMENT_STATUSES),
            async (psychologistId, clientId, adminId, sessionDate, sessionType, paymentStatus) => {
              let sessionCreated = false;
              let createdSessionCount = 0;

              const existingSession = createExistingSession({
                psychologist: psychologistId,
                client: clientId,
                sessionDate,
                sessionType,
                status: 'Confirmed',
                paymentStatus: 'Paid'
              });

              Session.findOne = jest.fn().mockResolvedValue(existingSession);

              Session.mockImplementation(function(data) {
                sessionCreated = true;
                createdSessionCount++;
                this.save = jest.fn().mockResolvedValue({ ...data, _id: 'new-session-id' });
                Object.assign(this, data);
              });

              const hasConflict = hasBookingConflict(psychologistId, sessionDate, existingSession);

              if (!hasConflict) {
                new Session({
                  client: clientId,
                  psychologist: psychologistId,
                  sessionType,
                  sessionDate,
                  price: 2000,
                  status: 'Approved',
                  paymentStatus: 'Pending',
                  createdByAdmin: true,
                  adminId,
                  adminBookingReason: 'Test booking',
                  adminPaymentStatus: paymentStatus
                });
              }

              // PROPERTY: When conflict exists, no new session should be created
              expect(hasConflict).toBe(true);
              expect(sessionCreated).toBe(false);
              expect(createdSessionCount).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should detect conflicts for all active session statuses', async () => {
        await fc.assert(
          fc.asyncProperty(
            objectIdArb,
            objectIdArb,
            futureDateArb,
            fc.constantFrom(...ACTIVE_SESSION_STATUSES),
            async (psychologistId, clientId, sessionDate, activeStatus) => {
              // Skip invalid dates
              fc.pre(sessionDate instanceof Date && !isNaN(sessionDate.getTime()));
              
              const existingSession = createExistingSession({
                psychologist: psychologistId,
                client: clientId,
                sessionDate,
                status: activeStatus
              });

              const hasConflict = hasBookingConflict(psychologistId, sessionDate, existingSession);

              // PROPERTY: All active session statuses should block new bookings
              expect(hasConflict).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Boundary Conditions', () => {
      test('should allow booking when booking exactly 1 hour after existing session', async () => {
        await fc.assert(
          fc.asyncProperty(
            objectIdArb,
            objectIdArb,
            futureDateArb,
            fc.constantFrom(...ACTIVE_SESSION_STATUSES),
            async (psychologistId, clientId, baseDate, existingStatus) => {
              fc.pre(baseDate instanceof Date && !isNaN(baseDate.getTime()));
              
              const existingSessionDate = new Date(baseDate);
              const newBookingDate = new Date(existingSessionDate.getTime() + SESSION_DURATION_MS);

              const existingSession = createExistingSession({
                psychologist: psychologistId,
                client: clientId,
                sessionDate: existingSessionDate,
                status: existingStatus
              });

              const hasConflict = hasBookingConflict(psychologistId, newBookingDate, existingSession);

              // PROPERTY: Booking exactly 1 hour after should be allowed
              // because the sessions don't overlap (one ends when the other starts)
              expect(hasConflict).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should reject booking when attempting to book 1 minute before session ends', async () => {
        await fc.assert(
          fc.asyncProperty(
            objectIdArb,
            objectIdArb,
            futureDateArb,
            fc.constantFrom(...ACTIVE_SESSION_STATUSES),
            async (psychologistId, clientId, baseDate, existingStatus) => {
              const existingSessionDate = new Date(baseDate);
              const newBookingDate = new Date(existingSessionDate.getTime() + 59 * 60 * 1000);

              const existingSession = createExistingSession({
                psychologist: psychologistId,
                client: clientId,
                sessionDate: existingSessionDate,
                status: existingStatus
              });

              const hasConflict = hasBookingConflict(psychologistId, newBookingDate, existingSession);

              // PROPERTY: Booking during an existing session should be rejected
              expect(hasConflict).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Multiple Booking Attempts', () => {
      test('should maintain session count invariant when conflict is detected', async () => {
        await fc.assert(
          fc.asyncProperty(
            objectIdArb,
            objectIdArb,
            objectIdArb,
            futureDateArb,
            fc.array(fc.constantFrom(...VALID_SESSION_TYPES), { minLength: 1, maxLength: 5 }),
            async (psychologistId, clientId, adminId, sessionDate, attemptedSessionTypes) => {
              let sessionCount = 0;

              const existingSession = createExistingSession({
                psychologist: psychologistId,
                client: clientId,
                sessionDate,
                status: 'Confirmed',
                paymentStatus: 'Paid'
              });

              Session.mockImplementation(function(data) {
                sessionCount++;
                this.save = jest.fn().mockResolvedValue({ ...data, _id: `session-${sessionCount}` });
                Object.assign(this, data);
              });

              // Attempt multiple bookings at the same time
              for (const sessionType of attemptedSessionTypes) {
                const hasConflict = hasBookingConflict(psychologistId, sessionDate, existingSession);
                
                if (!hasConflict) {
                  new Session({
                    client: clientId,
                    psychologist: psychologistId,
                    sessionType,
                    sessionDate,
                    price: 2000,
                    status: 'Approved',
                    paymentStatus: 'Pending',
                    createdByAdmin: true,
                    adminId,
                    adminBookingReason: 'Test booking',
                    adminPaymentStatus: 'pending'
                  });
                }
              }

              // PROPERTY: No new sessions should be created when conflicts exist
              expect(sessionCount).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
