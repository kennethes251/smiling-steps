/**
 * ModerationService - Chat Room Moderation Management
 * 
 * This service handles all moderation operations including:
 * - Mute/unmute participants
 * - Kick/ban participants
 * - Moderator assignment
 * - Moderation logging
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 5.5
 */

const ChatRoom = require('../models/ChatRoom');
const ModerationLog = require('../models/ModerationLog');
const User = require('../models/User');

/**
 * Error codes for moderation operations
 */
const MODERATION_ERROR_CODES = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  NOT_PARTICIPANT: 'NOT_PARTICIPANT',
  NOT_MODERATOR: 'NOT_MODERATOR',
  NOT_OWNER: 'NOT_OWNER',
  USER_BANNED: 'USER_BANNED',
  USER_MUTED: 'USER_MUTED',
  USER_NOT_MUTED: 'USER_NOT_MUTED',
  CANNOT_MODERATE_SELF: 'CANNOT_MODERATE_SELF',
  CANNOT_MODERATE_OWNER: 'CANNOT_MODERATE_OWNER',
  CANNOT_MODERATE_MODERATOR: 'CANNOT_MODERATE_MODERATOR',
  ALREADY_MODERATOR: 'ALREADY_MODERATOR',
  NOT_A_MODERATOR: 'NOT_A_MODERATOR',
  INVALID_DURATION: 'INVALID_DURATION',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

/**
 * ModerationService Class
 * 
 * Centralizes all moderation operations for chat rooms
 */
class ModerationService {
  
  // ============================================
  // MUTE/UNMUTE FUNCTIONALITY - Requirements 4.1, 4.2
  // ============================================
  
  /**
   * Mute a participant in a chat room
   * 
   * Requirement 4.1: Moderator can mute participant for specified duration
   * 
   * @param {string} roomId - Room ID
   * @param {string} moderatorId - ID of the moderator performing the action
   * @param {string} targetUserId - ID of the user to mute
   * @param {number} duration - Duration in minutes (0 = indefinite)
   * @param {string} reason - Reason for muting
   * @returns {Promise<Object>} Result with room and log entry
   */
  async muteParticipant(roomId, moderatorId, targetUserId, duration = 30, reason = '') {
    // Validate duration
    if (duration < 0) {
      throw this._createError('Duration cannot be negative', MODERATION_ERROR_CODES.INVALID_DURATION, 400);
    }
    
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MODERATION_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Verify moderator permissions
    await this._verifyModeratorPermissions(room, moderatorId, targetUserId);
    
    // Check if target is a participant
    const participant = room.getParticipant(targetUserId);
    if (!participant) {
      throw this._createError(
        'Target user is not a participant in this room',
        MODERATION_ERROR_CODES.NOT_PARTICIPANT,
        400
      );
    }
    
    // Calculate mute expiration
    const mutedUntil = duration > 0 
      ? new Date(Date.now() + duration * 60 * 1000)
      : null; // null = indefinite mute
    
    // Apply mute
    participant.isMuted = true;
    participant.mutedUntil = mutedUntil;
    participant.mutedBy = moderatorId;
    participant.muteReason = reason || 'No reason provided';
    
    await room.save();
    
    // Log the action - Requirement 4.6
    const logEntry = await ModerationLog.logAction({
      room: roomId,
      moderator: moderatorId,
      targetUser: targetUserId,
      action: 'mute',
      reason: reason || 'No reason provided',
      duration: duration,
      metadata: {
        mutedUntil: mutedUntil
      }
    });
    
    console.log(`✅ User ${targetUserId} muted in room ${room.name} for ${duration} minutes by ${moderatorId}`);
    
    return {
      success: true,
      room,
      logEntry,
      mutedUntil
    };
  }
  
