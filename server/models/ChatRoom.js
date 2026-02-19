const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * ChatRoom Model
 * 
 * Represents a virtual space where multiple users can communicate simultaneously.
 * Supports support groups, therapy groups, community discussions, and private rooms.
 * 
 * Requirements: 1.1, 1.2, 1.3, 5.2
 */
const ChatRoomSchema = new Schema({
  // Room identification and basic info
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    maxlength: [100, 'Room name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  roomType: {
    type: String,
    enum: ['support_group', 'therapy_group', 'community', 'private'],
    required: [true, 'Room type is required']
  },
  
  // Ownership and moderation
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Room owner is required']
  },
  moderators: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Participants with their roles and status
  participants: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['participant', 'moderator', 'owner'],
      default: 'participant'
    },
    isMuted: {
      type: Boolean,
      default: false
    },
    mutedUntil: {
      type: Date
    },
    mutedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    muteReason: {
      type: String,
      trim: true
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Banned users list
  bannedUsers: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    bannedAt: {
      type: Date,
      default: Date.now
    },
    bannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      trim: true
    }
  }],
  
  // Room settings - Requirements 5.2
  settings: {
    maxParticipants: {
      type: Number,
      default: 50,
      min: [1, 'Minimum participants is 1'],
      max: [100, 'Maximum participants is 100']
    },
    isJoinable: {
      type: Boolean,
      default: true
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    messageRetentionDays: {
      type: Number,
      default: 90,
      min: 1
    },
    allowFileSharing: {
      type: Boolean,
      default: false
    }
  },
  
  // Scheduled sessions for group therapy - Requirements 10.1, 10.4
  scheduledSessions: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Session title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Session description cannot exceed 500 characters']
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    cancelledAt: {
      type: Date
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    cancellationReason: {
      type: String,
      trim: true
    }
  }],
  
  // Room activity tracking
  lastActivity: {
    type: Date,
    default: Date.now
  },
  messageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Room status
  isActive: {
    type: Boolean,
    default: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedAt: {
    type: Date
  },
  lockedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Invitation system for private rooms
  invitations: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending'
    },
    expiresAt: {
      type: Date
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


// ============================================
// INDEXES for performance optimization
// ============================================

// Room discovery queries - find public/community rooms
ChatRoomSchema.index({ roomType: 1, isActive: 1, 'settings.isPublic': 1 }, { name: 'idx_room_discovery' });

// Owner queries - find rooms owned by a user
ChatRoomSchema.index({ owner: 1, isActive: 1 }, { name: 'idx_owner_rooms' });

// Participant queries - find rooms a user is in
ChatRoomSchema.index({ 'participants.user': 1, isActive: 1 }, { name: 'idx_participant_rooms' });

// Last activity for sorting
ChatRoomSchema.index({ lastActivity: -1 }, { name: 'idx_last_activity' });

// Room name search
ChatRoomSchema.index({ name: 'text', description: 'text' }, { name: 'idx_room_search' });

// Scheduled sessions queries
ChatRoomSchema.index({ 'scheduledSessions.startTime': 1, 'scheduledSessions.isActive': 1 }, { name: 'idx_scheduled_sessions' });

// ============================================
// VIRTUALS
// ============================================

// Virtual for participant count
ChatRoomSchema.virtual('participantCount').get(function() {
  return this.participants ? this.participants.length : 0;
});

// Virtual for active session
ChatRoomSchema.virtual('activeSession').get(function() {
  if (!this.scheduledSessions) return null;
  return this.scheduledSessions.find(session => session.isActive && !session.cancelledAt);
});

// Virtual for upcoming sessions
ChatRoomSchema.virtual('upcomingSessions').get(function() {
  if (!this.scheduledSessions) return [];
  const now = new Date();
  return this.scheduledSessions
    .filter(session => session.startTime > now && !session.cancelledAt)
    .sort((a, b) => a.startTime - b.startTime);
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if a user is a participant in the room
 */
ChatRoomSchema.methods.isParticipant = function(userId) {
  const userIdStr = userId.toString();
  return this.participants.some(p => p.user.toString() === userIdStr);
};

/**
 * Check if a user is a moderator in the room
 */
ChatRoomSchema.methods.isModerator = function(userId) {
  const userIdStr = userId.toString();
  return this.moderators.some(m => m.toString() === userIdStr) ||
         this.participants.some(p => p.user.toString() === userIdStr && p.role === 'moderator');
};

/**
 * Check if a user is the owner of the room
 */
ChatRoomSchema.methods.isOwner = function(userId) {
  return this.owner.toString() === userId.toString();
};

/**
 * Check if a user is banned from the room
 */
ChatRoomSchema.methods.isBanned = function(userId) {
  const userIdStr = userId.toString();
  return this.bannedUsers.some(b => b.user.toString() === userIdStr);
};

/**
 * Check if a user is muted in the room
 */
ChatRoomSchema.methods.isMuted = function(userId) {
  const userIdStr = userId.toString();
  const participant = this.participants.find(p => p.user.toString() === userIdStr);
  if (!participant) return false;
  if (!participant.isMuted) return false;
  // Check if mute has expired
  if (participant.mutedUntil && participant.mutedUntil < new Date()) {
    return false;
  }
  return true;
};

/**
 * Check if a user can join the room
 */
ChatRoomSchema.methods.canJoin = function(userId) {
  // Check if room is active and joinable
  if (!this.isActive || !this.settings.isJoinable) return false;
  
  // Check if user is banned
  if (this.isBanned(userId)) return false;
  
  // Check if room is at capacity
  if (this.participants.length >= this.settings.maxParticipants) return false;
  
  // Check if already a participant
  if (this.isParticipant(userId)) return false;
  
  // For private rooms, check if user has an invitation
  if (this.roomType === 'private') {
    const userIdStr = userId.toString();
    const hasInvitation = this.invitations.some(
      inv => inv.user.toString() === userIdStr && 
             inv.status === 'pending' &&
             (!inv.expiresAt || inv.expiresAt > new Date())
    );
    if (!hasInvitation) return false;
  }
  
  return true;
};

/**
 * Get participant by user ID
 */
ChatRoomSchema.methods.getParticipant = function(userId) {
  const userIdStr = userId.toString();
  return this.participants.find(p => p.user.toString() === userIdStr);
};

/**
 * Add a participant to the room
 */
ChatRoomSchema.methods.addParticipant = function(userId, role = 'participant') {
  if (this.isParticipant(userId)) {
    throw new Error('User is already a participant');
  }
  
  this.participants.push({
    user: userId,
    role: role,
    joinedAt: new Date(),
    lastReadAt: new Date()
  });
  
  return this;
};

/**
 * Remove a participant from the room
 */
ChatRoomSchema.methods.removeParticipant = function(userId) {
  const userIdStr = userId.toString();
  this.participants = this.participants.filter(p => p.user.toString() !== userIdStr);
  this.moderators = this.moderators.filter(m => m.toString() !== userIdStr);
  return this;
};

/**
 * Update last activity timestamp
 */
ChatRoomSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this;
};

/**
 * Increment message count
 */
ChatRoomSchema.methods.incrementMessageCount = function() {
  this.messageCount += 1;
  this.lastActivity = new Date();
  return this;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find public/community rooms for discovery
 */
ChatRoomSchema.statics.findPublicRooms = function(options = {}) {
  const { limit = 20, skip = 0, search, roomType } = options;
  
  const query = {
    isActive: true,
    $or: [
      { 'settings.isPublic': true },
      { roomType: 'community' }
    ]
  };
  
  if (roomType) {
    query.roomType = roomType;
  }
  
  let findQuery = this.find(query)
    .select('name description roomType owner participants settings lastActivity messageCount createdAt')
    .populate('owner', 'name profilePicture')
    .sort({ lastActivity: -1 })
    .skip(skip)
    .limit(limit);
  
  if (search) {
    findQuery = this.find({
      ...query,
      $text: { $search: search }
    })
    .select('name description roomType owner participants settings lastActivity messageCount createdAt')
    .populate('owner', 'name profilePicture')
    .sort({ score: { $meta: 'textScore' }, lastActivity: -1 })
    .skip(skip)
    .limit(limit);
  }
  
  return findQuery;
};

/**
 * Find rooms for a specific user
 */
ChatRoomSchema.statics.findUserRooms = function(userId) {
  return this.find({
    isActive: true,
    'participants.user': userId
  })
  .select('name description roomType owner participants settings lastActivity messageCount createdAt')
  .populate('owner', 'name profilePicture')
  .sort({ lastActivity: -1 });
};

// ============================================
// MIDDLEWARE
// ============================================

// Pre-save middleware to ensure owner is in participants
ChatRoomSchema.pre('save', function(next) {
  if (this.isNew && this.owner) {
    // Check if owner is already in participants
    const ownerInParticipants = this.participants.some(
      p => p.user.toString() === this.owner.toString()
    );
    
    if (!ownerInParticipants) {
      this.participants.push({
        user: this.owner,
        role: 'owner',
        joinedAt: new Date(),
        lastReadAt: new Date()
      });
    }
  }
  next();
});

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);
