/**
 * AvailabilityWindow Model
 * 
 * Implements Requirements 2.1, 2.5 from teletherapy-booking-enhancement
 * - Define schema with therapist, day, start/end times
 * - Add recurring vs one-time flag
 * - Add active/inactive status
 * - Create indexes for efficient querying
 */

const mongoose = require('mongoose');

const AvailabilityWindowSchema = new mongoose.Schema({
  // Reference to the therapist (psychologist)
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Therapist reference is required']
    // Note: Compound indexes below cover therapist queries
  },

  // Type of availability window
  windowType: {
    type: String,
    enum: ['recurring', 'one-time', 'exception'],
    default: 'recurring',
    required: true
  },

  // For recurring windows: day of week (0 = Sunday, 6 = Saturday)
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    required: function() {
      return this.windowType === 'recurring';
    },
    validate: {
      validator: function(v) {
        if (this.windowType === 'recurring') {
          return v !== null && v !== undefined && v >= 0 && v <= 6;
        }
        return true;
      },
      message: 'Day of week is required for recurring availability windows'
    }
  },

  // For one-time windows: specific date
  specificDate: {
    type: Date,
    required: function() {
      return this.windowType === 'one-time' || this.windowType === 'exception';
    },
    validate: {
      validator: function(v) {
        if (this.windowType === 'one-time' || this.windowType === 'exception') {
          return v !== null && v !== undefined;
        }
        return true;
      },
      message: 'Specific date is required for one-time or exception windows'
    }
  },

  // Start time in HH:MM format (24-hour)
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
  },

  // End time in HH:MM format (24-hour)
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
  },

  // Duration in minutes (calculated from start/end times)
  durationMinutes: {
    type: Number,
    min: 15,
    max: 720 // Max 12 hours
  },

  // Active/inactive status
  isActive: {
    type: Boolean,
    default: true
    // Note: Compound indexes below cover isActive queries
  },

  // Title/label for the availability window
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },

  // Notes about this availability window
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Session types available during this window
  sessionTypes: [{
    type: String,
    enum: ['Individual', 'Couples', 'Family', 'Group']
  }],

  // Maximum sessions that can be booked during this window
  maxSessions: {
    type: Number,
    default: null, // null means unlimited
    min: 1
  },

  // Recurrence pattern for recurring windows
  recurrence: {
    // How often the pattern repeats
    frequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
      default: 'weekly'
    },
    // Start date for the recurrence pattern
    startDate: {
      type: Date
    },
    // End date for the recurrence pattern (null = indefinite)
    endDate: {
      type: Date
    },
    // Specific weeks of the month (for monthly recurrence)
    weeksOfMonth: [{
      type: Number,
      min: 1,
      max: 5
    }]
  },

  // Timezone for this availability window
  timezone: {
    type: String,
    default: 'Africa/Nairobi' // Kenya timezone
  },

  // Booking buffer time in minutes (time before/after sessions)
  bufferMinutes: {
    type: Number,
    default: 15,
    min: 0,
    max: 60
  },

  // Minimum advance booking time in hours
  minAdvanceBookingHours: {
    type: Number,
    default: 24,
    min: 0
  },

  // Maximum advance booking time in days
  maxAdvanceBookingDays: {
    type: Number,
    default: 30,
    min: 1,
    max: 365
  },

  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deactivatedAt: {
    type: Date
  },
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deactivationReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// INDEXES for efficient querying (Requirement 2.1)
// ============================================

// Compound index for therapist availability lookups
AvailabilityWindowSchema.index({ therapist: 1, isActive: 1, windowType: 1 });

// Index for recurring windows by day of week
AvailabilityWindowSchema.index({ therapist: 1, dayOfWeek: 1, isActive: 1 });

// Index for one-time windows by specific date
AvailabilityWindowSchema.index({ therapist: 1, specificDate: 1, isActive: 1 });

// Index for finding windows within date ranges
AvailabilityWindowSchema.index({ 'recurrence.startDate': 1, 'recurrence.endDate': 1 });

// Index for efficient time-based queries
AvailabilityWindowSchema.index({ startTime: 1, endTime: 1 });

// ============================================
// VIRTUALS
// ============================================

/**
 * Virtual: Get day name from dayOfWeek
 */
AvailabilityWindowSchema.virtual('dayName').get(function() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return this.dayOfWeek !== undefined ? days[this.dayOfWeek] : null;
});

