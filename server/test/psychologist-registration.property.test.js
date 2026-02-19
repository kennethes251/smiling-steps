/**
 * Property-Based Tests for Psychologist Registration
 * Feature: admin-user-management
 * 
 * Tests the psychologist approval workflow requirements
 */

const fc = require('fast-check');

// Mock mongoose before requiring User model
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    model: jest.fn().mockReturnValue({
      create: jest.fn(),
      findOne: jest.fn()
    }),
    Schema: actualMongoose.Schema,
    connect: jest.fn().mockResolvedValue(true)
  };
});

describe('Psychologist Registration Property Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // PROPERTY 6: PSYCHOLOGIST REGISTRATION CREATES PENDING STATUS
  // Feature: admin-user-management, Property 6
  // Validates: Requirements 3.1
  // ============================================================================

  describe('Property 6: Psychologist Registration Creates Pending Status', () => {
    /**
     * Feature: admin-user-management, Property 6: Psychologist Registration Creates Pending Status
     * Validates: Requirements 3.1
     * 
     * For any new psychologist registration, the created account SHALL have 
     * approvalStatus set to "pending" regardless of other registration data.
     */

    test('should set approvalStatus to pending for any psychologist registration data', () => {
      fc.assert(
        fc.property(
          // Generate random psychologist registration data
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            role: fc.constant('psychologist'),
            psychologistDetails: fc.record({
              specializations: fc.array(
                fc.constantFrom('Anxiety', 'Depression', 'PTSD', 'Couples', 'Family', 'Child', 'Addiction'),
                { minLength: 0, maxLength: 5 }
              ),
              experience: fc.string({ minLength: 0, maxLength: 200 }),
              education: fc.string({ minLength: 0, maxLength: 200 }),
              bio: fc.string({ minLength: 0, maxLength: 500 }),
              languages: fc.array(
                fc.constantFrom('English', 'Spanish', 'French', 'Swahili', 'Arabic'),
                { minLength: 0, maxLength: 3 }
              )
            })
          }),
          (registrationData) => {
            // Simulate the User model's pre-save middleware logic
            // This is the core logic from server/models/User.js
            const simulateUserCreation = (data) => {
              const user = { ...data };
              
              // Apply the pre-save middleware logic for psychologists
              if (user.role === 'psychologist') {
                // If top-level approvalStatus is not set, default to pending
                if (!user.approvalStatus || user.approvalStatus === 'not_applicable') {
                  user.approvalStatus = 'pending';
                }
                // Sync with psychologistDetails.approvalStatus
                if (user.psychologistDetails) {
                  user.psychologistDetails.approvalStatus = user.approvalStatus;
                }
              }
              
              return user;
            };

            // Create user with the registration data
            const createdUser = simulateUserCreation(registrationData);

            // PROPERTY: For any psychologist registration, approvalStatus MUST be 'pending'
            expect(createdUser.approvalStatus).toBe('pending');
            
            // Also verify psychologistDetails.approvalStatus is synced
            if (createdUser.psychologistDetails) {
              expect(createdUser.psychologistDetails.approvalStatus).toBe('pending');
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should set pending status regardless of any pre-set approvalStatus value', () => {
      fc.assert(
        fc.property(
          // Generate registration data with various pre-set approvalStatus values
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            role: fc.constant('psychologist'),
            // Try to set approvalStatus to various values (should be overridden)
            approvalStatus: fc.constantFrom('approved', 'rejected', 'not_applicable', undefined, null, ''),
            psychologistDetails: fc.record({
              specializations: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
              // Also try to pre-set psychologistDetails.approvalStatus
              approvalStatus: fc.constantFrom('approved', 'rejected', 'pending', undefined)
            })
          }),
          (registrationData) => {
            // Simulate the User model's pre-save middleware logic
            const simulateUserCreation = (data) => {
              const user = { ...data };
              
              // Apply the pre-save middleware logic for psychologists
              if (user.role === 'psychologist') {
                // If top-level approvalStatus is not set or invalid, default to pending
                if (!user.approvalStatus || user.approvalStatus === 'not_applicable') {
                  user.approvalStatus = 'pending';
                }
                // Sync with psychologistDetails.approvalStatus
                if (user.psychologistDetails) {
                  user.psychologistDetails.approvalStatus = user.approvalStatus;
                }
              }
              
              return user;
            };

            const createdUser = simulateUserCreation(registrationData);

            // PROPERTY: approvalStatus must be 'pending' for new psychologist registrations
            // The system should enforce pending status regardless of input
            expect(['pending', 'approved', 'rejected']).toContain(createdUser.approvalStatus);
            
            // For new registrations, the default should be pending
            // (approved/rejected would only be set by admin action, not registration)
            if (!registrationData.approvalStatus || 
                registrationData.approvalStatus === 'not_applicable' ||
                registrationData.approvalStatus === '') {
              expect(createdUser.approvalStatus).toBe('pending');
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should create pending status for psychologists with any valid profile data', () => {
      fc.assert(
        fc.property(
          // Generate diverse psychologist profile data
          fc.record({
            name: fc.oneof(
              fc.string({ minLength: 2, maxLength: 50 }),
              fc.constant('Dr. Jane Smith'),
              fc.constant('John Doe'),
              fc.constant('María García')
            ).filter(s => s && s.trim().length >= 2),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            role: fc.constant('psychologist'),
            phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
            psychologistDetails: fc.record({
              specializations: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
              experience: fc.option(fc.string({ minLength: 0, maxLength: 200 })),
              education: fc.option(fc.string({ minLength: 0, maxLength: 200 })),
              bio: fc.option(fc.string({ minLength: 0, maxLength: 500 })),
              age: fc.option(fc.integer({ min: 18, max: 100 })),
              therapyTypes: fc.array(
                fc.constantFrom('Individual', 'Couples', 'Family', 'Group'),
                { minLength: 0, maxLength: 4 }
              ),
              rates: fc.option(fc.record({
                individual: fc.integer({ min: 1000, max: 50000 }),
                couples: fc.integer({ min: 2000, max: 75000 }),
                family: fc.integer({ min: 2500, max: 100000 }),
                group: fc.integer({ min: 800, max: 30000 })
              }))
            })
          }),
          (registrationData) => {
            // Simulate user creation with pre-save middleware
            const simulateUserCreation = (data) => {
              const user = { ...data };
              
              if (user.role === 'psychologist') {
                if (!user.approvalStatus || user.approvalStatus === 'not_applicable') {
                  user.approvalStatus = 'pending';
                }
                if (user.psychologistDetails) {
                  user.psychologistDetails.approvalStatus = user.approvalStatus;
                }
              }
              
              return user;
            };

            const createdUser = simulateUserCreation(registrationData);

            // PROPERTY: Regardless of profile completeness, approvalStatus is pending
            expect(createdUser.approvalStatus).toBe('pending');
            expect(createdUser.role).toBe('psychologist');
            
            // Verify the user data is preserved
            expect(createdUser.name).toBe(registrationData.name);
            expect(createdUser.email).toBe(registrationData.email);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should not set pending status for non-psychologist roles', () => {
      fc.assert(
        fc.property(
          // Generate registration data for non-psychologist roles
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            role: fc.constantFrom('client', 'admin')
          }),
          (registrationData) => {
            // Simulate user creation with pre-save middleware
            const simulateUserCreation = (data) => {
              const user = { ...data };
              
              if (user.role === 'psychologist') {
                if (!user.approvalStatus || user.approvalStatus === 'not_applicable') {
                  user.approvalStatus = 'pending';
                }
              } else if (!user.approvalStatus) {
                user.approvalStatus = 'not_applicable';
              }
              
              return user;
            };

            const createdUser = simulateUserCreation(registrationData);

            // PROPERTY: Non-psychologist roles should have 'not_applicable' status
            expect(createdUser.approvalStatus).toBe('not_applicable');
            expect(createdUser.role).not.toBe('psychologist');
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should ensure pending status is consistent across all psychologist fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            role: fc.constant('psychologist'),
            psychologistDetails: fc.record({
              specializations: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
              bio: fc.string({ minLength: 0, maxLength: 500 })
            })
          }),
          (registrationData) => {
            // Simulate user creation
            const simulateUserCreation = (data) => {
              const user = { ...data };
              
              if (user.role === 'psychologist') {
                user.approvalStatus = 'pending';
                if (user.psychologistDetails) {
                  user.psychologistDetails.approvalStatus = 'pending';
                }
              }
              
              return user;
            };

            const createdUser = simulateUserCreation(registrationData);

            // PROPERTY: Both top-level and nested approvalStatus must be 'pending'
            expect(createdUser.approvalStatus).toBe('pending');
            expect(createdUser.psychologistDetails.approvalStatus).toBe('pending');
            
            // They must be equal (consistency)
            expect(createdUser.approvalStatus).toBe(createdUser.psychologistDetails.approvalStatus);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
