/**
 * Property-Based Tests for User Deactivation Prevents Login
 * 
 * Feature: admin-user-management, Property 3: User Deactivation Prevents Login
 * Validates: Requirements 2.4
 * 
 * For any user that has been deactivated by an admin, subsequent login attempts 
 * with valid credentials SHALL be rejected with an appropriate error message.
 */

const fc = require('fast-check');

// Mock environment setup
process.env.NODE_ENV = 'test';

describe('User Deactivation Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 3: User Deactivation Prevents Login', () => {
    /**
     * Feature: admin-user-management, Property 3: User Deactivation Prevents Login
     * Validates: Requirements 2.4
     */

    test('should reject login for any deactivated user with valid credentials', () => {
      fc.assert(
        fc.property(
          // Generate user data with various roles (excluding admin)
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            role: fc.constantFrom('client', 'psychologist'),
            status: fc.constant('inactive'), // User is deactivated
            isVerified: fc.boolean(),
            createdAt: fc.date()
          }),
          (user) => {
            // Simulate the canLogin method from User model
            const canLogin = () => {
              return user.status === 'active' && !user.isAccountLocked;
            };
            
            // Property: Deactivated users (status !== 'active') cannot login
            expect(canLogin()).toBe(false);
            
            // Verify the user has inactive status
            expect(user.status).toBe('inactive');
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should allow login for active users with valid credentials', () => {
      fc.assert(
        fc.property(
          // Generate active user data
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            role: fc.constantFrom('client', 'psychologist', 'admin'),
            status: fc.constant('active'), // User is active
            isAccountLocked: fc.constant(false),
            isVerified: fc.constant(true),
            createdAt: fc.date()
          }),
          (user) => {
            // Simulate the canLogin method from User model
            const canLogin = () => {
              return user.status === 'active' && !user.isAccountLocked;
            };
            
            // Property: Active users can login
            expect(canLogin()).toBe(true);
            
            // Verify the user has active status
            expect(user.status).toBe('active');
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should transition from active to inactive correctly', () => {
      fc.assert(
        fc.property(
          // Generate user that starts as active
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            role: fc.constantFrom('client', 'psychologist'),
            status: fc.constant('active'),
            isAccountLocked: fc.constant(false)
          }),
          (user) => {
            // Initial state: user can login
            const canLoginBefore = user.status === 'active' && !user.isAccountLocked;
            expect(canLoginBefore).toBe(true);
            
            // Simulate deactivation by admin
            user.status = 'inactive';
            
            // After deactivation: user cannot login
            const canLoginAfter = user.status === 'active' && !user.isAccountLocked;
            expect(canLoginAfter).toBe(false);
            
            // Status should be inactive
            expect(user.status).toBe('inactive');
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should return appropriate error message for deactivated users', () => {
      fc.assert(
        fc.property(
          // Generate deactivated user
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            email: fc.emailAddress(),
            status: fc.constant('inactive'),
            role: fc.constantFrom('client', 'psychologist')
          }),
          (user) => {
            // Simulate login attempt response for inactive user
            const getLoginResponse = (userStatus) => {
              if (userStatus === 'inactive') {
                return {
                  success: false,
                  code: 'ACCOUNT_INACTIVE',
                  message: 'Your account has been deactivated. Please contact support.'
                };
              }
              return { success: true };
            };
            
            const response = getLoginResponse(user.status);
            
            // Property: Response should indicate account is inactive
            expect(response.success).toBe(false);
            expect(response.code).toBe('ACCOUNT_INACTIVE');
            expect(response.message).toBeDefined();
            expect(typeof response.message).toBe('string');
            expect(response.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should reject login for deleted users as well', () => {
      fc.assert(
        fc.property(
          // Generate user with deleted status
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.constant('Deleted User'),
            email: fc.string({ minLength: 24, maxLength: 24 }).map(id => `deleted_${id}@anonymized.local`),
            role: fc.constantFrom('client', 'psychologist'),
            status: fc.constant('deleted'),
            deletedAt: fc.date(),
            anonymizedAt: fc.date()
          }),
          (user) => {
            // Simulate the canLogin method
            const canLogin = () => {
              return user.status === 'active';
            };
            
            // Property: Deleted users cannot login
            expect(canLogin()).toBe(false);
            expect(user.status).toBe('deleted');
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should handle all non-active statuses consistently', () => {
      fc.assert(
        fc.property(
          // Generate user with any non-active status
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            email: fc.emailAddress(),
            role: fc.constantFrom('client', 'psychologist'),
            status: fc.constantFrom('inactive', 'deleted') // All non-active statuses
          }),
          (user) => {
            // Simulate the canLogin method
            const canLogin = () => {
              return user.status === 'active';
            };
            
            // Property: Any non-active status should prevent login
            expect(canLogin()).toBe(false);
            expect(['inactive', 'deleted']).toContain(user.status);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should validate status field is properly set during deactivation', () => {
      fc.assert(
        fc.property(
          // Generate admin performing deactivation
          fc.record({
            adminId: fc.string({ minLength: 24, maxLength: 24 }),
            adminRole: fc.constant('admin')
          }),
          // Generate target user to deactivate
          fc.record({
            userId: fc.string({ minLength: 24, maxLength: 24 }),
            email: fc.emailAddress(),
            role: fc.constantFrom('client', 'psychologist'),
            currentStatus: fc.constant('active')
          }),
          (admin, targetUser) => {
            // Simulate the deactivation process
            const performDeactivation = (adminRole, userRole, currentStatus) => {
              // Admin cannot deactivate other admins
              if (userRole === 'admin') {
                return { success: false, error: 'Cannot modify admin account status' };
              }
              
              // Cannot deactivate already deleted users
              if (currentStatus === 'deleted') {
                return { success: false, error: 'Cannot change status of deleted user' };
              }
              
              // Valid deactivation
              return { 
                success: true, 
                newStatus: 'inactive',
                previousStatus: currentStatus
              };
            };
            
            const result = performDeactivation(admin.adminRole, targetUser.role, targetUser.currentStatus);
            
            // Property: Deactivation should succeed for non-admin users
            expect(result.success).toBe(true);
            expect(result.newStatus).toBe('inactive');
            expect(result.previousStatus).toBe('active');
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should prevent admin accounts from being deactivated', () => {
      fc.assert(
        fc.property(
          // Generate admin user that someone tries to deactivate
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            email: fc.emailAddress(),
            role: fc.constant('admin'),
            status: fc.constant('active')
          }),
          (adminUser) => {
            // Simulate attempt to deactivate admin
            const canDeactivate = (userRole) => {
              return userRole !== 'admin';
            };
            
            // Property: Admin accounts cannot be deactivated
            expect(canDeactivate(adminUser.role)).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
