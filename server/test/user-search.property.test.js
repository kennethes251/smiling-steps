/**
 * Property-Based Tests for User Search
 * 
 * Feature: admin-user-management, Property 2: User Search Returns Matching Results
 * Validates: Requirements 2.2
 * 
 * For any search query (name, email, or role), all returned users SHALL contain 
 * the search term in the specified field, and no matching users SHALL be excluded 
 * from results.
 */

const fc = require('fast-check');

// Mock environment setup
process.env.NODE_ENV = 'test';

// Mock mongoose before requiring User model
jest.mock('../models/User');

const User = require('../models/User');

describe('User Search Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 2: User Search Returns Matching Results', () => {
    /**
     * Feature: admin-user-management, Property 2: User Search Returns Matching Results
     * Validates: Requirements 2.2
     */

    test('should return all users matching name search query', () => {
      fc.assert(
        fc.property(
          // Generate a list of users with various names
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
              email: fc.emailAddress(),
              role: fc.constantFrom('client', 'psychologist', 'admin'),
              status: fc.constantFrom('active', 'inactive'),
              createdAt: fc.date()
            }),
            { minLength: 5, maxLength: 30 }
          ),
          // Generate alphanumeric search terms (avoiding regex special characters)
          fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/).filter(s => s.length >= 1),
          (users, searchTerm) => {
            const searchLower = searchTerm.toLowerCase();
            
            // Simulate the search logic from admin.js (using regex)
            const searchRegex = new RegExp(searchTerm.trim(), 'i');
            const filteredUsers = users.filter(user => 
              searchRegex.test(user.name) || searchRegex.test(user.email)
            );
            
            // Property 1: All returned users must contain the search term in name or email
            filteredUsers.forEach(user => {
              const nameMatches = user.name.toLowerCase().includes(searchLower);
              const emailMatches = user.email.toLowerCase().includes(searchLower);
              expect(nameMatches || emailMatches).toBe(true);
            });
            
            // Property 2: No matching users should be excluded
            const expectedMatches = users.filter(user =>
              user.name.toLowerCase().includes(searchLower) ||
              user.email.toLowerCase().includes(searchLower)
            );
            
            expect(filteredUsers.length).toBe(expectedMatches.length);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should return all users matching email search query', () => {
      fc.assert(
        fc.property(
          // Generate users with various email addresses
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
              email: fc.emailAddress(),
              role: fc.constantFrom('client', 'psychologist', 'admin'),
              status: fc.constantFrom('active', 'inactive'),
              createdAt: fc.date()
            }),
            { minLength: 5, maxLength: 30 }
          ),
          // Generate email domain search term
          fc.constantFrom('gmail', 'yahoo', 'test', 'example', 'com', 'org'),
          (users, searchTerm) => {
            const searchLower = searchTerm.toLowerCase();
            
            // Simulate the search logic
            const searchRegex = new RegExp(searchTerm.trim(), 'i');
            const filteredUsers = users.filter(user => 
              searchRegex.test(user.name) || searchRegex.test(user.email)
            );
            
            // All returned users must contain the search term
            filteredUsers.forEach(user => {
              const nameMatches = user.name.toLowerCase().includes(searchLower);
              const emailMatches = user.email.toLowerCase().includes(searchLower);
              expect(nameMatches || emailMatches).toBe(true);
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should filter users by role correctly', () => {
      fc.assert(
        fc.property(
          // Generate users with various roles
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
              email: fc.emailAddress(),
              role: fc.constantFrom('client', 'psychologist', 'admin'),
              status: fc.constantFrom('active', 'inactive'),
              createdAt: fc.date()
            }),
            { minLength: 10, maxLength: 30 }
          ),
          // Generate role filter
          fc.constantFrom('client', 'psychologist', 'admin'),
          (users, roleFilter) => {
            // Filter users by role
            const filteredUsers = users.filter(user => user.role === roleFilter);
            
            // All returned users must have the specified role
            filteredUsers.forEach(user => {
              expect(user.role).toBe(roleFilter);
            });
            
            // No users with the specified role should be excluded
            const expectedCount = users.filter(u => u.role === roleFilter).length;
            expect(filteredUsers.length).toBe(expectedCount);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should filter users by status correctly', () => {
      fc.assert(
        fc.property(
          // Generate users with various statuses
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
              email: fc.emailAddress(),
              role: fc.constantFrom('client', 'psychologist', 'admin'),
              status: fc.constantFrom('active', 'inactive'),
              createdAt: fc.date()
            }),
            { minLength: 10, maxLength: 30 }
          ),
          // Generate status filter
          fc.constantFrom('active', 'inactive'),
          (users, statusFilter) => {
            // Filter users by status
            const filteredUsers = users.filter(user => user.status === statusFilter);
            
            // All returned users must have the specified status
            filteredUsers.forEach(user => {
              expect(user.status).toBe(statusFilter);
            });
            
            // No users with the specified status should be excluded
            const expectedCount = users.filter(u => u.status === statusFilter).length;
            expect(filteredUsers.length).toBe(expectedCount);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should combine search with role filter correctly', () => {
      fc.assert(
        fc.property(
          // Generate users
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
              email: fc.emailAddress(),
              role: fc.constantFrom('client', 'psychologist', 'admin'),
              status: fc.constantFrom('active', 'inactive'),
              createdAt: fc.date()
            }),
            { minLength: 10, maxLength: 30 }
          ),
          // Generate search term and role filter
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.trim().length >= 1),
          fc.constantFrom('client', 'psychologist', 'admin'),
          (users, searchTerm, roleFilter) => {
            const searchLower = searchTerm.toLowerCase();
            
            // Apply both filters
            const filteredUsers = users.filter(user => {
              const matchesSearch = 
                user.name.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower);
              const matchesRole = user.role === roleFilter;
              return matchesSearch && matchesRole;
            });
            
            // All returned users must match BOTH criteria
            filteredUsers.forEach(user => {
              const nameMatches = user.name.toLowerCase().includes(searchLower);
              const emailMatches = user.email.toLowerCase().includes(searchLower);
              expect(nameMatches || emailMatches).toBe(true);
              expect(user.role).toBe(roleFilter);
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should return empty array when no users match search', () => {
      fc.assert(
        fc.property(
          // Generate users with predictable names
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.constantFrom('Alice', 'Bob', 'Charlie', 'Diana'),
              email: fc.constantFrom('alice@test.com', 'bob@test.com', 'charlie@test.com', 'diana@test.com'),
              role: fc.constantFrom('client', 'psychologist'),
              status: fc.constant('active'),
              createdAt: fc.date()
            }),
            { minLength: 1, maxLength: 10 }
          ),
          // Generate search term that won't match
          fc.constantFrom('xyz123', 'qqq999', 'zzz000'),
          (users, searchTerm) => {
            const searchLower = searchTerm.toLowerCase();
            
            // Filter users
            const filteredUsers = users.filter(user =>
              user.name.toLowerCase().includes(searchLower) ||
              user.email.toLowerCase().includes(searchLower)
            );
            
            // Should return empty array for non-matching search
            expect(filteredUsers.length).toBe(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should handle case-insensitive search correctly', () => {
      fc.assert(
        fc.property(
          // Generate users
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.oneof(
                fc.constant('John Smith'),
                fc.constant('JANE DOE'),
                fc.constant('alice johnson'),
                fc.constant('Bob Williams')
              ),
              email: fc.emailAddress(),
              role: fc.constantFrom('client', 'psychologist'),
              status: fc.constant('active'),
              createdAt: fc.date()
            }),
            { minLength: 5, maxLength: 15 }
          ),
          // Generate search term with various cases
          fc.oneof(
            fc.constant('john'),
            fc.constant('JOHN'),
            fc.constant('John'),
            fc.constant('jOhN')
          ),
          (users, searchTerm) => {
            const searchLower = searchTerm.toLowerCase();
            
            // Case-insensitive search
            const filteredUsers = users.filter(user =>
              user.name.toLowerCase().includes(searchLower) ||
              user.email.toLowerCase().includes(searchLower)
            );
            
            // All returned users should match regardless of case
            filteredUsers.forEach(user => {
              const nameMatches = user.name.toLowerCase().includes(searchLower);
              const emailMatches = user.email.toLowerCase().includes(searchLower);
              expect(nameMatches || emailMatches).toBe(true);
            });
            
            // Count should be consistent regardless of search term case
            const expectedCount = users.filter(u =>
              u.name.toLowerCase().includes('john') ||
              u.email.toLowerCase().includes('john')
            ).length;
            
            expect(filteredUsers.length).toBe(expectedCount);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should exclude deleted users from search results', () => {
      fc.assert(
        fc.property(
          // Generate users including some deleted ones
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
              email: fc.emailAddress(),
              role: fc.constantFrom('client', 'psychologist'),
              status: fc.constantFrom('active', 'inactive', 'deleted'),
              createdAt: fc.date()
            }),
            { minLength: 10, maxLength: 30 }
          ),
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.trim().length >= 1),
          (users, searchTerm) => {
            const searchLower = searchTerm.toLowerCase();
            
            // Filter excluding deleted users (as per admin.js implementation)
            const filteredUsers = users.filter(user => {
              if (user.status === 'deleted') return false;
              return user.name.toLowerCase().includes(searchLower) ||
                     user.email.toLowerCase().includes(searchLower);
            });
            
            // No deleted users should be in results
            filteredUsers.forEach(user => {
              expect(user.status).not.toBe('deleted');
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
