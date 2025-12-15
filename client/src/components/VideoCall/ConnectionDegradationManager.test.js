import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConnectionDegradationManager from './ConnectionDegradationManager';

// Mock the connection degradation utilities
jest.mock('../../utils/connectionDegradation', () => ({
  monitorConnectionHealth: jest.fn(() => ({
    quality: 'good',
    strategy: null,
    metrics: {
      videoPacketLoss: 1.0,
      audioPacketLoss: 0.5,
      rtt: 50,
      frameDropRate: 2.0
    },
    suggestions: []
  })),
  autoApplyDegradation: jest.fn(() => Promise.resolve({
    applied: true,
    reason: 'Reduced video quality to improve connection',
    newQuality: 'MEDIUM',
    suggestion: { action: 'reduce_quality', priority: 'medium' }
  })),
  QUALITY_LEVELS: {
    HIGH: { label: 'High Quality (720p)' },
    MEDIUM: { label: 'Medium Quality (480p)' },
    LOW: { label: 'Low Quality (240p)' },
    AUDIO_ONLY: { label: 'Audio Only' }
  },
  DEGRADATION_STRATEGIES: {
    REDUCE_QUALITY: 'reduce_quality',
    DISABLE_VIDEO: 'disable_video',
    AUDIO_ONLY: 'audio_only',
    RECONNECT: 'reconnect'
  },
  createReconnectionStrategy: jest.fn(() => ({
    shouldRetry: true,
    delay: 3000,
    strategy: 'normal_retry'
  }))
}));

