# New Session Booking Flow Design

## Overview
Complete redesign of the client session booking process with therapist approval and payment confirmation workflow.

## Booking Flow Steps

### Step 1: Select Psychologist
- Client clicks "Book Session" button
- Display list of available psychologists with:
  - Profile picture
  - Name & credentials
  - Specializations
  - Experience
  - Rating & reviews
  - Availability status

### Step 2: Choose Session Type & Rate
- Display psychologist's payment rates for different session types:
  - **Individual Therapy** - One-on-one session
  - **Couples Therapy** - Session for couples
  - **Family Therapy** - Session for families
  - **Group Therapy** - Group session
- Each type shows:
  - Session duration
  - Price (KSh)
  - Description

### Step 3: Select Preferred Date & Time
- Calendar view showing available dates
- Time slots for selected date
- Session duration display
- Timezone information

### Step 4: Booking Request Submitted
- Status: **Pending Therapist Approval**
- Client sees:
  - Booking summary
  - "Waiting for therapist approval" message
  - Estimated response time

### Step 5: Therapist Approves Booking
- Therapist receives notification
- Reviews booking request
- Can approve or decline with reason
- Upon approval:
  - Session status changes to **Approved - Pending Payment**
  - Client receives notification

### Step 6: Payment & Forms
Once therapist approves, client receives:

#### A. Payment Instructions
- M-Pesa payment details
- Payment reference number
- Amount to pay
- Payment deadline

#### B. Confidentiality Agreement
- Terms and conditions
- Privacy policy
- Client rights
- Consent for treatment
- Digital signature field

#### C. Client Information Form
- Emergency contact
- Medical history (if relevant)
- Current medications
- Therapy goals
- Special requirements

### Step 7: Payment Confirmation
Client submits:
- Payment confirmation message/screenshot
- M-Pesa transaction code
- Completed forms

**Payment Verification Options:**
1. **Manual Verification** (Current MVP)
   - Admin/Therapist reviews payment proof
   - Manually confirms payment
   
2. **Future: Automated POS Integration**
   - M-Pesa API integration
   - Automatic payment verification
   - Real-time confirmation

### Step 8: Booking Confirmed
- Status: **Booked & Confirmed**
- Client receives:
  - Confirmation email
  - Session details
  - Meeting link (for video sessions)
  - Calendar invite
  - Reminder notifications

## Database Schema Updates

### Session Model Additions
```javascript
{
  // Existing fields...
  
  // New fields for enhanced workflow
  therapyType: {
    type: String,
    enum: ['Individual', 'Couples', 'Family', 'Group'],
    required: true
  },
  
  sessionRate: {
    type: Number,
    required: true
  },
  
  status: {
    type: String,
    enum: [
      'Pending Approval',      // Waiting for therapist
      'Approved',              // Therapist approved, waiting for payment
      'Payment Submitted',     // Client submitted payment proof
      'Confirmed',             // Payment verified, session confirmed
      'In Progress',           // Session is happening
      'Completed',             // Session finished
      'Cancelled',             // Cancelled by either party
      'Declined'               // Therapist declined
    ],
    default: 'Pending Approval'
  },
  
  // Payment tracking
  paymentProof: {
    transactionCode: String,
    screenshot: String,      // URL to uploaded image
    submittedAt: Date
  },
  
  paymentVerifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  paymentVerifiedAt: Date,
  
  // Forms
  confidentialityAgreement: {
    agreed: Boolean,
    agreedAt: Date,
    signature: String,
    ipAddress: String
  },
  
  clientIntakeForm: {
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    medicalHistory: String,
    currentMedications: String,
    therapyGoals: String,
    specialRequirements: String,
    submittedAt: Date
  },
  
  // Approval tracking
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: Date,
  
  declineReason: String,
  
  // Notifications
  notificationsSent: [{
    type: String,
    sentAt: Date,
    status: String
  }]
}
```

### User Model - Psychologist Details
```javascript
psychologistDetails: {
  // Session rates
  rates: {
    individual: { amount: Number, duration: Number },
    couples: { amount: Number, duration: Number },
    family: { amount: Number, duration: Number },
    group: { amount: Number, duration: Number }
  },
  
  // Availability
  availability: {
    monday: [{ start: String, end: String }],
    tuesday: [{ start: String, end: String }],
    // ... other days
  },
  
  // Payment details
  paymentInfo: {
    mpesaNumber: String,
    mpesaName: String,
    bankAccount: String
  }
}
```

## UI Components Needed

1. **PsychologistSelectionCard** - Display psychologist info
2. **SessionTypeSelector** - Choose therapy type and see rates
3. **DateTimePicker** - Enhanced calendar with availability
4. **BookingStatusTracker** - Progress indicator
5. **PaymentInstructionsCard** - Payment details display
6. **ConfidentialityAgreementForm** - Legal agreement
7. **ClientIntakeForm** - Client information collection
8. **PaymentProofUpload** - Upload payment confirmation
9. **BookingConfirmationCard** - Final confirmation display

## API Endpoints Needed

### Client Endpoints
- `POST /api/sessions/request` - Create booking request
- `POST /api/sessions/:id/submit-payment` - Submit payment proof
- `POST /api/sessions/:id/submit-forms` - Submit confidentiality & intake forms
- `GET /api/sessions/:id/status` - Check booking status

### Therapist Endpoints
- `GET /api/sessions/pending-approval` - Get pending requests
- `PUT /api/sessions/:id/approve` - Approve booking
- `PUT /api/sessions/:id/decline` - Decline booking
- `PUT /api/sessions/:id/verify-payment` - Verify payment

### Admin Endpoints
- `GET /api/sessions/pending-payment` - Get sessions awaiting payment verification
- `PUT /api/sessions/:id/confirm-payment` - Manually confirm payment

## Implementation Priority

### Phase 1 (MVP)
1. ✅ Psychologist selection
2. ✅ Session type & rate selection
3. ✅ Date/time selection
4. ✅ Booking request creation
5. ✅ Therapist approval workflow
6. ✅ Payment instructions display
7. ✅ Manual payment confirmation

### Phase 2 (Enhanced)
1. Confidentiality agreement form
2. Client intake form
3. Payment proof upload
4. Email notifications
5. SMS notifications

### Phase 3 (Advanced)
1. M-Pesa API integration
2. Automated payment verification
3. Calendar integration
4. Automated reminders
5. Rescheduling functionality

## Notes
- Start with manual payment verification
- Can add M-Pesa API integration later
- Focus on smooth user experience
- Clear status updates at each step
- Email/SMS notifications are important
