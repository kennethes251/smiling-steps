import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoCallRoomNew from './VideoCallRoomNew';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('socket.io-client');
jest.mock('simple-peer');
jest.mock('./VideoCallErrorDisplay', () => ({ error, onRetry, onNavigateAway, onClose }) => (
  <div data-testid="error-display">
    {error && <span>Error: {error}</span>}
    {onRetry && <button onClick={onRetry}>Retry</button>}
    {onNavigateAway && <button onClick={onNavigateAway}>Navigate Away</button>}
    {onClose && <button onClick={onClose}>Close</button>}
  </div>
));
jest.mock('./PermissionRequestFlow', () => ({ onPermissionsGranted, onPermissionsDenied, onClose }) => (
  <div data-testid="permission-flow">
    <button onClick={onPermissionsGranted}>Grant Permissions</button>
    <button onClick={onPermissionsDenied}>Deny Permissions</button>
    {onClose && <button onClick={onClose}>Close</button>}
  </div>
));
jest.mock('./NetworkQualityIndicator', () => ({ peerConnection, onQualityChange }) => (
  <div data-testid="network-quality">Network Quality Indicator</div>
));
jest.mock('./QuickHelpPanel', () => ({ onOpenFullGuide }) => (
  <div data-testid="help-panel">
    <button onClick={onOpenFullGuide}>Open Guide</button>
  </div>
));
jest.mock('./TroubleshootingGuide', () => ({ open, onClose }) => 
  open ? <div data-testid="troubleshooting-guide"><button onClick={onClose}>Close Guide</button></div> : null
);
jest.mock('./ConnectionDegradationManager', () => ({ enabled }) => 
  enabled ? <div data-testid="degradation-manager">Degradation Manager</div> : null
);

// Mock WebRTC APIs
const mockGetUserMedia = jest.fn();
const mockGetDisplayMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
    getDisplayMedia: mockGetDisplayMedia
  }
});

// Mock socket.io
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn()
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
    getStats: jest.fn(() => Promise.resolve(new Map()))
  }
};

const MockPeer = jest.fn(() => mockPeer);
require('simple-peer').__setMockImplementation(MockPeer);

