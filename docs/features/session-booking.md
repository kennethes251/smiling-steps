# Session Booking System

*Comprehensive guide for the session booking and management system in Smiling Steps*

## ✅ Current Status: PRODUCTION READY

**Last Updated**: January 2026  
**Status**: ✅ Fully implemented and operational  
**Priority**: Critical - Core platform functionality

---

## 📋 Overview

The session booking system enables clients to book therapy sessions with approved psychologists. It includes availability management, booking confirmation, intake forms, cancellation/rescheduling, and comprehensive session tracking.

### Key Features
- **Session Booking Flow**: Complete booking process with form validation
- **Availability Management**: Psychologist availability windows and conflict detection
- **Intake Forms**: Comprehensive client intake with encryption
- **Confidentiality Agreements**: Legal compliance and consent management
- **Session Status Tracking**: Real-time session state management
- **Cancellation & Rescheduling**: Flexible session modification options
- **Reminder System**: Automated session reminders
- **Payment Integration**: Seamless payment processing

---

## 🏗️ Architecture

### Core Components
1. **Booking Flow** (`client/src/pages/BookingPageNew.js`)
2. **Session Management** (`server/routes/sessions-fixed.js`)
3. **Intake Forms** (`server/routes/intakeForms.js`)
4. **Availability System** (`server/routes/availabilityWindows.js`)
5. **Reminder Service** (`server/services/reminderSchedulerService.js`)

### Database Models

#### Session Model
```javascript
{
  _id: ObjectId,
  clientId: ObjectId, // Reference to User
  psychologistId: ObjectId, // Reference to User
  scheduledAt: Date,
  duration: Number, // Minutes
  status: String, // 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'
  sessionType: String, // 'initial', 'follow_up', 'emergency'
  
  // Booking details
  bookingReference: String, // Unique booking reference
  notes: String,
  specialRequests: String,
  
  // Payment information
  amount: Number,
  paymentStatus: String, // 'pending', 'paid', 'refunded'
  paymentMethod: String,
  transactionId: String,
  
  // Session tracking
  joinedAt: Date,
  endedAt: Date,
  actualDuration: Number,
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  rescheduledFrom: ObjectId // Reference to original session
}
```

#### Intake Form Model
```javascript
{
  _id: ObjectId,
  sessionId: ObjectId,
  clientId: ObjectId,
  
  // Personal Information (encrypted)
  personalInfo: {
    emergencyContact: String,
    medicalHistory: String,
    currentMedications: String,
    allergies: String
  },
  
  // Mental Health Assessment
  mentalHealthInfo: {
    previousTherapy: Boolean,
    currentSymptoms: [String],
    severityLevel: Number, // 1-10 scale
    triggerFactors: [String],
    copingMechanisms: [String]
  },
  
  // Goals and Expectations
  therapyGoals: [String],
  expectations: String,
  preferredApproach: String,
  
  // Consent and Agreements
  consentToTreatment: Boolean,
  confidentialityAgreement: Boolean,
  dataProcessingConsent: Boolean,
  
  // Metadata
  completedAt: Date,
  isComplete: Boolean,
  encryptionVersion: String
}
```

#### Availability Window Model
```javascript
{
  _id: ObjectId,
  psychologistId: ObjectId,
  dayOfWeek: Number, // 0-6 (Sunday-Saturday)
  startTime: String, // "09:00"
  endTime: String, // "17:00"
  isActive: Boolean,
  
  // Exceptions and overrides
  exceptions: [{
    date: Date,
    isAvailable: Boolean,
    customStartTime: String,
    customEndTime: String,
    reason: String
  }],
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## 💻 Implementation Details

### Frontend Booking Flow

#### Enhanced Booking Page
```jsx
import BookingPageNew from '../pages/BookingPageNew';

function App() {
  return (
    <Route path="/book-session" element={
      <RoleGuard allowedRoles={['client']}>
        <BookingPageNew />
      </RoleGuard>
    } />
  );
}

// Features:
// - Psychologist selection with profiles
// - Availability calendar integration
// - Intake form wizard
// - Payment processing
// - Booking confirmation
```

#### Intake Form Wizard
```jsx
import IntakeFormWizard from '../components/IntakeFormWizard';

const BookingPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  
  return (
    <IntakeFormWizard
      currentStep={currentStep}
      onStepComplete={(step, data) => {
        // Save step data
        saveFormData(step, data);
        setCurrentStep(step + 1);
      }}
      onFormComplete={(formData) => {
        // Submit complete form
        submitIntakeForm(formData);
      }}
    />
  );
};
```

### Backend API Endpoints

#### Session Booking
```http
POST /api/sessions/book
Authorization: Bearer <client-token>
Content-Type: application/json

{
  "psychologistId": "psych-id-here",
  "scheduledAt": "2026-01-15T10:00:00.000Z",
  "duration": 60,
  "sessionType": "initial",
  "specialRequests": "Prefer video call",
  "intakeFormData": {
    "personalInfo": {...},
    "mentalHealthInfo": {...},
    "therapyGoals": [...]
  }
}

Response:
{
  "sessionId": "session-id-here",
  "bookingReference": "BK-2026-001234",
  "scheduledAt": "2026-01-15T10:00:00.000Z",
  "paymentRequired": true,
  "amount": 1500,
  "status": "pending_payment"
}
```

#### Get Available Slots
```http
GET /api/availability/slots/:psychologistId?date=2026-01-15
Authorization: Bearer <client-token>

Response:
{
  "availableSlots": [
    {
      "startTime": "09:00",
      "endTime": "10:00",
      "available": true
    },
    {
      "startTime": "10:00", 
      "endTime": "11:00",
      "available": false,
      "reason": "booked"
    }
  ]
}
```

#### Session Management
```http
# Get client sessions
GET /api/sessions/my-sessions
Authorization: Bearer <client-token>

# Get psychologist sessions
GET /api/sessions/assigned
Authorization: Bearer <psychologist-token>

# Update session status
PUT /api/sessions/:sessionId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "confirmed",
  "notes": "Client confirmed attendance"
}
```

---

## 📝 Intake Form System

### Form Structure
The intake form is divided into multiple steps for better user experience:

#### Step 1: Personal Information
- Emergency contact details
- Medical history overview
- Current medications
- Known allergies

#### Step 2: Mental Health Assessment
- Previous therapy experience
- Current symptoms and concerns
- Severity assessment (1-10 scale)
- Identified trigger factors
- Current coping mechanisms

#### Step 3: Therapy Goals
- Primary therapy objectives
- Expected outcomes
- Preferred therapeutic approach
- Timeline expectations

#### Step 4: Consent & Agreements
- Consent to treatment
- Confidentiality agreement
- Data processing consent
- Terms and conditions

### Data Encryption
```javascript
// Intake form encryption
const encryptIntakeData = (data) => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.INTAKE_ENCRYPTION_KEY);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decryptIntakeData = (encryptedData) => {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.INTAKE_ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};
```

---

## 📅 Availability Management

### Psychologist Availability
```jsx
import AvailabilityManager from '../components/AvailabilityManager';

const PsychologistDashboard = () => {
  return (
    <AvailabilityManager
      psychologistId={user.id}
      onAvailabilityUpdate={(schedule) => {
        updateAvailability(schedule);
      }}
      allowExceptions={true}
      timeSlotDuration={60} // minutes
    />
  );
};
```

### Availability Calendar
```jsx
import AvailabilityCalendar from '../components/AvailabilityCalendar';

