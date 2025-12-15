/**
 * Session Status Updates Test
 * Tests the video call session status management functionality
 * Validates that sessions correctly transition to "In Progress" and "Completed" states
 */

const SessionStatusManager = require('../utils/sessionStatusManager');

// Mock global Session model for testing
const mockSessions = new Map();

global.Session = {
  findByPk: async (id, options) => {
    const session = mockSessions.get(id);
    if (!session) return null;
    
    // Simulate includes
    if (options?.include) {
      session.client = { id: session.clientId, name: 'Test Client' };
      session.psychologist = { id: session.psychologistId, name: 'Test Psychologist' };
    }
    
    return {
      ...session,
      save: async function() {
        mockSessions.set(id, { ...this });
        return this;
      }
    };
  }
};

describe('Session Status Updates', () => {
  
  beforeEach(() => {
    // Clear mock sessions before each test
    mockSessions.clear();
    
    // Create a test session
    mockSessions.set('test-session-1', {
      id: 'test-session-1',
      clientId: 'client-123',
      psychologistId: 'psychologist-456',
      status: 'Confirmed',
      paymentStatus: 'Confirmed',
      videoCallStarted: null,
      videoCallEnded: null,
      duration: null
    });
  });
  
  describe('Starting Video Call', () => {
    
    test('should update session status to "In Progress" when starting video call', async () => {
      const result = await SessionStatusManager.startVideoCall('test-session-1', 'client-123');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Video call started successfully');
      expect(result.session.status).toBe('In Progress');
      expect(result.session.videoCallStarted).toBeDefined();
      
      // Verify session was updated in mock storage
      const updatedSession = mockSessions.get('test-session-1');
      expect(updatedSession.status).toBe('In Progress');
      expect(updatedSession.videoCallStarted).toBeDefined();
    });
    
    test('should allow psychologist to start video call', async () => {
      const result = await SessionStatusManager.startVideoCall('test-session-1', 'psychologist-456');
      
      expect(result.success).toBe(true);
      expect(result.session.status).toBe('In Progress');
    });
    
    test('should reject unauthorized user from starting video call', async () => {
      await expect(
        SessionStatusManager.startVideoCall('test-session-1', 'unauthorized-user')
      ).rejects.toThrow('Unauthorized to start this session');
    });
    
    test('should prevent starting video call for cancelled session', async () => {
      // Update session to cancelled status
      const session = mockSessions.get('test-session-1');
      session.status = 'Cancelled';
      mockSessions.set('test-session-1', session);
      
      await expect(
        SessionStatusManager.startVideoCall('test-session-1', 'client-123')
      ).rejects.toThrow('Cannot start cancelled session');
    });
    
    test('should prevent starting video call without confirmed payment', async () => {
      // Update session to have unconfirmed payment
      const session = mockSessions.get('test-session-1');
      session.paymentStatus = 'Pending';
      mockSessions.set('test-session-1', session);
      
      await expect(
        SessionStatusManager.startVideoCall('test-session-1', 'client-123')
      ).rejects.toThrow('Payment must be confirmed before starting video call');
    });
    
    test('should not update start time if call already started', async () => {
      // Start call first time
      const firstResult = await SessionStatusManager.startVideoCall('test-session-1', 'client-123');
      const firstStartTime = firstResult.session.videoCallStarted;
      
      // Try to start again
      const secondResult = await SessionStatusManager.startVideoCall('test-session-1', 'client-123');
      
      expect(secondResult.success).toBe(true);
      expect(secondResult.message).toBe('Video call already in progress');
      expect(secondResult.session.videoCallStarted).toEqual(firstStartTime);
    });
    
  });
  
  describe('Ending Video Call', () => {
    
    test('should update session status to "Completed" when ending video call', async () => {
      // Start the call first
      await SessionStatusManager.startVideoCall('test-session-1', 'client-123');
      
      // Wait a moment to simulate call duration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // End the call
      const result = await SessionStatusManager.endVideoCall('test-session-1', 'client-123');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Video call ended successfully');
      expect(result.session.status).toBe('Completed');
      expect(result.session.videoCallEnded).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
      
      // Verify session was updated in mock storage
      const updatedSession = mockSessions.get('test-session-1');
      expect(updatedSession.status).toBe('Completed');
      expect(updatedSession.videoCallEnded).toBeDefined();
      expect(updatedSession.duration).toBeGreaterThanOrEqual(0);
    });
    
    test('should allow psychologist to end video call', async () => {
      // Start call as client
      await SessionStatusManager.startVideoCall('test-session-1', 'client-123');
      
      // End call as psychologist
      const result = await SessionStatusManager.endVideoCall('test-session-1', 'psychologist-456');
      
      expect(result.success).toBe(true);
      expect(result.session.status).toBe('Completed');
    });
    
    test('should reject unauthorized user from ending video call', async () => {
      await expect(
        SessionStatusManager.endVideoCall('test-session-1', 'unauthorized-user')
      ).rejects.toThrow('Unauthorized to end this session');
    });
    
    test('should handle ending call without start time', async () => {
      const result = await SessionStatusManager.endVideoCall('test-session-1', 'client-123');
      
      expect(result.success).toBe(true);
      expect(result.session.status).toBe('Completed');
      expect(result.duration).toBe(0);
    });
    
    test('should not update end time if call already ended', async () => {
      // Start and end call
      await SessionStatusManager.startVideoCall('test-session-1', 'client-123');
      const firstResult = await SessionStatusManager.endVideoCall('test-session-1', 'client-123');
      const firstEndTime = firstResult.session.videoCallEnded;
      
      // Try to end again
      const secondResult = await SessionStatusManager.endVideoCall('test-session-1', 'client-123');
      
      expect(secondResult.success).toBe(true);
      expect(secondResult.message).toBe('Video call already completed');
      expect(secondResult.session.videoCallEnded).toEqual(firstEndTime);
    });
    
  });
  
  describe('Auto-Start and Auto-End Functionality', () => {
    
    test('should auto-start video call for eligible session', async () => {
      const result = await SessionStatusManager.autoStartVideoCall('test-session-1');
      
      expect(result.success).toBe(true);
      expect(result.session.status).toBe('In Progress');
      expect(result.session.videoCallStarted).toBeDefined();
    });
    
    test('should not auto-start video call for ineligible session', async () => {
      // Update session to have unconfirmed payment
      const session = mockSessions.get('test-session-1');
      session.paymentStatus = 'Pending';
      mockSessions.set('test-session-1', session);
      
      const result = await SessionStatusManager.autoStartVideoCall('test-session-1');
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Session not eligible for auto-start');
    });
    
    test('should auto-end video call when participants leave', async () => {
      // Start the call first
      await SessionStatusManager.startVideoCall('test-session-1', 'client-123');
      
      // Auto-end the call
      const result = await SessionStatusManager.autoEndVideoCall('test-session-1');
      
      expect(result.success).toBe(true);
      expect(result.session.status).toBe('Completed');
      expect(result.session.videoCallEnded).toBeDefined();
    });
    
  });
  
  describe('Status Transition Validation', () => {
    
    test('should validate correct status transitions', () => {
      expect(SessionStatusManager.canTransitionToStatus('Confirmed', 'In Progress')).toBe(true);
      expect(SessionStatusManager.canTransitionToStatus('In Progress', 'Completed')).toBe(true);
      expect(SessionStatusManager.canTransitionToStatus('Pending Approval', 'Approved')).toBe(true);
    });
    
    test('should reject invalid status transitions', () => {
      expect(SessionStatusManager.canTransitionToStatus('Completed', 'In Progress')).toBe(false);
      expect(SessionStatusManager.canTransitionToStatus('Cancelled', 'In Progress')).toBe(false);
      expect(SessionStatusManager.canTransitionToStatus('Declined', 'Approved')).toBe(false);
    });
    
    test('should validate status transition with payment requirements', () => {
      const mockSession = {
        status: 'Confirmed',
        paymentStatus: 'Confirmed'
      };
      
      expect(() => {
        SessionStatusManager.validateStatusTransition(mockSession, 'In Progress');
      }).not.toThrow();
      
      mockSession.paymentStatus = 'Pending';
      expect(() => {
        SessionStatusManager.validateStatusTransition(mockSession, 'In Progress');
      }).toThrow('Payment must be confirmed before starting video call');
    });
    
  });
  
  describe('Session Status Retrieval', () => {
    
    test('should get session status with video call information', async () => {
      // Start and end a call
      await SessionStatusManager.startVideoCall('test-session-1', 'client-123');
      await SessionStatusManager.endVideoCall('test-session-1', 'client-123');
      
      const status = await SessionStatusManager.getSessionStatus('test-session-1', 'client-123');
      
      expect(status.sessionId).toBe('test-session-1');
      expect(status.status).toBe('Completed');
      expect(status.videoCall.started).toBeDefined();
      expect(status.videoCall.ended).toBeDefined();
      expect(status.videoCall.duration).toBeGreaterThanOrEqual(0);
      expect(status.videoCall.isActive).toBe(false);
      expect(status.participants.client.name).toBe('Test Client');
      expect(status.participants.psychologist.name).toBe('Test Psychologist');
    });
    
    test('should reject unauthorized access to session status', async () => {
      await expect(
        SessionStatusManager.getSessionStatus('test-session-1', 'unauthorized-user')
      ).rejects.toThrow('Unauthorized to view this session');
    });
    
  });
  
  describe('Error Handling', () => {
    
    test('should handle non-existent session gracefully', async () => {
      await expect(
        SessionStatusManager.startVideoCall('non-existent-session', 'client-123')
      ).rejects.toThrow('Session not found');
      
      await expect(
        SessionStatusManager.endVideoCall('non-existent-session', 'client-123')
      ).rejects.toThrow('Session not found');
    });
    
  });
  
});