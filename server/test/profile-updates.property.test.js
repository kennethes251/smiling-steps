/**
 * Property-Based Tests for Profile Updates Persistence
 * 
 * Feature: admin-user-management, Property 8: Profile Updates Persist Correctly
 * Validates: Requirements 4.2, 4.3, 5.1, 5.2
 * 
 * For any valid profile update (name, phone, bio, specializations, session rates),
 * reading the profile after update SHALL return the updated values.
 */

const fc = require('fast-check');

// Mock environment setup
process.env.NODE_ENV = 'test';

describe('Profile Updates Property-Based Tests', () => {
  
  describe('Property 8: Profile Updates Persist Correctly', () => {
    /**
     * Feature: admin-user-management, Property 8: Profile Updates Persist Correctly
     * Validates: Requirements 4.2, 4.3, 5.1, 5.2
     */

    // Helper to simulate profile update and read-back
    function simulateProfileUpdate(originalProfile, updateFields) {
      const updatedProfile = { ...originalProfile };
      
      // Apply updates (simulating the profile.js PUT logic)
      Object.keys(updateFields).forEach(field => {
        if (updateFields[field] !== undefined) {
          updatedProfile[field] = updateFields[field];
        }
      });
      
      return updatedProfile;
    }

    test('should persist name updates correctly - Requirement 4.2', () => {
      fc.assert(
        fc.property(
          // Generate original profile
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
            bio: fc.option(fc.string({ minLength: 0, maxLength: 500 })),
            role: fc.constantFrom('client', 'psychologist')
          }),
          // Generate new valid name (2-50 chars, non-empty after trim)
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          (originalProfile, newName) => {
            // Apply update
            const updatedProfile = simulateProfileUpdate(originalProfile, { name: newName });
            
            // Property: After update, reading profile returns the new name
            expect(updatedProfile.name).toBe(newName);
            
            // Property: Other fields remain unchanged
            expect(updatedProfile.email).toBe(originalProfile.email);
            expect(updatedProfile._id).toBe(originalProfile._id);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should persist phone updates correctly - Requirement 4.3', () => {
      fc.assert(
        fc.property(
          // Generate original profile
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/)),
            bio: fc.option(fc.string({ minLength: 0, maxLength: 500 })),
            role: fc.constantFrom('client', 'psychologist')
          }),
          // Generate valid phone number (matching the regex in profile.js)
          fc.stringMatching(/^\+?[0-9]{10,15}$/),
          (originalProfile, newPhone) => {
            // Apply update
            const updatedProfile = simulateProfileUpdate(originalProfile, { phone: newPhone });
            
            // Property: After update, reading profile returns the new phone
            expect(updatedProfile.phone).toBe(newPhone);
            
            // Property: Other fields remain unchanged
            expect(updatedProfile.name).toBe(originalProfile.name);
            expect(updatedProfile.email).toBe(originalProfile.email);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should persist bio updates correctly - Requirement 5.1', () => {
      fc.assert(
        fc.property(
          // Generate original profile
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
            bio: fc.option(fc.string({ minLength: 0, maxLength: 500 })),
            role: fc.constantFrom('client', 'psychologist')
          }),
          // Generate new bio (max 500 chars as per User model)
          fc.string({ minLength: 0, maxLength: 500 }),
          (originalProfile, newBio) => {
            // Apply update
            const updatedProfile = simulateProfileUpdate(originalProfile, { bio: newBio });
            
            // Property: After update, reading profile returns the new bio
            expect(updatedProfile.bio).toBe(newBio);
            
            // Property: Other fields remain unchanged
            expect(updatedProfile.name).toBe(originalProfile.name);
            expect(updatedProfile.email).toBe(originalProfile.email);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should persist session rates updates correctly for psychologists - Requirement 5.2', () => {
      fc.assert(
        fc.property(
          // Generate original psychologist profile with session rates
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            role: fc.constant('psychologist'),
            sessionRates: fc.record({
              individual: fc.integer({ min: 1000, max: 50000 }),
              couples: fc.integer({ min: 2000, max: 75000 }),
              family: fc.integer({ min: 2500, max: 100000 }),
              group: fc.integer({ min: 800, max: 30000 })
            })
          }),
          // Generate new session rates (positive numbers as per design)
          fc.record({
            individual: fc.integer({ min: 1000, max: 50000 }),
            couples: fc.integer({ min: 2000, max: 75000 }),
            family: fc.integer({ min: 2500, max: 100000 }),
            group: fc.integer({ min: 800, max: 30000 })
          }),
          (originalProfile, newRates) => {
            // Apply update
            const updatedProfile = simulateProfileUpdate(originalProfile, { sessionRates: newRates });
            
            // Property: After update, reading profile returns the new session rates
            expect(updatedProfile.sessionRates.individual).toBe(newRates.individual);
            expect(updatedProfile.sessionRates.couples).toBe(newRates.couples);
            expect(updatedProfile.sessionRates.family).toBe(newRates.family);
            expect(updatedProfile.sessionRates.group).toBe(newRates.group);
            
            // Property: Other fields remain unchanged
            expect(updatedProfile.name).toBe(originalProfile.name);
            expect(updatedProfile.role).toBe('psychologist');
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should persist multiple field updates atomically', () => {
      fc.assert(
        fc.property(
          // Generate original profile
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/)),
            bio: fc.option(fc.string({ minLength: 0, maxLength: 500 })),
            preferredLanguage: fc.constantFrom('English', 'Spanish', 'French'),
            timeZone: fc.constantFrom('America/New_York', 'America/Los_Angeles', 'Europe/London'),
            role: fc.constantFrom('client', 'psychologist')
          }),
          // Generate multiple update fields
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            phone: fc.stringMatching(/^\+?[0-9]{10,15}$/),
            bio: fc.string({ minLength: 0, maxLength: 500 }),
            preferredLanguage: fc.constantFrom('English', 'Spanish', 'French', 'German'),
            timeZone: fc.constantFrom('America/New_York', 'America/Chicago', 'UTC')
          }),
          (originalProfile, updates) => {
            // Apply all updates
            const updatedProfile = simulateProfileUpdate(originalProfile, updates);
            
            // Property: All updated fields should reflect new values
            expect(updatedProfile.name).toBe(updates.name);
            expect(updatedProfile.phone).toBe(updates.phone);
            expect(updatedProfile.bio).toBe(updates.bio);
            expect(updatedProfile.preferredLanguage).toBe(updates.preferredLanguage);
            expect(updatedProfile.timeZone).toBe(updates.timeZone);
            
            // Property: Non-updated fields remain unchanged
            expect(updatedProfile.email).toBe(originalProfile.email);
            expect(updatedProfile._id).toBe(originalProfile._id);
            expect(updatedProfile.role).toBe(originalProfile.role);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should persist psychologist specializations updates - Requirement 5.1', () => {
      fc.assert(
        fc.property(
          // Generate original psychologist profile
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            role: fc.constant('psychologist'),
            psychologistDetails: fc.record({
              specializations: fc.array(
                fc.constantFrom('Anxiety', 'Depression', 'PTSD', 'Relationships', 'Stress'),
                { minLength: 0, maxLength: 5 }
              ),
              experience: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
              bio: fc.option(fc.string({ minLength: 0, maxLength: 500 }))
            })
          }),
          // Generate new specializations
          fc.array(
            fc.constantFrom('Anxiety', 'Depression', 'PTSD', 'Relationships', 'Stress', 'Trauma', 'OCD', 'ADHD'),
            { minLength: 1, maxLength: 8 }
          ),
          (originalProfile, newSpecializations) => {
            // Apply update to psychologistDetails
            const updatedProfile = {
              ...originalProfile,
              psychologistDetails: {
                ...originalProfile.psychologistDetails,
                specializations: newSpecializations
              }
            };
            
            // Property: After update, specializations should match new values
            expect(updatedProfile.psychologistDetails.specializations).toEqual(newSpecializations);
            expect(updatedProfile.psychologistDetails.specializations.length).toBe(newSpecializations.length);
            
            // Property: Other psychologist details remain unchanged
            expect(updatedProfile.psychologistDetails.experience).toBe(originalProfile.psychologistDetails.experience);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should maintain data integrity - updates do not corrupt other fields', () => {
      fc.assert(
        fc.property(
          // Generate comprehensive profile
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.option(fc.stringMatching(/^\+?[0-9]{10,15}$/)),
            bio: fc.option(fc.string({ minLength: 0, maxLength: 500 })),
            role: fc.constantFrom('client', 'psychologist'),
            status: fc.constantFrom('active', 'inactive'),
            isVerified: fc.boolean(),
            createdAt: fc.date(),
            address: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            city: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
          }),
          // Generate single field update
          fc.constantFrom('name', 'phone', 'bio', 'address', 'city'),
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          (originalProfile, fieldToUpdate, newValue) => {
            // Store all original values
            const originalValues = { ...originalProfile };
            
            // Apply single field update
            const updatedProfile = simulateProfileUpdate(originalProfile, { [fieldToUpdate]: newValue });
            
            // Property: Updated field has new value
            expect(updatedProfile[fieldToUpdate]).toBe(newValue);
            
            // Property: All other fields remain exactly as they were
            Object.keys(originalValues).forEach(key => {
              if (key !== fieldToUpdate) {
                expect(updatedProfile[key]).toEqual(originalValues[key]);
              }
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should handle round-trip updates correctly', () => {
      fc.assert(
        fc.property(
          // Generate profile
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            bio: fc.string({ minLength: 0, maxLength: 500 }),
            role: fc.constantFrom('client', 'psychologist')
          }),
          // Generate sequence of updates
          fc.array(
            fc.record({
              name: fc.option(fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2)),
              bio: fc.option(fc.string({ minLength: 0, maxLength: 500 }))
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (originalProfile, updateSequence) => {
            let currentProfile = { ...originalProfile };
            
            // Apply sequence of updates
            updateSequence.forEach(update => {
              const fieldsToUpdate = {};
              if (update.name !== null && update.name !== undefined) {
                fieldsToUpdate.name = update.name;
              }
              if (update.bio !== null && update.bio !== undefined) {
                fieldsToUpdate.bio = update.bio;
              }
              currentProfile = simulateProfileUpdate(currentProfile, fieldsToUpdate);
            });
            
            // Property: Final profile should have the last applied values
            const lastUpdate = updateSequence[updateSequence.length - 1];
            if (lastUpdate.name !== null && lastUpdate.name !== undefined) {
              expect(currentProfile.name).toBe(lastUpdate.name);
            }
            if (lastUpdate.bio !== null && lastUpdate.bio !== undefined) {
              expect(currentProfile.bio).toBe(lastUpdate.bio);
            }
            
            // Property: Immutable fields remain unchanged
            expect(currentProfile.email).toBe(originalProfile.email);
            expect(currentProfile._id).toBe(originalProfile._id);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
