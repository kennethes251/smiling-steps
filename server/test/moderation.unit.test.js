/**
 * Moderation Service Unit Tests
 * 
 * Tests for ModerationService functionality.
 * Validates Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 5.5
 */

const mongoose = require('mongoose');
const { moderationService, MODERATION_ERROR_CODES } = require('../services/moderationService');
const { chatRoomService } = require('../services/chatRoomService');
const ChatRoom = require('../models/ChatRoom');
const ModerationLog = require('../models/ModerationLog');
const User = require('../models/User');

describe('ModerationService', () => {
  let psychologist;
  let client;
  let client2;
  let testRoom;

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

    client2 = await User.create({
      name: 'Test Client 2',
      email: 'client2@test.com',
      password: 'hashedpassword123',
      role: 'client',
      isVerified: true
    });

    // Create test room
    testRoom = await chatRoomService.createRoom(psychologist._id, {
      name: 'Moderation Test Room',
      description: 'Room for testing moderation',
      roomType: 'community'
    });

    // Add client as participant
    await chatRoomService.joinRoom(testRoom._id, client._id);
  });

  describe('Mute/Unmute - Requirements 4.1, 4.2', () => {
    test('should mute participant for specified duration (Req 4.1)', async () => {
      const result = await moderationService.muteParticipant(
        testRoom._id,
        psychologist._id,
        client._id,
        30,
        'Inappropriate behavior'
      );

      expect(result.success).toBe(true);
      expect(result.mutedUntil).toBeDefined();
      
      // Verify mute status
      const status = await moderationService.checkMuteStatus(testRoom._id, client._id);
      expect(status.isMuted).toBe(true);
      expect(status.muteReason).toBe('Inappropriate behavior');
    });

    test('should unmute participant and restore messaging (Req 4.2)', async () => {
      // First mute
      await moderationService.muteParticipant(
        testRoom._id,
        psychologist._id,
        client._id,
        30,
        'Test mute'
      );

      // Then unmute
      const result = await moderationService.unmuteParticipant(
        testRoom._id,
        psychologist._id,
        client._id
      );

      expect(result.success).toBe(true);
      
      // Verify unmuted
      const status = await moderationService.checkMuteStatus(testRoom._id, client._id);
      expect(status.isMuted).toBe(false);
    });

    test('should prevent muting self', async () => {
      await expect(moderationService.muteParticipant(
        testRoom._id,
        psychologist._id,
        psychologist._id,
        30,
        'Self mute'
      )).rejects.toThrow();
    });

    test('should prevent non-moderator from muting', async () => {
      await chatRoomService.joinRoom(testRoom._id, client2._id);

      await expect(moderationService.muteParticipant(
        testRoom._id,
        client._id,
        client2._id,
        30,
        'Unauthorized mute'
      )).rejects.toThrow();
    });

    test('should log mute action (Req 4.6)', async () => {
      const result = await moderationService.muteParticipant(
        testRoom._id,
        psychologist._id,
        client._id,
        30,
        'Test mute'
      );

      expect(result.logEntry).toBeDefined();
      expect(result.logEntry.action).toBe('mute');
      expect(result.logEntry.moderator.toString()).toBe(psychologist._id.toString());
      expect(result.logEntry.targetUser.toString()).toBe(client._id.toString());
    });
  });

  describe('Kick/Ban - Requirements 4.3, 4.4', () => {
    test('should kick participant from room (Req 4.3)', async () => {
      const result = await moderationService.kickParticipant(
        testRoom._id,
        psychologist._id,
        client._id,
        'Disruptive behavior'
      );

      expect(result.success).toBe(true);
      
      // Verify participant removed
      const room = await ChatRoom.findById(testRoom._id);
      expect(room.isParticipant(client._id)).toBe(false);
    });

    test('should ban participant and prevent rejoining (Req 4.4)', async () => {
      const result = await moderationService.banParticipant(
        testRoom._id,
        psychologist._id,
        client._id,
        'Severe violation'
      );

      expect(result.success).toBe(true);
      
      // Verify banned
      const banStatus = await moderationService.checkBanStatus(testRoom._id, client._id);
      expect(banStatus.isBanned).toBe(true);
      
      // Try to rejoin - should fail
      await expect(chatRoomService.joinRoom(testRoom._id, client._id))
        .rejects.toThrow();
    });

    test('should allow unbanning user', async () => {
      // Ban first
      await moderationService.banParticipant(
        testRoom._id,
        psychologist._id,
        client._id,
        'Test ban'
      );

      // Unban
      const result = await moderationService.unbanParticipant(
        testRoom._id,
        psychologist._id,
        client._id
      );

      expect(result.success).toBe(true);
      
      // Verify can rejoin
      const banStatus = await moderationService.checkBanStatus(testRoom._id, client._id);
      expect(banStatus.isBanned).toBe(false);
    });

    test('should prevent kicking room owner', async () => {
      // Add client as moderator
      await moderationService.assignModerator(testRoom._id, psychologist._id, client._id);

      // Try to kick owner
      await expect(moderationService.kickParticipant(
        testRoom._id,
        client._id,
        psychologist._id,
        'Trying to kick owner'
      )).rejects.toThrow();
    });

    test('should log kick and ban actions (Req 4.6)', async () => {
      const kickResult = await moderationService.kickParticipant(
        testRoom._id,
        psychologist._id,
        client._id,
        'Test kick'
      );

      expect(kickResult.logEntry.action).toBe('kick');

      // Rejoin for ban test
      await chatRoomService.joinRoom(testRoom._id, client._id);

      const banResult = await moderationService.banParticipant(
        testRoom._id,
        psychologist._id,
        client._id,
        'Test ban'
      );

      expect(banResult.logEntry.action).toBe('ban');
    });
  });

  describe('Moderator Assignment - Requirement 5.5', () => {
    test('should allow owner to assign moderator (Req 5.5)', async () => {
      const result = await moderationService.assignModerator(
        testRoom._id,
        psychologist._id,
        client._id
      );

      expect(result.success).toBe(true);
      
      // Verify moderator permissions
      const permissions = await moderationService.verifyModeratorPermissions(
        testRoom._id,
        client._id
      );
      expect(permissions.isModerator).toBe(true);
      expect(permissions.canModerate).toBe(true);
    });

    test('should allow owner to remove moderator (Req 5.5)', async () => {
      // Assign first
      await moderationService.assignModerator(testRoom._id, psychologist._id, client._id);

      // Remove
      const result = await moderationService.removeModerator(
        testRoom._id,
        psychologist._id,
        client._id
      );

      expect(result.success).toBe(true);
      
      // Verify no longer moderator
      const permissions = await moderationService.verifyModeratorPermissions(
        testRoom._id,
        client._id
      );
      expect(permissions.isModerator).toBe(false);
    });

    test('should prevent non-owner from assigning moderator', async () => {
      await chatRoomService.joinRoom(testRoom._id, client2._id);

      await expect(moderationService.assignModerator(
        testRoom._id,
        client._id,
        client2._id
      )).rejects.toThrow();
    });

    test('should allow moderator to perform moderation actions', async () => {
      // Assign client as moderator
      await moderationService.assignModerator(testRoom._id, psychologist._id, client._id);

      // Add client2 to room
      await chatRoomService.joinRoom(testRoom._id, client2._id);

      // Client (now moderator) should be able to mute client2
      const result = await moderationService.muteParticipant(
        testRoom._id,
        client._id,
        client2._id,
        30,
        'Moderator action'
      );

      expect(result.success).toBe(true);
    });

    test('should log moderator assignment (Req 4.6)', async () => {
      const result = await moderationService.assignModerator(
        testRoom._id,
        psychologist._id,
        client._id
      );

      expect(result.logEntry.action).toBe('assign_moderator');
    });
  });

  describe('Moderation Logging - Requirement 4.6', () => {
    test('should retrieve moderation logs for room', async () => {
      // Perform some moderation actions
      await moderationService.muteParticipant(
        testRoom._id,
        psychologist._id,
        client._id,
        30,
        'Test mute'
      );

      await moderationService.unmuteParticipant(
        testRoom._id,
        psychologist._id,
        client._id
      );

      // Get logs
      const logs = await moderationService.getModerationLogs(testRoom._id);

      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.some(l => l.action === 'mute')).toBe(true);
      expect(logs.some(l => l.action === 'unmute')).toBe(true);
    });

    test('should include moderator, target, action, reason, timestamp in logs', async () => {
      await moderationService.muteParticipant(
        testRoom._id,
        psychologist._id,
        client._id,
        30,
        'Test reason'
      );

      const logs = await moderationService.getModerationLogs(testRoom._id);
      const muteLog = logs.find(l => l.action === 'mute');

      expect(muteLog.moderator).toBeDefined();
      expect(muteLog.targetUser).toBeDefined();
      expect(muteLog.action).toBe('mute');
      expect(muteLog.reason).toBe('Test reason');
      expect(muteLog.createdAt).toBeDefined();
    });

    test('should get moderation stats', async () => {
      // Perform various actions
      await moderationService.muteParticipant(testRoom._id, psychologist._id, client._id, 30, 'Test');
      await moderationService.unmuteParticipant(testRoom._id, psychologist._id, client._id);

      const stats = await moderationService.getModerationStats(testRoom._id);

      expect(Array.isArray(stats)).toBe(true);
    });
  });
});
