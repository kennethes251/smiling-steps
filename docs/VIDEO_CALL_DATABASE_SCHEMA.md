# Video Call Database Schema

## Overview

This document describes the database schema extensions and new collections required for the video call feature. The system uses MongoDB as the primary database.

## Schema Extensions

### Session Model Extensions

The existing Session model is extended with video call specific fields:

```javascript
const sessionSchema = new mongoose.Schema({
  // Existing fields (preserved)
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  psychologistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionDate: {
    type: Date,
    required: true
  },
  sessionType: {
    type: String,
    enum: ['Individual', 'Group', 'Assessment'],
    default: 'Individual'
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'Declined'],
    default: 'Pending'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  
  // Video call specific fields (new)
  meetingLink: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  isVideoCall: {
    type: Boolean,
    default: true
  },
  videoCallStarted: {
    type: Date,
    default: null,
    index: true
  },
  videoCallEnded: {
    type: Date,
    default: null
  },
  callDuration: {
    type: Number, // Duration in minutes
    default: 0,
    min: 0
  },
  
  // Future enhancement fields
  recordingEnabled: {
    type: Boolean,
    default: false
  },
  recordingUrl: {
    type: String,
    default: null
  },
  
  // Audit and tracking fields
  lastAccessedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  accessCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
sessionSchema.index({ meetingLink: 1 });
sessionSchema.index({ videoCallStarted: 1 });
sessionSchema.index({ lastAccessedAt: 1 });
sessionSchema.index({ clientId: 1, sessionDate: 1 });
sessionSchema.index({ psychologistId: 1, sessionDate: 1 });
sessionSchema.index({ status: 1, sessionDate: 1 });

// Pre-save middleware to update timestamps
sessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for formatted duration
sessionSchema.virtual('formattedDuration').get(function() {
  if (this.callDuration === 0) return 'Not started';
  const hours = Math.floor(this.callDuration / 60);
  const minutes = this.callDuration % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

module.exports = mongoose.model('Session', sessionSchema);
```

## New Collections

### VideoCallAuditLog Collection

Tracks all video call access attempts and activities for compliance and debugging:

```javascript
const videoCallAuditLogSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: [
      'join_attempt',
      'join_success',
      'join_denied',
      'call_start',
      'call_end',
      'connection_established',
      'connection_failed',
      'permission_denied',
      'error_occurred'
    ],
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: Object,
    default: {}
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  roomId: {
    type: String,
    index: true
  },
  errorCode: {
    type: String,
    sparse: true
  },
  errorMessage: {
    type: String,
    sparse: true
  },
  duration: {
    type: Number, // For call_end actions
    min: 0
  }
});

// Compound indexes for common queries
videoCallAuditLogSchema.index({ sessionId: 1, timestamp: -1 });
videoCallAuditLogSchema.index({ userId: 1, timestamp: -1 });
videoCallAuditLogSchema.index({ action: 1, timestamp: -1 });
videoCallAuditLogSchema.index({ timestamp: -1 }); // For cleanup queries

// TTL index to automatically delete old audit logs (6 months)
videoCallAuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 15552000 });

module.exports = mongoose.model('VideoCallAuditLog', videoCallAuditLogSchema);
```

### VideoCallMetrics Collection

Stores aggregated metrics for monitoring and analytics:

```javascript
const videoCallMetricsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  period: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    required: true,
    index: true
  },
  
  // Connection metrics
  totalAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  successfulConnections: {
    type: Number,
    default: 0,
    min: 0
  },
  failedConnections: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Call metrics
  totalCalls: {
    type: Number,
    default: 0,
    min: 0
  },
  completedCalls: {
    type: Number,
    default: 0,
    min: 0
  },
  averageDuration: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDuration: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Error metrics
  errorCounts: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // Performance metrics
  averageConnectionTime: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // User metrics
  uniqueUsers: {
    type: Number,
    default: 0,
    min: 0
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes
videoCallMetricsSchema.index({ period: 1, date: -1 });
videoCallMetricsSchema.index({ date: -1 });

// Pre-save middleware
videoCallMetricsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('VideoCallMetrics', videoCallMetricsSchema);
```

## Data Relationships

### Entity Relationship Diagram

```
User (Client/Psychologist)
│
├── 1:N → Session
│   ├── meetingLink (unique)
│   ├── videoCallStarted
│   ├── videoCallEnded
│   └── callDuration
│
├── 1:N → VideoCallAuditLog
│   ├── sessionId → Session
│   ├── action
│   ├── timestamp
│   └── metadata
│
└── VideoCallMetrics (aggregated)
    ├── date
    ├── period
    └── metrics
```

### Query Patterns

#### Common Queries

**Find active video calls:**
```javascript
const activeCalls = await Session.find({
  status: 'In Progress',
  videoCallStarted: { $ne: null },
  videoCallEnded: null
});
```

**Get session by meeting link:**
```javascript
const session = await Session.findOne({
  meetingLink: roomId
}).populate('clientId psychologistId');
```

**Get user's upcoming video sessions:**
```javascript
const upcomingSessions = await Session.find({
  $or: [
    { clientId: userId },
    { psychologistId: userId }
  ],
  sessionDate: { $gte: new Date() },
  status: 'Confirmed',
  isVideoCall: true
}).sort({ sessionDate: 1 });
```

**Audit log for session:**
```javascript
const auditLogs = await VideoCallAuditLog.find({
  sessionId: sessionId
}).sort({ timestamp: -1 });
```

