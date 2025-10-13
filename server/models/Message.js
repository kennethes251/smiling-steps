const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'emoji', 'system'],
    default: 'text'
  },
  
  // Read status and delivery tracking
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date
  },
  deliveredAt: {
    type: Date,
    default: Date.now
  },
  
  // Message editing and deletion
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  
  // Reply functionality
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // File attachments
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file', 'audio', 'video']
    },
    url: String,
    filename: String,
    size: Number,
    mimeType: String
  }],
  
  // Emoji reactions
  reactions: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      maxlength: 10
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message priority for therapeutic context
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Therapeutic context flags
  isTherapeuticNote: {
    type: Boolean,
    default: false
  },
  
  // Message metadata
  metadata: {
    deviceInfo: String,
    ipAddress: String,
    userAgent: String
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for message status
MessageSchema.virtual('status').get(function() {
  if (this.isDeleted) return 'deleted';
  if (this.isRead) return 'read';
  if (this.deliveredAt) return 'delivered';
  return 'sent';
});

// Virtual for formatted timestamp
MessageSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
});

// Instance method to mark as read
MessageSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Instance method to soft delete
MessageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Static method to get unread count for user
MessageSchema.statics.getUnreadCount = function(userId, conversationId) {
  return this.countDocuments({
    conversation: conversationId,
    sender: { $ne: userId },
    isRead: false,
    isDeleted: false
  });
};

// Index for better query performance
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ isRead: 1, conversation: 1 });

module.exports = mongoose.model('Message', MessageSchema);
