const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * RoomMessage Model
 * 
 * Represents a message sent within a chat room.
 * Supports mentions, read receipts, and message moderation.
 * 
 * Requirements: 3.2, 7.2
 */
const RoomMessageSchema = new Schema({
  // Room reference
  room: {
    type: Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: [true, 'Room reference is required'],
    index: true
  },
  
  // Sender information
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  
  // Message content
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
    trim: true
  },
  
  // Message type
  messageType: {
    type: String,
    enum: ['text', 'system', 'announcement'],
    default: 'text'
  },
  
  // Mentions - users mentioned in the message with @username
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Read receipts - tracks who has read the message
  readBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Deletion tracking
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: {
    type: Date
  },
  deletionReason: {
    type: String,
    trim: true
  },
  
  // Edit tracking
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  editHistory: [{
    content: {
      type: String,
      required: true
    },
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Reply functionality
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'RoomMessage'
  },
  
  // File attachments (for future use)
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file', 'audio', 'video']
    },
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String
    },
    size: {
      type: Number
    },
    mimeType: {
      type: String
    }
  }],
  
  // Reactions (for future use)
  reactions: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true,
      maxlength: 10
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
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


// ============================================
// INDEXES for performance optimization
// ============================================

// Compound index for efficient message retrieval by room and time
RoomMessageSchema.index({ room: 1, createdAt: -1 }, { name: 'idx_room_messages' });

// Index for sender queries
RoomMessageSchema.index({ sender: 1, createdAt: -1 }, { name: 'idx_sender_messages' });

// Text index for search functionality - Requirements 7.2
RoomMessageSchema.index({ content: 'text' }, { name: 'idx_message_search' });

// Index for unread messages queries
RoomMessageSchema.index({ room: 1, 'readBy.user': 1 }, { name: 'idx_unread_messages' });

// Index for non-deleted messages
RoomMessageSchema.index({ room: 1, isDeleted: 1, createdAt: -1 }, { name: 'idx_active_messages' });

// Index for mentions
RoomMessageSchema.index({ mentions: 1, createdAt: -1 }, { name: 'idx_mentions' });

// ============================================
// VIRTUALS
// ============================================

// Virtual for read count
RoomMessageSchema.virtual('readCount').get(function() {
  return this.readBy ? this.readBy.length : 0;
});

// Virtual for message status
RoomMessageSchema.virtual('status').get(function() {
  if (this.isDeleted) return 'deleted';
  if (this.isEdited) return 'edited';
  return 'sent';
});

// Virtual for time ago
RoomMessageSchema.virtual('timeAgo').get(function() {
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

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if a user has read this message
 */
RoomMessageSchema.methods.isReadBy = function(userId) {
  const userIdStr = userId.toString();
  return this.readBy.some(r => r.user.toString() === userIdStr);
};

/**
 * Mark message as read by a user
 */
RoomMessageSchema.methods.markAsRead = function(userId) {
  if (!this.isReadBy(userId)) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
  return this;
};

/**
 * Soft delete the message
 */
RoomMessageSchema.methods.softDelete = function(deletedBy, reason = null) {
  this.isDeleted = true;
  this.deletedBy = deletedBy;
  this.deletedAt = new Date();
  if (reason) {
    this.deletionReason = reason;
  }
  return this;
};

/**
 * Edit the message content
 */
RoomMessageSchema.methods.editContent = function(newContent) {
  // Store original content in history
  this.editHistory.push({
    content: this.content,
    editedAt: new Date()
  });
  
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  
  return this;
};

/**
 * Add a reaction to the message
 */
RoomMessageSchema.methods.addReaction = function(userId, emoji) {
  const userIdStr = userId.toString();
  
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => r.user.toString() !== userIdStr);
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji,
    createdAt: new Date()
  });
  
  return this;
};

/**
 * Remove a reaction from the message
 */
RoomMessageSchema.methods.removeReaction = function(userId) {
  const userIdStr = userId.toString();
  this.reactions = this.reactions.filter(r => r.user.toString() !== userIdStr);
  return this;
};

/**
 * Parse mentions from content
 * Returns array of usernames mentioned with @
 */
RoomMessageSchema.methods.parseMentions = function() {
  const mentionRegex = /@(\w+)/g;
  const matches = this.content.match(mentionRegex);
  if (!matches) return [];
  return matches.map(m => m.substring(1)); // Remove @ prefix
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get messages for a room with pagination
 */
RoomMessageSchema.statics.getMessages = function(roomId, options = {}) {
  const { 
    limit = 50, 
    before = null, 
    after = null,
    includeDeleted = false 
  } = options;
  
  const query = { room: roomId };
  
  if (!includeDeleted) {
    query.isDeleted = false;
  }
  
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  } else if (after) {
    query.createdAt = { $gt: new Date(after) };
  }
  
  return this.find(query)
    .populate('sender', 'name profilePicture')
    .populate('mentions', 'name')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Search messages in a room
 */
RoomMessageSchema.statics.searchMessages = function(roomId, searchTerm, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  return this.find({
    room: roomId,
    isDeleted: false,
    $text: { $search: searchTerm }
  })
  .populate('sender', 'name profilePicture')
  .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

/**
 * Get unread count for a user in a room
 */
RoomMessageSchema.statics.getUnreadCount = function(roomId, userId, lastReadAt) {
  const query = {
    room: roomId,
    isDeleted: false,
    sender: { $ne: userId }
  };
  
  if (lastReadAt) {
    query.createdAt = { $gt: lastReadAt };
  }
  
  return this.countDocuments(query);
};

/**
 * Mark all messages as read for a user in a room
 */
RoomMessageSchema.statics.markAllAsRead = async function(roomId, userId, beforeDate = new Date()) {
  const messages = await this.find({
    room: roomId,
    isDeleted: false,
    createdAt: { $lte: beforeDate },
    'readBy.user': { $ne: userId }
  });
  
  const bulkOps = messages.map(msg => ({
    updateOne: {
      filter: { _id: msg._id },
      update: {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    }
  }));
  
  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }
  
  return messages.length;
};

/**
 * Get messages mentioning a specific user
 */
RoomMessageSchema.statics.getMentions = function(userId, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  return this.find({
    mentions: userId,
    isDeleted: false
  })
  .populate('room', 'name')
  .populate('sender', 'name profilePicture')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// ============================================
// MIDDLEWARE
// ============================================

// Pre-save middleware to update room's message count and last activity
RoomMessageSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const ChatRoom = mongoose.model('ChatRoom');
      await ChatRoom.findByIdAndUpdate(this.room, {
        $inc: { messageCount: 1 },
        lastActivity: new Date()
      });
    } catch (error) {
      console.error('Error updating room stats:', error);
    }
  }
  next();
});

module.exports = mongoose.model('RoomMessage', RoomMessageSchema);
