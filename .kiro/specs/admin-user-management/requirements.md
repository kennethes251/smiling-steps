# Requirements Document

## Introduction

This specification defines the admin dashboard, user management, profile management, and role-based access control features for the Smiling Steps teletherapy platform. These features complete the MVP by providing administrators with tools to manage users, approve psychologists, view statistics, and ensure proper access control across the platform.

## Glossary

- **Admin_Dashboard**: The administrative interface for platform management and statistics
- **User_Management_System**: The component handling user CRUD operations and status management
- **Profile_System**: The component managing user profile data and preferences
- **Role_Guard**: Frontend middleware that restricts route access based on user roles
- **Psychologist_Approval_Workflow**: The process for reviewing and approving therapist applications
- **Earnings_Dashboard**: The therapist interface for viewing payment history and earnings
- **Availability_Manager**: The component handling therapist schedule management
- **Client**: A user with role 'client' seeking therapy services
- **Psychologist**: A user with role 'psychologist' providing therapy services
- **Admin**: A user with role 'admin' managing the platform
- **Admin_Booking_System**: The component allowing admins to create session bookings on behalf of clients

## Requirements

### Requirement 1: Admin Dashboard Statistics

**User Story:** As an admin, I want to view platform statistics on my dashboard, so that I can monitor platform health and growth.

#### Acceptance Criteria

1. WHEN an admin accesses the dashboard, THE Admin_Dashboard SHALL display total registered clients count
2. WHEN an admin accesses the dashboard, THE Admin_Dashboard SHALL display total registered psychologists count
3. WHEN an admin accesses the dashboard, THE Admin_Dashboard SHALL display total sessions count with breakdown by status
4. WHEN an admin accesses the dashboard, THE Admin_Dashboard SHALL display total payments received with amount summary
5. WHEN an admin accesses the dashboard, THE Admin_Dashboard SHALL display pending psychologist approvals count
6. WHEN statistics are displayed, THE Admin_Dashboard SHALL refresh data every 60 seconds automatically

### Requirement 2: Admin User Management

**User Story:** As an admin, I want to view and manage all platform users, so that I can maintain platform integrity and handle user issues.

#### Acceptance Criteria

1. WHEN an admin views the users list, THE User_Management_System SHALL display all users with name, email, role, status, and registration date
2. WHEN an admin searches users, THE User_Management_System SHALL filter results by name, email, or role
3. WHEN an admin views user details, THE User_Management_System SHALL display complete profile information and activity history
4. WHEN an admin deactivates a user, THE User_Management_System SHALL set the account status to inactive and prevent login
5. WHEN an admin reactivates a user, THE User_Management_System SHALL restore account access
6. WHEN an admin deletes a user, THE User_Management_System SHALL soft-delete the account and anonymize personal data

### Requirement 3: Psychologist Approval Workflow

**User Story:** As an admin, I want to review and approve psychologist registrations, so that only qualified professionals can provide services.

#### Acceptance Criteria

1. WHEN a psychologist registers, THE Psychologist_Approval_Workflow SHALL create an account with status "pending_approval"
2. WHEN an admin views pending approvals, THE Admin_Dashboard SHALL display a list of psychologists awaiting approval
3. WHEN an admin reviews a psychologist, THE Admin_Dashboard SHALL display submitted credentials, qualifications, and profile information
4. WHEN an admin approves a psychologist, THE Psychologist_Approval_Workflow SHALL update status to "approved" and send notification email
5. WHEN an admin rejects a psychologist, THE Psychologist_Approval_Workflow SHALL update status to "rejected" and send notification with reason
6. WHEN a psychologist is approved, THE Psychologist_Approval_Workflow SHALL enable their profile visibility to clients

### Requirement 4: User Profile Management

**User Story:** As a user, I want to manage my profile information, so that I can keep my details up to date.

#### Acceptance Criteria

1. WHEN a user accesses their profile page, THE Profile_System SHALL display current profile information
2. WHEN a user updates their name, THE Profile_System SHALL validate and save the changes
3. WHEN a user updates their phone number, THE Profile_System SHALL validate the format and save
4. WHEN a user uploads a profile picture, THE Profile_System SHALL validate file type and size, then save
5. WHEN a user changes their password, THE Profile_System SHALL require current password verification
6. WHEN profile changes are saved, THE Profile_System SHALL display a success confirmation

