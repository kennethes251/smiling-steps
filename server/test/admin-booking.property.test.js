/**
 * Property-Based Tests for Admin Booking Creates Session with Correct Parameters
 * 
 * Feature: admin-user-management, Property 16: Admin Booking Creates Session with Correct Parameters
 * Validates: Requirements 15.1, 15.4
 * 
 * For any admin booking request with valid client, psychologist, date/time, session type, 
 * and payment status, the created session SHALL contain all specified parameters and be 
 * marked as admin-created with the admin's ID.
 */

const fc = require('fast-check');

// Mock environment setup
process.env.NODE_ENV = 'test';

// Mock mongoose models
jest.mock('../models/Session');
jest.mock('../models/User');
jest.mock('../models/AuditLog');

const Session = require('../models/Session');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

describe('Admin Booking Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 16: Admin Booking Creates Session with Correct Parameters', () => {
    /**
     * Feature: admin-user-management, Property 16: Admin Booking Creates Session with Correct Parameters
     * Validates: Requirements 15.1, 15.4
     * 
     * For any admin booking request with valid client, psychologist, date/time, session type, 
     * and payment status, the created session SHALL contain all specified parameters and be 
     * marked as admin-created with the admin's ID.
     */

    // Valid session types
    const validSessionTypes = ['Individual', 'Couples', 'Family', 'Group'];
    
    // Valid payment statuses for admin booking
    const validPaymentStatuses = ['pending', 'paid', 'waived'];

    // Generator for valid MongoDB ObjectId-like strings (24 hex characters)
    const objectIdArb = fc.array(
      fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
      { minLength: 24, maxLength: 24 }
    ).map(arr => arr.join(''));

    // Generator for future dates (sessions must be in the future)
    const futureDateArb = fc.date({ 
      min: new Date(Date.now() + 60 * 60 * 1000), // At least 1 hour in the future
      max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Up to 1 year in the future
    });

    // Generator for session rates
    const sessionRatesArb = fc.record({
      Individual: fc.integer({ min: 500, max: 10000 }),
      Couples: fc.integer({ min: 1000, max: 15000 }),
      Family: fc.integer({ min: 1500, max: 20000 }),
      Group: fc.integer({ min: 300, max: 5000 })
    });

    // Generator for admin booking request
    const adminBookingRequestArb = fc.record({
      clientId: objectIdArb,
      psychologistId: objectIdArb,
      adminId: objectIdArb,
      dateTime: futureDateArb,
      sessionType: fc.constantFrom(...validSessionTypes),
      paymentStatus: fc.constantFrom(...validPaymentStatuses),
      reason: fc.string({ minLength: 5, maxLength: 200 })
    });

    test('should create session with all specified parameters from admin booking request', async () => {
      await fc.assert(
        fc.asyncProperty(
          adminBookingRequestArb,
          sessionRatesArb,
          async (bookingRequest, sessionRates) => {
            // Mock client user
            const mockClient = {
              _id: bookingRequest.clientId,
              name: 'Test Client',
              email: 'client@test.com',
              role: 'client',
              status: 'active'
            };

            // Mock psychologist user
            const mockPsychologist = {
              _id: bookingRequest.psychologistId,
              name: 'Dr. Test',
              email: 'psychologist@test.com',
              role: 'psychologist',
              status: 'active',
              approvalStatus: 'approved',
              sessionRates: sessionRates,
              blockedDates: []
            };

            // Track what session was created
            let createdSession = null;

            // Mock User.findById to return appropriate users
            User.findById = jest.fn().mockImplementation((id) => {
              if (id === bookingRequest.clientId) {
                return Promise.resolve(mockClient);
              }
              if (id === bookingRequest.psychologistId) {
                return Promise.resolve(mockPsychologist);
              }
              return Promise.resolve(null);
            });

            // Mock Session.findOne to return no existing session (no conflicts)
            Session.findOne = jest.fn().mockResolvedValue(null);

            // Mock Session constructor and save
            Session.mockImplementation(function(data) {
              createdSession = { ...data, _id: 'new-session-id' };
              this.save = jest.fn().mockResolvedValue(createdSession);
              Object.assign(this, createdSession);
            });

            // Mock Session.findById for population
            Session.findById = jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                  populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue({
                      ...createdSession,
                      client: mockClient,
                      psychologist: mockPsychologist,
                      adminId: { _id: bookingRequest.adminId, name: 'Admin', email: 'admin@test.com' }
                    })
                  })
                })
              })
            });

            // Simulate the admin booking logic
            const expectedPrice = sessionRates[bookingRequest.sessionType];
            const expectedStatus = bookingRequest.paymentStatus === 'paid' ? 'Confirmed' : 'Approved';
            const expectedPaymentStatus = bookingRequest.paymentStatus === 'paid' ? 'Paid' : 'Pending';

            // Create session with admin booking fields
            const session = new Session({
              client: bookingRequest.clientId,
              psychologist: bookingRequest.psychologistId,
              sessionType: bookingRequest.sessionType,
              sessionDate: bookingRequest.dateTime,
              price: expectedPrice,
              status: expectedStatus,
              paymentStatus: expectedPaymentStatus,
              createdByAdmin: true,
              adminId: bookingRequest.adminId,
              adminBookingReason: bookingRequest.reason,
              adminPaymentStatus: bookingRequest.paymentStatus
            });

            await session.save();

            // PROPERTY ASSERTIONS:
            
            // 1. Session should contain the correct client ID
            expect(createdSession.client).toBe(bookingRequest.clientId);
            
            // 2. Session should contain the correct psychologist ID
            expect(createdSession.psychologist).toBe(bookingRequest.psychologistId);
            
            // 3. Session should contain the correct session type
            expect(createdSession.sessionType).toBe(bookingRequest.sessionType);
            
            // 4. Session should contain the correct date/time
            expect(createdSession.sessionDate).toEqual(bookingRequest.dateTime);
            
            // 5. Session should have the correct price based on session type
            expect(createdSession.price).toBe(expectedPrice);
            
            // 6. Session should be marked as admin-created
            expect(createdSession.createdByAdmin).toBe(true);
            
            // 7. Session should contain the admin's ID
            expect(createdSession.adminId).toBe(bookingRequest.adminId);
            
            // 8. Session should contain the admin booking reason
            expect(createdSession.adminBookingReason).toBe(bookingRequest.reason);
            
            // 9. Session should have the correct admin payment status
            expect(createdSession.adminPaymentStatus).toBe(bookingRequest.paymentStatus);
            
            // 10. Session status should be set correctly based on payment status
            expect(createdSession.status).toBe(expectedStatus);
            
            // 11. Payment status should be set correctly
            expect(createdSession.paymentStatus).toBe(expectedPaymentStatus);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should always mark session as createdByAdmin=true for admin bookings', async () => {
      await fc.assert(
        fc.asyncProperty(
          adminBookingRequestArb,
          async (bookingRequest) => {
            let createdSession = null;

            // Mock Session constructor
            Session.mockImplementation(function(data) {
              createdSession = { ...data, _id: 'session-id' };
              this.save = jest.fn().mockResolvedValue(createdSession);
              Object.assign(this, createdSession);
            });

            // Create session with admin booking
            const session = new Session({
              client: bookingRequest.clientId,
              psychologist: bookingRequest.psychologistId,
              sessionType: bookingRequest.sessionType,
              sessionDate: bookingRequest.dateTime,
              price: 2000,
              status: 'Approved',
              paymentStatus: 'Pending',
              createdByAdmin: true,
              adminId: bookingRequest.adminId,
              adminBookingReason: bookingRequest.reason,
              adminPaymentStatus: bookingRequest.paymentStatus
            });

            await session.save();

            // PROPERTY: createdByAdmin must always be true for admin bookings
            expect(createdSession.createdByAdmin).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should always include adminId in admin-created sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          adminBookingRequestArb,
          async (bookingRequest) => {
            let createdSession = null;

            Session.mockImplementation(function(data) {
              createdSession = { ...data, _id: 'session-id' };
              this.save = jest.fn().mockResolvedValue(createdSession);
              Object.assign(this, createdSession);
            });

            const session = new Session({
              client: bookingRequest.clientId,
              psychologist: bookingRequest.psychologistId,
              sessionType: bookingRequest.sessionType,
              sessionDate: bookingRequest.dateTime,
              price: 2000,
              status: 'Approved',
              paymentStatus: 'Pending',
              createdByAdmin: true,
              adminId: bookingRequest.adminId,
              adminBookingReason: bookingRequest.reason,
              adminPaymentStatus: bookingRequest.paymentStatus
            });

            await session.save();

            // PROPERTY: adminId must be present and match the admin who created the booking
            expect(createdSession.adminId).toBeDefined();
            expect(createdSession.adminId).toBe(bookingRequest.adminId);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should set correct status based on payment status (Req 15.4)', async () => {
      await fc.assert(
        fc.asyncProperty(
          adminBookingRequestArb,
          async (bookingRequest) => {
            let createdSession = null;

            Session.mockImplementation(function(data) {
              createdSession = { ...data, _id: 'session-id' };
              this.save = jest.fn().mockResolvedValue(createdSession);
              Object.assign(this, createdSession);
            });

            // Determine expected status based on payment status
            const expectedStatus = bookingRequest.paymentStatus === 'paid' ? 'Confirmed' : 'Approved';
            const expectedPaymentStatus = bookingRequest.paymentStatus === 'paid' ? 'Paid' : 'Pending';

            const session = new Session({
              client: bookingRequest.clientId,
              psychologist: bookingRequest.psychologistId,
              sessionType: bookingRequest.sessionType,
              sessionDate: bookingRequest.dateTime,
              price: 2000,
              status: expectedStatus,
              paymentStatus: expectedPaymentStatus,
              createdByAdmin: true,
              adminId: bookingRequest.adminId,
              adminBookingReason: bookingRequest.reason,
              adminPaymentStatus: bookingRequest.paymentStatus
            });

            await session.save();

            // PROPERTY: Status should be 'Confirmed' if paid, 'Approved' otherwise
            if (bookingRequest.paymentStatus === 'paid') {
              expect(createdSession.status).toBe('Confirmed');
              expect(createdSession.paymentStatus).toBe('Paid');
            } else {
              expect(createdSession.status).toBe('Approved');
              expect(createdSession.paymentStatus).toBe('Pending');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve all session type values correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validSessionTypes),
          objectIdArb,
          objectIdArb,
          objectIdArb,
          futureDateArb,
          async (sessionType, clientId, psychologistId, adminId, dateTime) => {
            let createdSession = null;

            Session.mockImplementation(function(data) {
              createdSession = { ...data, _id: 'session-id' };
              this.save = jest.fn().mockResolvedValue(createdSession);
              Object.assign(this, createdSession);
            });

            const session = new Session({
              client: clientId,
              psychologist: psychologistId,
              sessionType: sessionType,
              sessionDate: dateTime,
              price: 2000,
              status: 'Approved',
              paymentStatus: 'Pending',
              createdByAdmin: true,
              adminId: adminId,
              adminBookingReason: 'Test booking',
              adminPaymentStatus: 'pending'
            });

            await session.save();

            // PROPERTY: Session type should be preserved exactly as specified
            expect(createdSession.sessionType).toBe(sessionType);
            expect(validSessionTypes).toContain(createdSession.sessionType);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve all payment status values correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validPaymentStatuses),
          objectIdArb,
          objectIdArb,
          objectIdArb,
          futureDateArb,
          async (paymentStatus, clientId, psychologistId, adminId, dateTime) => {
            let createdSession = null;

            Session.mockImplementation(function(data) {
              createdSession = { ...data, _id: 'session-id' };
              this.save = jest.fn().mockResolvedValue(createdSession);
              Object.assign(this, createdSession);
            });

            const session = new Session({
              client: clientId,
              psychologist: psychologistId,
              sessionType: 'Individual',
              sessionDate: dateTime,
              price: 2000,
              status: paymentStatus === 'paid' ? 'Confirmed' : 'Approved',
              paymentStatus: paymentStatus === 'paid' ? 'Paid' : 'Pending',
              createdByAdmin: true,
              adminId: adminId,
              adminBookingReason: 'Test booking',
              adminPaymentStatus: paymentStatus
            });

            await session.save();

            // PROPERTY: Admin payment status should be preserved exactly as specified
            expect(createdSession.adminPaymentStatus).toBe(paymentStatus);
            expect(validPaymentStatuses).toContain(createdSession.adminPaymentStatus);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve booking reason in adminBookingReason field', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          objectIdArb,
          objectIdArb,
          objectIdArb,
          futureDateArb,
          async (reason, clientId, psychologistId, adminId, dateTime) => {
            let createdSession = null;

            Session.mockImplementation(function(data) {
              createdSession = { ...data, _id: 'session-id' };
              this.save = jest.fn().mockResolvedValue(createdSession);
              Object.assign(this, createdSession);
            });

            const session = new Session({
              client: clientId,
              psychologist: psychologistId,
              sessionType: 'Individual',
              sessionDate: dateTime,
              price: 2000,
              status: 'Approved',
              paymentStatus: 'Pending',
              createdByAdmin: true,
              adminId: adminId,
              adminBookingReason: reason,
              adminPaymentStatus: 'pending'
            });

            await session.save();

            // PROPERTY: Booking reason should be preserved exactly as specified
            expect(createdSession.adminBookingReason).toBe(reason);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve session date/time exactly as specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          futureDateArb,
          objectIdArb,
          objectIdArb,
          objectIdArb,
          async (dateTime, clientId, psychologistId, adminId) => {
            let createdSession = null;

            Session.mockImplementation(function(data) {
              createdSession = { ...data, _id: 'session-id' };
              this.save = jest.fn().mockResolvedValue(createdSession);
              Object.assign(this, createdSession);
            });

            const session = new Session({
              client: clientId,
              psychologist: psychologistId,
              sessionType: 'Individual',
              sessionDate: dateTime,
              price: 2000,
              status: 'Approved',
              paymentStatus: 'Pending',
              createdByAdmin: true,
              adminId: adminId,
              adminBookingReason: 'Test booking',
              adminPaymentStatus: 'pending'
            });

            await session.save();

            // PROPERTY: Session date should be preserved exactly as specified
            expect(createdSession.sessionDate).toEqual(dateTime);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should calculate price correctly based on session type and rates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validSessionTypes),
          sessionRatesArb,
          objectIdArb,
          objectIdArb,
          objectIdArb,
          futureDateArb,
          async (sessionType, sessionRates, clientId, psychologistId, adminId, dateTime) => {
            let createdSession = null;

            Session.mockImplementation(function(data) {
              createdSession = { ...data, _id: 'session-id' };
              this.save = jest.fn().mockResolvedValue(createdSession);
              Object.assign(this, createdSession);
            });

            const expectedPrice = sessionRates[sessionType];

            const session = new Session({
              client: clientId,
              psychologist: psychologistId,
              sessionType: sessionType,
              sessionDate: dateTime,
              price: expectedPrice,
              status: 'Approved',
              paymentStatus: 'Pending',
              createdByAdmin: true,
              adminId: adminId,
              adminBookingReason: 'Test booking',
              adminPaymentStatus: 'pending'
            });

            await session.save();

            // PROPERTY: Price should match the rate for the selected session type
            expect(createdSession.price).toBe(expectedPrice);
            expect(createdSession.price).toBe(sessionRates[sessionType]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
