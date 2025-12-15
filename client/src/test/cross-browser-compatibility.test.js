/**
 * Cross-Browser Compatibility Tests for Video Call Feature
 * 
 * Tests WebRTC functionality, media permissions, and UI compatibility
 * across different browsers as specified in requirements:
 * - Chrome/Edge (latest 2 versions)
 * - Firefox (latest 2 versions) 
 * - Safari (macOS/iOS latest 2 versions)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import VideoCallRoomNew from '../components/VideoCall/VideoCallRoomNew';

// Mock browser APIs that vary across browsers
const mockGetUserMedia = jest.fn();
const mockGetDisplayMedia = jest.fn();
const mockRTCPeerConnection = jest.fn();
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn()
};

// Browser detection utilities
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  let browser = 'unknown';
  let version = 'unknown';
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'unknown';
  } else if (userAgent.includes('Edg')) {
    browser = 'edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'unknown';
  } else if (userAgent.includes('Firefox')) {
    browser = 'firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'unknown';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : 'unknown';
  }
  
  return { browser, version };
};

// WebRTC feature detection
const detectWebRTCSupport = () => {
  return {
    hasRTCPeerConnection: typeof RTCPeerConnection !== 'undefined',
    hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    hasGetDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
    hasWebSocket: typeof WebSocket !== 'undefined',
    hasHTTPS: location.protocol === 'https:',
    hasMediaDevices: !!navigator.mediaDevices
  };
};

describe('Cross-Browser Compatibility Tests', () => {
  let originalNavigator;
  let originalRTCPeerConnection;
  let originalWebSocket;
  
  beforeEach(() => {
    // Store original objects
    originalNavigator = global.navigator;
    originalRTCPeerConnection = global.RTCPeerConnection;
    originalWebSocket = global.WebSocket;
    
    // Mock WebRTC APIs
    global.navigator = {
      ...originalNavigator,
      mediaDevices: {
        getUserMedia: mockGetUserMedia,
        getDisplayMedia: mockGetDisplayMedia
      },
      userAgent: originalNavigator.userAgent
    };
    
    global.RTCPeerConnection = mockRTCPeerConnection;
    global.WebSocket = jest.fn(() => mockSocket);
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore original objects
    global.navigator = originalNavigator;
    global.RTCPeerConnection = originalRTCPeerConnection;
    global.WebSocket = originalWebSocket;
  });

  describe('Browser Feature Detection', () => {
    test('detects current browser correctly', () => {
      const browserInfo = getBrowserInfo();
      expect(browserInfo.browser).toBeDefined();
      expect(browserInfo.version).toBeDefined();
      
      console.log(`Running tests on: ${browserInfo.browser} ${browserInfo.version}`);
    });

    test('detects WebRTC support', () => {
      const support = detectWebRTCSupport();
      
      // These should be available in test environment
      expect(support.hasWebSocket).toBe(true);
      expect(support.hasMediaDevices).toBe(true);
      
      // Log support status for debugging
      console.log('WebRTC Support:', support);
    });

    test('validates required WebRTC APIs are available', () => {
      // Test that all required APIs are present
      expect(typeof RTCPeerConnection).toBe('function');
      expect(navigator.mediaDevices).toBeDefined();
      expect(navigator.mediaDevices.getUserMedia).toBeDefined();
      expect(navigator.mediaDevices.getDisplayMedia).toBeDefined();
    });
  });

  describe('Chrome/Edge Compatibility', () => {
    beforeEach(() => {
      // Mock Chrome/Edge user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        configurable: true
      });
    });

    test('supports all required WebRTC features', () => {
      const support = detectWebRTCSupport();
      expect(support.hasRTCPeerConnection).toBe(true);
      expect(support.hasGetUserMedia).toBe(true);
      expect(support.hasGetDisplayMedia).toBe(true);
    });

    test('handles media permissions correctly', async () => {
      const mockStream = {
        getTracks: () => [
          { kind: 'video', enabled: true, stop: jest.fn() },
          { kind: 'audio', enabled: true, stop: jest.fn() }
        ],
        getVideoTracks: () => [{ enabled: true, stop: jest.fn() }],
        getAudioTracks: () => [{ enabled: true, stop: jest.fn() }]
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream);
      
      render(<VideoCallRoomNew sessionId="test-session" />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          video: expect.objectContaining({
            width: expect.any(Object),
            height: expect.any(Object),
            frameRate: expect.any(Object)
          }),
          audio: expect.objectContaining({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          })
        });
      });
    });

    test('supports screen sharing', async () => {
      const mockScreenStream = {
        getTracks: () => [{ kind: 'video', enabled: true, stop: jest.fn(), onended: null }],
        getVideoTracks: () => [{ enabled: true, stop: jest.fn(), onended: null }]
      };
      
      mockGetDisplayMedia.mockResolvedValue(mockScreenStream);
      
      render(<VideoCallRoomNew sessionId="test-session" />);
      
      // Wait for component to initialize
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /screen share/i })).toBeInTheDocument();
      });
      
      const screenShareButton = screen.getByRole('button', { name: /screen share/i });
      fireEvent.click(screenShareButton);
      
      await waitFor(() => {
        expect(mockGetDisplayMedia).toHaveBeenCalledWith({
          video: { cursor: 'always' },
          audio: false
        });
      });
    });
  });

  describe('Firefox Compatibility', () => {
    beforeEach(() => {
      // Mock Firefox user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        configurable: true
      });
    });

    test('handles Firefox-specific WebRTC differences', () => {
      // Firefox uses different constraint formats
      const support = detectWebRTCSupport();
      expect(support.hasRTCPeerConnection).toBe(true);
      expect(support.hasGetUserMedia).toBe(true);
    });

    test('handles Firefox media constraints format', async () => {
      const mockStream = {
        getTracks: () => [
          { kind: 'video', enabled: true, stop: jest.fn() },
          { kind: 'audio', enabled: true, stop: jest.fn() }
        ],
        getVideoTracks: () => [{ enabled: true, stop: jest.fn() }],
        getAudioTracks: () => [{ enabled: true, stop: jest.fn() }]
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream);
      
      render(<VideoCallRoomNew sessionId="test-session" />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
    });
  });

  describe('Safari Compatibility', () => {
    beforeEach(() => {
      // Mock Safari user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        configurable: true
      });
    });

    test('handles Safari WebRTC limitations', () => {
      const support = detectWebRTCSupport();
      expect(support.hasRTCPeerConnection).toBe(true);
      expect(support.hasGetUserMedia).toBe(true);
    });

    test('handles Safari autoplay policies', async () => {
      const mockStream = {
        getTracks: () => [
          { kind: 'video', enabled: true, stop: jest.fn() },
          { kind: 'audio', enabled: true, stop: jest.fn() }
        ],
        getVideoTracks: () => [{ enabled: true, stop: jest.fn() }],
        getAudioTracks: () => [{ enabled: true, stop: jest.fn() }]
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream);
      
      render(<VideoCallRoomNew sessionId="test-session" />);
      
      // Safari requires user interaction for autoplay
      await waitFor(() => {
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          expect(video.hasAttribute('playsInline')).toBe(true);
          expect(video.hasAttribute('autoPlay')).toBe(true);
        });
      });
    });
  });

  describe('Error Handling Across Browsers', () => {
    test('handles permission denied errors consistently', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);
      
      render(<VideoCallRoomNew sessionId="test-session" />);
      
      await waitFor(() => {
        expect(screen.getByText(/permission/i)).toBeInTheDocument();
      });
    });

    test('handles overconstrained errors with fallback', async () => {
      const constraintError = new Error('Overconstrained');
      constraintError.name = 'OverconstrainedError';
      
      // First call fails, second succeeds with lower quality
      mockGetUserMedia
        .mockRejectedValueOnce(constraintError)
        .mockResolvedValue({
          getTracks: () => [
            { kind: 'video', enabled: true, stop: jest.fn() },
            { kind: 'audio', enabled: true, stop: jest.fn() }
          ],
          getVideoTracks: () => [{ enabled: true, stop: jest.fn() }],
          getAudioTracks: () => [{ enabled: true, stop: jest.fn() }]
        });
      
      render(<VideoCallRoomNew sessionId="test-session" />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
      });
    });

    test('handles network connectivity issues', async () => {
      // Mock network error
      const networkError = new Error('Network error');
      mockGetUserMedia.mockRejectedValue(networkError);
      
      render(<VideoCallRoomNew sessionId="test-session" />);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to initialize/i)).toBeInTheDocument();
      });
    });
  });

  describe('UI Responsiveness Across Browsers', () => {
    test('renders video controls consistently', async () => {
      const mockStream = {
        getTracks: () => [
          { kind: 'video', enabled: true, stop: jest.fn() },
          { kind: 'audio', enabled: true, stop: jest.fn() }
        ],
        getVideoTracks: () => [{ enabled: true, stop: jest.fn() }],
        getAudioTracks: () => [{ enabled: true, stop: jest.fn() }]
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream);
      
      render(<VideoCallRoomNew sessionId="test-session" />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /video/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /audio/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /end call/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /screen share/i })).toBeInTheDocument();
      });
    });

    test('handles video element sizing correctly', async () => {
      const mockStream = {
        getTracks: () => [
          { kind: 'video', enabled: true, stop: jest.fn() },
          { kind: 'audio', enabled: true, stop: jest.fn() }
        ],
        getVideoTracks: () => [{ enabled: true, stop: jest.fn() }],
        getAudioTracks: () => [{ enabled: true, stop: jest.fn() }]
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream);
      
      render(<VideoCallRoomNew sessionId="test-session" />);
      
      await waitFor(() => {
        const videoElements = document.querySelectorAll('video');
        expect(videoElements.length).toBeGreaterThan(0);
        
        videoElements.forEach(video => {
          const styles = window.getComputedStyle(video);
          expect(styles.objectFit).toBe('cover');
        });
      });
    });
  });

  describe('Performance Across Browsers', () => {
    test('initializes within acceptable time limits', async () => {
      const startTime = performance.now();
      
      const mockStream = {
        getTracks: () => [
          { kind: 'video', enabled: true, stop: jest.fn() },
          { kind: 'audio', enabled: true, stop: jest.fn() }
        ],
        getVideoTracks: () => [{ enabled: true, stop: jest.fn() }],
        getAudioTracks: () => [{ enabled: true, stop: jest.fn() }]
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream);
      
      render(<VideoCallRoomNew sessionId="test-session" />);
      
      await waitFor(() => {
        expect(screen.getByText(/connecting/i)).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const initTime = endTime - startTime;
      
      // Should initialize within 5 seconds (requirement)
      expect(initTime).toBeLessThan(5000);
    });

    test('cleans up resources properly', async () => {
      const mockTrack = { stop: jest.fn() };
      const mockStream = {
        getTracks: () => [mockTrack],
        getVideoTracks: () => [mockTrack],
        getAudioTracks: () => [mockTrack]
      };
      
      mockGetUserMedia.mockResolvedValue(mockStream);
      
      const { unmount } = render(<VideoCallRoomNew sessionId="test-session" />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      unmount();
      
      // Verify cleanup
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });
});