### Requirement 5: Psychologist Profile Enhancement

**User Story:** As a psychologist, I want to manage my professional profile, so that clients can learn about my qualifications and services.

#### Acceptance Criteria

1. WHEN a psychologist edits their profile, THE Profile_System SHALL allow updating specializations, bio, and experience
2. WHEN a psychologist sets session rates, THE Profile_System SHALL store rates for different session types
3. WHEN a psychologist uploads credentials, THE Profile_System SHALL securely store license and certification documents
4. WHEN a psychologist profile is viewed by clients, THE Profile_System SHALL display approved information only
5. WHEN a psychologist updates their profile, THE Profile_System SHALL log the changes for audit purposes

### Requirement 6: Therapist Availability Management

**User Story:** As a psychologist, I want to manage my availability schedule, so that clients can only book during my available times.

#### Acceptance Criteria

1. WHEN a psychologist accesses availability settings, THE Availability_Manager SHALL display current schedule
2. WHEN a psychologist sets weekly recurring availability, THE Availability_Manager SHALL store day and time ranges
3. WHEN a psychologist blocks specific dates, THE Availability_Manager SHALL mark those dates as unavailable
4. WHEN a psychologist updates availability, THE Availability_Manager SHALL prevent conflicts with existing confirmed sessions
5. WHEN clients view booking options, THE Availability_Manager SHALL only show available time slots
6. WHEN availability changes affect pending bookings, THE Availability_Manager SHALL notify affected clients

### Requirement 7: Therapist Earnings Dashboard

**User Story:** As a psychologist, I want to view my earnings and payment history, so that I can track my income from the platform.

#### Acceptance Criteria

1. WHEN a psychologist accesses their earnings dashboard, THE Earnings_Dashboard SHALL display total earnings for current month
2. WHEN a psychologist views earnings history, THE Earnings_Dashboard SHALL display payments by date range
3. WHEN a psychologist views payment details, THE Earnings_Dashboard SHALL show session date, client name, amount, and M-Pesa transaction ID
4. WHEN a psychologist exports earnings, THE Earnings_Dashboard SHALL generate a CSV report
5. WHEN earnings are displayed, THE Earnings_Dashboard SHALL show pending payments separately from confirmed payments

### Requirement 8: Role-Based Frontend Route Guards

**User Story:** As a platform user, I want to access only the features appropriate for my role, so that the interface is relevant and secure.

#### Acceptance Criteria

1. WHEN a client attempts to access admin routes, THE Role_Guard SHALL redirect to the client dashboard
2. WHEN a psychologist attempts to access admin routes, THE Role_Guard SHALL redirect to the psychologist dashboard
3. WHEN an unauthenticated user attempts to access protected routes, THE Role_Guard SHALL redirect to the login page
4. WHEN a pending psychologist attempts to access active features, THE Role_Guard SHALL display approval pending message
5. WHEN a user logs in, THE Role_Guard SHALL redirect to the appropriate dashboard based on role
6. WHEN role verification fails, THE Role_Guard SHALL log the attempt and display an error message

### Requirement 9: Session Status Management

**User Story:** As a platform user, I want clear session status indicators, so that I understand the current state of my bookings.

#### Acceptance Criteria

1. WHEN a session is created, THE Session_System SHALL set status to "pending"
2. WHEN a therapist approves a session, THE Session_System SHALL update status to "approved"
3. WHEN payment is confirmed, THE Session_System SHALL update status to "confirmed"
4. WHEN a session starts, THE Session_System SHALL update status to "in_progress"
5. WHEN a session ends, THE Session_System SHALL update status to "completed"
6. WHEN a session is cancelled, THE Session_System SHALL update status to "cancelled" with reason

### Requirement 10: Admin Payment Overview

**User Story:** As an admin, I want to view all platform payments, so that I can monitor financial activity and resolve issues.

#### Acceptance Criteria

