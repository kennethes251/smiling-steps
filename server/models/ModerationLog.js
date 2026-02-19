const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * ModerationLog Model
 * 
 * Tracks all moderation actions taken in chat rooms for audit purposes.
 * Records who performed the action, who was affected, and why.
 * 
 * Requirements: 4.6
 */
const ModerationLogSchema = new Schema({
  // Room where the action occurred
  room: {
    type: Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: [true, 'Room reference is required'],
    index: true
  },
  
  // Moderator who performed the action
  moderator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Moderator reference is required']
  },
  
  // Target user of the action (for user-related actions)
  targetUser: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Target message (for message-related actions)
  targetMessage: {
    type: Schema.Types.ObjectId,
    ref: 'RoomMessage'
  },
  
  // Type of moderation action
  action: {
    type: String,
    enum: [
      'mute',           // Temporarily prevent user from sending messages
      'unmute',         // Restore user's ability to send messages
      'kick',           // Remove user from room
      'ban',            // Permanently ban user from room
      'unban',          // Remove ban from user
      'delete_message', // Delete a message
      'edit_settings',  // Change room settings
      'assign_moderator',   // Assign moderator role
      'remove_moderator',   // Remove moderator role
      'transfer_ownership', // Transfer room ownership
      'lock_room',      // Lock room from new messages
      'unlock_room',    // Unlock room
      'archive_room',   // Archive the room
      'warn'            // Issue a warning to user
    ],
    required: [true, 'Action type is required']
  },
  
  // Reason for the action
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  
  // Duration in minutes (for mute actions)
  duration: {
    type: Number,
    min: 0
  },
  
  // Additional metadata about the action
  metadata: {
    // For settings changes
    previousSettings: Schema.Types.Mixed,
    newSettings: Schema.Types.Mixed,
    
    // For message deletion
    deletedMessageContent: String,
    
    // For ownership transfer
    previousOwner: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    newOwner: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // IP address of moderator (for security)
    ipAddress: String,
    
    // User agent of moderator
    userAgent: String,
    
    // Any additional context
    additionalInfo: Schema.Types.Mixed
  },
  
  // Whether the action was reversed
  isReversed: {
    type: Boolean,
    default: false
  },
  reversedAt: {
    type: Date
  },
  reversedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reversalReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// INDEXES for performance optimization
// ============================================

// Room moderation history
ModerationLogSchema.index({ room: 1, createdAt: -1 }, { name: 'idx_room_moderation' });

// Moderator activity
ModerationLogSchema.index({ moderator: 1, createdAt: -1 }, { name: 'idx_moderator_activity' });

// Target user history
ModerationLogSchema.index({ targetUser: 1, createdAt: -1 }, { name: 'idx_target_user_history' });

// Action type queries
ModerationLogSchema.index({ room: 1, action: 1, createdAt: -1 }, { name: 'idx_room_action_type' });

// Date range queries
ModerationLogSchema.index({ createdAt: -1 }, { name: 'idx_moderation_date' });

// ============================================
// VIRTUALS
// ============================================

// Virtual for action description
ModerationLogSchema.virtual('actionDescription').get(function() {
  const descriptions = {
    mute: 'Muted user',
    unmute: 'Unmuted user',
    kick: 'Kicked user from room',
    ban: 'Banned user from room',
    unban: 'Unbanned user',
    delete_message: 'Deleted message',
    edit_settings: 'Updated room settings',
    assign_moderator: 'Assigned moderator role',
    remove_moderator: 'Removed moderator role',
    transfer_ownership: 'Transferred room ownership',
    lock_room: 'Locked room',
    unlock_room: 'Unlocked room',
    archive_room: 'Archived room',
    warn: 'Issued warning'
  };
  return descriptions[this.action] || this.action;
});

// Virtual for formatted duration
ModerationLogSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return null;
  
  if (this.duration < 60) {
    return `${this.duration} minute${this.duration !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  
  if (hours < 24) {
    let result = `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (minutes > 0) {
      result += ` ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return result;
  }
  
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''}`;
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Reverse the moderation action
 */
ModerationLogSchema.methods.reverse = function(reversedBy, reason = null) {
  this.isReversed = true;
  this.reversedAt = new Date();
  this.reversedBy = reversedBy;
  if (reason) {
    this.reversalReason = reason;
  }
  return this;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Log a moderation action
 */
ModerationLogSchema.statics.logAction = function(data) {
  return this.create({
    room: data.room,
    moderator: data.moderator,
    targetUser: data.targetUser,
    targetMessage: data.targetMessage,
    action: data.action,
    reason: data.reason,
    duration: data.duration,
    metadata: data.metadata
  });
};

/**
 * Get moderation history for a room
 */
ModerationLogSchema.statics.getRoomHistory = function(roomId, options = {}) {
  const { limit = 50, skip = 0, action = null, startDate = null, endDate = null } = options;
  
  const query = { room: roomId };
  
  if (action) {
    query.action = action;
  }
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .populate('moderator', 'name profilePicture')
    .populate('targetUser', 'name profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Get moderation history for a user (as target)
 */
ModerationLogSchema.statics.getUserHistory = function(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  return this.find({ targetUser: userId })
    .populate('room', 'name')
    .populate('moderator', 'name profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Get actions performed by a moderator
 */
ModerationLogSchema.statics.getModeratorActions = function(moderatorId, options = {}) {
  const { limit = 50, skip = 0, roomId = null } = options;
  
  const query = { moderator: moderatorId };
  
  if (roomId) {
    query.room = roomId;
  }
  
  return this.find(query)
    .populate('room', 'name')
    .populate('targetUser', 'name profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Get action counts for a room
 */
ModerationLogSchema.statics.getActionCounts = function(roomId, startDate = null, endDate = null) {
  const match = { room: mongoose.Types.ObjectId(roomId) };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);
};

/**
 * Check if a user has recent moderation actions against them
 */
ModerationLogSchema.statics.hasRecentActions = async function(roomId, userId, actionTypes, withinMinutes = 60) {
  const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
  
  const count = await this.countDocuments({
    room: roomId,
    targetUser: userId,
    action: { $in: actionTypes },
    createdAt: { $gte: cutoff },
    isReversed: false
  });
  
  return count > 0;
};

module.exports = mongoose.model('ModerationLog', ModerationLogSchema);
