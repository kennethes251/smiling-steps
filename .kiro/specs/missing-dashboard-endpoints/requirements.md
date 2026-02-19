# Missing Dashboard Endpoints - Requirements

## Overview
The ClientDashboard component is calling several API endpoints that either don't exist or are not properly accessible due to route ordering issues. This spec addresses fixing these missing/broken endpoints.

## Problem Statement
After successful login, the ClientDashboard makes parallel API calls that return 404 errors:
1. `GET /api/sessions/history` - Returns 404 (route exists but is shadowed by `/:id` route)
2. `GET /api/feedback/client` - Returns 404 (route doesn't exist)
3. `GET /api/company/my-company` - Returns 404 (route doesn't exist)

## Root Cause Analysis

### 1. Session History Route (Route Ordering Issue)
- **File**: `server/routes/sessions.js`
- **Issue**: The `/history` route is defined at line 999, AFTER the `/:id` route at line 331
- **Impact**: Express matches `/history` as an ID parameter, causing MongoDB ObjectId cast error → 404
- **Fix**: Move `/history` route BEFORE the `/:id` route

### 2. Feedback Routes (Missing Feature)
- **File**: No feedback routes exist
- **Issue**: ClientDashboard expects `GET /api/feedback/client` to fetch submitted feedback
- **Impact**: 404 error, `submittedFeedback` state never populated
- **Fix**: Create feedback routes or gracefully handle missing endpoint

### 3. Company Routes (Missing Feature)
- **File**: No company routes exist
- **Issue**: ClientDashboard expects `GET /api/company/my-company` for corporate clients
- **Impact**: 404 error, company badge never displays
- **Fix**: Create company routes or gracefully handle missing endpoint

---

## User Stories

### US-1: Fix Session History Route Order
**As a** client or psychologist  
**I want** to view my session history  
**So that** I can track my past therapy sessions and call durations

**Acceptance Criteria:**
- [ ] `GET /api/sessions/history` returns session history data (not 404)
- [ ] Route is moved before `/:id` route in sessions.js
- [ ] Response includes pagination, call data, and session details
- [ ] Existing functionality is preserved

### US-2: Create Client Feedback Endpoint
**As a** client  
**I want** to view feedback I've submitted for past sessions  
**So that** I can see which sessions I've already rated

**Acceptance Criteria:**
- [ ] `GET /api/feedback/client` returns array of feedback submitted by the logged-in client
- [ ] Response includes session IDs that have been rated
- [ ] Endpoint is protected by authentication
- [ ] Returns empty array if no feedback exists (not 404)

### US-3: Create Company Endpoint (Optional/Deferred)
**As a** corporate client  
**I want** to see my company information and subscription details  
**So that** I know my benefits and plan details

**Acceptance Criteria:**
- [ ] `GET /api/company/my-company` returns company info if user is part of a company
- [ ] Returns null/empty if user is not part of a company (not 404)
- [ ] Includes subscription tier and employee limit if applicable

**Note:** This feature may be deferred as it requires a Company model and corporate client functionality that may not be implemented yet.

---

## Technical Requirements

### TR-1: Route Ordering Fix
- Move all specific path routes (`/history`, `/pending-approval`, `/search/reference`, `/by-reference/:reference`, `/instant`, `/debug/test`) BEFORE the `/:id` route
- Follow Express best practice: specific routes before parameterized routes

### TR-2: Feedback Model & Routes
- Create `Feedback` model if not exists (sessionId, clientId, rating, comment, createdAt)
- Create `server/routes/feedback.js` with:
  - `POST /api/feedback` - Submit feedback for a session
  - `GET /api/feedback/client` - Get all feedback by logged-in client
  - `GET /api/feedback/session/:sessionId` - Get feedback for specific session

### TR-3: Graceful Error Handling
- Frontend should handle 404 gracefully (already does with `.catch(() => ({ data: [] }))`)
- Backend should return empty arrays/null instead of 404 for "no data" scenarios

---

## Files to Modify

1. `server/routes/sessions.js` - Reorder routes
2. `server/routes/feedback.js` - Create new file
3. `server/models/Feedback.js` - Create new file (if needed)
4. `server/index.js` - Register feedback routes

## Files to Review (No Changes)

1. `client/src/components/dashboards/ClientDashboard.js` - Already handles errors gracefully
2. `client/src/components/SessionHistory.js` - Will work once route is fixed

---

## Priority

1. **High**: Fix session history route ordering (US-1) - Quick fix, high impact
2. **Medium**: Create feedback endpoint (US-2) - New feature, moderate complexity
3. **Low**: Create company endpoint (US-3) - Deferred until corporate features needed

## Testing

- Test `GET /api/sessions/history` returns 200 with session data
- Test `GET /api/feedback/client` returns 200 with feedback array
- Verify ClientDashboard loads without console errors
- Verify SessionHistory component displays data correctly
