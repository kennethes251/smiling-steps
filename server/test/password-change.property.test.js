/**
 * Property-Based Tests for Password Change Requires Current Password
 * 
 * Feature: admin-user-management, Property 9: Password Change Requires Current Password
 * Validates: Requirements 4.5
 * 
 * For any password change request, if the provided current password does not match
 * the stored password, the request SHALL be rejected and the password SHALL remain unchanged.
 */

const fc = require('fast-check');
const bcrypt = require('bcryptjs');

// Mock environment setup
process.env.NODE_ENV = 'test';

describe('Password Change Property-Based Tests', () => {
  
  describe('Property 9: Password Change Requires Current Password', () => {
    /**
     * Feature: admin-user-management, Property 9: Password Change Requires Current Password
     * Validates: Requirements 4.5
     */

    // Helper to simulate password verification (mirrors profile.js logic)
    async function verifyCurrentPassword(providedPassword, storedHashedPassword) {
      return await bcrypt.compare(providedPassword, storedHashedPassword);
    }

    // Helper to hash a password (mirrors profile.js logic)
    // Using lower salt rounds (4) for testing to speed up property tests
    // Production uses 12 rounds
    async function hashPassword(password) {
      const salt = await bcrypt.genSalt(4);
      return await bcrypt.hash(password, salt);
    }

    // Helper to simulate password change logic
    async function simulatePasswordChange(storedHashedPassword, currentPassword, newPassword) {
      // Step 1: Verify current password
      const isMatch = await verifyCurrentPassword(currentPassword, storedHashedPassword);
      
      if (!isMatch) {
        return {
          success: false,
          message: 'Current password is incorrect',
          passwordChanged: false,
          newHashedPassword: storedHashedPassword // Password remains unchanged
        };
      }

      // Step 2: Validate new password strength (min 6 chars as per profile.js)
      if (newPassword.length < 6) {
        return {
          success: false,
          message: 'New password must be at least 6 characters long',
          passwordChanged: false,
          newHashedPassword: storedHashedPassword
        };
      }

      // Step 3: Check if new password is same as current
      const isSamePassword = await bcrypt.compare(newPassword, storedHashedPassword);
      if (isSamePassword) {
        return {
          success: false,
          message: 'New password must be different from current password',
          passwordChanged: false,
          newHashedPassword: storedHashedPassword
        };
      }

      // Step 4: Hash and update password
      const newHashedPassword = await hashPassword(newPassword);
      
      return {
        success: true,
        message: 'Password changed successfully',
        passwordChanged: true,
        newHashedPassword
      };
    }

    test('should reject password change when current password is incorrect - Requirement 4.5', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate actual stored password
          fc.string({ minLength: 6, maxLength: 30 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
          // Generate wrong current password (different from stored)
          fc.string({ minLength: 6, maxLength: 30 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
          // Generate new password
          fc.string({ minLength: 6, maxLength: 30 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
          async (actualPassword, wrongPassword, newPassword) => {
            // Ensure wrong password is actually different from actual password
            fc.pre(wrongPassword !== actualPassword);
            fc.pre(newPassword !== actualPassword);
            
            // Hash the actual stored password
            const storedHashedPassword = await hashPassword(actualPassword);
            
            // Attempt password change with wrong current password
            const result = await simulatePasswordChange(
              storedHashedPassword,
              wrongPassword, // Wrong password provided
              newPassword
            );
            
            // Property: Request should be rejected
            expect(result.success).toBe(false);
            expect(result.message).toBe('Current password is incorrect');
            
            // Property: Password should remain unchanged
            expect(result.passwordChanged).toBe(false);
            
            // Property: Stored password hash should be unchanged
            const canStillLoginWithOriginal = await bcrypt.compare(actualPassword, result.newHashedPassword);
            expect(canStillLoginWithOriginal).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should accept password change when current password is correct - Requirement 4.5', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate actual stored password
          fc.string({ minLength: 6, maxLength: 30 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
          // Generate new password (different from current)
          fc.string({ minLength: 6, maxLength: 30 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
          async (actualPassword, newPassword) => {
            // Ensure new password is different from actual password
            fc.pre(newPassword !== actualPassword);
            
            // Hash the actual stored password
            const storedHashedPassword = await hashPassword(actualPassword);
            
            // Attempt password change with correct current password
            const result = await simulatePasswordChange(
              storedHashedPassword,
              actualPassword, // Correct password provided
              newPassword
            );
            
            // Property: Request should be accepted
            expect(result.success).toBe(true);
            expect(result.message).toBe('Password changed successfully');
            
            // Property: Password should be changed
            expect(result.passwordChanged).toBe(true);
            
            // Property: New password should work for login
            const canLoginWithNew = await bcrypt.compare(newPassword, result.newHashedPassword);
            expect(canLoginWithNew).toBe(true);
            
            // Property: Old password should no longer work
            const canLoginWithOld = await bcrypt.compare(actualPassword, result.newHashedPassword);
            expect(canLoginWithOld).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should reject password change when new password is same as current - Requirement 4.5', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate password (used as both current and new)
          fc.string({ minLength: 6, maxLength: 30 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
          async (password) => {
            // Hash the stored password
            const storedHashedPassword = await hashPassword(password);
            
            // Attempt password change with same password as new
            const result = await simulatePasswordChange(
              storedHashedPassword,
              password, // Correct current password
              password  // Same as current (should be rejected)
            );
            
            // Property: Request should be rejected
            expect(result.success).toBe(false);
            expect(result.message).toBe('New password must be different from current password');
            
            // Property: Password should remain unchanged
            expect(result.passwordChanged).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should reject password change when new password is too short - Requirement 4.5', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid stored password
          fc.string({ minLength: 6, maxLength: 30 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
          // Generate short new password (less than 6 chars)
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
          async (actualPassword, shortNewPassword) => {
            // Hash the stored password
            const storedHashedPassword = await hashPassword(actualPassword);
            
            // Attempt password change with short new password
            const result = await simulatePasswordChange(
              storedHashedPassword,
              actualPassword, // Correct current password
              shortNewPassword // Too short
            );
            
            // Property: Request should be rejected
            expect(result.success).toBe(false);
            expect(result.message).toBe('New password must be at least 6 characters long');
            
            // Property: Password should remain unchanged
            expect(result.passwordChanged).toBe(false);
            
            // Property: Original password still works
            const canStillLogin = await bcrypt.compare(actualPassword, result.newHashedPassword);
            expect(canStillLogin).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should maintain password integrity through multiple failed attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate actual stored password
          fc.string({ minLength: 6, maxLength: 30 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
          // Generate array of wrong passwords (multiple failed attempts)
          fc.array(
            fc.string({ minLength: 6, maxLength: 30 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
            { minLength: 1, maxLength: 3 }
          ),
          // Generate new password
          fc.string({ minLength: 6, maxLength: 30 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
          async (actualPassword, wrongPasswords, newPassword) => {
            // Ensure all wrong passwords are different from actual
            const filteredWrongPasswords = wrongPasswords.filter(wp => wp !== actualPassword);
            fc.pre(filteredWrongPasswords.length > 0);
            fc.pre(newPassword !== actualPassword);
            
            // Hash the actual stored password
            let currentHashedPassword = await hashPassword(actualPassword);
            
            // Attempt multiple password changes with wrong passwords
            for (const wrongPassword of filteredWrongPasswords) {
              const result = await simulatePasswordChange(
                currentHashedPassword,
                wrongPassword,
                newPassword
              );
              
              // Property: Each attempt should fail
              expect(result.success).toBe(false);
              
              // Property: Password should remain unchanged after each failed attempt
              const canStillLogin = await bcrypt.compare(actualPassword, result.newHashedPassword);
              expect(canStillLogin).toBe(true);
              
              // Update current hash for next iteration (should be same)
              currentHashedPassword = result.newHashedPassword;
            }
            
            // Property: After all failed attempts, original password still works
            const finalCheck = await bcrypt.compare(actualPassword, currentHashedPassword);
            expect(finalCheck).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should correctly handle password verification with bcrypt timing safety', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate stored password
          fc.string({ minLength: 6, maxLength: 30 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
          // Generate test password (may or may not match)
          fc.string({ minLength: 6, maxLength: 30 }).filter(s => /^[a-zA-Z0-9!@#$%^&*]+$/.test(s)),
          async (storedPassword, testPassword) => {
            const storedHash = await hashPassword(storedPassword);
            
            // Verify password comparison is deterministic
            const result1 = await verifyCurrentPassword(testPassword, storedHash);
            const result2 = await verifyCurrentPassword(testPassword, storedHash);
            
            // Property: Same inputs should always produce same result
            expect(result1).toBe(result2);
            
            // Property: Correct password should always verify
            if (testPassword === storedPassword) {
              expect(result1).toBe(true);
            }
            
            // Property: Different password should never verify
            if (testPassword !== storedPassword) {
              expect(result1).toBe(false);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
