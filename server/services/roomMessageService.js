/**
 * RoomMessageService - Chat Room Message Management
 * 
 * This service handles all message operations including:
 * - Message sending with validation
 * - Message retrieval with pagination
 * - Message deletion
 * - Message search
 * - Unread count tracking
 * 
 * Requirements: 3.1, 3.2, 3.5, 3.6, 4.1, 4.5, 6.5, 7.1, 7.2, 7.3
 */

const RoomMessage = require('../models/RoomMessage');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Error codes for message operations
 */
const MESSAGE_ERROR_CODES = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
  NOT_PARTICIPANT: 'NOT_PARTICIPANT',
  USER_MUTED: 'USER_MUTED',
  USER_BANNED: 'USER_BANNED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  EMPTY_MESSAGE: 'EMPTY_MESSAGE',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED'
};

/**
 * RoomMessageService Class
 * 
 * Centralizes all message operations for chat rooms
 */
class RoomMessageService {
  
  // ============================================
  // MESSAGE SENDING - Requirements 3.1, 3.2, 4.1
  // ============================================
  
  /**
   * Send a message to a chat room
   * 
   * Requirements: 3.1, 3.2, 4.1
   * - Validate sender is participant
   * - Check mute status
   * - Parse mentions (@username)
   * - Store message with timestamp
   * 
   * @param {string} roomId - Room ID
   * @param {string} senderId - ID of the user sending the message
   * @param {string} content - Message content
   * @param {Object} options - Additional options
   * @param {string} options.messageType - Type of message (text, system, announcement)
   * @param {string} options.replyTo - ID of message being replied to
   * @returns {Promise<Object>} Created message
   */
  async sendMessage(roomId, senderId, content, options = {}) {
    // Validate content - Requirement 3.2
    if (!content || !content.trim()) {
      throw this._createError('Message content cannot be empty', MESSAGE_ERROR_CODES.EMPTY_MESSAGE, 400);
    }
    
    const trimmedContent = content.trim();
    
    if (trimmedContent.length > 2000) {
      throw this._createError(
        'Message cannot exceed 2000 characters',
        MESSAGE_ERROR_CODES.MESSAGE_TOO_LONG,
        400
      );
    }
    
    // Get room and validate
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MESSAGE_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Check if sender is a participant - Requirement 3.1
    if (!room.isParticipant(senderId)) {
      throw this._createError(
        'You must be a participant to send messages',
        MESSAGE_ERROR_CODES.NOT_PARTICIPANT,
        403
      );
    }
    
    // Check if sender is banned
    if (room.isBanned(senderId)) {
      throw this._createError(
        'You are banned from this room',
        MESSAGE_ERROR_CODES.USER_BANNED,
        403
      );
    }
    
    // Check mute status - Requirement 4.1
    const muteStatus = await this._checkMuteStatus(room, senderId);
    if (muteStatus.isMuted) {
      const muteMessage = muteStatus.mutedUntil
        ? `You are muted until ${muteStatus.mutedUntil.toISOString()}`
        : 'You are muted in this room';
      throw this._createError(muteMessage, MESSAGE_ERROR_CODES.USER_MUTED, 403);
    }
    
    // Parse mentions from content - Requirement 3.2
    const mentionedUserIds = await this._parseMentions(trimmedContent, room);
    
    // Create the message
    const message = new RoomMessage({
      room: roomId,
      sender: senderId,
      content: trimmedContent,
      messageType: options.messageType || 'text',
      mentions: mentionedUserIds,
      replyTo: options.replyTo || null
    });
    
    await message.save();
    
    // Populate sender info for response
    await message.populate('sender', 'name profilePicture');
    await message.populate('mentions', 'name');
    
    if (options.replyTo) {
      await message.populate('replyTo', 'content sender');
    }
    
    console.log(`✅ Message sent in room ${room.name} by ${senderId}`);
    
    return message;
  }
  
