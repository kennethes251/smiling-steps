import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NetworkQualityIndicator from './NetworkQualityIndicator';

// Mock peer connection
const createMockPeerConnection = (stats = {}) => ({
  _pc: {
    getStats: jest.fn().mockResolvedValue(new Map([
      ['inbound-rtp-video', {
        type: 'inbound-rtp',
        mediaType: 'video',
        packetsReceived: 1000,
        packetsLost: 10,
        bytesReceived: 500000,
        framesReceived: 300,
        framesDropped: 5,
        jitter: 0.01,
        ...stats.video?.inbound
      }],
      ['inbound-rtp-audio', {
        type: 'inbound-rtp',
        mediaType: 'audio',
        packetsReceived: 800,
        packetsLost: 5,
        bytesReceived: 100000,
        jitter: 0.005,
        ...stats.audio?.inbound
      }],
      ['outbound-rtp-video', {
        type: 'outbound-rtp',
        mediaType: 'video',
        packetsSent: 950,
        bytesSent: 480000,
        framesSent: 295,
        ...stats.video?.outbound
      }],
      ['candidate-pair', {
        type: 'candidate-pair',
        state: 'succeeded',
        currentRoundTripTime: 0.05,
        availableOutgoingBitrate: 2000000,
        availableIncomingBitrate: 1800000,
        ...stats.connection
      }]
    ]))
  }
});

describe('NetworkQualityIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any existing intervals
    if (window.networkQualityInterval) {
      clearInterval(window.networkQualityInterval);
      window.networkQualityInterval = null;
    }
  });

  afterEach(() => {
    // Clean up intervals
    if (window.networkQualityInterval) {
      clearInterval(window.networkQualityInterval);
      window.networkQualityInterval = null;
    }
  });

  test('renders network quality indicator', () => {
    const mockPeer = createMockPeerConnection();
    render(<NetworkQualityIndicator peerConnection={mockPeer} />);
    
    // Should render the quality indicator button
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  test('shows quality popover when clicked', async () => {
    const mockPeer = createMockPeerConnection();
    render(<NetworkQualityIndicator peerConnection={mockPeer} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Wait for popover to appear
    await waitFor(() => {
      expect(screen.getByText(/Network Quality:/)).toBeInTheDocument();
    });
  });

  test('calculates quality correctly for good connection', async () => {
    const mockPeer = createMockPeerConnection({
      video: {
        inbound: { packetsLost: 1, framesDropped: 0 }
      },
      audio: {
        inbound: { packetsLost: 0 }
      },
      connection: {
        currentRoundTripTime: 0.02 // 20ms
      }
    });

    const onQualityChange = jest.fn();
    render(
      <NetworkQualityIndicator 
        peerConnection={mockPeer} 
        onQualityChange={onQualityChange}
      />
    );

    // Wait for quality calculation
    await waitFor(() => {
      expect(onQualityChange).toHaveBeenCalled();
    }, { timeout: 3000 });

    const lastCall = onQualityChange.mock.calls[onQualityChange.mock.calls.length - 1];
    expect(['excellent', 'good']).toContain(lastCall[0]);
  });

  test('calculates quality correctly for poor connection', async () => {
    const mockPeer = createMockPeerConnection({
      video: {
        inbound: { 
          packetsLost: 100, // High packet loss
          framesDropped: 50  // High frame drops
        }
      },
      audio: {
        inbound: { packetsLost: 80 }
      },
      connection: {
        currentRoundTripTime: 0.4 // 400ms - high latency
      }
    });

    const onQualityChange = jest.fn();
    render(
      <NetworkQualityIndicator 
        peerConnection={mockPeer} 
        onQualityChange={onQualityChange}
      />
    );

    // Wait for quality calculation
    await waitFor(() => {
      expect(onQualityChange).toHaveBeenCalled();
    }, { timeout: 3000 });

    const lastCall = onQualityChange.mock.calls[onQualityChange.mock.calls.length - 1];
    expect(['poor', 'fair']).toContain(lastCall[0]);
  });

  test('shows connection statistics in popover', async () => {
    const mockPeer = createMockPeerConnection();
    render(<NetworkQualityIndicator peerConnection={mockPeer} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Wait for stats to load and popover to show
    await waitFor(() => {
      expect(screen.getByText('Connection Statistics')).toBeInTheDocument();
      expect(screen.getByText('Round Trip Time')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('shows quality trend when available', async () => {
    const mockPeer = createMockPeerConnection();
    const component = render(<NetworkQualityIndicator peerConnection={mockPeer} />);
    
    // Wait for multiple quality measurements to build history
    await waitFor(() => {
      const button = screen.getByRole('button');
      fireEvent.click(button);
    }, { timeout: 5000 });

    // The trend should eventually appear after enough measurements
    await waitFor(() => {
      expect(screen.getByText(/Quality Trend:/)).toBeInTheDocument();
    }, { timeout: 8000 });
  });

  test('generates appropriate suggestions for poor quality', async () => {
    const mockPeer = createMockPeerConnection({
      video: {
        inbound: { packetsLost: 50 }
      },
      connection: {
        currentRoundTripTime: 0.3, // High latency
        availableOutgoingBitrate: 300000 // Low bandwidth
      }
    });

    render(<NetworkQualityIndicator peerConnection={mockPeer} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Wait for suggestions to appear
    await waitFor(() => {
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('bandwidth test functionality', async () => {
    const mockPeer = createMockPeerConnection();
    render(<NetworkQualityIndicator peerConnection={mockPeer} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      const testButton = screen.getByText('Test Speed');
      expect(testButton).toBeInTheDocument();
      
      fireEvent.click(testButton);
      expect(screen.getByText('Testing...')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('handles peer connection errors gracefully', async () => {
    const mockPeer = {
      _pc: {
        getStats: jest.fn().mockRejectedValue(new Error('Stats error'))
      }
    };

    const onQualityChange = jest.fn();
    render(
      <NetworkQualityIndicator 
        peerConnection={mockPeer} 
        onQualityChange={onQualityChange}
      />
    );

    // Should handle error and set quality to unknown
    await waitFor(() => {
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(screen.getByText(/Unknown/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});