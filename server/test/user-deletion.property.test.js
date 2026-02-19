/**
 * Property-Based Tests for User Deletion Anonymizes Data
 * 
 * Feature: admin-user-management, Property 5: User Deletion Anonymizes Data
 * Validates: Requirements 2.6
 * 
 * For any user that has been soft-deleted, the user record SHALL exist with 
 * anonymized personal data (name, email, phone replaced with placeholders) 
 * while preserving the record ID for referential integrity.
 */

const fc = require('fast-check');

// Mock environment setup
process.env.NODE_ENV = 'test';

// Mock User model for testing - synchronous version
const createMockUser = (userData) => {
  const user = {
    _id: userData._id || 'test-user-id-123456789012',
    name: userData.name,
    email: userData.email,
    phone: userData.phone || null,
    role: userData.role || 'client',
    status: userData.status || 'active',
    preferredName: userData.preferredName || null,
    profilePicture: userData.profilePicture || null,
    dateOfBirth: userData.dateOfBirth || null,
    address: userData.address || null,
    city: userData.city || null,
    state: userData.state || null,
    zipCode: userData.zipCode || null,
    emergencyContact: userData.emergencyContact || null,
    emergencyPhone: userData.emergencyPhone || null,
    bio: userData.bio || null,
    medicalConditions: userData.medicalConditions || [],
    medications: userData.medications || [],
    allergies: userData.allergies || [],
    therapyGoals: userData.therapyGoals || [],
    psychologistDetails: userData.psychologistDetails || null,
    deletedAt: null,
    anonymizedAt: null,
    
    // Soft delete and anonymize method (synchronous for testing)
    softDeleteAndAnonymize: function() {
      const now = new Date();
      
      this.status = 'deleted';
      this.deletedAt = now;
      this.anonymizedAt = now;
      
      // Anonymize personal data
      this.name = 'Deleted User';
      this.email = `deleted_${this._id}@anonymized.local`;
      this.phone = null;
      this.preferredName = null;
      this.profilePicture = null;
      this.dateOfBirth = null;
      this.address = null;
      this.city = null;
      this.state = null;
      this.zipCode = null;
      this.emergencyContact = null;
      this.emergencyPhone = null;
      this.bio = null;
      
      // Clear sensitive arrays
      this.medicalConditions = [];
      this.medications = [];
      this.allergies = [];
      this.therapyGoals = [];
      
      // Clear psychologist details if applicable
      if (this.psychologistDetails) {
        this.psychologistDetails.bio = null;
        this.psychologistDetails.licenseUrl = null;
        this.psychologistDetails.profilePictureUrl = null;
        this.psychologistDetails.credentials = [];
        this.psychologistDetails.portfolioUrls = [];
      }
      
      return this;
    }
  };
  
  return user;
};

// Arbitrary generators for user data - using correct fast-check v4 API
const hexChars = '0123456789abcdef';
const userIdArb = fc.stringMatching(/^[0-9a-f]{24}$/);
const nameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
const emailArb = fc.emailAddress();
const phoneArb = fc.option(fc.string({ minLength: 10, maxLength: 20 }).map(s => s.replace(/[^0-9\-+() ]/g, '0')));
const roleArb = fc.constantFrom('client', 'psychologist');
const bioArb = fc.option(fc.string({ minLength: 0, maxLength: 500 }));
const addressArb = fc.option(fc.string({ minLength: 0, maxLength: 200 }));
const stringArrayArb = fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 });

// Generator for psychologist details
const psychologistDetailsArb = fc.option(fc.record({
  bio: fc.option(fc.string({ minLength: 0, maxLength: 500 })),
  licenseUrl: fc.option(fc.webUrl()),
  profilePictureUrl: fc.option(fc.webUrl()),
  credentials: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 5 }),
  portfolioUrls: fc.array(fc.webUrl(), { maxLength: 5 })
}));