/**
 * Virtual: Check if window is currently active and valid
 */
AvailabilityWindowSchema.virtual('isCurrentlyValid').get(function() {
  if (!this.isActive) return false;
  
  const now = new Date();
  
  // Check recurrence date range
  if (this.recurrence) {
    if (this.recurrence.startDate && now < this.recurrence.startDate) return false;
    if (this.recurrence.endDate && now > this.recurrence.endDate) return false;
  }
  
  // For one-time windows, check if the date has passed
  if (this.windowType === 'one-time' && this.specificDate) {
    const windowDate = new Date(this.specificDate);
    windowDate.setHours(23, 59, 59, 999);
    if (now > windowDate) return false;
  }
  
  return true;
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

/**
 * Calculate duration in minutes before saving
 */
AvailabilityWindowSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const [startH, startM] = this.startTime.split(':').map(Number);
    const [endH, endM] = this.endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    this.durationMinutes = endMinutes - startMinutes;
  }
  next();
});

/**
 * Validate that startTime is before endTime
 */
AvailabilityWindowSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const [startH, startM] = this.startTime.split(':').map(Number);
    const [endH, endM] = this.endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (startMinutes >= endMinutes) {
      return next(new Error('Start time must be before end time'));
    }
  }
  next();
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find all active availability windows for a therapist
 * @param {ObjectId} therapistId - The therapist's user ID
 * @returns {Promise<Array>} - Array of active availability windows
 */
AvailabilityWindowSchema.statics.findActiveByTherapist = async function(therapistId) {
  return this.find({
    therapist: therapistId,
    isActive: true
  }).sort({ dayOfWeek: 1, startTime: 1 });
};

/**
 * Find availability windows for a specific date
 * @param {ObjectId} therapistId - The therapist's user ID
 * @param {Date} date - The date to check
 * @returns {Promise<Array>} - Array of availability windows for that date
 */
AvailabilityWindowSchema.statics.findForDate = async function(therapistId, date) {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  const dateOnly = new Date(targetDate.toISOString().split('T')[0]);
  
  // Find recurring windows for this day of week
  const recurringWindows = await this.find({
    therapist: therapistId,
    isActive: true,
    windowType: 'recurring',
    dayOfWeek: dayOfWeek,
    $or: [
      { 'recurrence.startDate': { $exists: false } },
      { 'recurrence.startDate': { $lte: targetDate } }
    ],
    $or: [
      { 'recurrence.endDate': { $exists: false } },
      { 'recurrence.endDate': null },
      { 'recurrence.endDate': { $gte: targetDate } }
    ]
  });
  
  // Find one-time windows for this specific date
  const startOfDay = new Date(dateOnly);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateOnly);
  endOfDay.setHours(23, 59, 59, 999);
  
  const oneTimeWindows = await this.find({
    therapist: therapistId,
    isActive: true,
    windowType: 'one-time',
    specificDate: { $gte: startOfDay, $lte: endOfDay }
  });
  
  // Find exception windows (blocked times) for this date
  const exceptionWindows = await this.find({
    therapist: therapistId,
    isActive: true,
    windowType: 'exception',
    specificDate: { $gte: startOfDay, $lte: endOfDay }
  });
  
  return {
    recurring: recurringWindows,
    oneTime: oneTimeWindows,
    exceptions: exceptionWindows
  };
};

/**
 * Check if a time slot is available
 * @param {ObjectId} therapistId - The therapist's user ID
 * @param {Date} startDateTime - Start of the proposed slot
 * @param {Date} endDateTime - End of the proposed slot
 * @returns {Promise<Object>} - { available: boolean, reason?: string }
 */
AvailabilityWindowSchema.statics.isSlotAvailable = async function(therapistId, startDateTime, endDateTime) {
  const windows = await this.findForDate(therapistId, startDateTime);
  
  const startTime = startDateTime.toTimeString().slice(0, 5);
  const endTime = endDateTime.toTimeString().slice(0, 5);
  
  // Check if there's an exception (blocked time) that covers this slot
  for (const exception of windows.exceptions) {
    if (this.timesOverlap(startTime, endTime, exception.startTime, exception.endTime)) {
      return { available: false, reason: 'Time slot is blocked by therapist' };
    }
  }
  
  // Check if slot falls within any availability window
  const allAvailableWindows = [...windows.recurring, ...windows.oneTime];
  
  for (const window of allAvailableWindows) {
    if (this.timeWithinWindow(startTime, endTime, window.startTime, window.endTime)) {
      return { available: true };
    }
  }
  
  return { available: false, reason: 'Time slot is outside therapist availability' };
};