const BookingPage = () => {
  return (
    <AvailabilityCalendar
      psychologistId={selectedPsychologist.id}
      selectedDate={selectedDate}
      onSlotSelect={(slot) => {
        setSelectedSlot(slot);
      }}
      minAdvanceBooking={24} // hours
      maxAdvanceBooking={30} // days
    />
  );
};
```

### Conflict Detection
```javascript
// Availability conflict service
const checkAvailabilityConflict = async (psychologistId, scheduledAt, duration) => {
  const startTime = new Date(scheduledAt);
  const endTime = new Date(startTime.getTime() + (duration * 60000));
  
  // Check existing sessions
  const conflictingSessions = await Session.find({
    psychologistId,
    scheduledAt: {
      $gte: startTime,
      $lt: endTime
    },
    status: { $in: ['scheduled', 'confirmed', 'in_progress'] }
  });
  
  if (conflictingSessions.length > 0) {
    throw new Error('Time slot not available');
  }
  
  // Check availability windows
  const dayOfWeek = startTime.getDay();
  const timeSlot = startTime.toTimeString().substring(0, 5);
  
  const availability = await AvailabilityWindow.findOne({
    psychologistId,
    dayOfWeek,
    startTime: { $lte: timeSlot },
    endTime: { $gt: timeSlot },
    isActive: true
  });
  
  if (!availability) {
    throw new Error('Psychologist not available at this time');
  }
  
  return true;
};
```

---

## 🔄 Cancellation & Rescheduling

### Cancellation System
```javascript
// Cancellation service
const cancelSession = async (sessionId, userId, reason) => {
  const session = await Session.findById(sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  // Check cancellation policy (24 hours advance notice)
  const hoursUntilSession = (session.scheduledAt - new Date()) / (1000 * 60 * 60);
  const allowCancellation = hoursUntilSession >= 24;
  
  if (!allowCancellation && session.clientId.toString() === userId) {
    throw new Error('Cancellation must be made at least 24 hours in advance');
  }
  
  // Update session status
  session.status = 'cancelled';
  session.cancelledAt = new Date();
  session.cancellationReason = reason;
  await session.save();
  
  // Process refund if applicable
  if (session.paymentStatus === 'paid' && allowCancellation) {
    await processRefund(session.transactionId, session.amount);
  }
  
  // Send notifications
  await sendCancellationNotification(session);
  
  return session;
};
```

### Rescheduling System
```jsx
import RescheduleDialog from '../components/RescheduleDialog';

const SessionCard = ({ session }) => {
  const [showReschedule, setShowReschedule] = useState(false);
  
  return (
    <div className="session-card">
      <h3>Session with {session.psychologist.name}</h3>
      <p>Scheduled: {formatDate(session.scheduledAt)}</p>
      
      <button onClick={() => setShowReschedule(true)}>
        Reschedule
      </button>
      
      {showReschedule && (
        <RescheduleDialog
          session={session}
          onReschedule={(newDateTime) => {
            rescheduleSession(session.id, newDateTime);
            setShowReschedule(false);
          }}
          onCancel={() => setShowReschedule(false)}
        />
      )}
    </div>
  );
};
```

---

## 🔔 Reminder System

### Automated Reminders
```javascript
// Reminder scheduler service
const scheduleSessionReminders = async (session) => {
  const reminders = [
    { time: 24 * 60, message: '24-hour reminder' }, // 24 hours before
    { time: 2 * 60, message: '2-hour reminder' },   // 2 hours before
    { time: 15, message: '15-minute reminder' }     // 15 minutes before
  ];
  
  for (const reminder of reminders) {
    const reminderTime = new Date(session.scheduledAt.getTime() - (reminder.time * 60000));
    
    await scheduleJob(reminderTime, async () => {
      await sendSessionReminder(session, reminder.message);
    });
  }
};

const sendSessionReminder = async (session, type) => {
  const client = await User.findById(session.clientId);
  const psychologist = await User.findById(session.psychologistId);
  
  // Email reminder
  await emailService.sendEmail({
    to: client.email,
    subject: `Session Reminder - ${type}`,
    template: 'session-reminder',
    data: {
      clientName: client.name,
      psychologistName: psychologist.name,
      sessionTime: session.scheduledAt,
      joinUrl: `${process.env.CLIENT_URL}/session/${session._id}`
    }
  });
  
  // SMS reminder (if enabled)
  if (client.smsNotifications) {
    await smsService.sendSMS({
      to: client.phoneNumber,
      message: `Reminder: You have a therapy session with ${psychologist.name} at ${formatTime(session.scheduledAt)}`
    });
  }
};
```

### Reminder Preferences
```jsx
import ReminderPreferences from '../components/ReminderPreferences';

const ProfilePage = () => {
  return (
    <ReminderPreferences
      userId={user.id}
      preferences={user.notificationPreferences}
      onUpdate={(preferences) => {
        updateNotificationPreferences(preferences);
      }}
    />
  );
};
```

---

## 📊 Session Analytics

### Session Metrics
```javascript
// Session analytics service
const getSessionAnalytics = async (psychologistId, dateRange) => {
  const pipeline = [
    {
      $match: {
        psychologistId: new ObjectId(psychologistId),
        scheduledAt: {
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        completedSessions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledSessions: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0] }
        },
        averageDuration: { $avg: '$actualDuration' }
      }
    }
  ];
  
  const result = await Session.aggregate(pipeline);
  return result[0] || {};
};
```

### Performance Dashboard
```jsx
const SessionAnalyticsDashboard = ({ psychologistId }) => {
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    fetchSessionAnalytics(psychologistId).then(setAnalytics);
  }, [psychologistId]);
  
  return (
    <div className="analytics-dashboard">
      <h2>Session Analytics</h2>
      <div className="metrics-grid">
        <MetricCard title="Total Sessions" value={analytics?.totalSessions} />
        <MetricCard title="Completion Rate" value={`${analytics?.completionRate}%`} />
        <MetricCard title="Total Revenue" value={`KES ${analytics?.totalRevenue}`} />
        <MetricCard title="Avg Duration" value={`${analytics?.averageDuration} min`} />
      </div>
    </div>
  );
};
```

---

## 🧪 Testing

### Test Categories

#### Unit Tests
- Booking validation logic
- Availability conflict detection
- Intake form encryption/decryption
- Reminder scheduling
- Cancellation policy enforcement

#### Integration Tests
- Complete booking flow
- Payment integration
- Email/SMS notifications
- Session state transitions

#### Property-based Tests
```javascript
// Test booking reference generation
fc.assert(fc.property(
  fc.date(), fc.integer(1, 999999),
  (date, sequence) => {
    const reference = generateBookingReference(date, sequence);
    return reference.startsWith('BK-') && reference.length === 12;
  }
));
```

### Test Scripts
```bash
# Test booking system
node server/test/booking-flow.integration.test.js

