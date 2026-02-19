/**
 * ChatRoomSocketService - Real-time Socket.io Management for Chat Rooms
 * 
 * This service handles all real-time features including:
 * - Socket.io room management (join/leave/reconnection)
 * - Real-time message broadcasting
 * - Typing indicators
 * - Participant join/leave events
 * - Moderation events (mute/kick/ban)
 * - Room settings update events
 * 
 * Requirements: 2.4, 3.1, 3.4, 3.5, 4.1, 4.3, 4.5, 5.1, 6.2, 6.4
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { validateWebSocketOrigin } = require('../middleware/security');
const { chatRoomService } = require('./chatRoomService');
const { roomMessageService } = require('./roomMessageService');
const { moderationService } = require('./moderationService');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');

/**
 * Socket.io event names for chat rooms
 * Defined in design document
 */
const CHAT_ROOM_EVENTS = {
  // Client -> Server
  JOIN_ROOM: 'chat-room:join',
  LEAVE_ROOM: 'chat-room:leave',
  SEND_MESSAGE: 'chat-room:message:send',
  TYPING_START: 'chat-room:typing:start',
  TYPING_STOP: 'chat-room:typing:stop',
  MARK_READ: 'chat-room:messages:read',
  
  // Server -> Client
  MESSAGE_NEW: 'chat-room:message:new',
  MESSAGE_DELETED: 'chat-room:message:deleted',
  PARTICIPANT_JOINED: 'chat-room:participant:joined',
  PARTICIPANT_LEFT: 'chat-room:participant:left',
  PARTICIPANT_MUTED: 'chat-room:participant:muted',
  PARTICIPANT_UNMUTED: 'chat-room:participant:unmuted',
  PARTICIPANT_KICKED: 'chat-room:participant:kicked',
  PARTICIPANT_BANNED: 'chat-room:participant:banned',
  TYPING_INDICATOR: 'chat-room:typing:update',
  ROOM_UPDATED: 'chat-room:updated',
  SESSION_STARTED: 'chat-room:session:started',
  SESSION_ENDED: 'chat-room:session:ended',
  JOIN_SUCCESS: 'chat-room:join:success',
  JOIN_ERROR: 'chat-room:join:error',
  ERROR: 'chat-room:error'
};

// Active chat room connections: roomId -> { participants: Map<socketId, userInfo>, typingUsers: Set<userId> }
const activeChatRooms = new Map();

// User socket mapping: userId -> Set<socketId> (user can have multiple connections)
const userSockets = new Map();

// Rate limiting for messages: userId -> { count, windowStart }
const messageRateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_MESSAGES = 10; // 10 messages per minute per user

let chatIO = null;

/**
 * Initialize the chat room Socket.io namespace
 * 
 * @param {Object} io - Main Socket.io server instance
 * @returns {Object} Chat room namespace
 */
