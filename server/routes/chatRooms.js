/**
 * Chat Room Routes - REST API for Chat Room Management and Moderation
 * 
 * This file provides API endpoints for:
 * - Room management (create, list, join, leave)
 * - Moderation actions (mute, unmute, kick, ban, unban)
 * - Moderator assignment
 * - Moderation logs
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { rateLimiters } = require('../middleware/rateLimiting');
const { chatRoomService } = require('../services/chatRoomService');
const { moderationService, MODERATION_ERROR_CODES } = require('../services/moderationService');
const { roomMessageService, MESSAGE_ERROR_CODES } = require('../services/roomMessageService');
const { 
  emitMuteEvent, 
  emitUnmuteEvent, 
  emitKickEvent, 
  emitBanEvent,
  emitMessageDeletedEvent,
  emitRoomUpdatedEvent
} = require('../services/chatRoomSocketService');

// ============================================
// ROOM MANAGEMENT ROUTES
// ============================================

/**
 * @route   POST /api/chat-rooms
 * @desc    Create a new chat room
 * @access  Private (Psychologists only)
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, roomType, settings } = req.body;
    
    const room = await chatRoomService.createRoom(req.user.id, {
      name,
      description,
      roomType,
      settings
    });
    
    res.status(201).json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   GET /api/chat-rooms
 * @desc    List available chat rooms
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, roomType } = req.query;
    
    const rooms = await chatRoomService.listPublicRooms(
      { roomType },
      { page: parseInt(page), limit: parseInt(limit) }
    );
    
    res.json({
      success: true,
      ...rooms
    });
  } catch (error) {
    console.error('List rooms error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   GET /api/chat-rooms/my-rooms
 * @desc    Get rooms the user is part of
 * @access  Private
 */
