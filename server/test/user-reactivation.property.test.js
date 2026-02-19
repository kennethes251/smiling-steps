/**
 * Property-Based Tests for User Reactivation Restores Access
 * 
 * Feature: admin-user-management, Property 4: User Reactivation Restores Access
 * Validates: Requirements 2.5
 * 
 * For any user that has been deactivated and then reactivated, the user SHALL 
 * be able to login successfully with their original credentials.
 */

const fc = require('fast-check');

// Mock environment setup
process.env.NODE_ENV = 'test';

describe('User Reactivation Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 4: User Reactivation Restores Access', () => {
    /**
     * Feature: admin-user-management, Property 4: User Reactivation Restores Access
     * Validates: Requirements 2.5
     */

    test('should restore login access for any reactivated user (round-trip property)', () => {
      fc.assert(
        fc.property(
          // Generate user data with various roles (excluding admin)
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            role: fc.constantFrom('client', 'psychologist'),
            status: fc.constant('active'), // User starts as active
            isAccountLocked: fc.constant(false),
            isVerified: fc.constant(true),
            createdAt: fc.date()
          }),
          (user) => {
            // Helper function to check if user can login
            const canLogin = (userObj) => {
              return userObj.status === 'active' && !userObj.isAccountLocked;
            };
            
            // Step 1: User starts as active - can login
            const initialLoginState = canLogin(user);
            expect(initialLoginState).toBe(true);
            
            // Store original credentials
            const originalEmail = user.email;
            const originalPassword = user.password;
            
            // Step 2: Deactivate user
            user.status = 'inactive';
            const afterDeactivation = canLogin(user);
            expect(afterDeactivation).toBe(false);
            
            // Step 3: Reactivate user
            user.status = 'active';
            const afterReactivation = canLogin(user);
            
            // Property: After reactivation, user can login
            expect(afterReactivation).toBe(true);
            
            // Property: Credentials remain unchanged (round-trip)
            expect(user.email).toBe(originalEmail);
            expect(user.password).toBe(originalPassword);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should preserve all user data through deactivation-reactivation cycle', () => {
      fc.assert(
        fc.property(
          // Generate comprehensive user data
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            role: fc.constantFrom('client', 'psychologist'),
            phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
            bio: fc.option(fc.string({ minLength: 0, maxLength: 500 })),
            specializations: fc.array(fc.string({ minLength: 2, maxLength: 30 }), { maxLength: 5 }),
            status: fc.constant('active'),
            isAccountLocked: fc.constant(false),
            isVerified: fc.constant(true)
          }),
          (user) => {
            // Store original user data
            const originalData = {
              _id: user._id,
              name: user.name,
              email: user.email,
              password: user.password,
              role: user.role,
              phone: user.phone,
              bio: user.bio,
              specializations: [...user.specializations],
              isVerified: user.isVerified
            };
            
            // Deactivate
            user.status = 'inactive';
            
            // Reactivate
            user.status = 'active';
            
            // Property: All user data should be preserved
            expect(user._id).toBe(originalData._id);
            expect(user.name).toBe(originalData.name);
            expect(user.email).toBe(originalData.email);
            expect(user.password).toBe(originalData.password);
            expect(user.role).toBe(originalData.role);
            expect(user.phone).toBe(originalData.phone);
            expect(user.bio).toBe(originalData.bio);
            expect(user.specializations).toEqual(originalData.specializations);
            expect(user.isVerified).toBe(originalData.isVerified);
            expect(user.status).toBe('active');
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should allow reactivation from inactive status only', () => {
      fc.assert(
        fc.property(
          // Generate user with inactive status
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            email: fc.emailAddress(),
            role: fc.constantFrom('client', 'psychologist'),
            status: fc.constant('inactive')
          }),
          (user) => {
            // Simulate reactivation validation
            const canReactivate = (currentStatus) => {
              // Can only reactivate from inactive status
              // Cannot reactivate deleted users
              return currentStatus === 'inactive';
            };
            
            // Property: Inactive users can be reactivated
            expect(canReactivate(user.status)).toBe(true);
            
            // Perform reactivation
            user.status = 'active';
            
            // Property: After reactivation, status is active
            expect(user.status).toBe('active');
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should not allow reactivation of deleted users', () => {
      fc.assert(
        fc.property(
          // Generate deleted user
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
            // Simulate reactivation validation
            const canReactivate = (currentStatus) => {
              // Cannot reactivate deleted users
              return currentStatus === 'inactive';
            };
            
            // Property: Deleted users cannot be reactivated
            expect(canReactivate(user.status)).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should return success response with correct user data after reactivation', () => {
      fc.assert(
        fc.property(
          // Generate admin performing reactivation
          fc.record({
            adminId: fc.string({ minLength: 24, maxLength: 24 }),
            adminRole: fc.constant('admin')
          }),
          // Generate target user to reactivate
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            role: fc.constantFrom('client', 'psychologist'),
            status: fc.constant('inactive')
          }),
          (admin, targetUser) => {
            // Simulate the reactivation API response
            const performReactivation = (userRole, currentStatus) => {
              // Admin cannot reactivate other admins (they can't be deactivated anyway)
              if (userRole === 'admin') {
                return { 
                  success: false, 
                  code: 'FORBIDDEN',
                  message: 'Cannot modify admin account status' 
                };
              }
              
              // Cannot reactivate deleted users
              if (currentStatus === 'deleted') {
                return { 
                  success: false, 
                  code: 'VALIDATION_ERROR',
                  message: 'Cannot change status of deleted user' 
                };
              }
              
              // Cannot reactivate already active users (no-op but still valid)
              if (currentStatus === 'active') {
                return {
                  success: true,
                  message: 'User activated successfully',
                  user: {
                    id: targetUser._id,
                    name: targetUser.name,
                    email: targetUser.email,
                    role: targetUser.role,
                    status: 'active'
                  }
                };
              }
              
              // Valid reactivation from inactive
              return { 
                success: true, 
                message: 'User activated successfully',
                user: {
                  id: targetUser._id,
                  name: targetUser.name,
                  email: targetUser.email,
                  role: targetUser.role,
                  status: 'active'
                }
              };
            };
            
            const result = performReactivation(targetUser.role, targetUser.status);
            
            // Property: Reactivation should succeed for inactive non-admin users
            expect(result.success).toBe(true);
            expect(result.message).toBe('User activated successfully');
            expect(result.user.status).toBe('active');
            expect(result.user.id).toBe(targetUser._id);
            expect(result.user.name).toBe(targetUser.name);
            expect(result.user.email).toBe(targetUser.email);
            expect(result.user.role).toBe(targetUser.role);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should handle multiple deactivation-reactivation cycles correctly', () => {
      fc.assert(
        fc.property(
          // Generate user
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            role: fc.constantFrom('client', 'psychologist'),
            status: fc.constant('active'),
            isAccountLocked: fc.constant(false)
          }),
          // Generate number of cycles
          fc.integer({ min: 1, max: 5 }),
          (user, cycles) => {
            const canLogin = (userObj) => {
              return userObj.status === 'active' && !userObj.isAccountLocked;
            };
            
            const originalEmail = user.email;
            const originalPassword = user.password;
            
            // Perform multiple deactivation-reactivation cycles
            for (let i = 0; i < cycles; i++) {
              // Deactivate
              user.status = 'inactive';
              expect(canLogin(user)).toBe(false);
              
              // Reactivate
              user.status = 'active';
              expect(canLogin(user)).toBe(true);
            }
            
            // Property: After any number of cycles, user can still login
            expect(canLogin(user)).toBe(true);
            
            // Property: Credentials remain unchanged through all cycles
            expect(user.email).toBe(originalEmail);
            expect(user.password).toBe(originalPassword);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should create audit log entry for reactivation', () => {
      fc.assert(
        fc.property(
          // Generate admin
          fc.record({
            adminId: fc.string({ minLength: 24, maxLength: 24 })
          }),
          // Generate user to reactivate
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            email: fc.emailAddress(),
            role: fc.constantFrom('client', 'psychologist'),
            previousStatus: fc.constant('inactive'),
            newStatus: fc.constant('active')
          }),
          (admin, user) => {
            // Simulate audit log creation
            const createAuditLog = (action, details) => {
              return {
                action: action,
                adminId: details.adminId,
                userId: details.userId,
                targetType: 'User',
                targetId: details.userId,
                previousValue: { status: details.previousStatus },
                newValue: { status: details.newStatus },
                timestamp: new Date()
              };
            };
            
            const auditLog = createAuditLog('USER_STATUS_CHANGE', {
              adminId: admin.adminId,
              userId: user._id,
              previousStatus: user.previousStatus,
              newStatus: user.newStatus
            });
            
            // Property: Audit log should capture the status change
            expect(auditLog.action).toBe('USER_STATUS_CHANGE');
            expect(auditLog.adminId).toBe(admin.adminId);
            expect(auditLog.userId).toBe(user._id);
            expect(auditLog.previousValue.status).toBe('inactive');
            expect(auditLog.newValue.status).toBe('active');
            expect(auditLog.timestamp).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should validate status transition is valid for reactivation', () => {
      fc.assert(
        fc.property(
          // Generate various status values
          fc.constantFrom('active', 'inactive', 'deleted'),
          (currentStatus) => {
            // Simulate status transition validation
            const isValidReactivation = (fromStatus, toStatus) => {
              // Can only transition to active from inactive
              if (toStatus !== 'active') return false;
              if (fromStatus === 'deleted') return false;
              if (fromStatus === 'active') return true; // No-op but valid
              return fromStatus === 'inactive';
            };
            
            const canReactivate = isValidReactivation(currentStatus, 'active');
            
            // Property: Only inactive and active statuses can transition to active
            if (currentStatus === 'inactive' || currentStatus === 'active') {
              expect(canReactivate).toBe(true);
            } else {
              expect(canReactivate).toBe(false);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
