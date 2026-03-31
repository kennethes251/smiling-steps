/**
 * DirectMessageSocketService - Real-time Socket.io for 1-on-1 messaging
 *
 * Supports:
 *  - client <-> therapist/psychologist
 *  - therapist/psychologist <-> admin
 *
 * Events (client -> server):
 *  dm:join          { conversationId }
 *  dm:send          { conversationId, text }
 *  dm:typing:start  { conversationId }
 *  dm:typing:stop   { conversationId }
 *  dm:read          { conversationId }
 *
 * Events (server -> client):
 *  dm:message       { message, conversationId }
 *  dm:typing        { conversationId, userId, userName, isTyping }
 *  dm:read          { conversationId, readBy }
 *  dm:error         { error, code }
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// userId -> Set<socketId>
const onlineUsers = new Map();

let dmIO = null;

// Allowed role pairs for direct messaging
const ALLOWED_PAIRS = [
  new Set(['client', 'psychologist']),
  new Set(['psychologist', 'admin']),
  new Set(['client', 'admin']),
];

function rolesAllowed(roleA, roleB) {
  return ALLOWED_PAIRS.some(pair => pair.has(roleA) && pair.has(roleB));
}

function initializeDirectMessageSocket(io) {
  dmIO = io.of('/direct-messages');

  // Auth middleware
  dmIO.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.query.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('Authentication token required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.user.id).select('name email role');
      if (!user) return next(new Error('User not found'));

      socket.user = { id: user._id.toString(), name: user.name, role: user.role };
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  dmIO.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`💬 DM connected: ${socket.user.name} (${socket.user.role})`);

    // Track online users
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Join a conversation room
    socket.on('dm:join', async ({ conversationId }) => {
      try {
        const conv = await Conversation.findById(conversationId);
        if (!conv) return socket.emit('dm:error', { error: 'Conversation not found', code: 'NOT_FOUND' });

        const participants = conv.participants?.length
          ? conv.participants.map(p => p.toString())
          : [conv.client?.toString(), conv.psychologist?.toString()].filter(Boolean);

        if (!participants.includes(userId)) {
          return socket.emit('dm:error', { error: 'Not a participant', code: 'FORBIDDEN' });
        }

        socket.join(`dm:${conversationId}`);
        console.log(`👤 ${socket.user.name} joined DM room ${conversationId}`);
      } catch (err) {
        socket.emit('dm:error', { error: 'Failed to join conversation', code: 'SERVER_ERROR' });
      }
    });

    // Send a message
    socket.on('dm:send', async ({ conversationId, text }) => {
      try {
        if (!text?.trim()) return;

        const conv = await Conversation.findById(conversationId);
        if (!conv) return socket.emit('dm:error', { error: 'Conversation not found', code: 'NOT_FOUND' });

        const participants = conv.participants?.length
          ? conv.participants.map(p => p.toString())
          : [conv.client?.toString(), conv.psychologist?.toString()].filter(Boolean);

        if (!participants.includes(userId)) {
          return socket.emit('dm:error', { error: 'Not a participant', code: 'FORBIDDEN' });
        }

        // Save to DB
        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          text: text.trim(),
        });

        // Update conversation last message
        conv.lastMessage = { text: text.trim(), sender: userId, timestamp: new Date() };
        await conv.save();

        const populated = await message.populate('sender', 'name role profilePicture');

        // Broadcast to everyone in the room (including sender for confirmation)
        dmIO.to(`dm:${conversationId}`).emit('dm:message', {
          conversationId,
          message: populated,
        });

        console.log(`📨 DM sent in ${conversationId} by ${socket.user.name}`);
      } catch (err) {
        console.error('DM send error:', err);
        socket.emit('dm:error', { error: 'Failed to send message', code: 'SERVER_ERROR' });
      }
    });

    // Typing indicators
    socket.on('dm:typing:start', ({ conversationId }) => {
      socket.to(`dm:${conversationId}`).emit('dm:typing', {
        conversationId,
        userId,
        userName: socket.user.name,
        isTyping: true,
      });
    });

    socket.on('dm:typing:stop', ({ conversationId }) => {
      socket.to(`dm:${conversationId}`).emit('dm:typing', {
        conversationId,
        userId,
        userName: socket.user.name,
        isTyping: false,
      });
    });

    // Mark as read
    socket.on('dm:read', async ({ conversationId }) => {
      try {
        await Message.updateMany(
          { conversation: conversationId, sender: { $ne: userId }, isRead: false },
          { $set: { isRead: true, readAt: new Date() } }
        );
        socket.to(`dm:${conversationId}`).emit('dm:read', { conversationId, readBy: userId });
      } catch (err) {
        console.error('DM read error:', err);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        if (onlineUsers.get(userId).size === 0) onlineUsers.delete(userId);
      }
      console.log(`🔌 DM disconnected: ${socket.user.name}`);
    });
  });

  console.log('✅ Direct message Socket.io namespace initialized (/direct-messages)');
  return dmIO;
}

// Update the chat REST route to also support admin conversations
async function findOrCreateConversation(userA, userB) {
  const ids = [userA.id, userB.id].sort();

  // Try participants array first (new format)
  let conv = await Conversation.findOne({ participants: { $all: ids, $size: 2 } })
    .populate('participants', 'name email role profilePicture');

  if (!conv) {
    // Try legacy format
    const legacyQuery = {
      $or: [
        { client: userA.id, psychologist: userB.id },
        { client: userB.id, psychologist: userA.id },
      ],
    };
    conv = await Conversation.findOne(legacyQuery)
      .populate('client', 'name email role profilePicture')
      .populate('psychologist', 'name email role profilePicture');
  }

  if (!conv) {
    // Create new with participants array
    conv = await Conversation.create({ participants: ids });
    conv = await Conversation.findById(conv._id)
      .populate('participants', 'name email role profilePicture');
  }

  return conv;
}

function getDmIO() {
  return dmIO;
}

function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

module.exports = {
  initializeDirectMessageSocket,
  findOrCreateConversation,
  getDmIO,
  isUserOnline,
  rolesAllowed,
};