router.get('/my-rooms', auth, async (req, res) => {
  try {
    const rooms = await chatRoomService.getUserRooms(req.user.id);
    
    res.json({
      success: true,
      rooms
    });
  } catch (error) {
    console.error('Get user rooms error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   GET /api/chat-rooms/:id
 * @desc    Get room details
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const room = await chatRoomService.getRoomById(req.params.id, req.user.id);
    
    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   PUT /api/chat-rooms/:id
 * @desc    Update room settings
 * @access  Private (Owner only)
 * _Requirements: 5.1_
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, settings } = req.body;
    
    const room = await chatRoomService.updateRoom(req.params.id, req.user.id, {
      name,
      description,
      ...settings
    });
    
    // Emit room updated event - Requirement 5.1
    emitRoomUpdatedEvent(req.params.id, {
      updatedBy: req.user.id,
      updatedByName: req.user.name,
      changes: { name, description, settings },
      room: {
        _id: room._id,
        name: room.name,
        description: room.description,
        settings: room.settings
      }
    });
    
    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   DELETE /api/chat-rooms/:id
 * @desc    Delete/archive a room
 * @access  Private (Owner or Admin only)
 * _Requirements: 1.1_
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const room = await chatRoomService.deleteRoom(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Room archived successfully',
      room
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   POST /api/chat-rooms/:id/join
 * @desc    Join a chat room
 * @access  Private
 */
router.post('/:id/join', auth, async (req, res) => {
  try {
    const result = await chatRoomService.joinRoom(req.params.id, req.user.id);
    
    res.json({
      success: true,
      room: result.room
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   POST /api/chat-rooms/:id/leave
 * @desc    Leave a chat room
 * @access  Private
 */
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const result = await chatRoomService.leaveRoom(req.params.id, req.user.id);
    
    res.json({
      success: true,
      message: 'Left room successfully'
    });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   GET /api/chat-rooms/:id/participants
 * @desc    Get room participants
 * @access  Private
 */
router.get('/:id/participants', auth, async (req, res) => {
  try {
    const participants = await chatRoomService.getParticipants(req.params.id);
    
    res.json({
      success: true,
      participants
    });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

// ============================================
// MESSAGING ROUTES - Requirements 3.1, 4.5, 7.2
// ============================================

/**
 * @route   GET /api/chat-rooms/:id/messages
 * @desc    Get messages for a room with pagination
 * @access  Private (Participants only)
 * _Requirements: 3.1, 7.1_
 */
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const { limit = 50, before, after, includeDeleted } = req.query;
    
    const result = await roomMessageService.getMessages(
      req.params.id,
      req.user.id,
      {
        limit: parseInt(limit),
        before,
        after,
        includeDeleted: includeDeleted === 'true'
      }
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   POST /api/chat-rooms/:id/messages
 * @desc    Send a message to a room
 * @access  Private (Participants only)
 * _Requirements: 3.1, 3.2, 9.6_
 */
router.post('/:id/messages', auth, rateLimiters.chatMessage, async (req, res) => {
  try {
    const { content, messageType, replyTo } = req.body;
    
    const message = await roomMessageService.sendMessage(
      req.params.id,
      req.user.id,
      content,
      { messageType, replyTo }
    );
    
    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   DELETE /api/chat-rooms/:id/messages/:messageId
 * @desc    Delete a message
 * @access  Private (Sender or Moderators)
 * _Requirements: 4.5_
 */
router.delete('/:id/messages/:messageId', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const message = await roomMessageService.deleteMessage(
      req.params.messageId,
      req.user.id,
      reason
    );
    
    // Emit message deleted event - Requirement 4.5
    emitMessageDeletedEvent(req.params.id, {
      messageId: req.params.messageId,
      deletedBy: req.user.id,
      deletedByName: req.user.name,
      reason: reason || 'No reason provided'
    });
    
    res.json({
      success: true,
      message: 'Message deleted successfully',
      deletedMessage: message
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   GET /api/chat-rooms/:id/messages/search
 * @desc    Search messages in a room
 * @access  Private (Participants only)
 * _Requirements: 7.2, 7.3_
 */
router.get('/:id/messages/search', auth, async (req, res) => {
  try {
    const { q, limit = 20, skip = 0 } = req.query;
    
    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query is required'
        }
      });
    }
    
    const result = await roomMessageService.searchMessages(
      req.params.id,
      req.user.id,
      q,
      { limit: parseInt(limit), skip: parseInt(skip) }
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Search messages error:', error);
    // Fall back to regex search if text index fails
    if (error.code === 'IndexNotFound' || error.message?.includes('text index')) {
      try {
        const { q, limit = 20, skip = 0 } = req.query;
        const result = await roomMessageService.searchMessagesRegex(
          req.params.id,
          req.user.id,
          q,
          { limit: parseInt(limit), skip: parseInt(skip) }
        );
        return res.json({
          success: true,
          ...result
        });
      } catch (fallbackError) {
        return res.status(fallbackError.status || 500).json({
          success: false,
          error: {
            code: fallbackError.code || 'SERVER_ERROR',
            message: fallbackError.message
          }
        });
      }
    }
    
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   POST /api/chat-rooms/:id/messages/read
 * @desc    Mark messages as read
 * @access  Private (Participants only)
 * _Requirements: 6.5_
 */
router.post('/:id/messages/read', auth, async (req, res) => {
  try {
    const { readUntil } = req.body;
    
    const result = await roomMessageService.markAsRead(
      req.params.id,
      req.user.id,
      readUntil ? new Date(readUntil) : new Date()
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   GET /api/chat-rooms/:id/unread
 * @desc    Get unread message count for a room
 * @access  Private (Participants only)
 * _Requirements: 6.5_
 */
router.get('/:id/unread', auth, async (req, res) => {
  try {
    const result = await roomMessageService.getUnreadCount(
      req.params.id,
      req.user.id
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

// ============================================
// MODERATION ROUTES
// ============================================

/**
 * @route   POST /api/chat-rooms/:id/mute/:userId
 * @desc    Mute a participant
 * @access  Private (Moderators/Owners only)
 */
router.post('/:id/mute/:userId', auth, async (req, res) => {
  try {
    const { duration = 30, reason = '' } = req.body;
    
    const result = await moderationService.muteParticipant(
      req.params.id,
      req.user.id,
      req.params.userId,
      duration,
      reason
    );
    
    // Get target user info for the event
    const User = require('../models/User');
    const targetUser = await User.findById(req.params.userId).select('name');
    
    // Emit mute event - Requirement 4.1
    emitMuteEvent(req.params.id, {
      targetUserId: req.params.userId,
      targetUserName: targetUser?.name || 'Unknown',
      moderatorId: req.user.id,
      moderatorName: req.user.name,
      duration,
      mutedUntil: result.mutedUntil,
      reason: reason || 'No reason provided'
    });
    
    res.json({
      success: true,
      message: `User muted for ${duration} minutes`,
      mutedUntil: result.mutedUntil
    });
  } catch (error) {
    console.error('Mute participant error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   POST /api/chat-rooms/:id/unmute/:userId
 * @desc    Unmute a participant
 * @access  Private (Moderators/Owners only)
 */
router.post('/:id/unmute/:userId', auth, async (req, res) => {
  try {
    const result = await moderationService.unmuteParticipant(
      req.params.id,
      req.user.id,
      req.params.userId
    );
    
    // Get target user info for the event
    const User = require('../models/User');
    const targetUser = await User.findById(req.params.userId).select('name');
    
    // Emit unmute event - Requirement 4.2
    emitUnmuteEvent(req.params.id, {
      targetUserId: req.params.userId,
      targetUserName: targetUser?.name || 'Unknown',
      moderatorId: req.user.id,
      moderatorName: req.user.name
    });
    
    res.json({
      success: true,
      message: 'User unmuted successfully'
    });
  } catch (error) {
    console.error('Unmute participant error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   POST /api/chat-rooms/:id/kick/:userId
 * @desc    Kick a participant from the room
 * @access  Private (Moderators/Owners only)
 */
router.post('/:id/kick/:userId', auth, async (req, res) => {
  try {
    const { reason = '' } = req.body;
    
    // Get target user info before kicking
    const User = require('../models/User');
    const targetUser = await User.findById(req.params.userId).select('name');
    
    const result = await moderationService.kickParticipant(
      req.params.id,
      req.user.id,
      req.params.userId,
      reason
    );
    
    // Emit kick event - Requirement 4.3
    emitKickEvent(req.params.id, {
      targetUserId: req.params.userId,
      targetUserName: targetUser?.name || 'Unknown',
      moderatorId: req.user.id,
      moderatorName: req.user.name,
      reason: reason || 'No reason provided'
    });
    
    res.json({
      success: true,
      message: 'User kicked from room'
    });
  } catch (error) {
    console.error('Kick participant error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   POST /api/chat-rooms/:id/ban/:userId
 * @desc    Ban a user from the room
 * @access  Private (Moderators/Owners only)
 */
router.post('/:id/ban/:userId', auth, async (req, res) => {
  try {
    const { reason = '' } = req.body;
    
    // Get target user info before banning
    const User = require('../models/User');
    const targetUser = await User.findById(req.params.userId).select('name');
    
    const result = await moderationService.banParticipant(
      req.params.id,
      req.user.id,
      req.params.userId,
      reason
    );
    
    // Emit ban event - Requirement 4.4
    emitBanEvent(req.params.id, {
      targetUserId: req.params.userId,
      targetUserName: targetUser?.name || 'Unknown',
      moderatorId: req.user.id,
      moderatorName: req.user.name,
      reason: reason || 'No reason provided'
    });
    
    res.json({
      success: true,
      message: 'User banned from room'
    });
  } catch (error) {
    console.error('Ban participant error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   POST /api/chat-rooms/:id/unban/:userId
 * @desc    Unban a user from the room
 * @access  Private (Moderators/Owners only)
 */
router.post('/:id/unban/:userId', auth, async (req, res) => {
  try {
    const result = await moderationService.unbanParticipant(
      req.params.id,
      req.user.id,
      req.params.userId
    );
    
    res.json({
      success: true,
      message: 'User unbanned from room'
    });
  } catch (error) {
    console.error('Unban participant error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

// ============================================
// MODERATOR MANAGEMENT ROUTES
// ============================================

/**
 * @route   POST /api/chat-rooms/:id/moderators/:userId
 * @desc    Assign moderator role to a participant
 * @access  Private (Owners only)
 */
router.post('/:id/moderators/:userId', auth, async (req, res) => {
  try {
    const result = await moderationService.assignModerator(
      req.params.id,
      req.user.id,
      req.params.userId
    );
    
    res.json({
      success: true,
      message: 'User assigned as moderator'
    });
  } catch (error) {
    console.error('Assign moderator error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   DELETE /api/chat-rooms/:id/moderators/:userId
 * @desc    Remove moderator role from a participant
 * @access  Private (Owners only)
 */
router.delete('/:id/moderators/:userId', auth, async (req, res) => {
  try {
    const result = await moderationService.removeModerator(
      req.params.id,
      req.user.id,
      req.params.userId
    );
    
    res.json({
      success: true,
      message: 'Moderator role removed'
    });
  } catch (error) {
    console.error('Remove moderator error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   GET /api/chat-rooms/:id/permissions
 * @desc    Check user's permissions in a room
 * @access  Private
 */
router.get('/:id/permissions', auth, async (req, res) => {
  try {
    const permissions = await moderationService.verifyModeratorPermissions(
      req.params.id,
      req.user.id
    );
    
    res.json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error('Check permissions error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

// ============================================
// MODERATION LOGS ROUTES
// ============================================

/**
 * @route   GET /api/chat-rooms/:id/moderation-logs
 * @desc    Get moderation logs for a room
 * @access  Private (Moderators/Owners only)
 */
router.get('/:id/moderation-logs', auth, async (req, res) => {
  try {
    // First verify the user has moderator permissions
    const permissions = await moderationService.verifyModeratorPermissions(
      req.params.id,
      req.user.id
    );
    
    if (!permissions.canModerate) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_MODERATOR',
          message: 'You do not have permission to view moderation logs'
        }
      });
    }
    
    const { page = 1, limit = 50, action } = req.query;
    
    const logs = await moderationService.getModerationLogs(req.params.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      action
    });
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Get moderation logs error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   GET /api/chat-rooms/:id/moderation-stats
 * @desc    Get moderation statistics for a room
 * @access  Private (Moderators/Owners only)
 */
router.get('/:id/moderation-stats', auth, async (req, res) => {
  try {
    // First verify the user has moderator permissions
    const permissions = await moderationService.verifyModeratorPermissions(
      req.params.id,
      req.user.id
    );
    
    if (!permissions.canModerate) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_MODERATOR',
          message: 'You do not have permission to view moderation stats'
        }
      });
    }
    
    const { startDate, endDate } = req.query;
    
    const stats = await moderationService.getModerationStats(
      req.params.id,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get moderation stats error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   GET /api/chat-rooms/:id/mute-status/:userId
 * @desc    Check if a user is muted in a room
 * @access  Private
 */
router.get('/:id/mute-status/:userId', auth, async (req, res) => {
  try {
    const status = await moderationService.checkMuteStatus(
      req.params.id,
      req.params.userId
    );
    
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Check mute status error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * @route   GET /api/chat-rooms/:id/ban-status/:userId
 * @desc    Check if a user is banned from a room
 * @access  Private
 */
router.get('/:id/ban-status/:userId', auth, async (req, res) => {
  try {
    const status = await moderationService.checkBanStatus(
      req.params.id,
      req.params.userId
    );
    
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Check ban status error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

module.exports = router;
