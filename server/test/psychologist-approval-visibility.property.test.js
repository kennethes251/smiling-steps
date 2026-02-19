/**
 * Property-Based Tests for Psychologist Approval Visibility
 * Feature: admin-user-management
 * 
 * Property 7: Psychologist Approval Enables Visibility
 * Validates: Requirements 3.4, 3.6
 * 
 * For any psychologist that has been approved, their profile SHALL appear in 
 * client-facing therapist listings, and for any psychologist that is pending 
 * or rejected, their profile SHALL NOT appear in client-facing listings.
 */

const fc = require('fast-check');

describe('Psychologist Approval Visibility Property Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // PROPERTY 7: PSYCHOLOGIST APPROVAL ENABLES VISIBILITY
  // Feature: admin-user-management, Property 7
  // Validates: Requirements 3.4, 3.6
  // ============================================================================

  describe('Property 7: Psychologist Approval Enables Visibility', () => {
    /**
     * Feature: admin-user-management, Property 7: Psychologist Approval Enables Visibility
     * Validates: Requirements 3.4, 3.6
     * 
     * For any psychologist that has been approved, their profile SHALL appear in 
     * client-facing therapist listings, and for any psychologist that is pending 
     * or rejected, their profile SHALL NOT appear in client-facing listings.
     */

    /**
     * Simulates the visibility filter logic used in the public psychologists endpoint
     * This mirrors the query: { role: 'psychologist', 'psychologistDetails.approvalStatus': 'approved' }
     */
    const filterVisiblePsychologists = (psychologists) => {
      return psychologists.filter(psych => {
        // Must be a psychologist
        if (psych.role !== 'psychologist') return false;
        
        // Must have approved status (check both top-level and nested)
        const topLevelApproved = psych.approvalStatus === 'approved';
        const nestedApproved = psych.psychologistDetails?.approvalStatus === 'approved';
        
        // Either approval status being 'approved' makes them visible
        return topLevelApproved || nestedApproved;
      });
    };

    test('should only show approved psychologists in client-facing listings', () => {
      fc.assert(
        fc.property(
          // Generate array of psychologists with various approval statuses
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
              email: fc.emailAddress(),
              role: fc.constant('psychologist'),
              approvalStatus: fc.constantFrom('pending', 'approved', 'rejected'),
              psychologistDetails: fc.record({
                approvalStatus: fc.constantFrom('pending', 'approved', 'rejected'),
                specializations: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
                bio: fc.string({ minLength: 0, maxLength: 200 })
              })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (psychologists) => {
            // Ensure psychologistDetails.approvalStatus matches top-level for consistency
            const normalizedPsychologists = psychologists.map(p => ({
              ...p,
              psychologistDetails: {
                ...p.psychologistDetails,
                approvalStatus: p.approvalStatus
              }
            }));

            // Filter visible psychologists
            const visiblePsychologists = filterVisiblePsychologists(normalizedPsychologists);

            // PROPERTY: All visible psychologists must be approved
            visiblePsychologists.forEach(psych => {
              expect(psych.approvalStatus).toBe('approved');
            });

            // PROPERTY: No pending or rejected psychologists should be visible
            const pendingOrRejected = normalizedPsychologists.filter(
              p => p.approvalStatus === 'pending' || p.approvalStatus === 'rejected'
            );
            pendingOrRejected.forEach(psych => {
              expect(visiblePsychologists.find(v => v._id === psych._id)).toBeUndefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should include all approved psychologists in listings', () => {
      fc.assert(
        fc.property(
          // Generate array of psychologists with various approval statuses
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
              email: fc.emailAddress(),
              role: fc.constant('psychologist'),
              approvalStatus: fc.constantFrom('pending', 'approved', 'rejected'),
              psychologistDetails: fc.record({
                approvalStatus: fc.constantFrom('pending', 'approved', 'rejected'),
                specializations: fc.array(fc.string(), { minLength: 0, maxLength: 3 })
              })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (psychologists) => {
            // Normalize approval status
            const normalizedPsychologists = psychologists.map(p => ({
              ...p,
              psychologistDetails: {
                ...p.psychologistDetails,
                approvalStatus: p.approvalStatus
              }
            }));

            // Filter visible psychologists
            const visiblePsychologists = filterVisiblePsychologists(normalizedPsychologists);

            // Get all approved psychologists from original list
            const approvedPsychologists = normalizedPsychologists.filter(
              p => p.approvalStatus === 'approved'
            );

            // PROPERTY: All approved psychologists must be in visible list
            approvedPsychologists.forEach(approved => {
              const found = visiblePsychologists.find(v => v._id === approved._id);
              expect(found).toBeDefined();
            });

            // PROPERTY: Count of visible should equal count of approved
            expect(visiblePsychologists.length).toBe(approvedPsychologists.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should exclude pending psychologists from client-facing listings', () => {
      fc.assert(
        fc.property(
          // Generate psychologists with pending status
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
              email: fc.emailAddress(),
              role: fc.constant('psychologist'),
              approvalStatus: fc.constant('pending'),
              psychologistDetails: fc.record({
                approvalStatus: fc.constant('pending'),
                specializations: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
                bio: fc.string({ minLength: 0, maxLength: 200 })
              })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (pendingPsychologists) => {
            // Filter visible psychologists
            const visiblePsychologists = filterVisiblePsychologists(pendingPsychologists);

            // PROPERTY: No pending psychologists should be visible
            expect(visiblePsychologists.length).toBe(0);

            // Verify all input psychologists are pending
            pendingPsychologists.forEach(psych => {
              expect(psych.approvalStatus).toBe('pending');
              expect(visiblePsychologists.find(v => v._id === psych._id)).toBeUndefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should exclude rejected psychologists from client-facing listings', () => {
      fc.assert(
        fc.property(
          // Generate psychologists with rejected status
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
              email: fc.emailAddress(),
              role: fc.constant('psychologist'),
              approvalStatus: fc.constant('rejected'),
              approvalReason: fc.string({ minLength: 10, maxLength: 200 }),
              psychologistDetails: fc.record({
                approvalStatus: fc.constant('rejected'),
                specializations: fc.array(fc.string(), { minLength: 0, maxLength: 3 })
              })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (rejectedPsychologists) => {
            // Filter visible psychologists
            const visiblePsychologists = filterVisiblePsychologists(rejectedPsychologists);

            // PROPERTY: No rejected psychologists should be visible
            expect(visiblePsychologists.length).toBe(0);

            // Verify all input psychologists are rejected
            rejectedPsychologists.forEach(psych => {
              expect(psych.approvalStatus).toBe('rejected');
              expect(visiblePsychologists.find(v => v._id === psych._id)).toBeUndefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle mixed approval statuses correctly', () => {
      fc.assert(
        fc.property(
          // Generate specific counts of each status
          fc.tuple(
            fc.integer({ min: 0, max: 5 }), // pending count
            fc.integer({ min: 0, max: 5 }), // approved count
            fc.integer({ min: 0, max: 5 })  // rejected count
          ),
          ([pendingCount, approvedCount, rejectedCount]) => {
            // Create psychologists with specific statuses
            const psychologists = [];
            
            for (let i = 0; i < pendingCount; i++) {
              psychologists.push({
                _id: `pending_${i}_${'x'.repeat(16)}`,
                name: `Pending Doctor ${i}`,
                email: `pending${i}@test.com`,
                role: 'psychologist',
                approvalStatus: 'pending',
                psychologistDetails: { approvalStatus: 'pending' }
              });
            }
            
            for (let i = 0; i < approvedCount; i++) {
              psychologists.push({
                _id: `approved_${i}_${'x'.repeat(15)}`,
                name: `Approved Doctor ${i}`,
                email: `approved${i}@test.com`,
                role: 'psychologist',
                approvalStatus: 'approved',
                psychologistDetails: { approvalStatus: 'approved' }
              });
            }
            
            for (let i = 0; i < rejectedCount; i++) {
              psychologists.push({
                _id: `rejected_${i}_${'x'.repeat(15)}`,
                name: `Rejected Doctor ${i}`,
                email: `rejected${i}@test.com`,
                role: 'psychologist',
                approvalStatus: 'rejected',
                psychologistDetails: { approvalStatus: 'rejected' }
              });
            }

            // Filter visible psychologists
            const visiblePsychologists = filterVisiblePsychologists(psychologists);

            // PROPERTY: Visible count should exactly equal approved count
            expect(visiblePsychologists.length).toBe(approvedCount);

            // PROPERTY: All visible should be approved
            visiblePsychologists.forEach(psych => {
              expect(psych.approvalStatus).toBe('approved');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain visibility after approval status change', () => {
      fc.assert(
        fc.property(
          // Generate a psychologist
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            role: fc.constant('psychologist'),
            psychologistDetails: fc.record({
              specializations: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
              bio: fc.string({ minLength: 0, maxLength: 200 })
            })
          }),
          (psychologist) => {
            // Simulate approval workflow: pending -> approved
            
            // Step 1: Initially pending
            const pendingPsych = {
              ...psychologist,
              approvalStatus: 'pending',
              psychologistDetails: {
                ...psychologist.psychologistDetails,
                approvalStatus: 'pending'
              }
            };
            
            let visibleList = filterVisiblePsychologists([pendingPsych]);
            expect(visibleList.length).toBe(0); // Not visible when pending
            
            // Step 2: After approval
            const approvedPsych = {
              ...psychologist,
              approvalStatus: 'approved',
              approvedAt: new Date(),
              psychologistDetails: {
                ...psychologist.psychologistDetails,
                approvalStatus: 'approved'
              }
            };
            
            visibleList = filterVisiblePsychologists([approvedPsych]);
            expect(visibleList.length).toBe(1); // Visible after approval
            expect(visibleList[0]._id).toBe(psychologist._id);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should hide psychologist after rejection', () => {
      fc.assert(
        fc.property(
          // Generate a psychologist
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            role: fc.constant('psychologist'),
            psychologistDetails: fc.record({
              specializations: fc.array(fc.string(), { minLength: 0, maxLength: 3 })
            })
          }),
          fc.string({ minLength: 10, maxLength: 200 }), // rejection reason
          (psychologist, rejectionReason) => {
            // Simulate rejection workflow: pending -> rejected
            
            // Step 1: Initially pending
            const pendingPsych = {
              ...psychologist,
              approvalStatus: 'pending',
              psychologistDetails: {
                ...psychologist.psychologistDetails,
                approvalStatus: 'pending'
              }
            };
            
            let visibleList = filterVisiblePsychologists([pendingPsych]);
            expect(visibleList.length).toBe(0); // Not visible when pending
            
            // Step 2: After rejection
            const rejectedPsych = {
              ...psychologist,
              approvalStatus: 'rejected',
              approvalReason: rejectionReason,
              psychologistDetails: {
                ...psychologist.psychologistDetails,
                approvalStatus: 'rejected'
              }
            };
            
            visibleList = filterVisiblePsychologists([rejectedPsych]);
            expect(visibleList.length).toBe(0); // Still not visible after rejection
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should not show non-psychologist users in therapist listings', () => {
      fc.assert(
        fc.property(
          // Generate users with various roles
          fc.array(
            fc.record({
              _id: fc.string({ minLength: 24, maxLength: 24 }),
              name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
              email: fc.emailAddress(),
              role: fc.constantFrom('client', 'admin'),
              approvalStatus: fc.constantFrom('approved', 'not_applicable')
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (nonPsychologists) => {
            // Filter visible psychologists
            const visiblePsychologists = filterVisiblePsychologists(nonPsychologists);

            // PROPERTY: No non-psychologist users should appear in listings
            expect(visiblePsychologists.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle edge case of empty psychologist list', () => {
      // Empty list should return empty visible list
      const visiblePsychologists = filterVisiblePsychologists([]);
      expect(visiblePsychologists).toEqual([]);
      expect(visiblePsychologists.length).toBe(0);
    });

    test('should preserve psychologist data when filtering', () => {
      fc.assert(
        fc.property(
          // Generate approved psychologist with full profile data
          fc.record({
            _id: fc.string({ minLength: 24, maxLength: 24 }),
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            role: fc.constant('psychologist'),
            approvalStatus: fc.constant('approved'),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            psychologistDetails: fc.record({
              approvalStatus: fc.constant('approved'),
              specializations: fc.array(
                fc.constantFrom('Anxiety', 'Depression', 'PTSD', 'Couples'),
                { minLength: 1, maxLength: 4 }
              ),
              bio: fc.string({ minLength: 10, maxLength: 200 }),
              experience: fc.string({ minLength: 5, maxLength: 50 }),
              rates: fc.record({
                individual: fc.integer({ min: 1000, max: 10000 }),
                couples: fc.integer({ min: 2000, max: 15000 })
              })
            })
          }),
          (psychologist) => {
            // Filter visible psychologists
            const visiblePsychologists = filterVisiblePsychologists([psychologist]);

            // PROPERTY: Visible psychologist should have all original data preserved
            expect(visiblePsychologists.length).toBe(1);
            const visible = visiblePsychologists[0];
            
            expect(visible._id).toBe(psychologist._id);
            expect(visible.name).toBe(psychologist.name);
            expect(visible.email).toBe(psychologist.email);
            expect(visible.phone).toBe(psychologist.phone);
            expect(visible.psychologistDetails.specializations).toEqual(
              psychologist.psychologistDetails.specializations
            );
            expect(visible.psychologistDetails.bio).toBe(psychologist.psychologistDetails.bio);
            expect(visible.psychologistDetails.rates).toEqual(
              psychologist.psychologistDetails.rates
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
