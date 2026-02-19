# Implementation Plan: Admin & User Management

## Overview

This implementation plan covers the admin dashboard, user management, profile management, and role-based access control features. Tasks are organized to build incrementally, with property-based tests validating correctness at each stage.

## Tasks

- [x] 1. Set up backend infrastructure and data models
  - [x] 1.1 Extend User model with new fields (status, approvalStatus, availability, sessionRates, notifications)
    - Add status enum: active, inactive, deleted
    - Add approvalStatus enum: pending, approved, rejected
    - Add availability array with dayOfWeek, startTime, endTime
    - Add sessionRates object for different session types
    - Add notifications preferences object
    - _Requirements: 3.1, 6.2, 5.2, 13.2, 13.3_

  - [x] 1.2 Create AuditLog model for tracking changes
    - Define schema with userId, action, targetType, targetId, previousValue, newValue, timestamp
    - Add indexes for efficient querying
    - _Requirements: 5.5, 8.6_

  - [x] 1.3 Write property test for psychologist registration creates pending status

    - **Property 6: Psychologist Registration Creates Pending Status**
    - **Validates: Requirements 3.1**

- [x] 2. Implement admin statistics service
  - [x] 2.1 Create stats service with aggregation functions
    - Implement getTotalClients() - count users with role 'client'
    - Implement getTotalPsychologists() - count users with role 'psychologist'
    - Implement getSessionStats() - aggregate sessions by status
    - Implement getPaymentStats() - sum payments and count
    - Implement getPendingApprovals() - count pending psychologists
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Create GET /api/admin/stats endpoint
    - Combine all stats into single response
    - Add caching for performance (60 second TTL)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.3 Write property test for dashboard statistics accuracy

    - **Property 1: Dashboard Statistics Accuracy**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

- [x] 3. Implement user management endpoints
  - [x] 3.1 Create GET /api/admin/users endpoint with pagination and search
    - Support query params: page, limit, search, role, status
    - Implement search across name and email fields
    - Return paginated results with total count
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Write property test for user search returns matching results

    - **Property 2: User Search Returns Matching Results**
    - **Validates: Requirements 2.2**

  - [x] 3.3 Create PUT /api/admin/users/:id/status endpoint
    - Validate status transition (active ↔ inactive)
    - Log status change to audit log
    - _Requirements: 2.4, 2.5_

  - [x] 3.4 Write property test for user deactivation prevents login

    - **Property 3: User Deactivation Prevents Login**
    - **Validates: Requirements 2.4**

  - [x] 3.5 Write property test for user reactivation restores access

    - **Property 4: User Reactivation Restores Access**
    - **Validates: Requirements 2.5**

  - [x] 3.6 Create DELETE /api/admin/users/:id endpoint (soft delete)
    - Implement soft delete with anonymization
    - Replace name with "Deleted User"
    - Replace email with "deleted_{id}@anonymized.local"
    - Clear phone and other PII
    - Set deletedAt and anonymizedAt timestamps
    - _Requirements: 2.6_

  - [x] 3.7 Write property test for user deletion anonymizes data

    - **Property 5: User Deletion Anonymizes Data**
    - **Validates: Requirements 2.6**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement psychologist approval workflow
  - [x] 5.1 Create GET /api/admin/psychologists/pending endpoint
    - Return psychologists with approvalStatus 'pending'
    - Include profile information and credentials
    - _Requirements: 3.2, 3.3_

  - [x] 5.2 Create PUT /api/admin/psychologists/:id/approve endpoint
    - Update approvalStatus to 'approved'
    - Set approvedAt and approvedBy fields
    - Send approval notification email
    - _Requirements: 3.4_

  - [x] 5.3 Create PUT /api/admin/psychologists/:id/reject endpoint
    - Update approvalStatus to 'rejected'
    - Store rejection reason
    - Send rejection notification email with reason
    - _Requirements: 3.5_

  - [x] 5.4 Write property test for psychologist approval enables visibility

    - **Property 7: Psychologist Approval Enables Visibility**
    - **Validates: Requirements 3.4, 3.6**

- [x] 6. Implement profile management endpoints
  - [x] 6.1 Create GET /api/users/profile endpoint
    - Return current user's profile data
    - Exclude sensitive fields (password, tokens)
    - _Requirements: 4.1_

  - [x] 6.2 Create PUT /api/users/profile endpoint
    - Validate and update profile fields (name, phone, bio, specializations)
    - Log changes to audit log
    - _Requirements: 4.2, 4.3, 5.1_

  - [x] 6.3 Create PUT /api/users/profile/picture endpoint
    - Validate file type (jpg, png, gif) and size (max 5MB)
    - Upload to storage and update profilePicture URL
    - _Requirements: 4.4_

  - [x] 6.4 Create PUT /api/users/password endpoint
    - Require current password verification
    - Validate new password strength
    - Hash and update password
    - _Requirements: 4.5_

  - [x] 6.5 Write property test for profile updates persist correctly

    - **Property 8: Profile Updates Persist Correctly**
    - **Validates: Requirements 4.2, 4.3, 5.1, 5.2**

  - [x] 6.6 Write property test for password change requires current password

    - **Property 9: Password Change Requires Current Password**
    - **Validates: Requirements 4.5**