  /**
   * Parse @mentions from message content and resolve to user IDs
   * 
   * @param {string} content - Message content
   * @param {Object} room - Room document
   * @returns {Promise<Array>} Array of mentioned user IDs
   * @private
   */
  async _parseMentions(content, room) {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    
    if (!matches || matches.length === 0) {
      return [];
    }
    
    // Extract usernames (remove @ prefix)
    const usernames = [...new Set(matches.map(m => m.substring(1).toLowerCase()))];
    
    // Get participant user IDs
    const participantIds = room.participants.map(p => p.user);
    
    // Find users by name that are participants
    const users = await User.find({
      _id: { $in: participantIds },
      name: { $in: usernames.map(u => new RegExp(`^${u}$`, 'i')) }
    }).select('_id');
    
    return users.map(u => u._id);
  }
  
  /**
   * Check if a user is muted in a room
   * 
   * @param {Object} room - Room document
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Mute status
   * @private
   */
  async _checkMuteStatus(room, userId) {
    const participant = room.getParticipant(userId);
    if (!participant) {
      return { isMuted: false };
    }
    
    if (!participant.isMuted) {
      return { isMuted: false };
    }
    
    // Check if mute has expired
    if (participant.mutedUntil && participant.mutedUntil < new Date()) {
      // Auto-unmute
      participant.isMuted = false;
      participant.mutedUntil = null;
      participant.mutedBy = null;
      participant.muteReason = null;
      await room.save();
      return { isMuted: false, wasAutoUnmuted: true };
    }
    
    return {
      isMuted: true,
      mutedUntil: participant.mutedUntil,
      muteReason: participant.muteReason
    };
  }


  // ============================================
  // MESSAGE RETRIEVAL - Requirements 3.5, 3.6, 7.1
  // ============================================
  