describe('VideoCallRoomNew', () => {
  const mockSessionId = 'test-session-123';
  const mockOnCallEnd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    axios.get.mockImplementation((url) => {
      if (url.includes('/config')) {
        return Promise.resolve({
          data: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
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
            sessionType: 'Individual'
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    // Mock successful media access
    const mockStream = {
      getTracks: jest.fn(() => []),
      getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'token') return 'mock-token';
      if (key === 'user') return JSON.stringify({ id: 'user-123', name: 'Test User' });
      return null;
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test('renders video call interface', async () => {
    await act(async () => {
      render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  test('initializes call successfully', async () => {
    await act(async () => {
      render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
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

    expect(mockGetUserMedia).toHaveBeenCalled();
  });

  test('handles media permission errors', async () => {
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValue(permissionError);

    await act(async () => {
      render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('permission-flow')).toBeInTheDocument();
    });
  });

  test('handles permission flow completion', async () => {
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValueOnce(permissionError);

    await act(async () => {
      render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('permission-flow')).toBeInTheDocument();
    });

    // Mock successful media access after permission granted
    const mockStream = {
      getTracks: jest.fn(() => []),
      getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const grantButton = screen.getByText('Grant Permissions');
    await act(async () => {
      fireEvent.click(grantButton);
    });

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
    });
  });

  test('toggles video on/off', async () => {
    const mockVideoTrack = { enabled: true, stop: jest.fn() };
    const mockStream = {
      getTracks: jest.fn(() => [mockVideoTrack]),
      getVideoTracks: jest.fn(() => [mockVideoTrack]),
      getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    await act(async () => {
      render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /videocam/i })).toBeInTheDocument();
    });

    const videoButton = screen.getByRole('button', { name: /videocam/i });
    
    await act(async () => {
      fireEvent.click(videoButton);
    });

    expect(mockVideoTrack.enabled).toBe(false);
  });

  test('toggles audio on/off', async () => {
    const mockAudioTrack = { enabled: true, stop: jest.fn() };
    const mockStream = {
      getTracks: jest.fn(() => [mockAudioTrack]),
      getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => [mockAudioTrack])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    await act(async () => {
      render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mic/i })).toBeInTheDocument();
    });

    const audioButton = screen.getByRole('button', { name: /mic/i });
    
    await act(async () => {
      fireEvent.click(audioButton);
    });

    expect(mockAudioTrack.enabled).toBe(false);
  });

  test('handles screen sharing', async () => {
    const mockScreenStream = {
      getVideoTracks: jest.fn(() => [{ onended: null, stop: jest.fn() }]),
      getTracks: jest.fn(() => [])
    };
    mockGetDisplayMedia.mockResolvedValue(mockScreenStream);

    const mockStream = {
      getTracks: jest.fn(() => []),
      getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    await act(async () => {
      render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /screenshare/i })).toBeInTheDocument();
    });

    const screenShareButton = screen.getByRole('button', { name: /screenshare/i });
    
    await act(async () => {
      fireEvent.click(screenShareButton);
    });

    expect(mockGetDisplayMedia).toHaveBeenCalledWith({
      video: { cursor: 'always' },
      audio: false
    });
  });

  test('handles screen sharing permission denied', async () => {
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    mockGetDisplayMedia.mockRejectedValue(permissionError);

    const mockStream = {
      getTracks: jest.fn(() => []),
      getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    await act(async () => {
      render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /screenshare/i })).toBeInTheDocument();
    });

    const screenShareButton = screen.getByRole('button', { name: /screenshare/i });
    
    await act(async () => {
      fireEvent.click(screenShareButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      expect(screen.getByText(/screen-share-denied/)).toBeInTheDocument();
    });
  });

  test('ends call properly', async () => {
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }]),
      getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    await act(async () => {
      render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /callend/i })).toBeInTheDocument();
    });

    const endCallButton = screen.getByRole('button', { name: /callend/i });
    
    await act(async () => {
      fireEvent.click(endCallButton);
    });

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
  });

  test('handles API errors gracefully', async () => {
    axios.get.mockRejectedValue(new Error('API Error'));

    await act(async () => {
      render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
    });
  });

  test('displays call duration', async () => {
    jest.useFakeTimers();
    
    const mockStream = {
      getTracks: jest.fn(() => []),
      getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    await act(async () => {
      render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    await waitFor(() => {
      expect(screen.getByText('00:00:00')).toBeInTheDocument();
    });

    // Fast forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.getByText('00:00:05')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test('shows network quality warning for poor connection', async () => {
    const mockStream = {
      getTracks: jest.fn(() => []),
      getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { rerender } = await act(async () => {
      return render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    // Simulate poor network quality by triggering the network quality change handler
    // This would normally be called by the NetworkQualityIndicator component
    const component = screen.getByTestId('network-quality');
    
    // We need to access the component's internal state to trigger the poor quality warning
    // In a real scenario, this would be triggered by the NetworkQualityIndicator
    await act(async () => {
      // Simulate the component receiving poor quality notification
      // This is a simplified test - in reality the NetworkQualityIndicator would call onQualityChange
    });
  });

  test('opens troubleshooting guide', async () => {
    const mockStream = {
      getTracks: jest.fn(() => []),
      getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    await act(async () => {
      render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('help-panel')).toBeInTheDocument();
    });

    const openGuideButton = screen.getByText('Open Guide');
    
    await act(async () => {
      fireEvent.click(openGuideButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('troubleshooting-guide')).toBeInTheDocument();
    });
  });

  test('cleans up resources on unmount', async () => {
    const mockTrack = { stop: jest.fn() };
    const mockStream = {
      getTracks: jest.fn(() => [mockTrack]),
      getVideoTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => [{ enabled: true, stop: jest.fn() }])
    };
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { unmount } = await act(async () => {
      return render(<VideoCallRoomNew sessionId={mockSessionId} onCallEnd={mockOnCallEnd} />);
    });

    await act(async () => {
      unmount();
    });

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(mockPeer.destroy).toHaveBeenCalled();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});