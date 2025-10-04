const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  mood: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  energy: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  sleepHours: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  sleepQuality: {
    type: String,
    required: true,
    enum: ['poor', 'fair', 'good', 'excellent']
  },
  stressLevel: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  anxiety: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  activities: [{
    type: String
  }],
  symptoms: [{
    type: String
  }],
  gratitude: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Ensure one check-in per user per day
checkInSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('CheckIn', checkInSchema);