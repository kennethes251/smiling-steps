# 🎯 Session Rates Redesign Plan

## Current Problem
- Session rate management is on the dashboard (wrong place)
- Only one rate for all session types (not flexible)
- Can be changed anytime (affects existing bookings)

## New Design

### 1. Move to Profile Page
**Location**: Psychologist Profile Edit Page

**Why**: 
- Rates are part of professional profile
- Not something changed frequently
- Better organization

### 2. Separate Rates by Session Type

**The 4 Session Types:**
1. **Individual** - One-on-one therapy
2. **Couples** - Relationship counseling
3. **Family** - Family therapy
4. **Group** - Group sessions

**Structure:**
```javascript
psychologistDetails: {
  sessionRates: {
    Individual: 2500,
    Couples: 3500,
    Family: 4000,
    Group: 2000
  },
  offeredSessionTypes: ['Individual', 'Couples']  // Which types they offer
}
```

### 3. Rate Change Rules

**✅ Can Change:**
- Rates for future bookings
- Rates in profile settings

**❌ Cannot Change:**
- Rates for already booked sessions
- Rates for sessions in progress
- Historical session rates

**Implementation:**
- Session stores the rate at booking time
- Rate changes only affect NEW bookings
- Old bookings keep their original rate

## Database Schema

### User Model (psychologistDetails)
```javascript
psychologistDetails: {
  sessionRates: {
    Individual: Number,
    Couples: Number,
    Family: Number,
    Group: Number
  },
  offeredSessionTypes: [String],  // ['Individual', 'Couples', 'Family', 'Group']
  specializations: [String],
  bio: String,
  // ... other fields
}
```

### Session Model
```javascript
{
  sessionType: 'Individual' | 'Couples' | 'Family' | 'Group',
  sessionRate: Number,  // Rate at time of booking (LOCKED)
  price: Number,        // Same as sessionRate (for compatibility)
  // ... other fields
}
```

## UI Design

### Profile Edit Page - Session Rates Section

```
┌─────────────────────────────────────────────┐
│  Session Rates & Types                      │
├─────────────────────────────────────────────┤
│                                             │
│  Select which session types you offer:      │
│  ☑ Individual Therapy                       │
│  ☑ Couples Counseling                       │
│  ☐ Family Therapy                           │
│  ☐ Group Sessions                           │
│                                             │
│  Set your rates (KES):                      │
│                                             │
│  Individual Therapy:    [2500]              │
│  Couples Counseling:    [3500]              │
│  Family Therapy:        [----] (disabled)   │
│  Group Sessions:        [----] (disabled)   │
│                                             │
│  ⓘ Note: Rate changes only affect new      │
│     bookings. Existing bookings keep        │
│     their original rates.                   │
│                                             │
│  [Save Changes]                             │
└─────────────────────────────────────────────┘
```

### Booking Page - Client View

```
┌─────────────────────────────────────────────┐
│  Book Session with Dr. Leon                 │
├─────────────────────────────────────────────┤
│                                             │
│  Session Type:                              │
│  ○ Individual Therapy - KES 2,500           │
│  ○ Couples Counseling - KES 3,500           │
│                                             │
│  Date & Time: [Select...]                   │
│                                             │
│  Total: KES 2,500                           │
│                                             │
│  [Book Session]                             │
└─────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Remove from Dashboard
- Remove session rate section from PsychologistDashboard
- Keep it simple - just show bookings

### Step 2: Add to Profile Page
- Create SessionRatesEditor component
- Add to ProfilePage for psychologists
- Show checkboxes for session types
- Show rate inputs for selected types

### Step 3: Update Database Structure
- Migrate from single `sessionRate` to `sessionRates` object
- Add `offeredSessionTypes` array
- Keep backward compatibility

### Step 4: Update Booking Flow
- Show only offered session types
- Display correct rate for each type
- Lock rate when booking is created

### Step 5: Update Approval Flow
- Use the rate from session (already locked)
- Don't fetch current rate from profile
- Existing bookings unaffected by rate changes

## API Endpoints

### Update Profile with Rates
```
PUT /api/users/profile
Body: {
  psychologistDetails: {
    sessionRates: {
      Individual: 2500,
      Couples: 3500
    },
    offeredSessionTypes: ['Individual', 'Couples']
  }
}
```

### Get Psychologist Rates (for booking)
```
GET /api/users/psychologists/:id
Response: {
  sessionRates: { Individual: 2500, Couples: 3500 },
  offeredSessionTypes: ['Individual', 'Couples']
}
```

### Create Booking (locks rate)
```
POST /api/sessions/request
Body: {
  psychologistId: "...",
  sessionType: "Individual",
  sessionRate: 2500,  // Locked at booking time
  sessionDate: "..."
}
```

## Benefits

✅ **Better Organization** - Rates in profile where they belong
✅ **More Flexible** - Different rates for different session types
✅ **Protected Bookings** - Existing bookings keep their rates
✅ **Clear Pricing** - Clients see rates before booking
✅ **Professional** - Psychologists can offer multiple services

## Migration Strategy

### For Existing Data:
```javascript
// Convert old single rate to new structure
if (user.sessionRate && !user.psychologistDetails.sessionRates) {
  user.psychologistDetails.sessionRates = {
    Individual: user.sessionRate,
    Couples: user.sessionRate,
    Family: user.sessionRate,
    Group: user.sessionRate
  };
  user.psychologistDetails.offeredSessionTypes = ['Individual'];
}
```

## Next Steps

1. **Remove** session rate from dashboard
2. **Create** SessionRatesEditor component
3. **Add** to profile page
4. **Update** booking flow to use correct rates
5. **Test** that existing bookings are unaffected

Would you like me to implement this design?