function initializeChatRoomSocket(io) {
  // Create a namespace for chat rooms
  chatIO = io.of('/chat-rooms');
  
  // Configure CORS for the namespace
  chatIO.use(async (socket, next) => {
    try {
      // Validate origin
      const origin = socket.handshake.headers.origin;
      if (origin && !validateWebSocketOrigin(origin)) {
        console.warn(`🔒 Chat room WebSocket rejected from unauthorized origin: ${origin}`);
        return next(new Error('Unauthorized origin'));
      }
      
      // Extract and verify JWT token
      const token = socket.handshake.auth.token || 
                   socket.handshake.query.token ||
                   socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        console.warn('🔒 Chat room WebSocket rejected: No authentication token');
        return next(new Error('Authentication token required'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.user.id).select('name email role profilePicture');
      if (!user) {
        console.warn(`🔒 Chat room WebSocket rejected: User not found for ID ${decoded.user.id}`);
        return next(new Error('User not found'));
      }
      
      // Attach user info to socket
      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      };
      socket.userId = user._id.toString();
      
      console.log(`🔐 Chat room authenticated: ${user.name} (${user.role}) - Socket: ${socket.id}`);
      next();
    } catch (error) {
      console.warn('🔒 Chat room authentication failed:', error.message);
      next(new Error('Authentication failed'));
    }
  });
  
  // Connection rate limiting
  const connectionAttempts = new Map();
  chatIO.use((socket, next) => {
    const clientIP = socket.handshake.headers['x-forwarded-for'] || 
                    socket.handshake.address;
    
    const now = Date.now();
    const windowMs = 60000;
    const maxAttempts = 20;
    
    if (!connectionAttempts.has(clientIP)) {
      connectionAttempts.set(clientIP, []);
    }
    
    const attempts = connectionAttempts.get(clientIP);
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      console.warn(`🔒 Chat room rate limit exceeded for IP: ${clientIP}`);
      return next(new Error('Rate limit exceeded'));
    }
    
    recentAttempts.push(now);
    connectionAttempts.set(clientIP, recentAttempts);
    next();
  });
  
  // Handle connections
  chatIO.on('connection', (socket) => {
    console.log(`💬 Chat room connected: ${socket.user.name} - Socket: ${socket.id}`);
    
    // Track user socket
    if (!userSockets.has(socket.userId)) {
      userSockets.set(socket.userId, new Set());
    }
    userSockets.get(socket.userId).add(socket.id);
    
    // Set up event handlers
    setupJoinLeaveHandlers(socket);
    setupMessageHandlers(socket);
    setupTypingHandlers(socket);
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
      handleDisconnect(socket, reason);
    });
  });
  
  console.log('✅ Chat room Socket.io namespace initialized');
  return chatIO;
}



// ============================================
// JOIN/LEAVE HANDLERS - Requirements 3.1, 3.4, 3.5
// ============================================

/**
 * Set up join and leave room handlers
 * 
 * Requirements: 3.1, 3.4, 3.5
 * - Join socket room on room join
 * - Leave socket room on room leave
 * - Handle reconnection
 * 
 * @param {Object} socket - Socket.io socket instance
 */