**Daily metrics:**
```javascript
const dailyMetrics = await VideoCallMetrics.findOne({
  date: {
    $gte: startOfDay,
    $lt: endOfDay
  },
  period: 'daily'
});
```

## Migration Scripts

### Add Video Call Fields to Existing Sessions

```javascript
// Migration script: add-video-call-fields.js
const mongoose = require('mongoose');
const Session = require('../models/Session');

async function migrateVideoCallFields() {
  try {
    // Add video call fields to existing sessions
    const result = await Session.updateMany(
      { isVideoCall: { $exists: false } },
      {
        $set: {
          isVideoCall: true,
          callDuration: 0,
          accessCount: 0,
          lastAccessedAt: new Date()
        }
      }
    );
    
    console.log(`Updated ${result.modifiedCount} sessions`);
    
    // Generate meeting links for confirmed sessions without them
    const sessionsWithoutLinks = await Session.find({
      status: 'Confirmed',
      meetingLink: { $exists: false }
    });
    
    for (const session of sessionsWithoutLinks) {
      session.meetingLink = `room-${session._id}-${Date.now()}`;
      await session.save();
    }
    
    console.log(`Generated meeting links for ${sessionsWithoutLinks.length} sessions`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

module.exports = migrateVideoCallFields;
```

### Create Indexes

```javascript
// Migration script: create-video-call-indexes.js
const mongoose = require('mongoose');

async function createVideoCallIndexes() {
  const db = mongoose.connection.db;
  
  try {
    // Session collection indexes
    await db.collection('sessions').createIndex({ meetingLink: 1 }, { unique: true, sparse: true });
    await db.collection('sessions').createIndex({ videoCallStarted: 1 });
    await db.collection('sessions').createIndex({ lastAccessedAt: 1 });
    
    // VideoCallAuditLog collection indexes
    await db.collection('videocallauditlogs').createIndex({ sessionId: 1, timestamp: -1 });
    await db.collection('videocallauditlogs').createIndex({ userId: 1, timestamp: -1 });
    await db.collection('videocallauditlogs').createIndex({ action: 1, timestamp: -1 });
    await db.collection('videocallauditlogs').createIndex({ timestamp: 1 }, { expireAfterSeconds: 15552000 });
    
    // VideoCallMetrics collection indexes
    await db.collection('videocallmetrics').createIndex({ period: 1, date: -1 });
    await db.collection('videocallmetrics').createIndex({ date: -1 });
    
    console.log('Video call indexes created successfully');
    
  } catch (error) {
    console.error('Index creation failed:', error);
  }
}

module.exports = createVideoCallIndexes;
```

## Data Validation

### Session Validation Rules

```javascript
// Custom validation for video call fields
sessionSchema.pre('save', function(next) {
  // Validate call duration consistency
  if (this.videoCallStarted && this.videoCallEnded) {
    const duration = Math.round((this.videoCallEnded - this.videoCallStarted) / (1000 * 60));
    if (Math.abs(this.callDuration - duration) > 1) {
      return next(new Error('Call duration inconsistent with start/end times'));
    }
  }
  
  // Validate meeting link format
  if (this.meetingLink && !this.meetingLink.match(/^room-[a-f0-9-]+$/)) {
    return next(new Error('Invalid meeting link format'));
  }
  
  // Ensure video call sessions have meeting links
  if (this.isVideoCall && this.status === 'Confirmed' && !this.meetingLink) {
    this.meetingLink = `room-${this._id}-${Date.now()}`;
  }
  
  next();
});
```

### Audit Log Validation

```javascript
// Validation for audit log entries
videoCallAuditLogSchema.pre('save', function(next) {
  // Validate required metadata for specific actions
  if (this.action === 'call_end' && !this.duration) {
    return next(new Error('Duration required for call_end action'));
  }
  
  if (this.action === 'error_occurred' && !this.errorCode) {
    return next(new Error('Error code required for error_occurred action'));
  }
  
  next();
});
```

## Performance Considerations

### Indexing Strategy

1. **Primary Indexes**: On frequently queried fields (meetingLink, sessionId, userId)
2. **Compound Indexes**: For complex queries (userId + timestamp, sessionId + timestamp)
3. **TTL Indexes**: For automatic cleanup of old audit logs
4. **Sparse Indexes**: For optional fields (meetingLink, errorCode)

### Query Optimization

1. **Projection**: Only select needed fields in queries
2. **Pagination**: Use skip/limit for large result sets
3. **Aggregation**: Use MongoDB aggregation pipeline for complex analytics
4. **Caching**: Cache frequently accessed session data

### Data Archival

```javascript
// Archive old audit logs
const archiveOldAuditLogs = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const oldLogs = await VideoCallAuditLog.find({
    timestamp: { $lt: sixMonthsAgo }
  });
  
  // Archive to separate collection or external storage
  // Then delete from main collection
  await VideoCallAuditLog.deleteMany({
    timestamp: { $lt: sixMonthsAgo }
  });
};
```

## Backup and Recovery

### Backup Strategy

1. **Daily Backups**: Full database backup daily
2. **Incremental Backups**: Hourly incremental backups
3. **Point-in-Time Recovery**: Enable oplog for point-in-time recovery
4. **Cross-Region Replication**: Replicate to secondary region

### Recovery Procedures

1. **Session Recovery**: Restore session data from backup
2. **Audit Log Recovery**: Restore audit logs for compliance
3. **Metrics Recovery**: Recalculate metrics from audit logs if needed

This database schema provides a robust foundation for the video call feature while maintaining data integrity and performance.