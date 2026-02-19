# Implementation Plan: Missing Dashboard Endpoints

## Overview

This implementation plan fixes 404 errors in the ClientDashboard by reorganizing session routes and creating the missing feedback system endpoints.

## Tasks

- [x] 1. Fix Session Routes Ordering
  - [x] 1.1 Reorganize routes in `server/routes/sessions.js`
    - Move `GET /history` before `GET /:id` route
    - Move `GET /pending-approval` before `GET /:id` route
    - Move `GET /search/reference` before `GET /:id` route
    - Move `GET /by-reference/:reference` before `GET /:id` route
    - Move `POST /instant` before `GET /:id` route
    - Move `GET /debug/test` before `GET /:id` route
    - Ensure route order follows: specific paths → parameterized paths
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Create Feedback Model
  - [x] 2.1 Create `server/models/Feedback.js`
    - Define schema with fields: session, client, psychologist, rating, comment, isAnonymous
    - Add rating validation (1-5 range)
    - Add unique constraint on session field (one feedback per session)
    - Add timestamps
    - Export model
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Create Feedback Routes
  - [x] 3.1 Create `server/routes/feedback.js`
    - Set up Express router with authentication middleware
    - _Requirements: 3.1_

  - [x] 3.2 Implement POST / endpoint for feedback submission
    - Validate session exists and is completed
    - Validate client is the session's client
    - Check for duplicate feedback
    - Create feedback record
    - _Requirements: 3.2, 3.3_

  - [x] 3.3 Implement GET /client endpoint
    - Return array of feedback by logged-in client
    - Return empty array if no feedback (not 404)
    - _Requirements: 3.4, 3.5_

  - [x] 3.4 Implement GET /session/:sessionId endpoint
    - Get feedback for specific session
    - Validate authorization
    - _Requirements: 3.6_

- [x] 4. Register Feedback Routes
  - [x] 4.1 Update `server/index.js` to register feedback routes
    - Add route registration: `app.use('/api/feedback', require('./routes/feedback'))`
    - Add logger confirmation for routes loaded
    - _Requirements: 4.1_

- [x] 5. Checkpoint - Verify endpoints work
  - Test that `/api/sessions/history` returns 200
  - Test that `/api/feedback/client` returns empty array or feedback
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Test Dashboard Integration
  - [x] 6.1 Verify ClientDashboard loads without 404 errors
    - Verify no 404 errors for `/api/sessions/history`
    - Verify no 404 errors for `/api/feedback/client`
    - Verify SessionHistory component displays data
    - Verify feedback state is populated (even if empty array)
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Fix Mongoose Duplicate Index Warnings (Optional)

  - [x] 7.1 Remove duplicate index definitions

    - Search for models with `slug` field (likely `Blog.js`)
    - Search for models with `transactionID` field
    - Remove duplicate index definitions (either `index: true` in field or `schema.index()`)
    - Verify warnings are gone on server restart
    - _Requirements: 6.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster completion
- Task 1 is the highest priority - it immediately fixes the `/api/sessions/history` 404 error
- Each task references specific requirements for traceability
- Checkpoint ensures incremental validation before final testing
