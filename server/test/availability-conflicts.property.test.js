/**
 * Property-Based Tests for Availability Conflicts Prevention
 * 
 * Feature: admin-user-management, Property 11: Availability Conflicts Prevention
 * Validates: Requirements 6.4
 * 
 * For any availability update that would conflict with an existing confirmed session,
 * the update SHALL be rejected and the original availability SHALL remain unchanged.
 */

const fc = require('fast-check');

// Mock environment setup
process.env.NODE_ENV = 'test';

describe('Availability Conflicts Prevention Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 11: Availability Conflicts Prevention', () => {
    /**
     * Feature: admin-user-management, Property 11: Availability Conflicts Prevention
     * Validates: Requirements 6.4
     */

    /**
     * Compare two times in HH:MM format
     * Returns: negative if time1 < time2, 0 if equal, positive if time1 > time2
     */
    function compareTimes(time1, time2) {
      const [h1, m1] = time1.split(':').map(Number);
      const [h2, m2] = time2.split(':').map(Number);
      
      if (h1 !== h2) return h1 - h2;
      return m1 - m2;
    }

    /**
     * Check if a session time falls within an availability slot
     * @param {Date} sessionDate - The session date/time
     * @param {Array} availability - Array of availability slots
     * @returns {boolean} - True if session is within availability
     */
    function isSessionWithinAvailability(sessionDate, availability) {
      const dayOfWeek = sessionDate.getDay();
      const hours = sessionDate.getHours().toString().padStart(2, '0');
      const minutes = sessionDate.getMinutes().toString().padStart(2, '0');
      const sessionTime = `${hours}:${minutes}`;
      
      for (const slot of availability) {
        if (slot.dayOfWeek === dayOfWeek) {
          if (compareTimes(sessionTime, slot.startTime) >= 0 && 
              compareTimes(sessionTime, slot.endTime) <= 0) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * Check for conflicts between new availability and confirmed sessions
     * This simulates the server-side checkSessionConflicts function
     * @param {Array} confirmedSessions - Array of confirmed sessions
     * @param {Array} newAvailability - The new availability slots
     * @returns {Array} - Array of conflicting sessions
     */
    function checkSessionConflicts(confirmedSessions, newAvailability) {
      const conflicts = [];
      
      for (const session of confirmedSessions) {
        const sessionDate = new Date(session.sessionDate);
        
        // Check if this session falls within any of the new availability slots
        const isWithinAvailability = isSessionWithinAvailability(sessionDate, newAvailability);
        
        // If the session is NOT within the new availability, it's a conflict
        if (!isWithinAvailability) {
          conflicts.push({
            sessionId: session._id,
            sessionDate: session.sessionDate,
            sessionType: session.sessionType,
            status: session.status
          });
        }
      }
      
      return conflicts;
    }

    /**
     * Validate availability update request
     * Returns the result of the update attempt
     * @param {Object} psychologist - Psychologist with current availability
     * @param {Array} newAvailability - The new availability to set
     * @param {Array} confirmedSessions - Existing confirmed sessions
     * @returns {Object} - Update result with success status and data
     */
    function validateAvailabilityUpdate(psychologist, newAvailability, confirmedSessions) {
      // Check for conflicts with confirmed sessions
      const conflicts = checkSessionConflicts(confirmedSessions, newAvailability);
      
      if (conflicts.length > 0) {
        return {
          success: false,
          error: 'CONFLICT',
          message: 'Availability update conflicts with existing confirmed sessions',
          conflicts,
          // Original availability should remain unchanged
          availability: psychologist.availability
        };
      }
      
      return {
        success: true,
        error: null,
        message: 'Availability updated successfully',
        conflicts: [],
        // New availability is applied
        availability: newAvailability
      };
    }

    /**
     * Create a session date for a specific day of week and time
     * @param {number} dayOfWeek - Day of week (0-6)
     * @param {string} time - Time in HH:MM format
     * @param {number} weeksFromNow - Number of weeks from now
     * @returns {Date} - The session date
     */
    function createSessionDate(dayOfWeek, time, weeksFromNow = 1) {
      const now = new Date();
      const currentDay = now.getDay();
      
      // Calculate days until the target day of week
      let daysUntil = dayOfWeek - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      
      // Add weeks
      daysUntil += weeksFromNow * 7;
      
      const sessionDate = new Date(now);
      sessionDate.setDate(sessionDate.getDate() + daysUntil);
      
      // Set the time
      const [hours, minutes] = time.split(':').map(Number);
      sessionDate.setHours(hours, minutes, 0, 0);
      
      return sessionDate;
    }

    // Custom arbitrary for valid time strings
    const validTimeArb = fc.integer({ min: 0, max: 23 }).chain(hour => 
      fc.integer({ min: 0, max: 59 }).map(minute => 
        `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      )
    );

    // Custom arbitrary for availability slot with valid time range
    const availabilitySlotArb = fc.record({
      dayOfWeek: fc.integer({ min: 0, max: 6 }),
      startHour: fc.integer({ min: 0, max: 22 }),
      endHour: fc.integer({ min: 1, max: 23 })
    }).filter(slot => slot.startHour < slot.endHour)
      .map(slot => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: `${slot.startHour.toString().padStart(2, '0')}:00`,
        endTime: `${slot.endHour.toString().padStart(2, '0')}:00`
      }));

    test('should reject availability update when it conflicts with confirmed sessions', () => {
      fc.assert(
        fc.property(
          // Generate a day of week for the session
          fc.integer({ min: 0, max: 6 }),
          // Generate session time (hour)
          fc.integer({ min: 9, max: 16 }),
          (sessionDayOfWeek, sessionHour) => {
            const sessionTime = `${sessionHour.toString().padStart(2, '0')}:00`;
            
            // Create a confirmed session on a specific day and time
            const sessionDate = createSessionDate(sessionDayOfWeek, sessionTime);
            const confirmedSessions = [{
              _id: 'session123',
              sessionDate: sessionDate,
              sessionType: 'Individual',
              status: 'Confirmed'
            }];
            
            // Current availability includes the session's day and time
            const currentAvailability = [{
              dayOfWeek: sessionDayOfWeek,
              startTime: '08:00',
              endTime: '18:00'
            }];
            
            const psychologist = {
              _id: 'psych123',
              availability: currentAvailability
            };
            
            // New availability that EXCLUDES the session's day entirely
            // (different day of week)
            const differentDay = (sessionDayOfWeek + 1) % 7;
            const newAvailability = [{
              dayOfWeek: differentDay,
              startTime: '08:00',
              endTime: '18:00'
            }];
            
            const result = validateAvailabilityUpdate(psychologist, newAvailability, confirmedSessions);
            
            // Property: Update should be rejected due to conflict
            expect(result.success).toBe(false);
            expect(result.error).toBe('CONFLICT');
            expect(result.conflicts.length).toBeGreaterThan(0);
            
            // Property: Original availability should remain unchanged
            expect(result.availability).toEqual(currentAvailability);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject availability update when session time falls outside new time range', () => {
      fc.assert(
        fc.property(
          // Generate a day of week
          fc.integer({ min: 0, max: 6 }),
          // Generate session hour (afternoon)
          fc.integer({ min: 14, max: 17 }),
          (dayOfWeek, sessionHour) => {
            const sessionTime = `${sessionHour.toString().padStart(2, '0')}:00`;
            
            // Create a confirmed session in the afternoon
            const sessionDate = createSessionDate(dayOfWeek, sessionTime);
            const confirmedSessions = [{
              _id: 'session456',
              sessionDate: sessionDate,
              sessionType: 'Individual',
              status: 'Confirmed'
            }];
            
            // Current availability covers the whole day
            const currentAvailability = [{
              dayOfWeek: dayOfWeek,
              startTime: '08:00',
              endTime: '18:00'
            }];
            
            const psychologist = {
              _id: 'psych456',
              availability: currentAvailability
            };
            
            // New availability only covers morning (before the session)
            const newAvailability = [{
              dayOfWeek: dayOfWeek,
              startTime: '08:00',
              endTime: '12:00'  // Ends before the afternoon session
            }];
            
            const result = validateAvailabilityUpdate(psychologist, newAvailability, confirmedSessions);
            
            // Property: Update should be rejected because session is outside new time range
            expect(result.success).toBe(false);
            expect(result.error).toBe('CONFLICT');
            expect(result.conflicts.length).toBe(1);
            
            // Property: Original availability should remain unchanged
            expect(result.availability).toEqual(currentAvailability);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow availability update when no conflicts exist', () => {
      fc.assert(
        fc.property(
          // Generate a day of week for the session
          fc.integer({ min: 0, max: 6 }),
          // Generate session hour
          fc.integer({ min: 9, max: 16 }),
          (sessionDayOfWeek, sessionHour) => {
            const sessionTime = `${sessionHour.toString().padStart(2, '0')}:00`;
            
            // Create a confirmed session
            const sessionDate = createSessionDate(sessionDayOfWeek, sessionTime);
            const confirmedSessions = [{
              _id: 'session789',
              sessionDate: sessionDate,
              sessionType: 'Individual',
              status: 'Confirmed'
            }];
            
            // Current availability
            const currentAvailability = [{
              dayOfWeek: sessionDayOfWeek,
              startTime: '08:00',
              endTime: '18:00'
            }];
            
            const psychologist = {
              _id: 'psych789',
              availability: currentAvailability
            };
            
            // New availability that STILL includes the session's day and time
            const newAvailability = [{
              dayOfWeek: sessionDayOfWeek,
              startTime: '07:00',  // Earlier start
              endTime: '19:00'    // Later end - still covers the session
            }];
            
            const result = validateAvailabilityUpdate(psychologist, newAvailability, confirmedSessions);
            
            // Property: Update should succeed because session is still within availability
            expect(result.success).toBe(true);
            expect(result.error).toBeNull();
            expect(result.conflicts).toHaveLength(0);
            
            // Property: New availability should be applied
            expect(result.availability).toEqual(newAvailability);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve original availability on any conflict', () => {
      fc.assert(
        fc.property(
          // Generate multiple sessions on different days
          fc.array(
            fc.record({
              dayOfWeek: fc.integer({ min: 0, max: 6 }),
              hour: fc.integer({ min: 9, max: 16 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (sessionConfigs) => {
            // Create confirmed sessions
            const confirmedSessions = sessionConfigs.map((config, index) => {
              const sessionTime = `${config.hour.toString().padStart(2, '0')}:00`;
              return {
                _id: `session_${index}`,
                sessionDate: createSessionDate(config.dayOfWeek, sessionTime),
                sessionType: 'Individual',
                status: 'Confirmed'
              };
            });
            
            // Current availability covers all days
            const currentAvailability = [
              { dayOfWeek: 0, startTime: '08:00', endTime: '18:00' },
              { dayOfWeek: 1, startTime: '08:00', endTime: '18:00' },
              { dayOfWeek: 2, startTime: '08:00', endTime: '18:00' },
              { dayOfWeek: 3, startTime: '08:00', endTime: '18:00' },
              { dayOfWeek: 4, startTime: '08:00', endTime: '18:00' },
              { dayOfWeek: 5, startTime: '08:00', endTime: '18:00' },
              { dayOfWeek: 6, startTime: '08:00', endTime: '18:00' }
            ];
            
            const psychologist = {
              _id: 'psych_multi',
              availability: currentAvailability
            };
            
            // New availability that removes all days (guaranteed conflict)
            const newAvailability = [];
            
            const result = validateAvailabilityUpdate(psychologist, newAvailability, confirmedSessions);
            
            // Property: Update should be rejected
            expect(result.success).toBe(false);
            
            // Property: Original availability MUST remain unchanged
            expect(result.availability).toEqual(currentAvailability);
            expect(result.availability).not.toEqual(newAvailability);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should detect conflicts for all confirmed session statuses', () => {
      const confirmedStatuses = ['Confirmed', 'Approved', 'Booked', 'In Progress'];
      
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 6 }),
          fc.integer({ min: 9, max: 16 }),
          fc.constantFrom(...confirmedStatuses),
          (dayOfWeek, sessionHour, status) => {
            const sessionTime = `${sessionHour.toString().padStart(2, '0')}:00`;
            
            // Create a session with the given status
            const sessionDate = createSessionDate(dayOfWeek, sessionTime);
            const confirmedSessions = [{
              _id: 'session_status_test',
              sessionDate: sessionDate,
              sessionType: 'Individual',
              status: status
            }];
            
            const currentAvailability = [{
              dayOfWeek: dayOfWeek,
              startTime: '08:00',
              endTime: '18:00'
            }];
            
            const psychologist = {
              _id: 'psych_status_test',
              availability: currentAvailability
            };
            
            // New availability that excludes the session day
            const differentDay = (dayOfWeek + 1) % 7;
            const newAvailability = [{
              dayOfWeek: differentDay,
              startTime: '08:00',
              endTime: '18:00'
            }];
            
            const result = validateAvailabilityUpdate(psychologist, newAvailability, confirmedSessions);
            
            // Property: All confirmed statuses should trigger conflict detection
            expect(result.success).toBe(false);
            expect(result.conflicts.length).toBe(1);
            expect(result.conflicts[0].status).toBe(status);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle multiple availability slots correctly', () => {
      fc.assert(
        fc.property(
          // Generate session day and time
          fc.integer({ min: 1, max: 5 }),  // Weekday
          fc.integer({ min: 10, max: 15 }),
          (sessionDayOfWeek, sessionHour) => {
            const sessionTime = `${sessionHour.toString().padStart(2, '0')}:00`;
            
            const sessionDate = createSessionDate(sessionDayOfWeek, sessionTime);
            const confirmedSessions = [{
              _id: 'session_multi_slot',
              sessionDate: sessionDate,
              sessionType: 'Individual',
              status: 'Confirmed'
            }];
            
            // Current availability with multiple slots including session day
            const currentAvailability = [
              { dayOfWeek: sessionDayOfWeek, startTime: '09:00', endTime: '12:00' },
              { dayOfWeek: sessionDayOfWeek, startTime: '14:00', endTime: '18:00' }
            ];
            
            const psychologist = {
              _id: 'psych_multi_slot',
              availability: currentAvailability
            };
            
            // New availability with only morning slot (session is in afternoon range)
            // This should conflict if session is in afternoon
            const newAvailability = [
              { dayOfWeek: sessionDayOfWeek, startTime: '09:00', endTime: '12:00' }
            ];
            
            const result = validateAvailabilityUpdate(psychologist, newAvailability, confirmedSessions);
            
            // Check if session falls within the new availability
            const isWithin = isSessionWithinAvailability(sessionDate, newAvailability);
            
            if (isWithin) {
              // Session is in morning slot - should succeed
              expect(result.success).toBe(true);
            } else {
              // Session is in afternoon - should fail
              expect(result.success).toBe(false);
              expect(result.availability).toEqual(currentAvailability);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow update when no confirmed sessions exist', () => {
      fc.assert(
        fc.property(
          // Generate any new availability configuration
          fc.array(availabilitySlotArb, { minLength: 0, maxLength: 7 }),
          (newAvailability) => {
            // No confirmed sessions
            const confirmedSessions = [];
            
            const currentAvailability = [
              { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }
            ];
            
            const psychologist = {
              _id: 'psych_no_sessions',
              availability: currentAvailability
            };
            
            const result = validateAvailabilityUpdate(psychologist, newAvailability, confirmedSessions);
            
            // Property: With no sessions, any availability update should succeed
            expect(result.success).toBe(true);
            expect(result.conflicts).toHaveLength(0);
            expect(result.availability).toEqual(newAvailability);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should correctly identify boundary time conflicts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 6 }),
          (dayOfWeek) => {
            // Session at exactly 12:00
            const sessionDate = createSessionDate(dayOfWeek, '12:00');
            const confirmedSessions = [{
              _id: 'session_boundary',
              sessionDate: sessionDate,
              sessionType: 'Individual',
              status: 'Confirmed'
            }];
            
            const currentAvailability = [{
              dayOfWeek: dayOfWeek,
              startTime: '08:00',
              endTime: '18:00'
            }];
            
            const psychologist = {
              _id: 'psych_boundary',
              availability: currentAvailability
            };
            
            // New availability ends exactly at session time (12:00)
            // Session at 12:00 should be within slot ending at 12:00 (inclusive)
            const newAvailability = [{
              dayOfWeek: dayOfWeek,
              startTime: '08:00',
              endTime: '12:00'
            }];
            
            const result = validateAvailabilityUpdate(psychologist, newAvailability, confirmedSessions);
            
            // Property: Session at boundary should be considered within availability
            expect(result.success).toBe(true);
            expect(result.conflicts).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject when session is exactly one minute outside new availability', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 6 }),
          (dayOfWeek) => {
            // Session at 12:01 (one minute after availability ends)
            const sessionDate = createSessionDate(dayOfWeek, '12:01');
            const confirmedSessions = [{
              _id: 'session_one_minute',
              sessionDate: sessionDate,
              sessionType: 'Individual',
              status: 'Confirmed'
            }];
            
            const currentAvailability = [{
              dayOfWeek: dayOfWeek,
              startTime: '08:00',
              endTime: '18:00'
            }];
            
            const psychologist = {
              _id: 'psych_one_minute',
              availability: currentAvailability
            };
            
            // New availability ends at 12:00
            const newAvailability = [{
              dayOfWeek: dayOfWeek,
              startTime: '08:00',
              endTime: '12:00'
            }];
            
            const result = validateAvailabilityUpdate(psychologist, newAvailability, confirmedSessions);
            
            // Property: Session one minute outside should cause conflict
            expect(result.success).toBe(false);
            expect(result.conflicts.length).toBe(1);
            expect(result.availability).toEqual(currentAvailability);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