1. WHEN an admin views payments, THE Admin_Dashboard SHALL display all transactions with date, amount, client, therapist, and status
2. WHEN an admin searches payments, THE Admin_Dashboard SHALL filter by date range, client, therapist, or transaction ID
3. WHEN an admin views payment details, THE Admin_Dashboard SHALL display M-Pesa transaction details and session information
4. WHEN an admin exports payments, THE Admin_Dashboard SHALL generate a CSV report for accounting
5. WHEN payment discrepancies exist, THE Admin_Dashboard SHALL highlight flagged transactions for review

### Requirement 11: Client Dashboard Features

**User Story:** As a client, I want a comprehensive dashboard, so that I can manage my therapy journey effectively.

#### Acceptance Criteria

1. WHEN a client accesses their dashboard, THE Client_Dashboard SHALL display upcoming sessions with dates and therapist names
2. WHEN a client views session history, THE Client_Dashboard SHALL display past sessions with status and notes
3. WHEN a client has pending payments, THE Client_Dashboard SHALL display payment reminders prominently
4. WHEN a client views their therapist, THE Client_Dashboard SHALL display therapist profile and contact options
5. WHEN a client needs to book, THE Client_Dashboard SHALL provide quick access to the booking flow

### Requirement 12: Psychologist Dashboard Features

**User Story:** As a psychologist, I want a comprehensive dashboard, so that I can manage my practice effectively.

#### Acceptance Criteria

1. WHEN a psychologist accesses their dashboard, THE Psychologist_Dashboard SHALL display today's sessions prominently
2. WHEN a psychologist has pending approvals, THE Psychologist_Dashboard SHALL display booking requests requiring action
3. WHEN a psychologist views their schedule, THE Psychologist_Dashboard SHALL display weekly calendar view
4. WHEN a psychologist views a client, THE Psychologist_Dashboard SHALL display client history and intake form
5. WHEN a psychologist needs to join a session, THE Psychologist_Dashboard SHALL provide quick access to video call

### Requirement 13: Notification Preferences

**User Story:** As a user, I want to manage my notification preferences, so that I receive relevant communications.

#### Acceptance Criteria

1. WHEN a user accesses notification settings, THE Profile_System SHALL display current preferences
2. WHEN a user toggles email notifications, THE Profile_System SHALL update the preference
3. WHEN a user toggles SMS notifications, THE Profile_System SHALL update the preference
4. WHEN a user sets quiet hours, THE Profile_System SHALL respect the schedule for non-urgent notifications
5. WHEN preferences are saved, THE Profile_System SHALL apply them to future notifications immediately

### Requirement 14: Account Security Settings

**User Story:** As a user, I want to manage my account security, so that my account remains protected.

#### Acceptance Criteria

1. WHEN a user views security settings, THE Profile_System SHALL display last login time and active sessions
2. WHEN a user changes their password, THE Profile_System SHALL enforce password strength requirements
3. WHEN a user requests account deletion, THE Profile_System SHALL initiate the deletion workflow with confirmation
4. WHEN suspicious login is detected, THE Profile_System SHALL notify the user via email
5. WHEN a user logs out of all devices, THE Profile_System SHALL invalidate all active sessions

### Requirement 15: Admin Session Booking

**User Story:** As an admin, I want to book sessions on behalf of clients, so that I can assist clients who have difficulty booking themselves or handle special scheduling requests.

#### Acceptance Criteria

1. WHEN an admin initiates a booking on behalf of a client, THE Admin_Booking_System SHALL allow selection of client, psychologist, date/time, and session type
2. WHEN an admin selects a psychologist for booking, THE Admin_Booking_System SHALL only display available time slots respecting the psychologist's availability and blocked dates
3. WHEN an admin creates a booking, THE Admin_Booking_System SHALL validate that the selected time slot is still available
4. WHEN an admin creates a booking, THE Admin_Booking_System SHALL allow setting payment status as paid, pending, or waived
5. WHEN an admin booking is created successfully, THE Admin_Booking_System SHALL send notification emails to both client and psychologist
6. WHEN an admin creates a booking, THE Admin_Booking_System SHALL log the action in the audit trail with admin ID and reason
7. WHEN an admin views booking history, THE Admin_Booking_System SHALL indicate which bookings were created by admin on behalf of clients

