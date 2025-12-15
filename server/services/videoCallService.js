const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const SessionStatusManager = require('../utils/sessionStatusManager');
const jwt = require('jsonwebtoken');
const { validateWebSocketOrigin } = require('../middleware/security');
const videoCallMetricsService = require('./videoCallMetricsService');

let io;
const activeRooms = new Map(); // roomId -> { participants, startTime, sessionId, callStarted }

function initializeVideoCallServer(server) {
  // Enhanced Socket.io configuration with WSS security
  const socketConfig = {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://smiling-steps-frontend.onrender.com',
        process.env.CLIENT_URL || 'http://localhost:3000'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    // Force secure transport in production
    transports: process.env.NODE_ENV === 'production' ? ['websocket', 'polling'] : ['websocket', 'polling'],
    // Upgrade to secure transport
    upgradeTimeout: 30000,
    // Security settings
    allowEIO3: false, // Disable Engine.IO v3 for security
    serveClient: false, // Don't serve client files
    // Connection validation
    allowRequest: (req, callback) => {
      // Validate secure connection in production
      if (process.env.NODE_ENV === 'production') {
        const isSecure = req.secure || 
                        req.headers['x-forwarded-proto'] === 'https' ||
                        req.connection.encrypted;
        
        if (!isSecure) {
          console.warn('🔒 Rejected insecure WebSocket connection attempt');
          return callback('Secure connection required', false);
        }
      }
      
      // Validate origin using security middleware
      const origin = req.headers.origin;
      if (origin && !validateWebSocketOrigin(origin)) {
        console.warn(`🔒 Rejected WebSocket connection from unauthorized origin: ${origin}`);
        return callback('Unauthorized origin', false);
      }
      
      callback(null, true);
    }
  };

  io = socketIO(server, socketConfig);

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      // Extract token from handshake auth or query
      const token = socket.handshake.auth.token || 
                   socket.handshake.query.token ||
                   socket.request.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        console.warn('🔒 WebSocket connection rejected: No authentication token');
        return next(new Error('Authentication token required'));
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await global.User.findByPk(decoded.user.id);
      if (!user) {
        console.warn(`🔒 WebSocket connection rejected: User not found for ID ${decoded.user.id}`);
        return next(new Error('User not found'));
      }
      
      // Attach user to socket
      socket.user = user;
      socket.userId = user.id;
      socket.userRole = user.role;
      
      console.log(`🔐 Authenticated WebSocket connection: ${user.name} (${user.role}) - Socket: ${socket.id}`);
      next();
    } catch (error) {
      console.warn('🔒 WebSocket authentication failed:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  // Rate limiting for WebSocket connections
  const connectionAttempts = new Map();
  io.use((socket, next) => {
    const clientIP = socket.request.connection.remoteAddress || 
                    socket.request.headers['x-forwarded-for'] ||
                    socket.request.headers['x-real-ip'];
    
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxAttempts = 10; // Max 10 connections per minute per IP
    
    if (!connectionAttempts.has(clientIP)) {
      connectionAttempts.set(clientIP, []);
    }
    
    const attempts = connectionAttempts.get(clientIP);
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      console.warn(`🔒 Rate limit exceeded for IP: ${clientIP}`);
      return next(new Error('Rate limit exceeded'));
    }
    
    recentAttempts.push(now);
    connectionAttempts.set(clientIP, recentAttempts);
    
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🎥 Authenticated user connected: ${socket.user.name} (${socket.userRole}) - Socket: ${socket.id}`);
    
    // Join video room with enhanced security validation
    socket.on('join-room', async ({ roomId, sessionId }) => {
      // Record connection attempt
      const attemptId = videoCallMetricsService.recordConnectionAttempt(
        sessionId, 
        socket.userId, 
        socket.userRole,
        {
          userAgent: socket.request.headers['user-agent'],
          ipAddress: socket.request.connection.remoteAddress || socket.request.headers['x-forwarded-for'],
          browser: socket.request.headers['user-agent']?.split(' ')[0]
        }
      );
      try {
        // Use authenticated user data from socket
        const userId = socket.userId;
        const userName = socket.user.name;
        const userRole = socket.userRole;
        
        // Validate session access
        const session = await global.Session.findByPk(sessionId);
        if (!session) {
          socket.emit('join-error', { error: 'Session not found' });
          return;
        }
        
        // Verify user is authorized for this session
        const isAuthorized = 
          session.clientId === userId ||
          session.psychologistId === userId ||
          userRole === 'admin';
        
        if (!isAuthorized) {
          console.warn(`🔒 Unauthorized room join attempt: User ${userId} tried to join session ${sessionId}`);
          
          // Record security incident
          videoCallMetricsService.recordSecurityIncident(
            'unauthorized_access',
            sessionId,
            userId,
            { attemptedRole: userRole, actualAuthorization: false }
          );
          
          // Record connection failure
          videoCallMetricsService.recordConnectionFailure(
            attemptId,
            'authorization_failed',
            'Unauthorized access to this session'
          );
          
          socket.emit('join-error', { error: 'Unauthorized access to this session' });
          return;
        }
        
        // Verify session is in valid state
        if (session.status === 'Cancelled' || session.status === 'Declined') {
          videoCallMetricsService.recordConnectionFailure(
            attemptId,
            'invalid_session_status',
            `Cannot join ${session.status.toLowerCase()} session`
          );
          socket.emit('join-error', { error: 'Cannot join cancelled or declined session' });
          return;
        }
        
        // Verify payment status
        const paymentValid = ['Confirmed', 'Paid', 'Verified'].includes(session.paymentStatus);
        videoCallMetricsService.recordPaymentValidation(sessionId, paymentValid, session.paymentStatus);
        
        if (!paymentValid) {
          videoCallMetricsService.recordConnectionFailure(
            attemptId,
            'payment_not_confirmed',
            'Payment must be confirmed before joining'
          );
          socket.emit('join-error', { error: 'Payment must be confirmed before joining' });
          return;
        }
        
        // Verify room ID matches session
        if (session.meetingLink !== roomId) {
          console.warn(`🔒 Room ID mismatch: Expected ${session.meetingLink}, got ${roomId}`);
          
          // Record security incident
          videoCallMetricsService.recordSecurityIncident(
            'room_id_mismatch',
            sessionId,
            userId,
            { expectedRoomId: session.meetingLink, providedRoomId: roomId }
          );
          
          videoCallMetricsService.recordConnectionFailure(
            attemptId,
            'invalid_room_id',
            'Invalid room ID for session'
          );
          
          socket.emit('join-error', { error: 'Invalid room ID for session' });
          return;
        }
        
        socket.join(roomId);
        
        if (!activeRooms.has(roomId)) {
          activeRooms.set(roomId, {
            participants: [],
            startTime: new Date(),
            sessionId: sessionId,
            callStarted: false
          });
        }
        
        const room = activeRooms.get(roomId);
        
        // Record successful connection
        const connectionTime = Date.now() - (socket.handshake.time || Date.now());
        videoCallMetricsService.recordConnectionSuccess(attemptId, connectionTime);
        
        // Check if user is already in room (prevent duplicates)
        const existingParticipant = room.participants.find(p => p.userId === userId);
        if (existingParticipant) {
          // Update socket ID for reconnection
          existingParticipant.socketId = socket.id;
          console.log(`🔄 User ${userName} reconnected to room ${roomId}`);
        } else {
          room.participants.push({ socketId: socket.id, userId, userName, userRole });
          console.log(`👤 ${userName} (${userRole}) joined room ${roomId}`);
          
          // Record participant join
          videoCallMetricsService.recordParticipantJoin(sessionId, userId, userRole);
        }
      
      // If this is the second participant and call hasn't started, auto-start the call
      if (room.participants.length === 2 && !room.callStarted && sessionId) {
        try {
          const result = await SessionStatusManager.autoStartVideoCall(sessionId);
          if (result.success) {
            room.callStarted = true;
            
            // Record call start in metrics
            videoCallMetricsService.recordCallStart(sessionId, {
              autoStarted: true,
              participantCount: room.participants.length
            });
            
            // Notify all participants that call has started
            io.to(roomId).emit('call-started', {
              startTime: result.session.videoCallStarted,
              sessionId: sessionId,
              status: result.session.status
            });
            
            console.log(`🎥 Auto-started video call for session ${sessionId}`);
          } else {
            console.log(`🎥 Could not auto-start call for session ${sessionId}: ${result.reason}`);
          }
        } catch (error) {
          console.error('Failed to auto-start call:', error);
        }
      }
      
      // Notify others in room
      socket.to(roomId).emit('user-joined', { 
        userId, 
        userName, 
        userRole,
        socketId: socket.id 
      });
      
      // Send existing participants to new user
      const otherParticipants = room.participants.filter(p => p.socketId !== socket.id);
      socket.emit('existing-participants', otherParticipants);
      
      // Send current call status
      if (room.callStarted) {
        socket.emit('call-status', { 
          status: 'in-progress',
          startTime: room.startTime 
        });
      }
      
      // Send successful join confirmation
      socket.emit('join-success', {
        roomId,
        sessionId,
        participantCount: room.participants.length,
        userRole,
        secureConnection: process.env.NODE_ENV === 'production'
      });
      
    } catch (error) {
      console.error('Join room error:', error);
      
      // Record connection failure
      videoCallMetricsService.recordConnectionFailure(
        attemptId,
        'system_error',
        error.message,
        { stack: error.stack }
      );
      
      socket.emit('join-error', { error: 'Failed to join room' });
    }
  });

    // Secure WebRTC signaling with validation
    socket.on('offer', ({ offer, to, roomId }) => {
      try {
        // Validate that both users are in the same room
        if (!validateUsersInSameRoom(socket.id, to, roomId)) {
          console.warn(`🔒 Invalid offer attempt: ${socket.id} -> ${to} in room ${roomId}`);
          
          // Record security incident
          videoCallMetricsService.recordSecurityIncident(
            'invalid_signaling_attempt',
            roomId,
            socket.userId,
            { type: 'offer', targetSocket: to }
          );
          
          socket.emit('signaling-error', { error: 'Invalid signaling attempt' });
          return;
        }
        
        // Validate offer structure
        if (!offer || !offer.type || !offer.sdp) {
          socket.emit('signaling-error', { error: 'Invalid offer format' });
          return;
        }
        
        socket.to(to).emit('offer', { 
          offer, 
          from: socket.id,
          roomId,
          timestamp: new Date().toISOString()
        });
        
        console.log(`🔐 Secure offer relayed: ${socket.id} -> ${to} in room ${roomId}`);
      } catch (error) {
        console.error('Offer relay error:', error);
        socket.emit('signaling-error', { error: 'Failed to relay offer' });
      }
    });

    socket.on('answer', ({ answer, to, roomId }) => {
      try {
        // Validate that both users are in the same room
        if (!validateUsersInSameRoom(socket.id, to, roomId)) {
          console.warn(`🔒 Invalid answer attempt: ${socket.id} -> ${to} in room ${roomId}`);
          
          // Record security incident
          videoCallMetricsService.recordSecurityIncident(
            'invalid_signaling_attempt',
            roomId,
            socket.userId,
            { type: 'answer', targetSocket: to }
          );
          
          socket.emit('signaling-error', { error: 'Invalid signaling attempt' });
          return;
        }
        
        // Validate answer structure
        if (!answer || !answer.type || !answer.sdp) {
          socket.emit('signaling-error', { error: 'Invalid answer format' });
          return;
        }
        
        socket.to(to).emit('answer', { 
          answer, 
          from: socket.id,
          roomId,
          timestamp: new Date().toISOString()
        });
        
        console.log(`🔐 Secure answer relayed: ${socket.id} -> ${to} in room ${roomId}`);
      } catch (error) {
        console.error('Answer relay error:', error);
        socket.emit('signaling-error', { error: 'Failed to relay answer' });
      }
    });

    socket.on('ice-candidate', ({ candidate, to, roomId }) => {
      try {
        // Validate that both users are in the same room
        if (!validateUsersInSameRoom(socket.id, to, roomId)) {
          console.warn(`🔒 Invalid ICE candidate attempt: ${socket.id} -> ${to} in room ${roomId}`);
          
          // Record security incident
          videoCallMetricsService.recordSecurityIncident(
            'invalid_signaling_attempt',
            roomId,
            socket.userId,
            { type: 'ice-candidate', targetSocket: to }
          );
          
          socket.emit('signaling-error', { error: 'Invalid signaling attempt' });
          return;
        }
        
        // Validate ICE candidate structure
        if (!candidate) {
          socket.emit('signaling-error', { error: 'Invalid ICE candidate' });
          return;
        }
        
        socket.to(to).emit('ice-candidate', { 
          candidate, 
          from: socket.id,
          roomId,
          timestamp: new Date().toISOString()
        });
        
        console.log(`🔐 Secure ICE candidate relayed: ${socket.id} -> ${to} in room ${roomId}`);
      } catch (error) {
        console.error('ICE candidate relay error:', error);
        socket.emit('signaling-error', { error: 'Failed to relay ICE candidate' });
      }
    });

    // Leave room
    socket.on('leave-room', ({ roomId, userId }) => {
      handleUserLeave(socket, roomId, userId);
    });

    // Manual call start (for explicit control)
    socket.on('start-call', async ({ roomId, sessionId, userId }) => {
      if (activeRooms.has(roomId)) {
        const room = activeRooms.get(roomId);
        if (!room.callStarted && sessionId) {
          try {
            const result = await SessionStatusManager.startVideoCall(sessionId, userId);
            if (result.success) {
              room.callStarted = true;
              
              // Record call start in metrics
              videoCallMetricsService.recordCallStart(sessionId, {
                manuallyStarted: true,
                startedBy: userId,
                participantCount: room.participants.length
              });
              
              io.to(roomId).emit('call-started', {
                startTime: result.session.videoCallStarted,
                sessionId: sessionId,
                status: result.session.status
              });
              
              console.log(`🎥 Manually started video call for session ${sessionId}`);
            }
          } catch (error) {
            console.error('Failed to start call:', error);
            socket.emit('call-error', { error: error.message });
          }
        }
      }
    });

    // Manual call end
    socket.on('end-call', async ({ roomId, sessionId, userId }) => {
      if (activeRooms.has(roomId)) {
        const room = activeRooms.get(roomId);
        if (room.callStarted && sessionId) {
          try {
            const result = await SessionStatusManager.endVideoCall(sessionId, userId);
            if (result.success) {
              // Record call end in metrics
              videoCallMetricsService.recordCallEnd(
                sessionId, 
                'manual', 
                result.duration * 60 * 1000, // Convert minutes to milliseconds
                {
                  endedBy: userId,
                  participantCount: room.participants.length
                }
              );
              
              io.to(roomId).emit('call-ended', {
                endTime: result.session.videoCallEnded,
                duration: result.session.callDuration,
                sessionId: sessionId,
                status: result.session.status
              });
              
              console.log(`🎥 Manually ended video call for session ${sessionId}. Duration: ${result.duration} minutes`);
            }
          } catch (error) {
            console.error('Failed to end call:', error);
            socket.emit('call-error', { error: error.message });
          }
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 User ${socket.user?.name || socket.id} disconnected: ${reason}`);
      
      // Clean up user from all rooms using helper function
      const userRooms = getUserRooms(socket.id);
      userRooms.forEach(({ roomId, userId }) => {
        // Check if this was an unexpected disconnection during an active call
        const room = activeRooms.get(roomId);
        if (room && room.callStarted && room.participants.length > 1) {
          // Record as call drop if disconnection was unexpected
          if (reason !== 'client namespace disconnect' && reason !== 'transport close') {
            videoCallMetricsService.recordCallDrop(
              room.sessionId,
              reason,
              {
                userId: socket.userId,
                userRole: socket.userRole,
                participantCount: room.participants.length
              }
            );
          }
        }
        
        handleUserLeave(socket, roomId, userId);
      });
      
      // Log security event for audit
      console.log(`🔐 Secure WebSocket disconnection: User ${socket.userId} (${socket.userRole}) - Reason: ${reason}`);
    });
  });

  return io;
}

