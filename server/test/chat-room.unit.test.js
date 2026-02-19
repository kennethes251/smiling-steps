/**
 * Chat Room Unit Tests
 * 
 * Tests for ChatRoomService room management functionality.
 * Validates Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.5, 5.1, 5.2, 5.3, 6.1
 */

const mongoose = require('mongoose');
const { chatRoomService, ERROR_CODES } = require('../services/chatRoomService');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');

describe('ChatRoomService - Room Management', () => {
  let psychologist;
  let client;
  let admin;

  beforeEach(async () => {
    // Create test users
    psychologist = await User.create({
      name: 'Dr. Test Psychologist',
      email: 'psychologist@test.com',
      password: 'hashedpassword123',
      role: 'psychologist',
      isVerified: true
    });

    client = await User.create({
      name: 'Test Client',
      email: 'client@test.com',
      password: 'hashedpassword123',
      role: 'client',
      isVerified: true
    });

    admin = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'hashedpassword123',
      role: 'admin',
      isVerified: true
    });
  });

  describe('Room Creation - Requirements 1.1, 1.2, 1.3', () => {
    test('should create room with psychologist as owner (Req 1.1)', async () => {
      const roomData = {
        name: 'Support Group',
        description: 'A support group for anxiety',
        roomType: 'support_group'
      };

      const room = await chatRoomService.createRoom(psychologist._id, roomData);

      expect(room).toBeDefined();
      expect(room.owner._id.toString()).toBe(psychologist._id.toString());
      expect(room.name).toBe('Support Group');
      expect(room.roomType).toBe('support_group');
    });

    test('should require name, description, and roomType (Req 1.2)', async () => {
      // Missing name
      await expect(chatRoomService.createRoom(psychologist._id, {
        description: 'Test',
        roomType: 'community'
      })).rejects.toThrow();

      // Missing description
      await expect(chatRoomService.createRoom(psychologist._id, {
        name: 'Test',
        roomType: 'community'
      })).rejects.toThrow();

      // Missing roomType
      await expect(chatRoomService.createRoom(psychologist._id, {
        name: 'Test',
        description: 'Test'
      })).rejects.toThrow();
    });

    test('should generate unique room ID (Req 1.3)', async () => {
      const room1 = await chatRoomService.createRoom(psychologist._id, {
        name: 'Room 1',
        description: 'First room',
        roomType: 'community'
      });

      const room2 = await chatRoomService.createRoom(psychologist._id, {
        name: 'Room 2',
        description: 'Second room',
        roomType: 'community'
      });

      expect(room1._id.toString()).not.toBe(room2._id.toString());
    });

    test('should reject room creation by client', async () => {
      await expect(chatRoomService.createRoom(client._id, {
        name: 'Client Room',
        description: 'Should fail',
        roomType: 'community'
      })).rejects.toThrow();
    });

    test('should allow admin to create room', async () => {
      const room = await chatRoomService.createRoom(admin._id, {
        name: 'Admin Room',
        description: 'Created by admin',
        roomType: 'community'
      });

      expect(room).toBeDefined();
      expect(room.owner._id.toString()).toBe(admin._id.toString());
    });
  });

  describe('Room Discovery - Requirements 2.1, 2.6', () => {
    beforeEach(async () => {
      // Create some test rooms
      await chatRoomService.createRoom(psychologist._id, {
        name: 'Public Room',
        description: 'A public room',
        roomType: 'community',
        settings: { isPublic: true }
      });

      await chatRoomService.createRoom(psychologist._id, {
        name: 'Private Room',
        description: 'A private room',
        roomType: 'private',
        settings: { isPublic: false }
      });
    });

    test('should list only public/community rooms (Req 2.1)', async () => {
      const result = await chatRoomService.listPublicRooms();

      expect(result.rooms).toBeDefined();
      expect(result.rooms.length).toBeGreaterThan(0);
      
      // All returned rooms should be public or community type
      result.rooms.forEach(room => {
        const isPublicOrCommunity = room.roomType === 'community' || room.isJoinable;
        expect(isPublicOrCommunity).toBe(true);
      });
    });

    test('should include participant count in room list (Req 2.6)', async () => {
      const result = await chatRoomService.listPublicRooms();

      result.rooms.forEach(room => {
        expect(room.participantCount).toBeDefined();
        expect(typeof room.participantCount).toBe('number');
      });
    });
  });

  describe('Join/Leave Room - Requirements 2.2, 2.3, 2.5, 6.1', () => {
    let testRoom;

    beforeEach(async () => {
      testRoom = await chatRoomService.createRoom(psychologist._id, {
        name: 'Test Room',
        description: 'Room for testing join/leave',
        roomType: 'community',
        settings: { maxParticipants: 5 }
      });
    });

    test('should allow client to join room (Req 2.2)', async () => {
      const updatedRoom = await chatRoomService.joinRoom(testRoom._id, client._id);

      expect(updatedRoom.participants.length).toBe(2); // Owner + client
      const clientParticipant = updatedRoom.participants.find(
        p => p.user._id.toString() === client._id.toString()
      );
      expect(clientParticipant).toBeDefined();
    });

    test('should prevent joining when room is full (Req 2.3)', async () => {
      // Create room with limit of 2
      const smallRoom = await chatRoomService.createRoom(psychologist._id, {
        name: 'Small Room',
        description: 'Limited capacity',
        roomType: 'community',
        settings: { maxParticipants: 2 }
      });

      // Join with client (now at capacity: owner + client = 2)
      await chatRoomService.joinRoom(smallRoom._id, client._id);

      // Create another user and try to join
      const anotherClient = await User.create({
        name: 'Another Client',
        email: 'another@test.com',
        password: 'hashedpassword123',
        role: 'client',
        isVerified: true
      });

      await expect(chatRoomService.joinRoom(smallRoom._id, anotherClient._id))
        .rejects.toThrow();
    });

    test('should prevent banned user from rejoining (Req 2.5)', async () => {
      // First join
      await chatRoomService.joinRoom(testRoom._id, client._id);

      // Manually ban the user
      const room = await ChatRoom.findById(testRoom._id);
      room.bannedUsers.push({
        user: client._id,
        bannedBy: psychologist._id,
        reason: 'Test ban'
      });
      room.removeParticipant(client._id);
      await room.save();

      // Try to rejoin
      await expect(chatRoomService.joinRoom(testRoom._id, client._id))
        .rejects.toThrow();
    });

    test('should remove participant when leaving (Req 6.1)', async () => {
      // Join first
      await chatRoomService.joinRoom(testRoom._id, client._id);

      // Leave
      const updatedRoom = await chatRoomService.leaveRoom(testRoom._id, client._id);

      expect(updatedRoom.participants.length).toBe(1); // Only owner remains
      const clientParticipant = updatedRoom.participants.find(
        p => p.user.toString() === client._id.toString()
      );
      expect(clientParticipant).toBeUndefined();
    });
  });

  describe('Room Settings - Requirements 5.1, 5.2, 5.3', () => {
    let testRoom;

    beforeEach(async () => {
      testRoom = await chatRoomService.createRoom(psychologist._id, {
        name: 'Settings Test Room',
        description: 'Room for testing settings',
        roomType: 'community'
      });
    });

    test('should apply settings changes immediately (Req 5.1)', async () => {
      const updatedRoom = await chatRoomService.updateRoomSettings(
        testRoom._id,
        psychologist._id,
        { name: 'Updated Name', description: 'Updated description' }
      );

      expect(updatedRoom.name).toBe('Updated Name');
      expect(updatedRoom.description).toBe('Updated description');

      // Verify persistence
      const fetchedRoom = await chatRoomService.getRoomById(testRoom._id);
      expect(fetchedRoom.name).toBe('Updated Name');
    });

    test('should enforce participant limit bounds 1-100 (Req 5.2)', async () => {
      // Valid limit
      const validRoom = await chatRoomService.updateRoomSettings(
        testRoom._id,
        psychologist._id,
        { maxParticipants: 50 }
      );
      expect(validRoom.settings.maxParticipants).toBe(50);

      // Invalid: below minimum
      await expect(chatRoomService.updateRoomSettings(
        testRoom._id,
        psychologist._id,
        { maxParticipants: 0 }
      )).rejects.toThrow();

      // Invalid: above maximum
      await expect(chatRoomService.updateRoomSettings(
        testRoom._id,
        psychologist._id,
        { maxParticipants: 101 }
      )).rejects.toThrow();
    });

    test('should toggle joinable setting (Req 5.3)', async () => {
      // Disable joining
      let updatedRoom = await chatRoomService.updateRoomSettings(
        testRoom._id,
        psychologist._id,
        { isJoinable: false }
      );
      expect(updatedRoom.settings.isJoinable).toBe(false);

      // Try to join - should fail
      await expect(chatRoomService.joinRoom(testRoom._id, client._id))
        .rejects.toThrow();

      // Re-enable joining
      updatedRoom = await chatRoomService.updateRoomSettings(
        testRoom._id,
        psychologist._id,
        { isJoinable: true }
      );
      expect(updatedRoom.settings.isJoinable).toBe(true);

      // Now joining should work
      const joinedRoom = await chatRoomService.joinRoom(testRoom._id, client._id);
      expect(joinedRoom.participants.length).toBe(2);
    });

    test('should only allow owner to update settings', async () => {
      await expect(chatRoomService.updateRoomSettings(
        testRoom._id,
        client._id,
        { name: 'Hacked Name' }
      )).rejects.toThrow();
    });
  });
});
