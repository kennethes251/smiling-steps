const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
  // Legacy fields kept for backward compatibility
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  psychologist: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  // Flexible participants array supports any role pair:
  // client<->psychologist, psychologist<->admin, etc.
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  assessmentResult: {
    type: Schema.Types.ObjectId,
    ref: 'AssessmentResult',
  },
  lastMessage: {
    text: String,
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
  },
}, { timestamps: true });

// Index for fast participant lookups
ConversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
