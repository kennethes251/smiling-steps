/**
 * Video Call User Journey Tests (Client-Side)
 * 
 * Tests complete user journeys from the React frontend perspective:
 * - Full video call component lifecycle
 * - User interaction flows
 * - Error handling and recovery
 * - Integration with backend APIs
 * - WebRTC functionality simulation
 * 
 * Validates requirements:
 * - US-1: Client Joins Video Call
 * - US-2: Psychologist Joins Video Call  
 * - US-3: Video Call Controls
 * - US-4: Screen Sharing
 * - US-5: Connection Status
 * - US-6: Call Duration Tracking
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import VideoCallRoomNew from './VideoCallRoomNew';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('socket.io-client');
jest.mock('simple-peer');

// Mock all video call components
jest.mock('./VideoCallErrorDisplay', () => ({ error, onRetry, onNavigateAway, onClose }) => (
  <div data-testid="error-display">
    <span data-testid="error-message">{error}</span>
    {onRetry && <button data-testid="retry-button" onClick={onRetry}>Retry</button>}
    {onNavigateAway && <button data-testid="navigate-away-button" onClick={onNavigateAway}>Navigate Away</button>}
    {onClose && <button data-testid="close-error-button" onClick={onClose}>Close</button>}
  </div>
));

jest.mock('./PermissionRequestFlow', () => ({ onPermissionsGranted, onPermissionsDenied, onClose }) => (
  <div data-testid="permission-flow">
    <button data-testid="grant-permissions-button" onClick={onPermissionsGranted}>Grant Permissions</button>
    <button data-testid="deny-permissions-button" onClick={onPermissionsDenied}>Deny Permissions</button>
    {onClose && <button data-testid="close-permission-button" onClick={onClose}>Close</button>}
  </div>
));

jest.mock('./NetworkQualityIndicator', () => ({ peerConnection, onQualityChange }) => {
  React.useEffect(() => {
    // Simulate quality changes for testing
    const timer = setTimeout(() => {
      if (onQualityChange) {
        onQualityChange({ quality: 'good', stats: { rtt: 50, packetLoss: 0.01 } });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [onQualityChange]);
  
  return <div data-testid="network-quality">Network Quality: Good</div>;
});

jest.mock('./QuickHelpPanel', () => ({ onOpenFullGuide }) => (
  <div data-testid="help-panel">
    <button data-testid="open-guide-button" onClick={onOpenFullGuide}>Need Help?</button>
  </div>
));

jest.mock('./TroubleshootingGuide', () => ({ open, onClose }) => 
  open ? (
    <div data-testid="troubleshooting-guide">
      <h3>Troubleshooting Guide</h3>
      <button data-testid="close-guide-button" onClick={onClose}>Close Guide</button>
    </div>
  ) : null
);

jest.mock('./ConnectionDegradationManager', () => ({ enabled, onQualityChange }) => {
  React.useEffect(() => {
    if (enabled && onQualityChange) {
      // Simulate connection quality monitoring
      const timer = setInterval(() => {
        onQualityChange({ quality: 'good', recommendation: 'maintain' });
      }, 2000);
      return () => clearInterval(timer);
    }
  }, [enabled, onQualityChange]);
  
  return enabled ? <div data-testid="degradation-manager">Connection Manager Active</div> : null;
});

// Mock WebRTC APIs
const mockGetUserMedia = jest.fn();
const mockGetDisplayMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
    getDisplayMedia: mockGetDisplayMedia,
    enumerateDevices: jest.fn(() => Promise.resolve([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' },
      { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone 1' }
    ]))
  }
});

// Mock socket.io
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
  id: 'mock-socket-id'
};

const mockIo = jest.fn(() => mockSocket);
require('socket.io-client').__setMockImplementation(mockIo);

// Mock simple-peer
const mockPeer = {
  on: jest.fn(),
  signal: jest.fn(),
  destroy: jest.fn(),
  _pc: {
    getSenders: jest.fn(() => []),
    getStats: jest.fn(() => Promise.resolve(new Map([
      ['outbound-rtp', { type: 'outbound-rtp', bytesSent: 1000, packetsSent: 100 }],
      ['inbound-rtp', { type: 'inbound-rtp', bytesReceived: 1000, packetsReceived: 100 }]
    ])))
  }
};

const MockPeer = jest.fn(() => mockPeer);
require('simple-peer').__setMockImplementation(MockPeer);

describe('Video Call User Journeys', () => {
  const mockSessionId = 'test-session-123';
  const mockOnCallEnd = jest.fn();
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock successful API responses
    axios.get.mockImplementation((url) => {
      if (url.includes('/config')) {
        return Promise.resolve({
          data: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });
      }
      if (url.includes('/can-join')) {
        return Promise.resolve({
          data: { canJoin: true, reason: null, minutesUntilSession: 5 }
        });
      }
      if (url.includes('/session/')) {
        return Promise.resolve({
          data: {
            session: {
              id: mockSessionId,
              sessionType: 'Individual',
              status: 'Confirmed',
              client: { id: 'client-123', name: 'Test Client' },
              psychologist: { id: 'psych-123', name: 'Dr. Test' }
            }
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    axios.post.mockImplementation((url) => {
      if (url.includes('/generate-room')) {
        return Promise.resolve({
          data: {
            roomId: 'test-room-123',
            sessionId: mockSessionId,
            sessionType: 'Individual',
            participants: {
              client: { id: 'client-123', name: 'Test Client' },
              psychologist: { id: 'psych-123', name: 'Dr. Test' }
            }
          }
        });
      }
      if (url.includes('/start/')) {
        return Promise.resolve({
          data: { message: 'Video call started successfully' }
        });
      }
      if (url.includes('/end/')) {
        return Promise.resolve({
          data: { message: 'Video call ended successfully', duration: 5 }
        });
      }
      return Promise.resolve({ data: {} });
    });

    // Mock successful media access
    const mockVideoTrack = { enabled: true, stop: jest.fn(), kind: 'video' };
    const mockAudioTrack = { enabled: true, stop: jest.fn(), kind: 'audio' };
    const mockStream = {
      getTracks: jest.fn(() => [mockVideoTrack, mockAudioTrack]),
      getVideoTracks: jest.fn(() => [mockVideoTrack]),
      getAudioTracks: jest.fn(() => [mockAudioTrack]),
      id: 'mock-stream-id'
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'token') return 'mock-token';
      if (key === 'user') return JSON.stringify({ id: 'user-123', name: 'Test User', role: 'client' });
      return null;
    });

    // Mock socket events
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'connect') {
        setTimeout(() => callback(), 100);
      }
      if (event === 'join-success') {
        setTimeout(() => callback({ participantCount: 1, secureConnection: true }), 200);
      }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  describe('Complete Client Video Call Journey', () => {
    
    test('should complete full client video call flow from start to finish', async () => {
      // Render the video call component
      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      // Step 1: Initial loading state
      expect(screen.getByText('Connecting...')).toBeInTheDocument();

      // Step 2: Wait for initialization to complete
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/api/video-calls/config'),
          expect.objectContaining({
            headers: { 'x-auth-token': 'mock-token' }
          })
        );
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining(`/api/video-calls/generate-room/${mockSessionId}`),
          {},
          expect.objectContaining({
            headers: { 'x-auth-token': 'mock-token' }
          })
        );
      });

      // Step 3: Media permissions should be requested
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      // Step 4: Video call controls should be available
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /videocam/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /mic/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /screenshare/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /callend/i })).toBeInTheDocument();
      });

      // Step 5: Call duration timer should be running
      await waitFor(() => {
        expect(screen.getByText('00:00:00')).toBeInTheDocument();
      });

      // Advance timer to show duration
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText('00:00:05')).toBeInTheDocument();
      });

      // Step 6: Test video toggle
      const videoButton = screen.getByRole('button', { name: /videocam/i });
      await user.click(videoButton);

      // Video should be toggled off
      const mockVideoTrack = mockGetUserMedia.mock.results[0].value.getVideoTracks()[0];
      expect(mockVideoTrack.enabled).toBe(false);

      // Step 7: Test audio toggle
      const audioButton = screen.getByRole('button', { name: /mic/i });
      await user.click(audioButton);

      // Audio should be toggled off
      const mockAudioTrack = mockGetUserMedia.mock.results[0].value.getAudioTracks()[0];
      expect(mockAudioTrack.enabled).toBe(false);

      // Step 8: Test screen sharing
      const mockScreenStream = {
        getVideoTracks: jest.fn(() => [{ onended: null, stop: jest.fn(), kind: 'video' }]),
        getTracks: jest.fn(() => [{ stop: jest.fn() }]),
        id: 'screen-stream-id'
      };
      mockGetDisplayMedia.mockResolvedValue(mockScreenStream);

      const screenShareButton = screen.getByRole('button', { name: /screenshare/i });
      await user.click(screenShareButton);

      await waitFor(() => {
        expect(mockGetDisplayMedia).toHaveBeenCalledWith({
          video: { cursor: 'always' },
          audio: false
        });
      });

      // Step 9: End the call
      const endCallButton = screen.getByRole('button', { name: /callend/i });
      await user.click(endCallButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining(`/api/video-calls/end/${mockSessionId}`),
          {},
          expect.objectContaining({
            headers: { 'x-auth-token': 'mock-token' }
          })
        );
      });

      expect(mockOnCallEnd).toHaveBeenCalled();
    }, 15000);

    test('should handle permission denied scenario gracefully', async () => {
      // Mock permission denied error
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);

      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      // Should show permission request flow
      await waitFor(() => {
        expect(screen.getByTestId('permission-flow')).toBeInTheDocument();
      });

      // User grants permissions
      const mockStream = {
        getTracks: jest.fn(() => []),
        getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
        getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }])
      };
      mockGetUserMedia.mockResolvedValue(mockStream);

      const grantButton = screen.getByTestId('grant-permissions-button');
      await user.click(grantButton);

      // Should retry media access
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
      });

      // Permission flow should be hidden
      await waitFor(() => {
        expect(screen.queryByTestId('permission-flow')).not.toBeInTheDocument();
      });
    });

    test('should handle permission permanently denied scenario', async () => {
      // Mock permission denied error
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);

      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('permission-flow')).toBeInTheDocument();
      });

      // User denies permissions
      const denyButton = screen.getByTestId('deny-permissions-button');
      await user.click(denyButton);

      // Should show error display
      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent(/camera-mic-denied/);
      });

      // Should provide navigation option
      expect(screen.getByTestId('navigate-away-button')).toBeInTheDocument();
    });

  });

  describe('Network Quality and Connection Management', () => {

    test('should monitor and display network quality', async () => {
      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Network quality indicator should be present
      await waitFor(() => {
        expect(screen.getByTestId('network-quality')).toBeInTheDocument();
      });

      // Connection degradation manager should be active
      await waitFor(() => {
        expect(screen.getByTestId('degradation-manager')).toBeInTheDocument();
      });
    });

    test('should handle poor network quality warnings', async () => {
      // Mock poor network quality
      const NetworkQualityIndicator = require('./NetworkQualityIndicator');
      NetworkQualityIndicator.mockImplementation(({ onQualityChange }) => {
        React.useEffect(() => {
          setTimeout(() => {
            onQualityChange({ quality: 'poor', stats: { rtt: 500, packetLoss: 0.1 } });
          }, 1000);
        }, [onQualityChange]);
        
        return <div data-testid="network-quality">Network Quality: Poor</div>;
      });

      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Should show network quality warning
      await waitFor(() => {
        expect(screen.getByText(/Network Quality: Poor/)).toBeInTheDocument();
      });
    });

  });

  describe('Error Handling and Recovery', () => {

    test('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
      });

      // Should provide retry option
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();

      // Test retry functionality
      axios.get.mockResolvedValue({
        data: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      });

      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);

      // Should retry the API call
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    test('should handle screen sharing permission denied', async () => {
      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Mock screen sharing permission denied
      const screenShareError = new Error('Permission denied');
      screenShareError.name = 'NotAllowedError';
      mockGetDisplayMedia.mockRejectedValue(screenShareError);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /screenshare/i })).toBeInTheDocument();
      });

      const screenShareButton = screen.getByRole('button', { name: /screenshare/i });
      await user.click(screenShareButton);

      // Should show screen share error
      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent(/screen-share-denied/);
      });
    });

    test('should handle WebSocket connection failures', async () => {
      // Mock socket connection error
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          setTimeout(() => callback(new Error('Connection failed')), 100);
        }
      });

      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Should show connection error
      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
      });
    });

  });

  describe('Help and Troubleshooting', () => {

    test('should provide help and troubleshooting options', async () => {
      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Help panel should be available
      await waitFor(() => {
        expect(screen.getByTestId('help-panel')).toBeInTheDocument();
      });

      // Open troubleshooting guide
      const openGuideButton = screen.getByTestId('open-guide-button');
      await user.click(openGuideButton);

      // Troubleshooting guide should open
      await waitFor(() => {
        expect(screen.getByTestId('troubleshooting-guide')).toBeInTheDocument();
        expect(screen.getByText('Troubleshooting Guide')).toBeInTheDocument();
      });

      // Close troubleshooting guide
      const closeGuideButton = screen.getByTestId('close-guide-button');
      await user.click(closeGuideButton);

      // Guide should close
      await waitFor(() => {
        expect(screen.queryByTestId('troubleshooting-guide')).not.toBeInTheDocument();
      });
    });

  });

  describe('Multi-User Interaction Simulation', () => {

    test('should handle remote user joining the call', async () => {
      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Simulate remote user joining
      const joinCallback = mockSocket.on.mock.calls.find(call => call[0] === 'user-joined')?.[1];
      if (joinCallback) {
        await act(async () => {
          joinCallback({
            userName: 'Dr. Test',
            userRole: 'psychologist',
            socketId: 'remote-socket-id'
          });
        });
      }

      // Should show that remote user joined
      await waitFor(() => {
        expect(screen.getByText(/Dr\. Test.*joined/i)).toBeInTheDocument();
      });
    });

    test('should handle WebRTC signaling exchange', async () => {
      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Simulate receiving an offer
      const offerCallback = mockSocket.on.mock.calls.find(call => call[0] === 'offer')?.[1];
      if (offerCallback) {
        await act(async () => {
          offerCallback({
            offer: { type: 'offer', sdp: 'mock-sdp-offer' },
            from: 'remote-socket-id',
            roomId: 'test-room-123'
          });
        });
      }

      // Should create peer connection and send answer
      expect(MockPeer).toHaveBeenCalled();
      expect(mockPeer.signal).toHaveBeenCalled();
    });

    test('should handle remote user leaving the call', async () => {
      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Simulate remote user leaving
      const leaveCallback = mockSocket.on.mock.calls.find(call => call[0] === 'user-left')?.[1];
      if (leaveCallback) {
        await act(async () => {
          leaveCallback({
            userName: 'Dr. Test',
            userRole: 'psychologist',
            socketId: 'remote-socket-id'
          });
        });
      }

      // Should show that remote user left
      await waitFor(() => {
        expect(screen.getByText(/Dr\. Test.*left/i)).toBeInTheDocument();
      });
    });

  });

  describe('Call Statistics and Monitoring', () => {

    test('should track and display call statistics', async () => {
      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Should track call duration
      await waitFor(() => {
        expect(screen.getByText('00:00:00')).toBeInTheDocument();
      });

      // Advance time and check duration updates
      await act(async () => {
        jest.advanceTimersByTime(30000); // 30 seconds
      });

      await waitFor(() => {
        expect(screen.getByText('00:00:30')).toBeInTheDocument();
      });

      // Should collect WebRTC statistics
      expect(mockPeer._pc.getStats).toHaveBeenCalled();
    });

  });

  describe('Accessibility and User Experience', () => {

    test('should provide keyboard navigation support', async () => {
      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // All control buttons should be focusable
      await waitFor(() => {
        const videoButton = screen.getByRole('button', { name: /videocam/i });
        const audioButton = screen.getByRole('button', { name: /mic/i });
        const screenShareButton = screen.getByRole('button', { name: /screenshare/i });
        const endCallButton = screen.getByRole('button', { name: /callend/i });

        expect(videoButton).toBeInTheDocument();
        expect(audioButton).toBeInTheDocument();
        expect(screenShareButton).toBeInTheDocument();
        expect(endCallButton).toBeInTheDocument();

        // Test keyboard navigation
        videoButton.focus();
        expect(videoButton).toHaveFocus();
      });
    });

    test('should provide appropriate ARIA labels and roles', async () => {
      await act(async () => {
        render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Check for proper ARIA attributes
      await waitFor(() => {
        const videoButton = screen.getByRole('button', { name: /videocam/i });
        expect(videoButton).toHaveAttribute('aria-label');
        
        const audioButton = screen.getByRole('button', { name: /mic/i });
        expect(audioButton).toHaveAttribute('aria-label');
      });
    });

  });

  describe('Component Lifecycle and Cleanup', () => {

    test('should properly clean up resources on unmount', async () => {
      const { unmount } = await act(async () => {
        return render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Unmount component
      await act(async () => {
        unmount();
      });

      // Should clean up media streams
      const mockStream = await mockGetUserMedia.mock.results[0]?.value;
      if (mockStream) {
        mockStream.getTracks().forEach(track => {
          expect(track.stop).toHaveBeenCalled();
        });
      }

      // Should destroy peer connection
      expect(mockPeer.destroy).toHaveBeenCalled();

      // Should disconnect socket
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    test('should handle component re-renders gracefully', async () => {
      const { rerender } = await act(async () => {
        return render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Re-render with different props
      await act(async () => {
        rerender(<VideoCallRoomNew sessionId="different-session-id" onCallEnd={mockOnCallEnd} />);
      });

      // Should handle the change gracefully without errors
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

  });

});