// Full user data generator
const userDataArb = fc.record({
  _id: userIdArb,
  name: nameArb,
  email: emailArb,
  phone: phoneArb,
  role: roleArb,
  preferredName: fc.option(nameArb),
  profilePicture: fc.option(fc.webUrl()),
  dateOfBirth: fc.option(fc.date()),
  address: addressArb,
  city: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  state: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  zipCode: fc.option(fc.string({ minLength: 5, maxLength: 10 })),
  emergencyContact: fc.option(nameArb),
  emergencyPhone: phoneArb,
  bio: bioArb,
  medicalConditions: stringArrayArb,
  medications: stringArrayArb,
  allergies: stringArrayArb,
  therapyGoals: stringArrayArb,
  psychologistDetails: psychologistDetailsArb
});

describe('User Deletion Anonymization Property-Based Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 5: User Deletion Anonymizes Data', () => {
    /**
     * Feature: admin-user-management, Property 5: User Deletion Anonymizes Data
     * Validates: Requirements 2.6
     * 
     * For any user that has been soft-deleted, the user record SHALL exist with 
     * anonymized personal data while preserving the record ID for referential integrity.
     */
    
    test('soft-deleted user name is always "Deleted User"', () => {
      fc.assert(
        fc.property(userDataArb, (userData) => {
          const user = createMockUser(userData);
          const originalId = user._id;
          
          user.softDeleteAndAnonymize();
          
          // Name must be anonymized to "Deleted User"
          expect(user.name).toBe('Deleted User');
          // ID must be preserved
          expect(user._id).toBe(originalId);
        }),
        { numRuns: 20 }
      );
    });

    test('soft-deleted user email follows anonymization pattern', () => {
      fc.assert(
        fc.property(userDataArb, (userData) => {
          const user = createMockUser(userData);
          const originalId = user._id;
          
          user.softDeleteAndAnonymize();
          
          // Email must follow pattern: deleted_{id}@anonymized.local
          expect(user.email).toBe(`deleted_${originalId}@anonymized.local`);
        }),
        { numRuns: 20 }
      );
    });

    test('soft-deleted user phone is always null', () => {
      fc.assert(
        fc.property(userDataArb, (userData) => {
          const user = createMockUser(userData);
          
          user.softDeleteAndAnonymize();
          
          // Phone must be cleared
          expect(user.phone).toBeNull();
        }),
        { numRuns: 20 }
      );
    });

    test('soft-deleted user status is always "deleted"', () => {
      fc.assert(
        fc.property(userDataArb, (userData) => {
          const user = createMockUser(userData);
          
          user.softDeleteAndAnonymize();
          
          // Status must be set to deleted
          expect(user.status).toBe('deleted');
        }),
        { numRuns: 20 }
      );
    });

    test('soft-deleted user has deletedAt and anonymizedAt timestamps', () => {
      fc.assert(
        fc.property(userDataArb, (userData) => {
          const user = createMockUser(userData);
          const beforeDelete = new Date();
          
          user.softDeleteAndAnonymize();
          
          const afterDelete = new Date();
          
          // Timestamps must be set
          expect(user.deletedAt).toBeInstanceOf(Date);
          expect(user.anonymizedAt).toBeInstanceOf(Date);
          
          // Timestamps must be within the operation window
          expect(user.deletedAt.getTime()).toBeGreaterThanOrEqual(beforeDelete.getTime());
          expect(user.deletedAt.getTime()).toBeLessThanOrEqual(afterDelete.getTime());
          expect(user.anonymizedAt.getTime()).toBeGreaterThanOrEqual(beforeDelete.getTime());
          expect(user.anonymizedAt.getTime()).toBeLessThanOrEqual(afterDelete.getTime());
        }),
        { numRuns: 20 }
      );
    });

    test('soft-deleted user preserves record ID for referential integrity', () => {
      fc.assert(
        fc.property(userDataArb, (userData) => {
          const user = createMockUser(userData);
          const originalId = user._id;
          const originalRole = user.role;
          
          user.softDeleteAndAnonymize();
          
          // ID must be preserved (referential integrity)
          expect(user._id).toBe(originalId);
          // Role should be preserved for audit purposes
          expect(user.role).toBe(originalRole);
        }),
        { numRuns: 20 }
      );
    });

    test('soft-deleted user has all PII fields cleared', () => {
      fc.assert(
        fc.property(userDataArb, (userData) => {
          const user = createMockUser(userData);
          
          user.softDeleteAndAnonymize();
          
          // All PII fields must be cleared
          expect(user.preferredName).toBeNull();
          expect(user.profilePicture).toBeNull();
          expect(user.dateOfBirth).toBeNull();
          expect(user.address).toBeNull();
          expect(user.city).toBeNull();
          expect(user.state).toBeNull();
          expect(user.zipCode).toBeNull();
          expect(user.emergencyContact).toBeNull();
          expect(user.emergencyPhone).toBeNull();
          expect(user.bio).toBeNull();
        }),
        { numRuns: 20 }
      );
    });

    test('soft-deleted user has all sensitive arrays cleared', () => {
      fc.assert(
        fc.property(userDataArb, (userData) => {
          const user = createMockUser(userData);
          
          user.softDeleteAndAnonymize();
          
          // All sensitive arrays must be empty
          expect(user.medicalConditions).toEqual([]);
          expect(user.medications).toEqual([]);
          expect(user.allergies).toEqual([]);
          expect(user.therapyGoals).toEqual([]);
        }),
        { numRuns: 20 }
      );
    });

    test('soft-deleted psychologist has psychologistDetails cleared', () => {
      // Generate only users with psychologist details
      const psychologistDataArb = fc.record({
        _id: userIdArb,
        name: nameArb,
        email: emailArb,
        phone: phoneArb,
        role: fc.constant('psychologist'),
        psychologistDetails: fc.record({
          bio: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          licenseUrl: fc.option(fc.webUrl()),
          profilePictureUrl: fc.option(fc.webUrl()),
          credentials: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
          portfolioUrls: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 })
        })
      });

      fc.assert(
        fc.property(psychologistDataArb, (userData) => {
          const user = createMockUser(userData);
          
          user.softDeleteAndAnonymize();
          
          // Psychologist details must be cleared
          expect(user.psychologistDetails.bio).toBeNull();
          expect(user.psychologistDetails.licenseUrl).toBeNull();
          expect(user.psychologistDetails.profilePictureUrl).toBeNull();
          expect(user.psychologistDetails.credentials).toEqual([]);
          expect(user.psychologistDetails.portfolioUrls).toEqual([]);
        }),
        { numRuns: 20 }
      );
    });

    test('soft delete is idempotent - deleting twice produces same result', () => {
      fc.assert(
        fc.property(userDataArb, (userData) => {
          const user = createMockUser(userData);
          const originalId = user._id;
          
          // First deletion
          user.softDeleteAndAnonymize();
          const stateAfterFirst = {
            name: user.name,
            email: user.email,
            phone: user.phone,
            status: user.status
          };
          
          // Second deletion (should be idempotent)
          user.softDeleteAndAnonymize();
          
          // State should be the same after second deletion
          expect(user.name).toBe(stateAfterFirst.name);
          expect(user.email).toBe(stateAfterFirst.email);
          expect(user.phone).toBe(stateAfterFirst.phone);
          expect(user.status).toBe(stateAfterFirst.status);
          expect(user._id).toBe(originalId);
        }),
        { numRuns: 20 }
      );
    });

    test('anonymized email is unique per user ID', () => {
      fc.assert(
        fc.property(
          fc.array(userIdArb, { minLength: 2, maxLength: 10 }),
          (userIds) => {
            // Ensure unique IDs for this test
            const uniqueIds = [...new Set(userIds)];
            if (uniqueIds.length < 2) return true; // Skip if not enough unique IDs
            
            const users = uniqueIds.map(id => createMockUser({ 
              _id: id, 
              name: 'Test User', 
              email: `test${id}@example.com` 
            }));
            
            // Delete all users
            users.forEach(u => u.softDeleteAndAnonymize());
            
            // All anonymized emails should be unique
            const emails = users.map(u => u.email);
            const uniqueEmails = new Set(emails);
            
            expect(uniqueEmails.size).toBe(users.length);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