function setupJoinLeaveHandlers(socket) {
  
  /**
   * Handle joining a chat room
   * Requirement 3.5: Load recent message history on reconnection
   */
  socket.on(CHAT_ROOM_EVENTS.JOIN_ROOM, async ({ roomId }) => {
    try {
      const userId = socket.userId;
      
      // Verify user is a participant in the room
      const room = await ChatRoom.findById(roomId);
      if (!room) {
        socket.emit(CHAT_ROOM_EVENTS.JOIN_ERROR, { 
          error: 'Room not found',
          code: 'ROOM_NOT_FOUND'
        });
        return;
      }
      
      if (!room.isParticipant(userId)) {
        socket.emit(CHAT_ROOM_EVENTS.JOIN_ERROR, { 
          error: 'You are not a participant in this room',
          code: 'NOT_PARTICIPANT'
        });
        return;
      }
      
      // Check if user is banned
      if (room.isBanned(userId)) {
        socket.emit(CHAT_ROOM_EVENTS.JOIN_ERROR, { 
          error: 'You are banned from this room',
          code: 'USER_BANNED'
        });
        return;
      }
      
      // Join the socket room
      socket.join(`chat-room:${roomId}`);
      
      // Initialize room tracking if needed
      if (!activeChatRooms.has(roomId)) {
        activeChatRooms.set(roomId, {
          participants: new Map(),
          typingUsers: new Set()
        });
      }
      
      const roomData = activeChatRooms.get(roomId);
      
      // Check if this is a reconnection (user already in room with different socket)
      const existingEntry = Array.from(roomData.participants.entries())
        .find(([_, info]) => info.userId === userId);
      
      if (existingEntry) {
        // Update socket ID for reconnection
        const [oldSocketId, userInfo] = existingEntry;
        roomData.participants.delete(oldSocketId);
        roomData.participants.set(socket.id, {
          ...userInfo,
          socketId: socket.id,
          reconnectedAt: new Date()
        });
        
        console.log(`🔄 User ${socket.user.name} reconnected to chat room ${roomId}`);
      } else {
        // New join
        roomData.participants.set(socket.id, {
          socketId: socket.id,
          odId: userId,
          userName: socket.user.name,
          userRole: socket.user.role,
          profilePicture: socket.user.profilePicture,
          joinedAt: new Date()
        });
        
        // Notify other participants - Requirement 2.4
        socket.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.PARTICIPANT_JOINED, {
          userId,
          userName: socket.user.name,
          userRole: socket.user.role,
          profilePicture: socket.user.profilePicture,
          timestamp: new Date().toISOString()
        });
        
        console.log(`👤 ${socket.user.name} joined chat room ${roomId}`);
      }
      
      // Get current online participants
      const onlineParticipants = Array.from(roomData.participants.values()).map(p => ({
        userId: p.userId,
        userName: p.userName,
        userRole: p.userRole,
        profilePicture: p.profilePicture
      }));
      
      // Get current typing users
      const typingUsers = Array.from(roomData.typingUsers);
      
      // Send success response with room state
      socket.emit(CHAT_ROOM_EVENTS.JOIN_SUCCESS, {
        roomId,
        roomName: room.name,
        onlineParticipants,
        typingUsers,
        participantCount: room.participants.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Chat room join error:', error);
      socket.emit(CHAT_ROOM_EVENTS.JOIN_ERROR, { 
        error: 'Failed to join room',
        code: 'SERVER_ERROR'
      });
    }
  });
  
  /**
   * Handle leaving a chat room
   * Requirement 6.2: Notify remaining participants
   */
  socket.on(CHAT_ROOM_EVENTS.LEAVE_ROOM, async ({ roomId }) => {
    try {
      await handleLeaveRoom(socket, roomId);
    } catch (error) {
      console.error('Chat room leave error:', error);
      socket.emit(CHAT_ROOM_EVENTS.ERROR, { 
        error: 'Failed to leave room',
        code: 'SERVER_ERROR'
      });
    }
  });
}

/**
 * Handle a user leaving a chat room
 * 
 * @param {Object} socket - Socket.io socket instance
 * @param {string} roomId - Room ID
 */
async function handleLeaveRoom(socket, roomId) {
  const userId = socket.userId;
  
  // Leave the socket room
  socket.leave(`chat-room:${roomId}`);
  
  // Update room tracking
  if (activeChatRooms.has(roomId)) {
    const roomData = activeChatRooms.get(roomId);
    
    // Remove from participants
    roomData.participants.delete(socket.id);
    
    // Remove from typing users
    roomData.typingUsers.delete(userId);
    
    // Notify other participants - Requirement 6.2
    socket.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.PARTICIPANT_LEFT, {
      userId,
      userName: socket.user.name,
      timestamp: new Date().toISOString()
    });
    
    // Update typing indicator if user was typing
    broadcastTypingIndicator(roomId);
    
    // Clean up empty room tracking
    if (roomData.participants.size === 0) {
      activeChatRooms.delete(roomId);
    }
    
    console.log(`👋 ${socket.user.name} left chat room ${roomId}`);
  }
}

/**
 * Handle socket disconnect
 * 
 * @param {Object} socket - Socket.io socket instance
 * @param {string} reason - Disconnect reason
 */