describe('ConnectionDegradationManager', () => {
  const mockOnQualityChange = jest.fn();
  const mockOnStreamChange = jest.fn();
  const mockOnReconnectNeeded = jest.fn();
  
  const mockNetworkStats = {
    video: {
      inbound: { packetsReceived: 1000, packetsLost: 10, framesReceived: 300, framesDropped: 5 },
      outbound: { packetsSent: 950, bytesSent: 480000 }
    },
    audio: {
      inbound: { packetsReceived: 800, packetsLost: 5 },
      outbound: { packetsSent: 780, bytesSent: 100000 }
    },
    connection: {
      currentRoundTripTime: 0.05,
      availableOutgoingBitrate: 2000000
    }
  };

  const mockStream = {
    getTracks: jest.fn(() => []),
    getVideoTracks: jest.fn(() => [{ enabled: true }]),
    getAudioTracks: jest.fn(() => [{ enabled: true }])
  };

  const mockPeerConnection = {
    _pc: {
      getSenders: jest.fn(() => []),
      getStats: jest.fn(() => Promise.resolve(new Map()))
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('renders when enabled', () => {
    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    expect(screen.getByTestId('degradation-manager')).toBeInTheDocument();
  });

  test('does not render when disabled', () => {
    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={false}
      />
    );

    expect(screen.queryByTestId('degradation-manager')).not.toBeInTheDocument();
  });

  test('shows connection quality indicator', async () => {
    const { monitorConnectionHealth } = require('../../utils/connectionDegradation');
    monitorConnectionHealth.mockReturnValue({
      quality: 'good',
      strategy: null,
      metrics: mockNetworkStats,
      suggestions: []
    });

    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Connection: GOOD/)).toBeInTheDocument();
    });
  });

  test('shows settings button when suggestions are available', async () => {
    const { monitorConnectionHealth } = require('../../utils/connectionDegradation');
    monitorConnectionHealth.mockReturnValue({
      quality: 'fair',
      strategy: 'reduce_quality',
      metrics: mockNetworkStats,
      suggestions: [{
        action: 'reduce_quality',
        message: 'Reduce video quality to improve connection',
        priority: 'medium'
      }]
    });

    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  test('applies auto-degradation when conditions are met', async () => {
    jest.useFakeTimers();
    
    const { monitorConnectionHealth, autoApplyDegradation } = require('../../utils/connectionDegradation');
    
    monitorConnectionHealth.mockReturnValue({
      quality: 'poor',
      strategy: 'reduce_quality',
      metrics: mockNetworkStats,
      suggestions: [{
        action: 'reduce_quality',
        message: 'Reduce video quality to improve connection',
        priority: 'high',
        targetQuality: 'MEDIUM'
      }]
    });

    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    // Fast forward to trigger monitoring
    act(() => {
      jest.advanceTimersByTime(4000); // Trigger multiple monitoring cycles
    });

    await waitFor(() => {
      expect(autoApplyDegradation).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  test('shows degradation suggestion dialog', async () => {
    const { monitorConnectionHealth } = require('../../utils/connectionDegradation');
    
    monitorConnectionHealth.mockReturnValue({
      quality: 'poor',
      strategy: 'reduce_quality',
      metrics: mockNetworkStats,
      suggestions: [{
        action: 'reduce_quality',
        message: 'Reduce video quality to improve connection',
        priority: 'critical',
        targetQuality: 'MEDIUM'
      }]
    });

    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Connection Quality Issue')).toBeInTheDocument();
    });
  });

  test('handles manual degradation acceptance', async () => {
    const { monitorConnectionHealth, autoApplyDegradation } = require('../../utils/connectionDegradation');
    
    monitorConnectionHealth.mockReturnValue({
      quality: 'poor',
      strategy: 'reduce_quality',
      metrics: mockNetworkStats,
      suggestions: [{
        action: 'reduce_quality',
        message: 'Reduce video quality to improve connection',
        priority: 'critical',
        targetQuality: 'MEDIUM'
      }]
    });

    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Apply Recommendation')).toBeInTheDocument();
    });

    const applyButton = screen.getByText('Apply Recommendation');
    
    await act(async () => {
      fireEvent.click(applyButton);
    });

    expect(autoApplyDegradation).toHaveBeenCalled();
  });

  test('handles critical connection and triggers reconnect', async () => {
    jest.useFakeTimers();
    
    const { monitorConnectionHealth, createReconnectionStrategy } = require('../../utils/connectionDegradation');
    
    monitorConnectionHealth.mockReturnValue({
      quality: 'offline',
      strategy: 'reconnect',
      metrics: mockNetworkStats,
      suggestions: [{
        action: 'reconnect',
        message: 'Connection lost, attempting to reconnect',
        priority: 'critical'
      }]
    });

    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    // Simulate multiple consecutive poor readings
    act(() => {
      jest.advanceTimersByTime(20000); // 20 seconds of monitoring
    });

    await waitFor(() => {
      expect(mockOnReconnectNeeded).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  test('shows auto-optimization indicator', async () => {
    jest.useFakeTimers();
    
    const { autoApplyDegradation } = require('../../utils/connectionDegradation');
    
    autoApplyDegradation.mockResolvedValue({
      applied: true,
      reason: 'Auto-optimized connection quality',
      newQuality: 'MEDIUM'
    });

    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.getByText(/Auto-optimization active/)).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test('opens settings panel', async () => {
    const { monitorConnectionHealth } = require('../../utils/connectionDegradation');
    
    monitorConnectionHealth.mockReturnValue({
      quality: 'fair',
      strategy: null,
      metrics: mockNetworkStats,
      suggestions: [{
        action: 'reduce_quality',
        message: 'Consider reducing quality',
        priority: 'medium'
      }]
    });

    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    await waitFor(() => {
      const settingsButton = screen.getByRole('button');
      fireEvent.click(settingsButton);
    });

    expect(screen.getByText('Connection Management Settings')).toBeInTheDocument();
  });

  test('toggles automatic mode', async () => {
    const { monitorConnectionHealth } = require('../../utils/connectionDegradation');
    
    monitorConnectionHealth.mockReturnValue({
      quality: 'fair',
      strategy: null,
      metrics: mockNetworkStats,
      suggestions: []
    });

    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    await waitFor(() => {
      const settingsButton = screen.getByRole('button');
      fireEvent.click(settingsButton);
    });

    const autoModeSwitch = screen.getByRole('checkbox');
    fireEvent.click(autoModeSwitch);

    expect(autoModeSwitch).not.toBeChecked();
  });

  test('shows degradation history in settings', async () => {
    const { monitorConnectionHealth, autoApplyDegradation } = require('../../utils/connectionDegradation');
    
    // First apply a degradation
    autoApplyDegradation.mockResolvedValue({
      applied: true,
      reason: 'Reduced quality due to poor connection',
      newQuality: 'MEDIUM'
    });

    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    // Trigger degradation
    await act(async () => {
      // This would normally be triggered by monitoring
    });

    // Open settings
    await waitFor(() => {
      const settingsButton = screen.getByRole('button');
      fireEvent.click(settingsButton);
    });

    expect(screen.getByText('Recent Quality Adjustments:')).toBeInTheDocument();
  });

  test('handles degradation errors gracefully', async () => {
    const { monitorConnectionHealth, autoApplyDegradation } = require('../../utils/connectionDegradation');
    
    monitorConnectionHealth.mockReturnValue({
      quality: 'poor',
      strategy: 'reduce_quality',
      metrics: mockNetworkStats,
      suggestions: [{
        action: 'reduce_quality',
        priority: 'high',
        targetQuality: 'MEDIUM'
      }]
    });

    autoApplyDegradation.mockRejectedValue(new Error('Degradation failed'));

    render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    // Should not crash when degradation fails
    await waitFor(() => {
      expect(screen.getByTestId('degradation-manager')).toBeInTheDocument();
    });
  });

  test('stops monitoring when disabled', () => {
    const { rerender } = render(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={true}
      />
    );

    expect(screen.getByTestId('degradation-manager')).toBeInTheDocument();

    rerender(
      <ConnectionDegradationManager
        networkStats={mockNetworkStats}
        currentStream={mockStream}
        currentQuality="HIGH"
        peerConnection={mockPeerConnection}
        onQualityChange={mockOnQualityChange}
        onStreamChange={mockOnStreamChange}
        onReconnectNeeded={mockOnReconnectNeeded}
        enabled={false}
      />
    );

    expect(screen.queryByTestId('degradation-manager')).not.toBeInTheDocument();
  });
});