- [x] 7. Implement psychologist session rates
  - [x] 7.1 Create PUT /api/users/rates endpoint
    - Validate rate values (positive numbers)
    - Update sessionRates object
    - Log changes to audit log
    - _Requirements: 5.2_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement availability management
  - [x] 9.1 Create GET /api/users/availability endpoint
    - Return current availability schedule
    - Return blocked dates
    - _Requirements: 6.1_

  - [x] 9.2 Create PUT /api/users/availability endpoint
    - Validate time ranges (startTime < endTime)
    - Check for conflicts with confirmed sessions
    - Update availability array
    - _Requirements: 6.2, 6.4_

  - [x] 9.3 Create POST /api/users/availability/block endpoint
    - Add dates to blockedDates array
    - Check for conflicts with confirmed sessions
    - _Requirements: 6.3_

  - [x] 9.4 Write property test for availability blocking prevents booking

    - **Property 10: Availability Blocking Prevents Booking**
    - **Validates: Requirements 6.3, 6.5**

  - [x] 9.5 Write property test for availability conflicts prevention

    - **Property 11: Availability Conflicts Prevention**
    - **Validates: Requirements 6.4**

- [x] 10. Implement earnings dashboard
  - [x] 10.1 Create GET /api/users/earnings endpoint
    - Calculate total earnings for current month
    - Support date range filtering
    - Return payment details with session info
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 10.2 Create GET /api/users/earnings/export endpoint
    - Generate CSV with payment details
    - Include date, client, amount, transaction ID
    - _Requirements: 7.4_

  - [x] 10.3 Write property test for earnings calculation accuracy

    - **Property 12: Earnings Calculation Accuracy**
    - **Validates: Requirements 7.1, 7.2**