function handleDisconnect(socket, reason) {
  console.log(`🔌 Chat room disconnected: ${socket.user?.name || socket.id} - Reason: ${reason}`);
  
  // Remove from user sockets tracking
  if (userSockets.has(socket.userId)) {
    userSockets.get(socket.userId).delete(socket.id);
    if (userSockets.get(socket.userId).size === 0) {
      userSockets.delete(socket.userId);
    }
  }
  
  // Clean up from all rooms
  activeChatRooms.forEach((roomData, roomId) => {
    if (roomData.participants.has(socket.id)) {
      const userInfo = roomData.participants.get(socket.id);
      roomData.participants.delete(socket.id);
      roomData.typingUsers.delete(socket.userId);
      
      // Notify other participants
      socket.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.PARTICIPANT_LEFT, {
        userId: socket.userId,
        userName: socket.user?.name,
        reason: 'disconnected',
        timestamp: new Date().toISOString()
      });
      
      // Update typing indicator
      broadcastTypingIndicator(roomId);
      
      // Clean up empty room tracking
      if (roomData.participants.size === 0) {
        activeChatRooms.delete(roomId);
      }
    }
  });
}



// ============================================
// MESSAGE HANDLERS - Requirements 3.1, 2.4, 6.2, 6.4
// ============================================

/**
 * Set up message handlers
 * 
 * Requirements: 3.1, 2.4, 6.2, 6.4
 * - Broadcast new messages to room participants
 * - Emit typing indicators
 * - Emit participant join/leave events
 * 
 * @param {Object} socket - Socket.io socket instance
 */
function setupMessageHandlers(socket) {
  
  /**
   * Handle sending a message
   * Requirement 3.1: Broadcast message to all room participants immediately
   */
  socket.on(CHAT_ROOM_EVENTS.SEND_MESSAGE, async ({ roomId, content, messageType, replyTo }) => {
    try {
      const userId = socket.userId;
      
      // Check rate limit - Requirement 9.6
      if (!checkMessageRateLimit(userId)) {
        socket.emit(CHAT_ROOM_EVENTS.ERROR, {
          error: 'Rate limit exceeded. Maximum 10 messages per minute.',
          code: 'RATE_LIMITED'
        });
        return;
      }
      
      // Send message using the service (handles validation, mute check, etc.)
      const message = await roomMessageService.sendMessage(
        roomId,
        userId,
        content,
        { messageType, replyTo }
      );
      
      // Stop typing indicator for this user
      if (activeChatRooms.has(roomId)) {
        activeChatRooms.get(roomId).typingUsers.delete(userId);
        broadcastTypingIndicator(roomId);
      }
      
      // Broadcast message to all participants in the room - Requirement 3.1
      chatIO.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.MESSAGE_NEW, {
        message: {
          _id: message._id,
          content: message.content,
          sender: message.sender,
          messageType: message.messageType,
          mentions: message.mentions,
          replyTo: message.replyTo,
          createdAt: message.createdAt
        },
        roomId,
        timestamp: new Date().toISOString()
      });
      
      console.log(`💬 Message sent in room ${roomId} by ${socket.user.name}`);
      
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit(CHAT_ROOM_EVENTS.ERROR, {
        error: error.message,
        code: error.code || 'SERVER_ERROR'
      });
    }
  });
  
  /**
   * Handle marking messages as read
   */
  socket.on(CHAT_ROOM_EVENTS.MARK_READ, async ({ roomId, readUntil }) => {
    try {
      await roomMessageService.markAsRead(
        roomId,
        socket.userId,
        readUntil ? new Date(readUntil) : new Date()
      );
    } catch (error) {
      console.error('Mark read error:', error);
    }
  });
}

/**
 * Check if a user is within the message rate limit
 * Requirement 9.6: Max 10 messages per minute per user
 * 
 * @param {string} userId - User ID
 * @returns {boolean} True if within limit
 */
function checkMessageRateLimit(userId) {
  const now = Date.now();
  
  if (!messageRateLimits.has(userId)) {
    messageRateLimits.set(userId, { count: 1, windowStart: now });
    return true;
  }
  
  const userLimit = messageRateLimits.get(userId);
  
  // Reset window if expired
  if (now - userLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
    messageRateLimits.set(userId, { count: 1, windowStart: now });
    return true;
  }
  
  // Check if within limit
  if (userLimit.count >= RATE_LIMIT_MAX_MESSAGES) {
    return false;
  }
  
  // Increment count
  userLimit.count++;
  return true;
}

