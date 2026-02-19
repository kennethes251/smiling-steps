const mongoose = require('mongoose');

const SessionRateSchema = new mongoose.Schema({
  // Therapist reference
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // Note: Compound indexes below cover therapist queries
  },
  
  // Session type
  sessionType: {
    type: String,
    enum: ['Individual', 'Couples', 'Family', 'Group'],
    required: true
    // Note: Compound indexes below cover sessionType queries
  },
  
  // Rate amount in KES
  amount: {
    type: Number,
    required: true,
    min: [0, 'Rate amount must be positive'],
    validate: {
      validator: function(value) {
        return Number.isInteger(value) && value >= 0;
      },
      message: 'Rate amount must be a positive integer'
    }
  },
  
  // Session duration in minutes
  duration: {
    type: Number,
    required: true,
    min: [15, 'Session duration must be at least 15 minutes'],
    max: [240, 'Session duration cannot exceed 240 minutes'],
    default: 60,
    validate: {
      validator: function(value) {
        return Number.isInteger(value) && value >= 15;
      },
      message: 'Duration must be a positive integer of at least 15 minutes'
    }
  },
  
  // When this rate becomes effective
  effectiveFrom: {
    type: Date,
    required: true,
    default: Date.now
    // Note: Compound indexes below cover effectiveFrom queries
  },
  
  // When this rate expires (null means current/active rate)
  effectiveTo: {
    type: Date,
    default: null
    // Note: effectiveTo is used in queries with effectiveFrom
  },
  
  // Whether this is the current active rate
  isActive: {
    type: Boolean,
    default: true
    // Note: Compound indexes below cover isActive queries
  },
  
  // Rate change reason/notes
  changeReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Change reason cannot exceed 500 characters']
  },
  
  // Who created/updated this rate
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Audit fields
  createdAt: {
    type: Date,
    default: Date.now
    // Note: createdAt is typically queried with other fields
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
SessionRateSchema.index({ therapist: 1, sessionType: 1, isActive: 1 });
SessionRateSchema.index({ therapist: 1, effectiveFrom: -1 });
SessionRateSchema.index({ therapist: 1, sessionType: 1, effectiveFrom: -1 });
SessionRateSchema.index({ isActive: 1, effectiveFrom: -1 });

// Ensure only one active rate per therapist per session type
SessionRateSchema.index(
  { therapist: 1, sessionType: 1, isActive: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { isActive: true },
    name: 'unique_active_rate_per_therapist_session_type'
  }
);

// Pre-save middleware to handle rate transitions
SessionRateSchema.pre('save', async function(next) {
  this.updatedAt = new Date();
  
  // If this is a new active rate, deactivate previous rates
  if (this.isNew && this.isActive) {
    await this.constructor.updateMany(
      {
        therapist: this.therapist,
        sessionType: this.sessionType,
        isActive: true,
        _id: { $ne: this._id }
      },
      {
        $set: {
          isActive: false,
          effectiveTo: this.effectiveFrom,
          updatedAt: new Date()
        }
      }
    );
  }
  
  next();
});

// Static method to get current rate for therapist and session type
SessionRateSchema.statics.getCurrentRate = async function(therapistId, sessionType) {
  const rate = await this.findOne({
    therapist: therapistId,
    sessionType: sessionType,
    isActive: true,
    effectiveFrom: { $lte: new Date() }
  }).populate('therapist', 'name email');
  
  return rate;
};

// Static method to get rate history for a therapist
SessionRateSchema.statics.getRateHistory = async function(therapistId, sessionType = null, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  const query = { therapist: therapistId };
  if (sessionType) {
    query.sessionType = sessionType;
  }
  
  return this.find(query)
    .sort({ effectiveFrom: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('createdBy', 'name email role')
    .exec();
};

// Static method to get all current rates for a therapist
SessionRateSchema.statics.getCurrentRates = async function(therapistId) {
  return this.find({
    therapist: therapistId,
    isActive: true,
    effectiveFrom: { $lte: new Date() }
  }).sort({ sessionType: 1 });
};

// Static method to create or update a rate
SessionRateSchema.statics.setRate = async function(therapistId, sessionType, amount, duration, createdBy, changeReason = null) {
  // Validate inputs
  if (!therapistId || !sessionType || !amount || !duration || !createdBy) {
    throw new Error('Missing required parameters for rate creation');
  }
  
  if (amount < 0 || !Number.isInteger(amount)) {
    throw new Error('Rate amount must be a positive integer');
  }
  
  if (duration < 15 || !Number.isInteger(duration)) {
    throw new Error('Duration must be a positive integer of at least 15 minutes');
  }
  
  // Create new rate (pre-save middleware will handle deactivating old rates)
  const newRate = new this({
    therapist: therapistId,
    sessionType: sessionType,
    amount: amount,
    duration: duration,
    effectiveFrom: new Date(),
    isActive: true,
    changeReason: changeReason,
    createdBy: createdBy
  });
  
  return newRate.save();
};

// Static method to get rate that was effective at a specific date (for historical bookings)
SessionRateSchema.statics.getRateAtDate = async function(therapistId, sessionType, date) {
  return this.findOne({
    therapist: therapistId,
    sessionType: sessionType,
    effectiveFrom: { $lte: date },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gt: date } }
    ]
  }).sort({ effectiveFrom: -1 });
};

// Instance method to deactivate this rate
SessionRateSchema.methods.deactivate = async function(effectiveTo = new Date()) {
  this.isActive = false;
  this.effectiveTo = effectiveTo;
  this.updatedAt = new Date();
  return this.save();
};

// Virtual for rate per minute (useful for billing calculations)
SessionRateSchema.virtual('ratePerMinute').get(function() {
  return this.duration > 0 ? this.amount / this.duration : 0;
});

// Virtual for formatted rate display
SessionRateSchema.virtual('formattedRate').get(function() {
  return `KES ${this.amount.toLocaleString()} for ${this.duration} minutes`;
});

// Ensure virtuals are included in JSON output
SessionRateSchema.set('toJSON', { virtuals: true });
SessionRateSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SessionRate', SessionRateSchema);