/**
 * Helper: Check if two time ranges overlap
 */
AvailabilityWindowSchema.statics.timesOverlap = function(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
};

/**
 * Helper: Check if a time range is within a window
 */
AvailabilityWindowSchema.statics.timeWithinWindow = function(slotStart, slotEnd, windowStart, windowEnd) {
  return slotStart >= windowStart && slotEnd <= windowEnd;
};

/**
 * Get available time slots for a therapist on a specific date
 * @param {ObjectId} therapistId - The therapist's user ID
 * @param {Date} date - The date to check
 * @param {Number} slotDurationMinutes - Duration of each slot (default 60)
 * @returns {Promise<Array>} - Array of available time slots
 */
AvailabilityWindowSchema.statics.getAvailableSlots = async function(therapistId, date, slotDurationMinutes = 60) {
  const windows = await this.findForDate(therapistId, date);
  const allWindows = [...windows.recurring, ...windows.oneTime];
  const exceptions = windows.exceptions;
  
  const slots = [];
  
  for (const window of allWindows) {
    const [startH, startM] = window.startTime.split(':').map(Number);
    const [endH, endM] = window.endTime.split(':').map(Number);
    
    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const bufferMinutes = window.bufferMinutes || 15;
    
    while (currentMinutes + slotDurationMinutes <= endMinutes) {
      const slotStartH = Math.floor(currentMinutes / 60);
      const slotStartM = currentMinutes % 60;
      const slotEndMinutes = currentMinutes + slotDurationMinutes;
      const slotEndH = Math.floor(slotEndMinutes / 60);
      const slotEndM = slotEndMinutes % 60;
      
      const slotStart = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`;
      const slotEnd = `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`;
      
      // Check if slot overlaps with any exception
      let isBlocked = false;
      for (const exception of exceptions) {
        if (this.timesOverlap(slotStart, slotEnd, exception.startTime, exception.endTime)) {
          isBlocked = true;
          break;
        }
      }
      
      if (!isBlocked) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          windowId: window._id,
          sessionTypes: window.sessionTypes || ['Individual', 'Couples', 'Family', 'Group']
        });
      }
      
      currentMinutes += slotDurationMinutes + bufferMinutes;
    }
  }
  
  return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Deactivate this availability window
 * @param {ObjectId} userId - User performing the deactivation
 * @param {String} reason - Reason for deactivation
 */
AvailabilityWindowSchema.methods.deactivate = async function(userId, reason) {
  this.isActive = false;
  this.deactivatedAt = new Date();
  this.deactivatedBy = userId;
  this.deactivationReason = reason;
  return this.save();
};

/**
 * Reactivate this availability window
 * @param {ObjectId} userId - User performing the reactivation
 */
AvailabilityWindowSchema.methods.reactivate = async function(userId) {
  this.isActive = true;
  this.deactivatedAt = null;
  this.deactivatedBy = null;
  this.deactivationReason = null;
  this.updatedBy = userId;
  return this.save();
};

/**
 * Check if this window conflicts with another window
 * @param {Object} otherWindow - Another availability window to check against
 * @returns {Boolean} - True if there's a conflict
 */
AvailabilityWindowSchema.methods.conflictsWith = function(otherWindow) {
  // Different therapists can't conflict
  if (this.therapist.toString() !== otherWindow.therapist.toString()) {
    return false;
  }
  
  // Check if same day/date
  let sameDay = false;
  
  if (this.windowType === 'recurring' && otherWindow.windowType === 'recurring') {
    sameDay = this.dayOfWeek === otherWindow.dayOfWeek;
  } else if (this.windowType !== 'recurring' && otherWindow.windowType !== 'recurring') {
    const date1 = new Date(this.specificDate).toISOString().split('T')[0];
    const date2 = new Date(otherWindow.specificDate).toISOString().split('T')[0];
    sameDay = date1 === date2;
  }
  
  if (!sameDay) return false;
  
  // Check time overlap
  return this.constructor.timesOverlap(
    this.startTime, this.endTime,
    otherWindow.startTime, otherWindow.endTime
  );
};

// Export the model
module.exports = mongoose.model('AvailabilityWindow', AvailabilityWindowSchema);
