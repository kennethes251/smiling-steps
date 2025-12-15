const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  psychologist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sessionType: {
    type: String,
    enum: ['Individual', 'Couples', 'Family', 'Group'],
    required: true,
  },
  sessionDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Booked', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  meetingLink: {
    type: String,
    trim: true,
  },
  sessionNotes: {
    type: String,
    trim: true,
  },
  sessionProof: {
    type: String, // URL to the uploaded proof image
  },
  price: {
    type: Number,
    required: true,
  },
  // Video call specific fields
  isVideoCall: {
    type: Boolean,
    default: true,
  },
  videoCallStarted: {
    type: Date,
  },
  videoCallEnded: {
    type: Date,
  },
  callDuration: {
    type: Number, // in minutes
  },
  isInstantSession: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    trim: true,
  },
  // Recording settings (for future implementation)
  recordingEnabled: {
    type: Boolean,
    default: false,
  },
  recordingUrl: {
    type: String,
    trim: true,
  },
  
  // Payment fields
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Confirmed'],
    default: 'Pending'
  },
  paymentAmount: {
    type: Number,
    default: 0
  },
  paymentInstructions: {
    type: String,
    default: 'Send payment to M-Pesa number: 0707439299'
  },
  paymentNotifiedAt: {
    type: Date
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Session', SessionSchema);