  /**
   * Unmute a participant in a chat room
   * 
   * Requirement 4.2: Moderator can unmute participant to restore messaging capability
   * 
   * @param {string} roomId - Room ID
   * @param {string} moderatorId - ID of the moderator performing the action
   * @param {string} targetUserId - ID of the user to unmute
   * @returns {Promise<Object>} Result with room and log entry
   */
  async unmuteParticipant(roomId, moderatorId, targetUserId) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MODERATION_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Verify moderator permissions
    await this._verifyModeratorPermissions(room, moderatorId, targetUserId);
    
    // Check if target is a participant
    const participant = room.getParticipant(targetUserId);
    if (!participant) {
      throw this._createError(
        'Target user is not a participant in this room',
        MODERATION_ERROR_CODES.NOT_PARTICIPANT,
        400
      );
    }
    
    // Check if user is actually muted
    if (!participant.isMuted) {
      throw this._createError(
        'User is not muted',
        MODERATION_ERROR_CODES.USER_NOT_MUTED,
        400
      );
    }
    
    // Remove mute
    participant.isMuted = false;
    participant.mutedUntil = null;
    participant.mutedBy = null;
    participant.muteReason = null;
    
    await room.save();
    
    // Log the action - Requirement 4.6
    const logEntry = await ModerationLog.logAction({
      room: roomId,
      moderator: moderatorId,
      targetUser: targetUserId,
      action: 'unmute',
      reason: 'Mute removed by moderator'
    });
    
    console.log(`✅ User ${targetUserId} unmuted in room ${room.name} by ${moderatorId}`);
    