// ============================================
// TYPING HANDLERS - Requirement 6.4
// ============================================

/**
 * Set up typing indicator handlers
 * 
 * Requirement 6.4: Show typing indicator to other participants
 * 
 * @param {Object} socket - Socket.io socket instance
 */
function setupTypingHandlers(socket) {
  
  /**
   * Handle typing start
   */
  socket.on(CHAT_ROOM_EVENTS.TYPING_START, ({ roomId }) => {
    try {
      if (!activeChatRooms.has(roomId)) return;
      
      const roomData = activeChatRooms.get(roomId);
      roomData.typingUsers.add(socket.userId);
      
      // Broadcast typing indicator - Requirement 6.4
      broadcastTypingIndicator(roomId, socket.id);
      
    } catch (error) {
      console.error('Typing start error:', error);
    }
  });
  
  /**
   * Handle typing stop
   */
  socket.on(CHAT_ROOM_EVENTS.TYPING_STOP, ({ roomId }) => {
    try {
      if (!activeChatRooms.has(roomId)) return;
      
      const roomData = activeChatRooms.get(roomId);
      roomData.typingUsers.delete(socket.userId);
      
      // Broadcast typing indicator
      broadcastTypingIndicator(roomId, socket.id);
      
    } catch (error) {
      console.error('Typing stop error:', error);
    }
  });
}

/**
 * Broadcast typing indicator to room participants
 * 
 * @param {string} roomId - Room ID
 * @param {string} excludeSocketId - Socket ID to exclude from broadcast (optional)
 */
function broadcastTypingIndicator(roomId, excludeSocketId = null) {
  if (!activeChatRooms.has(roomId)) return;
  
  const roomData = activeChatRooms.get(roomId);
  
  // Get typing user info
  const typingUsers = [];
  roomData.typingUsers.forEach(userId => {
    // Find user info from participants
    const participant = Array.from(roomData.participants.values())
      .find(p => p.userId === userId);
    if (participant) {
      typingUsers.push({
        userId,
        userName: participant.userName
      });
    }
  });
  
  // Broadcast to room
  if (excludeSocketId) {
    chatIO.to(`chat-room:${roomId}`).except(excludeSocketId).emit(CHAT_ROOM_EVENTS.TYPING_INDICATOR, {
      roomId,
      typingUsers,
      timestamp: new Date().toISOString()
    });
  } else {
    chatIO.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.TYPING_INDICATOR, {
      roomId,
      typingUsers,
      timestamp: new Date().toISOString()
    });
  }
}



// ============================================
// MODERATION EVENT EMITTERS - Requirements 4.1, 4.3, 4.5, 5.1
// ============================================

/**
 * Emit mute event to room participants
 * Requirement 4.1: Notify when participant is muted
 * 
 * @param {string} roomId - Room ID
 * @param {Object} data - Mute data
 */
function emitMuteEvent(roomId, data) {
  if (!chatIO) return;
  
  chatIO.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.PARTICIPANT_MUTED, {
    roomId,
    targetUserId: data.targetUserId,
    targetUserName: data.targetUserName,
    moderatorId: data.moderatorId,
    moderatorName: data.moderatorName,
    duration: data.duration,
    mutedUntil: data.mutedUntil,
    reason: data.reason,
    timestamp: new Date().toISOString()
  });
  
  console.log(`🔇 Mute event emitted for user ${data.targetUserId} in room ${roomId}`);
}

/**
 * Emit unmute event to room participants
 * Requirement 4.2: Notify when participant is unmuted
 * 
 * @param {string} roomId - Room ID
 * @param {Object} data - Unmute data
 */
function emitUnmuteEvent(roomId, data) {
  if (!chatIO) return;
  
  chatIO.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.PARTICIPANT_UNMUTED, {
    roomId,
    targetUserId: data.targetUserId,
    targetUserName: data.targetUserName,
    moderatorId: data.moderatorId,
    moderatorName: data.moderatorName,
    timestamp: new Date().toISOString()
  });
  
  console.log(`🔊 Unmute event emitted for user ${data.targetUserId} in room ${roomId}`);
}