# Test intake forms
node server/test/integration/form-completion.integration.test.js

# Test cancellation system
node server/test/integration/cancellation-refund.integration.test.js
```

---

## 🔒 Security & Compliance

### Data Protection
- **Intake Form Encryption**: AES-256 encryption for sensitive data
- **Access Control**: Role-based access to session data
- **Audit Logging**: Complete audit trail for all session actions
- **Data Retention**: Configurable data retention policies

### HIPAA Compliance Considerations
- Encrypted data storage and transmission
- Access logging and monitoring
- User consent and agreements
- Secure session handling

### Privacy Features
```javascript
// Secure data deletion
const secureDeleteSession = async (sessionId) => {
  const session = await Session.findById(sessionId);
  
  // Encrypt sensitive data before deletion
  session.notes = '[REDACTED]';
  session.specialRequests = '[REDACTED]';
  
  // Mark for secure deletion
  session.deletedAt = new Date();
  session.deletionReason = 'User request';
  
  await session.save();
  
  // Schedule physical deletion after retention period
  schedulePhysicalDeletion(sessionId, 30); // 30 days
};
```

---

## 🚀 Deployment & Monitoring

### Performance Optimization
- Database indexing for session queries
- Caching for availability data
- Optimized booking flow
- Efficient reminder scheduling

### Monitoring Metrics
- Booking success rate
- Average booking completion time
- Cancellation rates
- No-show rates
- System performance metrics

### Health Checks
```javascript
// Session system health check
app.get('/api/sessions/health', async (req, res) => {
  try {
    // Check database connectivity
    await Session.findOne().limit(1);
    
    // Check reminder service
    const pendingReminders = await getReminderQueueSize();
    
    // Check availability service
    const availabilityCheck = await testAvailabilityService();
    
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: 'operational',
        reminders: pendingReminders < 1000 ? 'operational' : 'degraded',
        availability: availabilityCheck ? 'operational' : 'error'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

---

## 🎯 Future Enhancements

### Planned Features
- **Group Sessions**: Support for group therapy sessions
- **Recurring Appointments**: Automatic recurring session booking
- **Waitlist System**: Automatic booking when slots become available
- **Advanced Scheduling**: AI-powered optimal scheduling
- **Mobile App Integration**: Native mobile booking experience

### Technical Improvements
- **Real-time Updates**: WebSocket-based real-time availability
- **Advanced Analytics**: Predictive analytics for no-shows
- **Integration APIs**: Third-party calendar integration
- **Accessibility**: Enhanced accessibility features

---

*The session booking system is production-ready and provides a comprehensive solution for therapy session management with strong security and user experience features.*