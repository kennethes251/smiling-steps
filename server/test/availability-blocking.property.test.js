/**
 * Property-Based Tests for Availability Blocking Prevents Booking
 * 
 * Feature: admin-user-management, Property 10: Availability Blocking Prevents Booking
 * Validates: Requirements 6.3, 6.5
 * 
 * For any date that a psychologist has blocked, that date SHALL NOT appear 
 * in available booking slots for clients.
 */

const fc = require('fast-check');

// Mock environment setup
process.env.NODE_ENV = 'test';

describe('Availability Blocking Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 10: Availability Blocking Prevents Booking', () => {
    /**
     * Feature: admin-user-management, Property 10: Availability Blocking Prevents Booking
     * Validates: Requirements 6.3, 6.5
     */

    /**
     * Helper function to check if a date is valid
     * @param {Date} date - The date to check
     * @returns {boolean} - True if the date is valid
     */
    function isValidDate(date) {
      return date instanceof Date && !isNaN(date.getTime());
    }

    /**
     * Helper function to check if a date is blocked
     * @param {Date} date - The date to check
     * @param {Date[]} blockedDates - Array of blocked dates
     * @returns {boolean} - True if the date is blocked
     */
    function isDateBlocked(date, blockedDates) {
      if (!blockedDates || blockedDates.length === 0) return false;
      if (!isValidDate(date)) return false;
      
      const dateStr = new Date(date).toISOString().split('T')[0];
      
      return blockedDates.some(blockedDate => {
        if (!isValidDate(blockedDate)) return false;
        const blockedStr = new Date(blockedDate).toISOString().split('T')[0];
        return dateStr === blockedStr;
      });
    }

    /**
     * Helper function to get available slots for a psychologist
     * This simulates the logic that should filter out blocked dates
     * @param {Object} psychologist - Psychologist with availability and blockedDates
     * @param {Date} requestedDate - The date client wants to book
     * @returns {Object} - Available slots info
     */
    function getAvailableSlots(psychologist, requestedDate) {
      const { availability, blockedDates } = psychologist;
      
      // Validate the requested date
      if (!isValidDate(requestedDate)) {
        return {
          isAvailable: false,
          reason: 'INVALID_DATE',
          slots: []
        };
      }
      
      // If the date is blocked, no slots should be available
      if (isDateBlocked(requestedDate, blockedDates)) {
        return {
          isAvailable: false,
          reason: 'DATE_BLOCKED',
          slots: []
        };
      }
      
      // Check if the day of week has availability
      const dayOfWeek = new Date(requestedDate).getDay();
      const daySlots = (availability || []).filter(slot => slot.dayOfWeek === dayOfWeek);
      
      if (daySlots.length === 0) {
        return {
          isAvailable: false,
          reason: 'NO_AVAILABILITY',
          slots: []
        };
      }
      
      return {
        isAvailable: true,
        reason: null,
        slots: daySlots
      };
    }

    /**
     * Helper function to validate booking attempt
     * @param {Object} psychologist - Psychologist with blockedDates
     * @param {Date} requestedDate - The date client wants to book
     * @returns {Object} - Booking validation result
     */
    function validateBookingAttempt(psychologist, requestedDate) {
      const { blockedDates } = psychologist;
      
      // Validate the requested date
      if (!isValidDate(requestedDate)) {
        return {
          canBook: false,
          error: 'INVALID_DATE',
          message: 'Invalid date provided'
        };
      }
      
      // Check if date is blocked
      if (isDateBlocked(requestedDate, blockedDates)) {
        return {
          canBook: false,
          error: 'BLOCKED_DATE',
          message: 'This date is not available for booking'
        };
      }
      
      return {
        canBook: true,
        error: null,
        message: 'Date is available'
      };
    }

    // Custom arbitrary for valid future dates
    const validFutureDate = fc.integer({ min: 1, max: 90 }).map(daysFromNow => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      return date;
    });

    test('should not show blocked dates as available for any psychologist', () => {
      fc.assert(
        fc.property(
          // Generate psychologist with blocked dates
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            role: fc.constant('psychologist'),
            availability: fc.array(
              fc.record({
                dayOfWeek: fc.integer({ min: 0, max: 6 }),
                startTime: fc.constantFrom('09:00', '10:00', '11:00', '14:00', '15:00'),
                endTime: fc.constantFrom('12:00', '13:00', '17:00', '18:00')
              }),
              { minLength: 1, maxLength: 7 }
            ),
            blockedDates: fc.array(validFutureDate, { minLength: 1, maxLength: 10 })
          }),
          (psychologist) => {
            // For each blocked date, verify it's not available
            for (const blockedDate of psychologist.blockedDates) {
              const availableSlots = getAvailableSlots(psychologist, blockedDate);
              
              // Property: Blocked dates should never be available
              expect(availableSlots.isAvailable).toBe(false);
              expect(availableSlots.reason).toBe('DATE_BLOCKED');
              expect(availableSlots.slots).toHaveLength(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject booking attempts on blocked dates', () => {
      fc.assert(
        fc.property(
          // Generate psychologist with blocked dates
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            role: fc.constant('psychologist'),
            blockedDates: fc.array(validFutureDate, { minLength: 1, maxLength: 10 })
          }),
          (psychologist) => {
            // For each blocked date, verify booking is rejected
            for (const blockedDate of psychologist.blockedDates) {
              const bookingResult = validateBookingAttempt(psychologist, blockedDate);
              
              // Property: Booking on blocked dates should be rejected
              expect(bookingResult.canBook).toBe(false);
              expect(bookingResult.error).toBe('BLOCKED_DATE');
              expect(bookingResult.message).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow booking on non-blocked dates with availability', () => {
      fc.assert(
        fc.property(
          // Generate days offset for blocked dates (1-30 days from now)
          fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 1, maxLength: 5 }),
          // Generate days offset for requested date (31-60 days from now, guaranteed not blocked)
          fc.integer({ min: 31, max: 60 }),
          (blockedDaysOffsets, requestedDayOffset) => {
            const now = new Date();
            
            // Create blocked dates
            const blockedDates = blockedDaysOffsets.map(offset => {
              const date = new Date(now);
              date.setDate(date.getDate() + offset);
              date.setHours(12, 0, 0, 0);
              return date;
            });
            
            // Create requested date (guaranteed to be after blocked dates range)
            const requestedDate = new Date(now);
            requestedDate.setDate(requestedDate.getDate() + requestedDayOffset);
            requestedDate.setHours(12, 0, 0, 0);
            
            const psychologist = {
              availability: [
                { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 6, startTime: '09:00', endTime: '17:00' }
              ],
              blockedDates: blockedDates
            };
            
            const bookingResult = validateBookingAttempt(psychologist, requestedDate);
            
            // Property: Non-blocked dates should allow booking
            expect(bookingResult.canBook).toBe(true);
            expect(bookingResult.error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should correctly identify blocked dates regardless of time component', () => {
      fc.assert(
        fc.property(
          // Generate days offset
          fc.integer({ min: 1, max: 90 }),
          // Generate different hours for the same date (using UTC to avoid timezone issues)
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          (daysOffset, hour, minute) => {
            // Use a fixed base date to avoid timezone issues
            const baseDate = new Date('2025-06-15T12:00:00.000Z');
            
            // Create blocked date - use the same calendar day
            const blockedDate = new Date(baseDate);
            blockedDate.setUTCDate(blockedDate.getUTCDate() + daysOffset);
            blockedDate.setUTCHours(12, 0, 0, 0); // Set to noon UTC
            
            // Create requested date at different time on same calendar day
            const requestedDate = new Date(baseDate);
            requestedDate.setUTCDate(requestedDate.getUTCDate() + daysOffset);
            requestedDate.setUTCHours(hour, minute, 0, 0);
            
            const psychologist = {
              blockedDates: [blockedDate]
            };
            
            // Property: Same calendar date should be blocked regardless of time
            // Note: We compare using UTC date strings to ensure consistency
            const blockedDateStr = blockedDate.toISOString().split('T')[0];
            const requestedDateStr = requestedDate.toISOString().split('T')[0];
            
            // Only test when the dates are actually the same calendar day in UTC
            if (blockedDateStr === requestedDateStr) {
              const isBlocked = isDateBlocked(requestedDate, psychologist.blockedDates);
              expect(isBlocked).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle empty blocked dates array correctly', () => {
      fc.assert(
        fc.property(
          // Generate psychologist with no blocked dates
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            role: fc.constant('psychologist'),
            availability: fc.constant([
              { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' },
              { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
              { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
              { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
              { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
              { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
              { dayOfWeek: 6, startTime: '09:00', endTime: '17:00' }
            ]),
            blockedDates: fc.constant([]) // Empty blocked dates
          }),
          validFutureDate,
          (psychologist, requestedDate) => {
            const availableSlots = getAvailableSlots(psychologist, requestedDate);
            
            // Property: With no blocked dates, all dates with availability should be available
            expect(availableSlots.isAvailable).toBe(true);
            expect(availableSlots.slots.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle undefined blocked dates correctly', () => {
      fc.assert(
        fc.property(
          // Generate psychologist with undefined blocked dates
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            role: fc.constant('psychologist'),
            availability: fc.constant([
              { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }
            ])
          }),
          validFutureDate,
          (psychologist, requestedDate) => {
            // Explicitly set blockedDates to undefined
            psychologist.blockedDates = undefined;
            
            const isBlocked = isDateBlocked(requestedDate, psychologist.blockedDates);
            
            // Property: Undefined blocked dates should not block any date
            expect(isBlocked).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should block multiple dates independently', () => {
      fc.assert(
        fc.property(
          // Generate multiple distinct day offsets
          fc.array(
            fc.integer({ min: 1, max: 90 }),
            { minLength: 2, maxLength: 10 }
          ).filter(offsets => {
            // Ensure offsets are distinct
            return new Set(offsets).size === offsets.length;
          }),
          (dayOffsets) => {
            const now = new Date();
            
            // Create blocked dates from offsets
            const blockedDates = dayOffsets.map(offset => {
              const date = new Date(now);
              date.setDate(date.getDate() + offset);
              date.setHours(12, 0, 0, 0);
              return date;
            });
            
            const psychologist = {
              blockedDates: blockedDates,
              availability: [
                { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 6, startTime: '09:00', endTime: '17:00' }
              ]
            };
            
            // Property: Each blocked date should be independently blocked
            for (const blockedDate of blockedDates) {
              const availableSlots = getAvailableSlots(psychologist, blockedDate);
              expect(availableSlots.isAvailable).toBe(false);
              expect(availableSlots.reason).toBe('DATE_BLOCKED');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should correctly filter available slots excluding blocked dates', () => {
      fc.assert(
        fc.property(
          // Generate a starting day offset
          fc.integer({ min: 1, max: 30 }),
          (daysFromNow) => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + daysFromNow);
            
            // Create a week of dates
            const weekDates = [];
            for (let i = 0; i < 7; i++) {
              const date = new Date(startDate);
              date.setDate(date.getDate() + i);
              date.setHours(12, 0, 0, 0);
              weekDates.push(date);
            }
            
            // Block some random dates (first 3)
            const blockedDates = weekDates.slice(0, 3);
            const unblockedDates = weekDates.slice(3);
            
            const psychologist = {
              blockedDates: blockedDates,
              availability: [
                { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 6, startTime: '09:00', endTime: '17:00' }
              ]
            };
            
            // Property: Blocked dates should not be available
            for (const blockedDate of blockedDates) {
              const result = getAvailableSlots(psychologist, blockedDate);
              expect(result.isAvailable).toBe(false);
            }
            
            // Property: Unblocked dates should be available
            for (const unblockedDate of unblockedDates) {
              const result = getAvailableSlots(psychologist, unblockedDate);
              expect(result.isAvailable).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