/**
 * Emit kick event to room participants
 * Requirement 4.3: Notify when participant is kicked
 * 
 * @param {string} roomId - Room ID
 * @param {Object} data - Kick data
 */
function emitKickEvent(roomId, data) {
  if (!chatIO) return;
  
  // Notify all participants
  chatIO.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.PARTICIPANT_KICKED, {
    roomId,
    targetUserId: data.targetUserId,
    targetUserName: data.targetUserName,
    moderatorId: data.moderatorId,
    moderatorName: data.moderatorName,
    reason: data.reason,
    timestamp: new Date().toISOString()
  });
  
  // Force disconnect the kicked user from the room
  forceLeaveRoom(data.targetUserId, roomId, 'kicked');
  
  console.log(`👢 Kick event emitted for user ${data.targetUserId} in room ${roomId}`);
}

/**
 * Emit ban event to room participants
 * Requirement 4.4: Notify when participant is banned
 * 
 * @param {string} roomId - Room ID
 * @param {Object} data - Ban data
 */
function emitBanEvent(roomId, data) {
  if (!chatIO) return;
  
  // Notify all participants
  chatIO.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.PARTICIPANT_BANNED, {
    roomId,
    targetUserId: data.targetUserId,
    targetUserName: data.targetUserName,
    moderatorId: data.moderatorId,
    moderatorName: data.moderatorName,
    reason: data.reason,
    timestamp: new Date().toISOString()
  });
  
  // Force disconnect the banned user from the room
  forceLeaveRoom(data.targetUserId, roomId, 'banned');
  
  console.log(`🚫 Ban event emitted for user ${data.targetUserId} in room ${roomId}`);
}

/**
 * Emit message deletion event to room participants
 * Requirement 4.5: Notify when message is deleted
 * 
 * @param {string} roomId - Room ID
 * @param {Object} data - Deletion data
 */
function emitMessageDeletedEvent(roomId, data) {
  if (!chatIO) return;
  
  chatIO.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.MESSAGE_DELETED, {
    roomId,
    messageId: data.messageId,
    deletedBy: data.deletedBy,
    deletedByName: data.deletedByName,
    reason: data.reason,
    timestamp: new Date().toISOString()
  });
  
  console.log(`🗑️ Message deletion event emitted for message ${data.messageId} in room ${roomId}`);
}

/**
 * Emit room settings update event to room participants
 * Requirement 5.1: Notify when room settings change
 * 
 * @param {string} roomId - Room ID
 * @param {Object} data - Update data
 */
function emitRoomUpdatedEvent(roomId, data) {
  if (!chatIO) return;
  
  chatIO.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.ROOM_UPDATED, {
    roomId,
    updatedBy: data.updatedBy,
    updatedByName: data.updatedByName,
    changes: data.changes,
    room: data.room,
    timestamp: new Date().toISOString()
  });
  
  console.log(`⚙️ Room update event emitted for room ${roomId}`);
}

/**
 * Emit scheduled session started event
 * Requirement 10.2: Notify when session starts
 * 
 * @param {string} roomId - Room ID
 * @param {Object} data - Session data
 */
function emitSessionStartedEvent(roomId, data) {
  if (!chatIO) return;
  
  chatIO.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.SESSION_STARTED, {
    roomId,
    sessionId: data.sessionId,
    sessionTitle: data.sessionTitle,
    startedBy: data.startedBy,
    timestamp: new Date().toISOString()
  });
  
  console.log(`🎬 Session started event emitted for room ${roomId}`);
}

/**
 * Emit scheduled session ended event
 * Requirement 10.3: Notify when session ends
 * 
 * @param {string} roomId - Room ID
 * @param {Object} data - Session data
 */