  /**
   * Get messages for a room with cursor-based pagination
   * 
   * Requirements: 3.5, 3.6, 7.1
   * - Get messages for room with cursor-based pagination
   * - Return in chronological order
   * - Support before/after cursors
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - Requesting user ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Max messages to return (default 50)
   * @param {string} options.before - Cursor for messages before this timestamp/ID
   * @param {string} options.after - Cursor for messages after this timestamp/ID
   * @param {boolean} options.includeDeleted - Include deleted messages (default false)
   * @returns {Promise<Object>} Messages with pagination info
   */
  async getMessages(roomId, userId, options = {}) {
    const { 
      limit = 50, 
      before = null, 
      after = null,
      includeDeleted = false 
    } = options;
    
    // Validate room exists
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MESSAGE_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Check if user is a participant
    if (!room.isParticipant(userId)) {
      throw this._createError(
        'You must be a participant to view messages',
        MESSAGE_ERROR_CODES.NOT_PARTICIPANT,
        403
      );
    }
    
    // Build query
    const query = { room: roomId };
    
    if (!includeDeleted) {
      query.isDeleted = false;
    }
    
    // Handle cursor-based pagination
    if (before) {
      // Get messages before this cursor (older messages)
      const cursorDate = this._parseCursor(before);
      if (cursorDate) {
        query.createdAt = { $lt: cursorDate };
      }
    } else if (after) {
      // Get messages after this cursor (newer messages)
      const cursorDate = this._parseCursor(after);
      if (cursorDate) {
        query.createdAt = { $gt: cursorDate };
      }
    }
    
    // Determine sort order - Requirement 3.6 (chronological)
    // When fetching "before", we want newest first then reverse
    // When fetching "after" or default, we want oldest first
    const sortOrder = before ? -1 : -1; // Always fetch newest first, then reverse for display
    
    // Execute query
    const messages = await RoomMessage.find(query)
      .populate('sender', 'name profilePicture')
      .populate('mentions', 'name')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: sortOrder })
      .limit(limit + 1); // Fetch one extra to check if there are more
    
    // Check if there are more messages
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Remove the extra message
    }
    
    // Reverse to get chronological order (oldest first) for display
    const orderedMessages = messages.reverse();
    
    // Build pagination cursors
    const pagination = {
      limit,
      hasMore,
      nextCursor: null,
      prevCursor: null
    };
    
    if (orderedMessages.length > 0) {
      // Cursor for older messages (before first message)
      pagination.prevCursor = this._createCursor(orderedMessages[0].createdAt);
      // Cursor for newer messages (after last message)
      pagination.nextCursor = this._createCursor(orderedMessages[orderedMessages.length - 1].createdAt);
    }
    
    return {
      messages: orderedMessages,
      pagination
    };
  }
  
  /**
   * Parse a cursor string to a Date
   * 
   * @param {string} cursor - Cursor string (ISO date or message ID)
   * @returns {Date|null} Parsed date or null
   * @private
   */
  _parseCursor(cursor) {
    if (!cursor) return null;
    
    // Try parsing as ISO date
    const date = new Date(cursor);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try parsing as MongoDB ObjectId (extract timestamp)
    if (mongoose.Types.ObjectId.isValid(cursor)) {
      return new mongoose.Types.ObjectId(cursor).getTimestamp();
    }
    
    return null;
  }
  
  /**
   * Create a cursor string from a Date
   * 
   * @param {Date} date - Date to encode
   * @returns {string} Cursor string
   * @private
   */
  _createCursor(date) {
    return date.toISOString();
  }


  // ============================================
  // MESSAGE DELETION - Requirement 4.5
  // ============================================
  
  /**
   * Delete a message (soft delete)
   * 
   * Requirement 4.5:
   * - Mark message as deleted
   * - Record who deleted and when
   * - Hide from subsequent retrievals
   * 
   * @param {string} messageId - Message ID
   * @param {string} userId - ID of user deleting the message
   * @param {string} reason - Optional reason for deletion
   * @returns {Promise<Object>} Deleted message
   */
  async deleteMessage(messageId, userId, reason = '') {
    const message = await RoomMessage.findById(messageId);
    if (!message) {
      throw this._createError('Message not found', MESSAGE_ERROR_CODES.MESSAGE_NOT_FOUND, 404);
    }
    
    // Get the room to check permissions
    const room = await ChatRoom.findById(message.room);
    if (!room) {
      throw this._createError('Room not found', MESSAGE_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Check authorization:
    // - Message sender can delete their own messages
    // - Room moderators/owners can delete any message
    const isSender = message.sender.toString() === userId.toString();
    const isModerator = room.isModerator(userId);
    const isOwner = room.isOwner(userId);
    
    if (!isSender && !isModerator && !isOwner) {
      throw this._createError(
        'You do not have permission to delete this message',
        MESSAGE_ERROR_CODES.NOT_AUTHORIZED,
        403
      );
    }
    
    // Check if already deleted
    if (message.isDeleted) {
      throw this._createError(
        'Message is already deleted',
        MESSAGE_ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // Soft delete the message
    message.isDeleted = true;
    message.deletedBy = userId;
    message.deletedAt = new Date();
    message.deletionReason = reason || (isSender ? 'Deleted by sender' : 'Deleted by moderator');
    
    await message.save();
    
    console.log(`✅ Message ${messageId} deleted by ${userId}`);
    
    return message;
  }


  // ============================================
  // MESSAGE SEARCH - Requirements 7.2, 7.3
  // ============================================
  
  /**
   * Search messages in a room
   * 
   * Requirements: 7.2, 7.3
   * - Search messages by content
   * - Return with context and timestamp
   * - Respect room membership
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - Requesting user ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @param {number} options.limit - Max results (default 20)
   * @param {number} options.skip - Offset for pagination (default 0)
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchMessages(roomId, userId, searchTerm, options = {}) {
    const { limit = 20, skip = 0 } = options;
    
    // Validate search term
    if (!searchTerm || !searchTerm.trim()) {
      throw this._createError('Search term is required', MESSAGE_ERROR_CODES.VALIDATION_ERROR, 400);
    }
    
    const trimmedSearch = searchTerm.trim();
    
    // Validate room exists
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MESSAGE_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Check if user is a participant - Requirement 7.3 (respect room membership)
    if (!room.isParticipant(userId)) {
      throw this._createError(
        'You must be a participant to search messages',
        MESSAGE_ERROR_CODES.NOT_PARTICIPANT,
        403
      );
    }
    
    // Build search query using text index
    const query = {
      room: roomId,
      isDeleted: false,
      $text: { $search: trimmedSearch }
    };
    
    // Get total count for pagination
    const total = await RoomMessage.countDocuments(query);
    
    // Execute search - Requirement 7.2
    const messages = await RoomMessage.find(query)
      .populate('sender', 'name profilePicture')
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Return with context and timestamp - Requirement 7.3
    const results = messages.map(msg => ({
      _id: msg._id,
      content: msg.content,
      sender: msg.sender,
      createdAt: msg.createdAt,
      messageType: msg.messageType,
      // Include text search score for relevance
      relevanceScore: msg._doc.score || 0
    }));
    
    return {
      results,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + messages.length < total
      },
      searchTerm: trimmedSearch
    };
  }
  
  /**
   * Search messages using regex (fallback for when text index isn't available)
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - Requesting user ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Search results
   */
  async searchMessagesRegex(roomId, userId, searchTerm, options = {}) {
    const { limit = 20, skip = 0 } = options;
    
    if (!searchTerm || !searchTerm.trim()) {
      throw this._createError('Search term is required', MESSAGE_ERROR_CODES.VALIDATION_ERROR, 400);
    }
    
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MESSAGE_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    if (!room.isParticipant(userId)) {
      throw this._createError(
        'You must be a participant to search messages',
        MESSAGE_ERROR_CODES.NOT_PARTICIPANT,
        403
      );
    }
    
    // Use case-insensitive regex search
    const query = {
      room: roomId,
      isDeleted: false,
      content: { $regex: searchTerm.trim(), $options: 'i' }
    };
    
    const total = await RoomMessage.countDocuments(query);
    
    const messages = await RoomMessage.find(query)
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    return {
      results: messages,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + messages.length < total
      },
      searchTerm: searchTerm.trim()
    };
  }


  // ============================================
  // UNREAD COUNT TRACKING - Requirement 6.5
  // ============================================
  
  /**
   * Get unread message count for a user in a room
   * 
   * Requirement 6.5:
   * - Track last read timestamp per participant
   * - Calculate unread count
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Unread count info
   */
  async getUnreadCount(roomId, userId) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MESSAGE_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Get participant's last read timestamp
    const participant = room.getParticipant(userId);
    if (!participant) {
      return {
        unreadCount: 0,
        isParticipant: false
      };
    }
    
    const lastReadAt = participant.lastReadAt || participant.joinedAt;
    
    // Count messages after last read (excluding user's own messages)
    const unreadCount = await RoomMessage.countDocuments({
      room: roomId,
      isDeleted: false,
      sender: { $ne: userId },
      createdAt: { $gt: lastReadAt }
    });
    
    return {
      unreadCount,
      lastReadAt,
      isParticipant: true
    };
  }
  
  /**
   * Mark messages as read for a user in a room
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @param {Date} readUntil - Mark all messages up to this time as read (default: now)
   * @returns {Promise<Object>} Update result
   */
  async markAsRead(roomId, userId, readUntil = new Date()) {
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MESSAGE_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Get participant
    const participant = room.getParticipant(userId);
    if (!participant) {
      throw this._createError(
        'You are not a participant in this room',
        MESSAGE_ERROR_CODES.NOT_PARTICIPANT,
        403
      );
    }
    
    // Update last read timestamp
    const previousLastRead = participant.lastReadAt;
    participant.lastReadAt = readUntil;
    await room.save();
    
    // Optionally update readBy on individual messages
    // This is more expensive but provides per-message read receipts
    const updateResult = await RoomMessage.updateMany(
      {
        room: roomId,
        isDeleted: false,
        createdAt: { $lte: readUntil },
        'readBy.user': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );
    
    return {
      success: true,
      previousLastRead,
      newLastRead: readUntil,
      messagesMarkedRead: updateResult.modifiedCount
    };
  }
  
  /**
   * Get unread counts for all rooms a user is in
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of room unread counts
   */
  async getAllUnreadCounts(userId) {
    // Get all rooms user is a participant in
    const rooms = await ChatRoom.find({
      isActive: true,
      'participants.user': userId
    }).select('_id name participants');
    
    const unreadCounts = await Promise.all(
      rooms.map(async (room) => {
        const participant = room.participants.find(
          p => p.user.toString() === userId.toString()
        );
        const lastReadAt = participant?.lastReadAt || participant?.joinedAt || new Date(0);
        
        const count = await RoomMessage.countDocuments({
          room: room._id,
          isDeleted: false,
          sender: { $ne: userId },
          createdAt: { $gt: lastReadAt }
        });
        
        return {
          roomId: room._id,
          roomName: room.name,
          unreadCount: count,
          lastReadAt
        };
      })
    );
    
    return unreadCounts;
  }


  // ============================================
  // ADDITIONAL HELPER METHODS
  // ============================================
  
  /**
   * Get a single message by ID
   * 
   * @param {string} messageId - Message ID
   * @param {string} userId - Requesting user ID
   * @returns {Promise<Object>} Message
   */
  async getMessageById(messageId, userId) {
    const message = await RoomMessage.findById(messageId)
      .populate('sender', 'name profilePicture')
      .populate('mentions', 'name')
      .populate('replyTo', 'content sender');
    
    if (!message) {
      throw this._createError('Message not found', MESSAGE_ERROR_CODES.MESSAGE_NOT_FOUND, 404);
    }
    
    // Check if user has access to the room
    const room = await ChatRoom.findById(message.room);
    if (!room || !room.isParticipant(userId)) {
      throw this._createError(
        'You do not have access to this message',
        MESSAGE_ERROR_CODES.NOT_PARTICIPANT,
        403
      );
    }
    
    return message;
  }
  
  /**
   * Get messages mentioning a specific user
   * 
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Messages with pagination
   */
  async getMentions(userId, options = {}) {
    const { limit = 20, skip = 0 } = options;
    
    const total = await RoomMessage.countDocuments({
      mentions: userId,
      isDeleted: false
    });
    
    const messages = await RoomMessage.find({
      mentions: userId,
      isDeleted: false
    })
    .populate('room', 'name')
    .populate('sender', 'name profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    return {
      messages,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + messages.length < total
      }
    };
  }
  
  /**
   * Export chat history for a room (moderators only)
   * 
   * @param {string} roomId - Room ID
   * @param {string} userId - Requesting user ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported messages
   */
  async exportChatHistory(roomId, userId, options = {}) {
    const { startDate, endDate, format = 'json' } = options;
    
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      throw this._createError('Room not found', MESSAGE_ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    
    // Only moderators and owners can export
    if (!room.isModerator(userId) && !room.isOwner(userId)) {
      throw this._createError(
        'Only moderators can export chat history',
        MESSAGE_ERROR_CODES.NOT_AUTHORIZED,
        403
      );
    }
    
    // Build query
    const query = {
      room: roomId,
      isDeleted: false
    };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const messages = await RoomMessage.find(query)
      .populate('sender', 'name email')
      .sort({ createdAt: 1 });
    
    // Format for export
    const exportData = {
      room: {
        id: room._id,
        name: room.name,
        description: room.description,
        roomType: room.roomType
      },
      exportedAt: new Date(),
      exportedBy: userId,
      messageCount: messages.length,
      dateRange: {
        start: startDate || 'beginning',
        end: endDate || 'now'
      },
      messages: messages.map(msg => ({
        id: msg._id,
        sender: msg.sender?.name || 'Unknown',
        senderEmail: msg.sender?.email,
        content: msg.content,
        timestamp: msg.createdAt,
        messageType: msg.messageType
      }))
    };
    
    return exportData;
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
const roomMessageService = new RoomMessageService();

module.exports = {
  RoomMessageService,
  roomMessageService,
  MESSAGE_ERROR_CODES
};