    return {
      success: true,
      room,
      logEntry
    };
  }
  
  /**
   * Check if a user is muted in a room
   * 
   * Used before allowing messages - Requirement 4.1
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID to check
   * @returns {Promise<Object>} Mute status with details
   */
  async checkMuteStatus(roomId, userId) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MODERATION_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    const participant = room.getParticipant(userId);
    if (!participant) {
      return {
        isMuted: false,
        isParticipant: false
      };
    }
    
    // Check if mute has expired
    if (participant.isMuted && participant.mutedUntil) {
      if (participant.mutedUntil < new Date()) {
        // Mute has expired - auto-unmute
        participant.isMuted = false;
        participant.mutedUntil = null;
        participant.mutedBy = null;
        participant.muteReason = null;
        await room.save();
        
        return {
          isMuted: false,
          isParticipant: true,
          wasAutoUnmuted: true
        };
      }
    }
    
    return {
      isMuted: participant.isMuted,
      isParticipant: true,
      mutedUntil: participant.mutedUntil,
      muteReason: participant.muteReason
    };
  }

  
  // ============================================
  // KICK/BAN FUNCTIONALITY - Requirements 4.3, 4.4
  // ============================================
  
  /**
   * Kick a participant from a chat room
   * 
   * Requirement 4.3: Remove participant from room and notify them
   * 
   * @param {string} roomId - Room ID
   * @param {string} moderatorId - ID of the moderator performing the action
   * @param {string} targetUserId - ID of the user to kick
   * @param {string} reason - Reason for kicking
   * @returns {Promise<Object>} Result with room and log entry
   */
  async kickParticipant(roomId, moderatorId, targetUserId, reason = '') {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MODERATION_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Verify moderator permissions
    await this._verifyModeratorPermissions(room, moderatorId, targetUserId);
    
    // Check if target is a participant
    if (!room.isParticipant(targetUserId)) {
      throw this._createError(
        'Target user is not a participant in this room',
        MODERATION_ERROR_CODES.NOT_PARTICIPANT,
        400
      );
    }
    
    // Remove participant from room
    room.removeParticipant(targetUserId);
    room.updateActivity();
    
    await room.save();
    
    // Log the action - Requirement 4.6
    const logEntry = await ModerationLog.logAction({
      room: roomId,
      moderator: moderatorId,
      targetUser: targetUserId,
      action: 'kick',
      reason: reason || 'No reason provided'
    });
    
    console.log(`✅ User ${targetUserId} kicked from room ${room.name} by ${moderatorId}`);
    
    return {
      success: true,
      room,
      logEntry
    };
  }
  
  /**
   * Ban a participant from a chat room
   * 
   * Requirement 4.4: Permanently prevent user from rejoining
   * 
   * @param {string} roomId - Room ID
   * @param {string} moderatorId - ID of the moderator performing the action
   * @param {string} targetUserId - ID of the user to ban
   * @param {string} reason - Reason for banning
   * @returns {Promise<Object>} Result with room and log entry
   */
  async banParticipant(roomId, moderatorId, targetUserId, reason = '') {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MODERATION_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Verify moderator permissions
    await this._verifyModeratorPermissions(room, moderatorId, targetUserId);
    
    // Check if user is already banned
    if (room.isBanned(targetUserId)) {
      throw this._createError(
        'User is already banned from this room',
        MODERATION_ERROR_CODES.USER_BANNED,
        400
      );
    }
    
    // Remove from participants if currently a participant
    if (room.isParticipant(targetUserId)) {
      room.removeParticipant(targetUserId);
    }
    
    // Add to banned list
    room.bannedUsers.push({
      user: targetUserId,
      bannedAt: new Date(),
      bannedBy: moderatorId,
      reason: reason || 'No reason provided'
    });
    
    room.updateActivity();
    await room.save();
    
    // Log the action - Requirement 4.6
    const logEntry = await ModerationLog.logAction({
      room: roomId,
      moderator: moderatorId,
      targetUser: targetUserId,
      action: 'ban',
      reason: reason || 'No reason provided'
    });
    
    console.log(`✅ User ${targetUserId} banned from room ${room.name} by ${moderatorId}`);
    
    return {
      success: true,
      room,
      logEntry
    };
  }
  
  /**
   * Unban a user from a chat room
   * 
   * @param {string} roomId - Room ID
   * @param {string} moderatorId - ID of the moderator performing the action
   * @param {string} targetUserId - ID of the user to unban
   * @returns {Promise<Object>} Result with room and log entry
   */
  async unbanParticipant(roomId, moderatorId, targetUserId) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MODERATION_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Verify moderator has permission (owner or moderator)
    if (!room.isOwner(moderatorId) && !room.isModerator(moderatorId)) {
      throw this._createError(
        'You do not have permission to unban users',
        MODERATION_ERROR_CODES.NOT_MODERATOR,
        403
      );
    }
    
    // Check if user is actually banned
    if (!room.isBanned(targetUserId)) {
      throw this._createError(
        'User is not banned from this room',
        MODERATION_ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // Remove from banned list
    room.bannedUsers = room.bannedUsers.filter(
      b => b.user.toString() !== targetUserId.toString()
    );
    
    await room.save();
    
    // Log the action - Requirement 4.6
    const logEntry = await ModerationLog.logAction({
      room: roomId,
      moderator: moderatorId,
      targetUser: targetUserId,
      action: 'unban',
      reason: 'Ban removed by moderator'
    });
    
    console.log(`✅ User ${targetUserId} unbanned from room ${room.name} by ${moderatorId}`);
    
    return {
      success: true,
      room,
      logEntry
    };
  }
  
  /**
   * Check if a user is banned from a room
   * 
   * Used to prevent banned users from rejoining - Requirement 4.4
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID to check
   * @returns {Promise<Object>} Ban status with details
   */
  async checkBanStatus(roomId, userId) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MODERATION_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    const banEntry = room.bannedUsers.find(
      b => b.user.toString() === userId.toString()
    );
    
    if (banEntry) {
      return {
        isBanned: true,
        bannedAt: banEntry.bannedAt,
        reason: banEntry.reason
      };
    }
    
    return {
      isBanned: false
    };
  }

  
  // ============================================
  // MODERATOR ASSIGNMENT - Requirement 5.5
  // ============================================
  
  /**
   * Assign moderator role to a participant
   * 
   * Requirement 5.5: Owner can assign moderator permissions
   * 
   * @param {string} roomId - Room ID
   * @param {string} ownerId - ID of the room owner
   * @param {string} targetUserId - ID of the user to make moderator
   * @returns {Promise<Object>} Result with room and log entry
   */
  async assignModerator(roomId, ownerId, targetUserId) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MODERATION_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Only owner can assign moderators
    if (!room.isOwner(ownerId)) {
      throw this._createError(
        'Only the room owner can assign moderators',
        MODERATION_ERROR_CODES.NOT_OWNER,
        403
      );
    }
    
    // Cannot assign self (owner is already a moderator)
    if (ownerId.toString() === targetUserId.toString()) {
      throw this._createError(
        'Owner is already a moderator',
        MODERATION_ERROR_CODES.CANNOT_MODERATE_SELF,
        400
      );
    }
    
    // Check if target is a participant
    const participant = room.getParticipant(targetUserId);
    if (!participant) {
      throw this._createError(
        'Target user is not a participant in this room',
        MODERATION_ERROR_CODES.NOT_PARTICIPANT,
        400
      );
    }
    
    // Check if already a moderator
    if (room.isModerator(targetUserId)) {
      throw this._createError(
        'User is already a moderator',
        MODERATION_ERROR_CODES.ALREADY_MODERATOR,
        400
      );
    }
    
    // Add to moderators list
    room.moderators.push(targetUserId);
    participant.role = 'moderator';
    
    await room.save();
    
    // Log the action - Requirement 4.6
    const logEntry = await ModerationLog.logAction({
      room: roomId,
      moderator: ownerId,
      targetUser: targetUserId,
      action: 'assign_moderator',
      reason: 'Assigned as moderator by owner'
    });
    
    console.log(`✅ User ${targetUserId} assigned as moderator in room ${room.name} by ${ownerId}`);
    
    return {
      success: true,
      room,
      logEntry
    };
  }
  
  /**
   * Remove moderator role from a participant
   * 
   * Requirement 5.5: Owner can remove moderator permissions
   * 
   * @param {string} roomId - Room ID
   * @param {string} ownerId - ID of the room owner
   * @param {string} targetUserId - ID of the user to remove as moderator
   * @returns {Promise<Object>} Result with room and log entry
   */
  async removeModerator(roomId, ownerId, targetUserId) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MODERATION_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Only owner can remove moderators
    if (!room.isOwner(ownerId)) {
      throw this._createError(
        'Only the room owner can remove moderators',
        MODERATION_ERROR_CODES.NOT_OWNER,
        403
      );
    }
    
    // Cannot remove self
    if (ownerId.toString() === targetUserId.toString()) {
      throw this._createError(
        'Cannot remove yourself as moderator',
        MODERATION_ERROR_CODES.CANNOT_MODERATE_SELF,
        400
      );
    }
    
    // Check if target is a moderator
    if (!room.isModerator(targetUserId)) {
      throw this._createError(
        'User is not a moderator',
        MODERATION_ERROR_CODES.NOT_A_MODERATOR,
        400
      );
    }
    
    // Remove from moderators list
    room.moderators = room.moderators.filter(
      m => m.toString() !== targetUserId.toString()
    );
    
    // Update participant role
    const participant = room.getParticipant(targetUserId);
    if (participant) {
      participant.role = 'participant';
    }
    
    await room.save();
    
    // Log the action - Requirement 4.6
    const logEntry = await ModerationLog.logAction({
      room: roomId,
      moderator: ownerId,
      targetUser: targetUserId,
      action: 'remove_moderator',
      reason: 'Moderator role removed by owner'
    });
    
    console.log(`✅ User ${targetUserId} removed as moderator in room ${room.name} by ${ownerId}`);
    
    return {
      success: true,
      room,
      logEntry
    };
  }
  
  /**
   * Verify if a user has moderator permissions
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID to check
   * @returns {Promise<Object>} Permission details
   */
  async verifyModeratorPermissions(roomId, userId) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MODERATION_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    return {
      isOwner: room.isOwner(userId),
      isModerator: room.isModerator(userId),
      canModerate: room.isOwner(userId) || room.isModerator(userId)
    };
  }

  
  // ============================================
  // MODERATION LOGGING - Requirement 4.6
  // ============================================
  
  /**
   * Get moderation logs for a room
   * 
   * Requirement 4.6: Log all moderation actions
   * 
   * @param {string} roomId - Room ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of moderation logs
   */
  async getModerationLogs(roomId, options = {}) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MODERATION_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    return ModerationLog.getRoomHistory(roomId, options);
  }
  
  /**
   * Get moderation history for a specific user
   * 
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of moderation logs
   */
  async getUserModerationHistory(userId, options = {}) {
    return ModerationLog.getUserHistory(userId, options);
  }
  
  /**
   * Get actions performed by a specific moderator
   * 
   * @param {string} moderatorId - Moderator ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of moderation logs
   */
  async getModeratorActions(moderatorId, options = {}) {
    return ModerationLog.getModeratorActions(moderatorId, options);
  }
  
  /**
   * Get moderation action counts for a room
   * 
   * @param {string} roomId - Room ID
   * @param {Date} startDate - Start date for filtering
   * @param {Date} endDate - End date for filtering
   * @returns {Promise<Array>} Action counts by type
   */
  async getModerationStats(roomId, startDate = null, endDate = null) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MODERATION_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    return ModerationLog.getActionCounts(roomId, startDate, endDate);
  }
  
  /**
   * Log a custom moderation action
   * 
   * @param {Object} data - Log data
   * @returns {Promise<Object>} Created log entry
   */
  async logAction(data) {
    return ModerationLog.logAction(data);
  }
  
  // ============================================
  // HELPER METHODS
  // ============================================
  
  /**
   * Verify that a user has moderator permissions and can moderate the target
   * 
   * @param {Object} room - Room document
   * @param {string} moderatorId - ID of the moderator
   * @param {string} targetUserId - ID of the target user
   * @throws {Error} If permissions are insufficient
   * @private
   */
  async _verifyModeratorPermissions(room, moderatorId, targetUserId) {
    // Check if moderator has permission
    const isOwner = room.isOwner(moderatorId);
    const isModerator = room.isModerator(moderatorId);
    
    if (!isOwner && !isModerator) {
      throw this._createError(
        'You do not have permission to perform moderation actions',
        MODERATION_ERROR_CODES.NOT_MODERATOR,
        403
      );
    }
    
    // Cannot moderate self
    if (moderatorId.toString() === targetUserId.toString()) {
      throw this._createError(
        'You cannot perform moderation actions on yourself',
        MODERATION_ERROR_CODES.CANNOT_MODERATE_SELF,
        400
      );
    }
    
    // Cannot moderate the owner (unless you are the owner)
    if (room.isOwner(targetUserId) && !isOwner) {
      throw this._createError(
        'You cannot perform moderation actions on the room owner',
        MODERATION_ERROR_CODES.CANNOT_MODERATE_OWNER,
        403
      );
    }
    
    // Moderators cannot moderate other moderators (only owner can)
    if (room.isModerator(targetUserId) && !isOwner) {
      throw this._createError(
        'Only the room owner can moderate other moderators',
        MODERATION_ERROR_CODES.CANNOT_MODERATE_MODERATOR,
        403
      );
    }
  }
  
  /**
   * Create a standardized error object
   * 
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {number} status - HTTP status code
   * @returns {Error} Error object
   * @private
   */
  _createError(message, code, status = 400) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
  }
}

// Export singleton instance
const moderationService = new ModerationService();

module.exports = {
  ModerationService,
  moderationService,
  MODERATION_ERROR_CODES
};