function emitSessionEndedEvent(roomId, data) {
  if (!chatIO) return;
  
  chatIO.to(`chat-room:${roomId}`).emit(CHAT_ROOM_EVENTS.SESSION_ENDED, {
    roomId,
    sessionId: data.sessionId,
    sessionTitle: data.sessionTitle,
    endedBy: data.endedBy,
    roomLocked: data.roomLocked,
    timestamp: new Date().toISOString()
  });
  
  console.log(`🎬 Session ended event emitted for room ${roomId}`);
}

/**
 * Force a user to leave a room (used for kick/ban)
 * 
 * @param {string} userId - User ID to remove
 * @param {string} roomId - Room ID
 * @param {string} reason - Reason for removal
 */
function forceLeaveRoom(userId, roomId, reason) {
  // Get all sockets for this user
  const userSocketIds = userSockets.get(userId);
  if (!userSocketIds) return;
  
  userSocketIds.forEach(socketId => {
    const socket = chatIO.sockets.get(socketId);
    if (socket) {
      // Leave the room
      socket.leave(`chat-room:${roomId}`);
      
      // Notify the user
      socket.emit(CHAT_ROOM_EVENTS.ERROR, {
        error: `You have been ${reason} from this room`,
        code: reason.toUpperCase(),
        roomId
      });
    }
  });
  
  // Clean up room tracking
  if (activeChatRooms.has(roomId)) {
    const roomData = activeChatRooms.get(roomId);
    
    // Remove all sockets for this user
    userSocketIds.forEach(socketId => {
      roomData.participants.delete(socketId);
    });
    
    roomData.typingUsers.delete(userId);
    
    // Clean up empty room
    if (roomData.participants.size === 0) {
      activeChatRooms.delete(roomId);
    }
  }
}



// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get online participants for a room
 * 
 * @param {string} roomId - Room ID
 * @returns {Array} List of online participants
 */
function getOnlineParticipants(roomId) {
  if (!activeChatRooms.has(roomId)) {
    return [];
  }
  
  return Array.from(activeChatRooms.get(roomId).participants.values()).map(p => ({
    userId: p.userId,
    userName: p.userName,
    userRole: p.userRole,
    profilePicture: p.profilePicture
  }));
}

/**
 * Check if a user is online in a room
 * 
 * @param {string} roomId - Room ID
 * @param {string} userId - User ID
 * @returns {boolean} True if user is online
 */
function isUserOnline(roomId, userId) {
  if (!activeChatRooms.has(roomId)) {
    return false;
  }
  
  return Array.from(activeChatRooms.get(roomId).participants.values())
    .some(p => p.userId === userId);
}

/**
 * Get the Socket.io namespace for chat rooms
 * 
 * @returns {Object} Socket.io namespace
 */
function getChatIO() {
  return chatIO;
}

/**
 * Get active chat rooms data (for debugging/monitoring)
 * 
 * @returns {Object} Active rooms data
 */
function getActiveChatRooms() {
  const rooms = {};
  activeChatRooms.forEach((data, roomId) => {
    rooms[roomId] = {
      participantCount: data.participants.size,
      typingCount: data.typingUsers.size,
      participants: Array.from(data.participants.values()).map(p => ({
        userName: p.userName,
        joinedAt: p.joinedAt
      }))
    };
  });
  return rooms;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Initialization
  initializeChatRoomSocket,
  getChatIO,
  
  // Event constants
  CHAT_ROOM_EVENTS,
  
  // Event emitters (for use by routes/services)
  emitMuteEvent,
  emitUnmuteEvent,
  emitKickEvent,
  emitBanEvent,
  emitMessageDeletedEvent,
  emitRoomUpdatedEvent,
  emitSessionStartedEvent,
  emitSessionEndedEvent,
  
  // Utility functions
  getOnlineParticipants,
  isUserOnline,
  getActiveChatRooms,
  forceLeaveRoom,
  
  // For testing
  activeChatRooms,
  userSockets
};