- [x] 11. Implement role-based access control
  - [x] 11.1 Create requireRole middleware
    - Accept array of allowed roles
    - Check user role against allowed roles
    - Return 403 if not authorized
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 11.2 Create requireApproved middleware
    - Check psychologist approval status
    - Return 403 with pending status if not approved
    - _Requirements: 8.4_

  - [x] 11.3 Apply role middleware to all admin routes
    - Protect /api/admin/* with requireRole('admin')
    - _Requirements: 8.1, 8.2_

  - [x] 11.4 Write property test for role-based access control enforcement


    - **Property 13: Role-Based Access Control Enforcement**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement session status management
  - [x] 13.1 Create session status transition validation
    - Define valid transitions: pending → approved, approved → confirmed, etc.
    - Reject invalid transitions
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 13.2 Update session routes to use status validation
    - Apply validation to all status update endpoints
    - Log status changes to audit log
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 13.3 Write property test for session state machine validity

    - **Property 14: Session State Machine Validity**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**

- [x] 14. Implement admin payment overview
  - [x] 14.1 Create GET /api/admin/payments endpoint
    - Return all payments with pagination
    - Support filters: date range, client, therapist, transaction ID
    - Include session and user details
    - _Requirements: 10.1, 10.2_

  - [x] 14.2 Create GET /api/admin/payments/export endpoint
    - Generate CSV for accounting
    - Include all payment details
    - _Requirements: 10.4_

  - [x] 14.3 Write property test for payment search returns matching results


    - **Property 15: Payment Search Returns Matching Results**
    - **Validates: Requirements 10.2**

- [x] 15. Implement frontend Role Guard component
  - [x] 15.1 Create RoleGuard component
    - Check user authentication
    - Check user role against allowed roles
    - Redirect to appropriate dashboard if unauthorized
    - Show pending approval page for pending psychologists
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 15.2 Apply RoleGuard to all protected routes in App.js
    - Wrap admin routes with RoleGuard allowedRoles={['admin']}
    - Wrap psychologist routes with RoleGuard allowedRoles={['psychologist']}
    - Wrap client routes with RoleGuard allowedRoles={['client']}
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 16. Implement Admin Dashboard UI
  - [x] 16.1 Create AdminDashboard statistics cards
    - Display total clients, psychologists, sessions, payments
    - Display pending approvals count with link
    - Auto-refresh every 60 seconds
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 16.2 Create UserManagement component
    - Display users table with search and filters
    - Add activate/deactivate buttons
    - Add delete button with confirmation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 16.3 Create PsychologistApprovals component
    - Display pending psychologists list
    - Show credentials and profile info
    - Add approve/reject buttons with reason input
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [x] 16.4 Create PaymentOverview component
    - Display payments table with filters
    - Add export to CSV button
    - Highlight flagged transactions
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Implement Client Dashboard UI
  - [x] 18.1 Update ClientDashboard with upcoming sessions
    - Display upcoming confirmed sessions
    - Show therapist name and session date
    - Add join call button for video sessions
    - _Requirements: 11.1_

  - [x] 18.2 Add session history section
    - Display past sessions with status
    - Show session notes if available
    - _Requirements: 11.2_

  - [x] 18.3 Add payment reminders
    - Display pending payments prominently
    - Link to payment page
    - _Requirements: 11.3_

- [x] 19. Implement Psychologist Dashboard UI
  - [x] 19.1 Update PsychologistDashboard with today's sessions
    - Display today's sessions prominently
    - Show client name and session time
    - Add join call button
    - _Requirements: 12.1_

  - [x] 19.2 Add pending bookings section
    - Display booking requests awaiting approval
    - Add approve/decline buttons
    - _Requirements: 12.2_

  - [x] 19.3 Create EarningsDashboard component
    - Display monthly earnings total
    - Show payment history with filters
    - Add export to CSV button
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 20. Implement Profile Page UI
  - [x] 20.1 Create ProfilePage component
    - Display current profile information
    - Add edit form for profile fields
    - Add profile picture upload
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 20.2 Create AvailabilityManager component (psychologist only)
    - Display weekly schedule editor
    - Add blocked dates calendar
    - Show conflict warnings
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 20.3 Create SecuritySettings component
    - Add password change form
    - Display active sessions
    - Add logout all devices button
    - Add account deletion request
    - _Requirements: 14.1, 14.2, 14.3, 14.5_

  - [x] 20.4 Create NotificationSettings component
    - Add email/SMS toggles
    - Add quiet hours settings
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 22. Implement admin session booking backend
  - [x] 22.1 Extend Session model with admin booking fields
    - Add createdByAdmin boolean field (default: false)
    - Add adminId reference field
    - Add adminBookingReason string field
    - Add paymentStatus enum field (pending, paid, waived)
    - _Requirements: 15.1, 15.4, 15.7_

  - [x] 22.2 Create POST /api/admin/sessions/book endpoint
    - Accept clientId, psychologistId, dateTime, sessionType, paymentStatus, reason
    - Validate psychologist availability and blocked dates
    - Check for existing bookings at the same time slot
    - Create session with admin booking fields populated
    - Log action to audit trail
    - _Requirements: 15.1, 15.2, 15.3, 15.6_

  - [x] 22.3 Create GET /api/admin/sessions/admin-created endpoint
    - Return sessions where createdByAdmin is true
    - Support pagination and date range filtering
    - Include admin name and booking reason in response
    - _Requirements: 15.7_

  - [x] 22.4 Implement notification service for admin bookings
    - Send email to client about the booking
    - Send email to psychologist about the booking
    - Include admin contact info for questions
    - _Requirements: 15.5_

  - [x] 22.5 Write property test for admin booking creates session with correct parameters

    - **Property 16: Admin Booking Creates Session with Correct Parameters**
    - **Validates: Requirements 15.1, 15.4**

  - [x] 22.6 Write property test for admin booking prevents double-booking


    - **Property 17: Admin Booking Prevents Double-Booking**
    - **Validates: Requirements 15.3**

  - [x] 22.7 Write property test for admin booking creates audit trail


    - **Property 18: Admin Booking Creates Audit Trail**
    - **Validates: Requirements 15.6**

  - [x] 22.8 Write property test for admin-created bookings are identifiable

    - **Property 19: Admin-Created Bookings Are Identifiable**
    - **Validates: Requirements 15.7**

- [x] 23. Implement admin session booking frontend
  - [x] 23.1 Create AdminBookingForm component
    - Client search/selection dropdown
    - Psychologist selection with availability display
    - Date/time picker showing only available slots
    - Session type selection
    - Payment status selection (paid, pending, waived)
    - Reason/notes text field
    - _Requirements: 15.1, 15.2, 15.4_

  - [x] 23.2 Add admin booking section to AdminDashboard
    - Add "Book for Client" button/card
    - Display recent admin-created bookings
    - Show booking success/error feedback
    - _Requirements: 15.1, 15.7_

  - [x] 23.3 Update session listings to show admin-created indicator
    - Add visual indicator for admin-created sessions
    - Show admin name and reason on hover/click
    - _Requirements: 15.7_

- [x] 24. Final checkpoint - Ensure all admin booking tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
