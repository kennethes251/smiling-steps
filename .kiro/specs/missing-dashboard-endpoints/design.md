# Missing Dashboard Endpoints - Design

## Architecture Overview

This design addresses three issues:
1. Route ordering bug in sessions.js
2. Missing feedback routes
3. Missing company routes (deferred)

---

## 1. Session Routes Reordering

### Current Route Order (Problematic)
```
Line 129: POST /request
Line 230: POST /
Line 287: GET /
Line 331: GET /:id          ← CATCHES /history, /pending-approval, etc.
Line 360: DELETE /:id
Line 437: GET /pending-approval  ← NEVER REACHED
Line 461: PUT /:id/approve
...
Line 999: GET /history      ← NEVER REACHED
```

### Fixed Route Order
```javascript
// Specific routes FIRST
router.get('/history', auth, ...)
router.get('/pending-approval', auth, ...)
router.get('/search/reference', auth, ...)
router.get('/by-reference/:reference', auth, ...)
router.post('/request', auth, ...)
router.post('/instant', auth, ...)
router.get('/debug/test', ...)

// Parameterized routes LAST
router.get('/:id', auth, ...)
router.delete('/:id', auth, ...)
router.put('/:id/approve', auth, ...)
router.put('/:id/decline', auth, ...)
router.post('/:id/submit-payment', auth, ...)
router.put('/:id/verify-payment', auth, ...)
router.put('/:id/link', auth, ...)
router.post('/:id/complete', auth, ...)
router.put('/:id/start-call', auth, ...)
router.put('/:id/end-call', auth, ...)
```

---

## 2. Feedback System Design

### Data Model

```javascript
// server/models/Feedback.js
const FeedbackSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    unique: true  // One feedback per session
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  psychologist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 1000
  },
  isAnonymous: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});
```

### API Endpoints

#### POST /api/feedback
Submit feedback for a completed session.

**Request:**
```json
{
  "sessionId": "ObjectId",
  "rating": 5,
  "comment": "Great session!",
  "isAnonymous": false
}
```

**Response:**
```json
{
  "success": true,
  "msg": "Feedback submitted successfully",
  "feedback": { ... }
}
```

**Validation:**
- Session must exist and be completed
- Client must be the session's client
- No duplicate feedback for same session

#### GET /api/feedback/client
Get all feedback submitted by the logged-in client.

**Response:**
```json
{
  "success": true,
  "feedback": [
    {
      "_id": "...",
      "session": "sessionId",
      "rating": 5,
      "comment": "...",
      "createdAt": "..."
    }
  ]
}
```

#### GET /api/feedback/psychologist (Optional)
Get all feedback received by a psychologist.

**Response:**
```json
{
  "success": true,
  "feedback": [...],
  "averageRating": 4.5,
  "totalReviews": 25
}
```

---

## 3. Route Registration

### server/index.js additions
```javascript
// Add after sessions routes
app.use('/api/feedback', require('./routes/feedback'));
logger.info('  ✅ feedback routes loaded');
```

---

## 4. Error Handling Strategy

### Backend
- Return empty arrays for "no data" scenarios
- Return 404 only for "resource not found" (specific ID lookup)
- Return 403 for unauthorized access

### Frontend (Already Implemented)
```javascript
// ClientDashboard.js already handles gracefully:
axios.get(`${API_BASE_URL}/api/feedback/client`, config)
  .catch(() => ({ data: [] }))  // Returns empty array on error
```

---

## 5. Implementation Sequence

### Phase 1: Fix Route Ordering (Immediate)
1. Reorganize routes in `server/routes/sessions.js`
2. Test `/api/sessions/history` endpoint
3. Verify no regression in other session endpoints

### Phase 2: Add Feedback System
1. Create `server/models/Feedback.js`
2. Create `server/routes/feedback.js`
3. Register routes in `server/index.js`
4. Test feedback submission and retrieval

### Phase 3: Company Routes (Deferred)
- Requires Company model and corporate client features
- Can be implemented when corporate subscription feature is needed

---

## 6. Testing Checklist

- [ ] `GET /api/sessions/history` returns 200 with data
- [ ] `GET /api/sessions/:id` still works for valid ObjectIds
- [ ] `GET /api/sessions/pending-approval` works for psychologists
- [ ] `POST /api/feedback` creates feedback record
- [ ] `GET /api/feedback/client` returns client's feedback
- [ ] Duplicate feedback submission is rejected
- [ ] ClientDashboard loads without 404 errors
- [ ] SessionHistory component displays correctly
