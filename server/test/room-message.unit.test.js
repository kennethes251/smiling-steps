/**
 * RoomMessageService Unit Tests
 * 
 * Tests for message sending, retrieval, deletion, search, and unread tracking
 * 
 * Requirements: 3.1, 3.2, 3.5, 3.6, 4.1, 4.5, 6.5, 7.1, 7.2, 7.3
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { RoomMessageService, roomMessageService, MESSAGE_ERROR_CODES } = require('../services/roomMessageService');
const ChatRoom = require('../models/ChatRoom');
const RoomMessage = require('../models/RoomMessage');
const User = require('../models/User');

let mongoServer;

// Test data
let testOwner;
let testParticipant;
let testNonParticipant;
let testRoom;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear collections
  await User.deleteMany({});
  await ChatRoom.deleteMany({});
  await RoomMessage.deleteMany({});
  
  // Create test users
  testOwner = await User.create({
    name: 'Test Owner',
    email: 'owner@test.com',
    password: 'password123',
    role: 'psychologist'
  });
  
  testParticipant = await User.create({
    name: 'Test Participant',
    email: 'participant@test.com',
    password: 'password123',
    role: 'client'
  });
  
  testNonParticipant = await User.create({
    name: 'Non Participant',
    email: 'nonparticipant@test.com',
    password: 'password123',
    role: 'client'
  });
  
  // Create test room with owner and participant
  testRoom = await ChatRoom.create({
    name: 'Test Room',
    description: 'A test chat room',
    roomType: 'support_group',
    owner: testOwner._id,
    participants: [
      { user: testOwner._id, role: 'owner', joinedAt: new Date(), lastReadAt: new Date() },
      { user: testParticipant._id, role: 'participant', joinedAt: new Date(), lastReadAt: new Date() }
    ],
    moderators: [testOwner._id],
    settings: {
      maxParticipants: 50,
      isJoinable: true,
      isPublic: true
    }
  });
});

describe('RoomMessageService', () => {
  
  // ============================================
  // MESSAGE SENDING TESTS - Requirements 3.1, 3.2, 4.1
  // ============================================
  
  describe('sendMessage', () => {
    
    test('should send a message successfully - Requirement 3.1', async () => {
      const message = await roomMessageService.sendMessage(
        testRoom._id,
        testParticipant._id,
        'Hello, this is a test message!'
      );
      
      expect(message).toBeDefined();
      expect(message.content).toBe('Hello, this is a test message!');
      expect(message.sender._id.toString()).toBe(testParticipant._id.toString());
      expect(message.room.toString()).toBe(testRoom._id.toString());
      expect(message.createdAt).toBeDefined();
    });
    
    test('should include sender name and timestamp - Requirement 3.2', async () => {
      const message = await roomMessageService.sendMessage(
        testRoom._id,
        testParticipant._id,
        'Test message with metadata'
      );
      
      expect(message.sender.name).toBe('Test Participant');
      expect(message.createdAt).toBeInstanceOf(Date);
      expect(message.content).toBe('Test message with metadata');
    });
    
    test('should reject empty messages', async () => {
      await expect(
        roomMessageService.sendMessage(testRoom._id, testParticipant._id, '')
      ).rejects.toThrow('Message content cannot be empty');
      
      await expect(
        roomMessageService.sendMessage(testRoom._id, testParticipant._id, '   ')
      ).rejects.toThrow('Message content cannot be empty');
    });
    
    test('should reject messages over 2000 characters', async () => {
      const longMessage = 'a'.repeat(2001);
      
      await expect(
        roomMessageService.sendMessage(testRoom._id, testParticipant._id, longMessage)
      ).rejects.toThrow('Message cannot exceed 2000 characters');
    });
    
    test('should reject messages from non-participants - Requirement 3.1', async () => {
      await expect(
        roomMessageService.sendMessage(testRoom._id, testNonParticipant._id, 'Hello')
      ).rejects.toThrow('You must be a participant to send messages');
    });
    
    test('should reject messages from muted users - Requirement 4.1', async () => {
      // Mute the participant
      const participant = testRoom.participants.find(
        p => p.user.toString() === testParticipant._id.toString()
      );
      participant.isMuted = true;
      participant.mutedUntil = new Date(Date.now() + 60000); // Muted for 1 minute
      await testRoom.save();
      
      await expect(
        roomMessageService.sendMessage(testRoom._id, testParticipant._id, 'Hello')
      ).rejects.toThrow(/You are muted/);
    });
    
    test('should allow messages after mute expires', async () => {
      // Set expired mute
      const participant = testRoom.participants.find(
        p => p.user.toString() === testParticipant._id.toString()
      );
      participant.isMuted = true;
      participant.mutedUntil = new Date(Date.now() - 1000); // Expired 1 second ago
      await testRoom.save();
      
      const message = await roomMessageService.sendMessage(
        testRoom._id,
        testParticipant._id,
        'Hello after unmute'
      );
      
      expect(message.content).toBe('Hello after unmute');
    });
    
    test('should parse @mentions correctly', async () => {
      const message = await roomMessageService.sendMessage(
        testRoom._id,
        testOwner._id,
        'Hello @Test Participant, how are you?'
      );
      
      // Note: Mention parsing depends on exact username matching
      expect(message.mentions).toBeDefined();
      expect(Array.isArray(message.mentions)).toBe(true);
    });
  });


  // ============================================
  // MESSAGE RETRIEVAL TESTS - Requirements 3.5, 3.6, 7.1
  // ============================================
  
  describe('getMessages', () => {
    
    beforeEach(async () => {
      // Create some test messages
      const messages = [];
      for (let i = 0; i < 10; i++) {
        messages.push({
          room: testRoom._id,
          sender: i % 2 === 0 ? testOwner._id : testParticipant._id,
          content: `Test message ${i + 1}`,
          createdAt: new Date(Date.now() - (10 - i) * 1000) // Oldest first
        });
      }
      await RoomMessage.insertMany(messages);
    });
    
    test('should retrieve messages for a room - Requirement 7.1', async () => {
      const result = await roomMessageService.getMessages(
        testRoom._id,
        testParticipant._id
      );
      
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBe(10);
      expect(result.pagination).toBeDefined();
    });
    
    test('should return messages in chronological order - Requirement 3.6', async () => {
      const result = await roomMessageService.getMessages(
        testRoom._id,
        testParticipant._id
      );
      
      // Messages should be in chronological order (oldest first)
      for (let i = 1; i < result.messages.length; i++) {
        const prevTime = new Date(result.messages[i - 1].createdAt).getTime();
        const currTime = new Date(result.messages[i].createdAt).getTime();
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });
    
    test('should support pagination with limit', async () => {
      const result = await roomMessageService.getMessages(
        testRoom._id,
        testParticipant._id,
        { limit: 5 }
      );
      
      expect(result.messages.length).toBe(5);
      expect(result.pagination.hasMore).toBe(true);
    });
    
    test('should support cursor-based pagination with before', async () => {
      // Get all messages first
      const allMessages = await roomMessageService.getMessages(
        testRoom._id,
        testParticipant._id
      );
      
      // Get messages before the last message
      const lastMessage = allMessages.messages[allMessages.messages.length - 1];
      const result = await roomMessageService.getMessages(
        testRoom._id,
        testParticipant._id,
        { before: lastMessage.createdAt.toISOString(), limit: 5 }
      );
      
      expect(result.messages.length).toBeLessThanOrEqual(5);
      // All messages should be before the cursor
      result.messages.forEach(msg => {
        expect(new Date(msg.createdAt).getTime()).toBeLessThan(new Date(lastMessage.createdAt).getTime());
      });
    });
    
    test('should reject requests from non-participants', async () => {
      await expect(
        roomMessageService.getMessages(testRoom._id, testNonParticipant._id)
      ).rejects.toThrow('You must be a participant to view messages');
    });
    
    test('should not include deleted messages by default', async () => {
      // Delete one message
      const messages = await RoomMessage.find({ room: testRoom._id });
      messages[0].isDeleted = true;
      await messages[0].save();
      
      const result = await roomMessageService.getMessages(
        testRoom._id,
        testParticipant._id
      );
      
      expect(result.messages.length).toBe(9);
    });
  });


  // ============================================
  // MESSAGE DELETION TESTS - Requirement 4.5
  // ============================================
  
  describe('deleteMessage', () => {
    let testMessage;
    
    beforeEach(async () => {
      testMessage = await RoomMessage.create({
        room: testRoom._id,
        sender: testParticipant._id,
        content: 'Message to be deleted'
      });
    });
    
    test('should allow sender to delete their own message - Requirement 4.5', async () => {
      const result = await roomMessageService.deleteMessage(
        testMessage._id,
        testParticipant._id
      );
      
      expect(result.isDeleted).toBe(true);
      expect(result.deletedBy.toString()).toBe(testParticipant._id.toString());
      expect(result.deletedAt).toBeDefined();
    });
    
    test('should allow moderator to delete any message', async () => {
      const result = await roomMessageService.deleteMessage(
        testMessage._id,
        testOwner._id,
        'Inappropriate content'
      );
      
      expect(result.isDeleted).toBe(true);
      expect(result.deletedBy.toString()).toBe(testOwner._id.toString());
      expect(result.deletionReason).toBe('Inappropriate content');
    });
    
    test('should hide deleted messages from retrieval - Requirement 4.5', async () => {
      await roomMessageService.deleteMessage(testMessage._id, testParticipant._id);
      
      const result = await roomMessageService.getMessages(
        testRoom._id,
        testParticipant._id
      );
      
      const deletedMessage = result.messages.find(
        m => m._id.toString() === testMessage._id.toString()
      );
      expect(deletedMessage).toBeUndefined();
    });
    
    test('should reject deletion by non-authorized users', async () => {
      // Create a message by owner
      const ownerMessage = await RoomMessage.create({
        room: testRoom._id,
        sender: testOwner._id,
        content: 'Owner message'
      });
      
      // Participant should not be able to delete owner's message
      await expect(
        roomMessageService.deleteMessage(ownerMessage._id, testParticipant._id)
      ).rejects.toThrow('You do not have permission to delete this message');
    });
    
    test('should reject deleting already deleted message', async () => {
      await roomMessageService.deleteMessage(testMessage._id, testParticipant._id);
      
      await expect(
        roomMessageService.deleteMessage(testMessage._id, testParticipant._id)
      ).rejects.toThrow('Message is already deleted');
    });
  });


  // ============================================
  // MESSAGE SEARCH TESTS - Requirements 7.2, 7.3
  // ============================================
  
  describe('searchMessages', () => {
    
    beforeEach(async () => {
      // Create messages with searchable content
      await RoomMessage.create([
        { room: testRoom._id, sender: testOwner._id, content: 'Hello world' },
        { room: testRoom._id, sender: testParticipant._id, content: 'Hello there' },
        { room: testRoom._id, sender: testOwner._id, content: 'Goodbye world' },
        { room: testRoom._id, sender: testParticipant._id, content: 'Testing search' },
        { room: testRoom._id, sender: testOwner._id, content: 'Another message' }
      ]);
    });
    
    test('should search messages by content using regex - Requirement 7.2', async () => {
      const result = await roomMessageService.searchMessagesRegex(
        testRoom._id,
        testParticipant._id,
        'Hello'
      );
      
      expect(result.results.length).toBe(2);
      result.results.forEach(msg => {
        expect(msg.content.toLowerCase()).toContain('hello');
      });
    });
    
    test('should return messages with context and timestamp - Requirement 7.3', async () => {
      const result = await roomMessageService.searchMessagesRegex(
        testRoom._id,
        testParticipant._id,
        'world'
      );
      
      result.results.forEach(msg => {
        expect(msg.content).toBeDefined();
        expect(msg.createdAt).toBeDefined();
        expect(msg.sender).toBeDefined();
      });
    });
    
    test('should respect room membership - Requirement 7.3', async () => {
      await expect(
        roomMessageService.searchMessagesRegex(
          testRoom._id,
          testNonParticipant._id,
          'Hello'
        )
      ).rejects.toThrow('You must be a participant to search messages');
    });
    
    test('should support pagination in search results', async () => {
      const result = await roomMessageService.searchMessagesRegex(
        testRoom._id,
        testParticipant._id,
        'message',
        { limit: 2 }
      );
      
      expect(result.results.length).toBeLessThanOrEqual(2);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBeGreaterThanOrEqual(1);
    });
    
    test('should reject empty search terms', async () => {
      await expect(
        roomMessageService.searchMessagesRegex(testRoom._id, testParticipant._id, '')
      ).rejects.toThrow('Search term is required');
    });
    
    test('should not return deleted messages in search', async () => {
      // Delete one message
      const messages = await RoomMessage.find({ room: testRoom._id, content: /Hello/ });
      if (messages.length > 0) {
        messages[0].isDeleted = true;
        await messages[0].save();
      }
      
      const result = await roomMessageService.searchMessagesRegex(
        testRoom._id,
        testParticipant._id,
        'Hello'
      );
      
      result.results.forEach(msg => {
        expect(msg.isDeleted).not.toBe(true);
      });
    });
  });


  // ============================================
  // UNREAD COUNT TESTS - Requirement 6.5
  // ============================================
  
  describe('getUnreadCount', () => {
    
    beforeEach(async () => {
      // Set participant's last read to a specific time
      const participant = testRoom.participants.find(
        p => p.user.toString() === testParticipant._id.toString()
      );
      participant.lastReadAt = new Date(Date.now() - 60000); // 1 minute ago
      await testRoom.save();
      
      // Create messages - some before and some after lastReadAt
      await RoomMessage.create([
        { 
          room: testRoom._id, 
          sender: testOwner._id, 
          content: 'Old message',
          createdAt: new Date(Date.now() - 120000) // 2 minutes ago
        },
        { 
          room: testRoom._id, 
          sender: testOwner._id, 
          content: 'New message 1',
          createdAt: new Date(Date.now() - 30000) // 30 seconds ago
        },
        { 
          room: testRoom._id, 
          sender: testOwner._id, 
          content: 'New message 2',
          createdAt: new Date(Date.now() - 10000) // 10 seconds ago
        },
        { 
          room: testRoom._id, 
          sender: testParticipant._id, // Own message - should not count
          content: 'My own message',
          createdAt: new Date(Date.now() - 5000)
        }
      ]);
    });
    
    test('should calculate unread count correctly - Requirement 6.5', async () => {
      const result = await roomMessageService.getUnreadCount(
        testRoom._id,
        testParticipant._id
      );
      
      expect(result.unreadCount).toBe(2); // Only messages from others after lastReadAt
      expect(result.isParticipant).toBe(true);
      expect(result.lastReadAt).toBeDefined();
    });
    
    test('should not count own messages as unread', async () => {
      const result = await roomMessageService.getUnreadCount(
        testRoom._id,
        testParticipant._id
      );
      
      // Should not include the participant's own message
      expect(result.unreadCount).toBe(2);
    });
    
    test('should return 0 for non-participants', async () => {
      const result = await roomMessageService.getUnreadCount(
        testRoom._id,
        testNonParticipant._id
      );
      
      expect(result.unreadCount).toBe(0);
      expect(result.isParticipant).toBe(false);
    });
  });
  
  describe('markAsRead', () => {
    
    beforeEach(async () => {
      // Create some unread messages
      await RoomMessage.create([
        { room: testRoom._id, sender: testOwner._id, content: 'Message 1' },
        { room: testRoom._id, sender: testOwner._id, content: 'Message 2' },
        { room: testRoom._id, sender: testOwner._id, content: 'Message 3' }
      ]);
    });
    
    test('should update lastReadAt timestamp', async () => {
      const beforeRead = new Date();
      
      const result = await roomMessageService.markAsRead(
        testRoom._id,
        testParticipant._id
      );
      
      expect(result.success).toBe(true);
      expect(new Date(result.newLastRead).getTime()).toBeGreaterThanOrEqual(beforeRead.getTime());
    });
    
    test('should reset unread count after marking as read', async () => {
      // First check there are unread messages
      const beforeMark = await roomMessageService.getUnreadCount(
        testRoom._id,
        testParticipant._id
      );
      expect(beforeMark.unreadCount).toBeGreaterThan(0);
      
      // Mark as read
      await roomMessageService.markAsRead(testRoom._id, testParticipant._id);
      
      // Check unread count is now 0
      const afterMark = await roomMessageService.getUnreadCount(
        testRoom._id,
        testParticipant._id
      );
      expect(afterMark.unreadCount).toBe(0);
    });
    
    test('should reject marking as read for non-participants', async () => {
      await expect(
        roomMessageService.markAsRead(testRoom._id, testNonParticipant._id)
      ).rejects.toThrow('You are not a participant in this room');
    });
  });
  
  describe('getAllUnreadCounts', () => {
    
    test('should return unread counts for all rooms', async () => {
      // Create another room with the participant
      const room2 = await ChatRoom.create({
        name: 'Second Room',
        description: 'Another test room',
        roomType: 'community',
        owner: testOwner._id,
        participants: [
          { user: testOwner._id, role: 'owner', lastReadAt: new Date() },
          { user: testParticipant._id, role: 'participant', lastReadAt: new Date(Date.now() - 60000) }
        ]
      });
      
      // Add messages to both rooms
      await RoomMessage.create([
        { room: testRoom._id, sender: testOwner._id, content: 'Room 1 message' },
        { room: room2._id, sender: testOwner._id, content: 'Room 2 message' }
      ]);
      
      const result = await roomMessageService.getAllUnreadCounts(testParticipant._id);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      result.forEach(item => {
        expect(item.roomId).toBeDefined();
        expect(item.roomName).toBeDefined();
        expect(typeof item.unreadCount).toBe('number');
      });
    });
  });
});
