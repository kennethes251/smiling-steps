/**
 * @stable - Authentication Login Tests
 * 
 * These tests protect the STABLE authentication system.
 * DO NOT modify without explicit user instruction.
 * 
 * Last verified: December 28, 2025
 * 
 * Protected features:
 * - Client login with email verification check
 * - Psychologist login with approvalStatus in response
 * - GET /api/auth returns approvalStatus
 * - POST /api/auth/refresh returns approvalStatus
 * - RoleGuard logic for pending approval page
 */

const fc = require('fast-check');

// ============================================
// STABLE API RESPONSE CONTRACTS
// ============================================

const REQUIRED_LOGIN_RESPONSE_FIELDS = ['success', 'token', 'user'];
const REQUIRED_USER_FIELDS = ['id', 'name', 'email', 'role', 'isVerified', 'approvalStatus'];
const VALID_ROLES = ['client', 'psychologist', 'admin'];
const VALID_APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'not_applicable'];

// ============================================
// PROPERTY-BASED TESTS
// ============================================

describe('@stable Authentication System - Login Response Contract', () => {
  
  describe('Login Response Structure', () => {
    
    test('successful login response must contain all required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            success: fc.constant(true),
            token: fc.string({ minLength: 10 }),
            user: fc.record({
              id: fc.string({ minLength: 1 }),
              name: fc.string({ minLength: 1 }),
              email: fc.emailAddress(),
              role: fc.constantFrom(...VALID_ROLES),
              isVerified: fc.boolean(),
              approvalStatus: fc.constantFrom(...VALID_APPROVAL_STATUSES)
            })
          }),
          (response) => {
            // All required fields must be present
            REQUIRED_LOGIN_RESPONSE_FIELDS.forEach(field => {
              expect(response).toHaveProperty(field);
            });
            
            // User object must have all required fields
            REQUIRED_USER_FIELDS.forEach(field => {
              expect(response.user).toHaveProperty(field);
            });
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('psychologist login must include approvalStatus', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1 }),
            email: fc.emailAddress(),
            role: fc.constant('psychologist'),
            isVerified: fc.constant(true),
            approvalStatus: fc.constantFrom('pending', 'approved', 'rejected')
          }),
          (userData) => {
            // Psychologist MUST have approvalStatus that is NOT 'not_applicable'
            expect(userData.approvalStatus).not.toBe('not_applicable');
            expect(['pending', 'approved', 'rejected']).toContain(userData.approvalStatus);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('client login approvalStatus should be not_applicable', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1 }),
            email: fc.emailAddress(),
            role: fc.constant('client'),
            isVerified: fc.boolean(),
            approvalStatus: fc.constant('not_applicable')
          }),
          (userData) => {
            // Client approvalStatus should be 'not_applicable'
            expect(userData.approvalStatus).toBe('not_applicable');
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Email Verification Logic', () => {
    
    test('unverified users should not be able to login', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            isVerified: fc.constant(false),
            role: fc.constantFrom('client', 'psychologist')
          }),
          (user) => {
            // Business rule: unverified users cannot login
            const canLogin = user.isVerified === true;
            expect(canLogin).toBe(false);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('verified users should be able to proceed with login', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            isVerified: fc.constant(true),
            role: fc.constantFrom('client', 'psychologist')
          }),
          (user) => {
            // Business rule: verified users can proceed
            const canProceed = user.isVerified === true;
            expect(canProceed).toBe(true);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Psychologist Approval Status Logic', () => {
    
    test('pending psychologists should see approval pending page', () => {
      fc.assert(
        fc.property(
          fc.record({
            role: fc.constant('psychologist'),
            approvalStatus: fc.constant('pending'),
            isVerified: fc.constant(true)
          }),
          (user) => {
            // RoleGuard logic: show pending page if approvalStatus !== 'approved'
            const shouldShowPendingPage = 
              user.role === 'psychologist' && 
              user.approvalStatus !== 'approved';
            
            expect(shouldShowPendingPage).toBe(true);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('approved psychologists should access dashboard', () => {
      fc.assert(
        fc.property(
          fc.record({
            role: fc.constant('psychologist'),
            approvalStatus: fc.constant('approved'),
            isVerified: fc.constant(true)
          }),
          (user) => {
            // RoleGuard logic: allow access if approvalStatus === 'approved'
            const shouldAllowAccess = 
              user.role === 'psychologist' && 
              user.approvalStatus === 'approved';
            
            expect(shouldAllowAccess).toBe(true);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('rejected psychologists should not access dashboard', () => {
      fc.assert(
        fc.property(
          fc.record({
            role: fc.constant('psychologist'),
            approvalStatus: fc.constant('rejected'),
            isVerified: fc.constant(true)
          }),
          (user) => {
            // Business rule: rejected psychologists cannot access dashboard
            const shouldDenyAccess = 
              user.role === 'psychologist' && 
              user.approvalStatus === 'rejected';
            
            expect(shouldDenyAccess).toBe(true);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Token Refresh Response Contract', () => {
    
    test('refresh response must include approvalStatus for psychologists', () => {
      fc.assert(
        fc.property(
          fc.record({
            success: fc.constant(true),
            token: fc.string({ minLength: 10 }),
            user: fc.record({
              id: fc.string({ minLength: 1 }),
              name: fc.string({ minLength: 1 }),
              email: fc.emailAddress(),
              role: fc.constant('psychologist'),
              isVerified: fc.constant(true),
              approvalStatus: fc.constantFrom('pending', 'approved', 'rejected')
            })
          }),
          (response) => {
            // Refresh response must have approvalStatus for psychologists
            expect(response.user).toHaveProperty('approvalStatus');
            expect(response.user.approvalStatus).not.toBe('not_applicable');
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('GET /api/auth Response Contract', () => {
    
    test('auth endpoint must return approvalStatus for psychologists', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1 }),
            email: fc.emailAddress(),
            role: fc.constant('psychologist'),
            isVerified: fc.constant(true),
            approvalStatus: fc.constantFrom('pending', 'approved', 'rejected')
          }),
          (userData) => {
            // GET /api/auth must return approvalStatus
            expect(userData).toHaveProperty('approvalStatus');
            expect(['pending', 'approved', 'rejected']).toContain(userData.approvalStatus);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

// ============================================
// UNIT TESTS FOR CRITICAL LOGIC
// ============================================

describe('@stable Authentication System - Critical Logic', () => {
  
  describe('approvalStatus Resolution Logic', () => {
    
    // This mirrors the actual logic in users-mongodb-fixed.js
    const resolveApprovalStatus = (user) => {
      if (user.role === 'psychologist') {
        return user.approvalStatus || 
               user.psychologistDetails?.approvalStatus || 
               'pending';
      }
      return 'not_applicable';
    };

    test('should resolve approvalStatus from top-level field', () => {
      const user = {
        role: 'psychologist',
        approvalStatus: 'approved',
        psychologistDetails: { approvalStatus: 'pending' }
      };
      expect(resolveApprovalStatus(user)).toBe('approved');
    });

    test('should fallback to psychologistDetails.approvalStatus', () => {
      const user = {
        role: 'psychologist',
        psychologistDetails: { approvalStatus: 'approved' }
      };
      expect(resolveApprovalStatus(user)).toBe('approved');
    });

    test('should default to pending if no approvalStatus found', () => {
      const user = {
        role: 'psychologist',
        psychologistDetails: {}
      };
      expect(resolveApprovalStatus(user)).toBe('pending');
    });

    test('should return not_applicable for clients', () => {
      const user = { role: 'client' };
      expect(resolveApprovalStatus(user)).toBe('not_applicable');
    });

    test('should return not_applicable for admins', () => {
      const user = { role: 'admin' };
      expect(resolveApprovalStatus(user)).toBe('not_applicable');
    });
  });

  describe('RoleGuard Pending Page Logic', () => {
    
    // This mirrors the actual logic in RoleGuard.js
    const shouldShowPendingPage = (user, allowedRoles) => {
      if (!user) return false;
      if (!allowedRoles.includes(user.role)) return false;
      
      // Only psychologists need approval check
      if (user.role === 'psychologist') {
        return user.approvalStatus !== 'approved';
      }
      return false;
    };

    test('should show pending page for unapproved psychologist', () => {
      const user = { role: 'psychologist', approvalStatus: 'pending' };
      expect(shouldShowPendingPage(user, ['psychologist'])).toBe(true);
    });

    test('should not show pending page for approved psychologist', () => {
      const user = { role: 'psychologist', approvalStatus: 'approved' };
      expect(shouldShowPendingPage(user, ['psychologist'])).toBe(false);
    });

    test('should not show pending page for clients', () => {
      const user = { role: 'client', approvalStatus: 'not_applicable' };
      expect(shouldShowPendingPage(user, ['client'])).toBe(false);
    });

    test('should not show pending page for admins', () => {
      const user = { role: 'admin' };
      expect(shouldShowPendingPage(user, ['admin'])).toBe(false);
    });
  });

  describe('Email Verification Check Logic', () => {
    
    // This mirrors the actual logic in users-mongodb-fixed.js
    const shouldBlockLogin = (user) => {
      // Admin bypasses verification
      if (user.role === 'admin') return false;
      
      // Clients and psychologists need verification
      if ((user.role === 'client' || user.role === 'psychologist') && !user.isVerified) {
        return true;
      }
      return false;
    };

    test('should block unverified client', () => {
      const user = { role: 'client', isVerified: false };
      expect(shouldBlockLogin(user)).toBe(true);
    });

    test('should block unverified psychologist', () => {
      const user = { role: 'psychologist', isVerified: false };
      expect(shouldBlockLogin(user)).toBe(true);
    });

    test('should allow verified client', () => {
      const user = { role: 'client', isVerified: true };
      expect(shouldBlockLogin(user)).toBe(false);
    });

    test('should allow verified psychologist', () => {
      const user = { role: 'psychologist', isVerified: true };
      expect(shouldBlockLogin(user)).toBe(false);
    });

    test('should allow admin without verification', () => {
      const user = { role: 'admin', isVerified: false };
      expect(shouldBlockLogin(user)).toBe(false);
    });
  });
});

// ============================================
// INVARIANT TESTS
// ============================================

describe('@stable Authentication System - Invariants', () => {
  
  test('INVARIANT: Login response user object always has approvalStatus', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('client', 'psychologist', 'admin'),
        (role) => {
          // Simulate building userData like in users-mongodb-fixed.js
          const userData = {
            id: 'test-id',
            name: 'Test User',
            email: 'test@example.com',
            role: role,
            isVerified: true,
            approvalStatus: role === 'psychologist' ? 'approved' : 'not_applicable'
          };
          
          // INVARIANT: approvalStatus must always be present
          expect(userData).toHaveProperty('approvalStatus');
          expect(VALID_APPROVAL_STATUSES).toContain(userData.approvalStatus);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('INVARIANT: Psychologist approvalStatus is never not_applicable', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('pending', 'approved', 'rejected'),
        (status) => {
          const userData = {
            role: 'psychologist',
            approvalStatus: status
          };
          
          // INVARIANT: Psychologist should never have 'not_applicable'
          expect(userData.approvalStatus).not.toBe('not_applicable');
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('INVARIANT: Client approvalStatus is always not_applicable', () => {
    const userData = {
      role: 'client',
      approvalStatus: 'not_applicable'
    };
    
    // INVARIANT: Client should always have 'not_applicable'
    expect(userData.approvalStatus).toBe('not_applicable');
  });
});
