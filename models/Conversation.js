const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  psychologist: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
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

module.exports = mongoose.model('Conversation', ConversationSchema);