// Helper function to validate users are in the same room
function validateUsersInSameRoom(fromSocketId, toSocketId, roomId) {
  if (!activeRooms.has(roomId)) {
    return false;
  }
  
  const room = activeRooms.get(roomId);
  const fromParticipant = room.participants.find(p => p.socketId === fromSocketId);
  const toParticipant = room.participants.find(p => p.socketId === toSocketId);
  
  return fromParticipant && toParticipant;
}

// Helper function to get user's rooms (for cleanup)
function getUserRooms(socketId) {
  const userRooms = [];
  activeRooms.forEach((room, roomId) => {
    const participant = room.participants.find(p => p.socketId === socketId);
    if (participant) {
      userRooms.push({ roomId, userId: participant.userId });
    }
  });
  return userRooms;
}

async function handleUserLeave(socket, roomId, userId) {
  socket.leave(roomId);
  
  if (activeRooms.has(roomId)) {
    const room = activeRooms.get(roomId);
    const leavingParticipant = room.participants.find(p => p.socketId === socket.id);
    room.participants = room.participants.filter(p => p.socketId !== socket.id);
    
    console.log(`👋 User ${leavingParticipant?.userName || userId} left room ${roomId}. Remaining: ${room.participants.length}`);
    
    // Notify others with secure information
    socket.to(roomId).emit('user-left', { 
      userId, 
      socketId: socket.id,
      userName: leavingParticipant?.userName,
      timestamp: new Date().toISOString()
    });
    
    // If call was in progress and someone leaves, consider ending the call
    if (room.callStarted && room.participants.length === 0 && room.sessionId) {
      try {
        const result = await SessionStatusManager.autoEndVideoCall(room.sessionId);
        if (result.success) {
          // Record call end in metrics
          videoCallMetricsService.recordCallEnd(
            room.sessionId, 
            'auto_end_participants_left', 
            result.session.callDuration * 60 * 1000, // Convert minutes to milliseconds
            {
              reason: 'all_participants_left',
              participantCount: 0
            }
          );
          
          console.log(`🎥 Auto-ended video call for session ${room.sessionId} (all participants left). Duration: ${result.session.callDuration} minutes`);
        }
      } catch (error) {
        console.error('Failed to auto-end call:', error);
      }
    }
    
    // Clean up empty rooms
    if (room.participants.length === 0) {
      activeRooms.delete(roomId);
      console.log(`🗑️  Room ${roomId} deleted (empty)`);
    }
  }
}

module.exports = { initializeVideoCallServer, activeRooms };
