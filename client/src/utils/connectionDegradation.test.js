import {
  QUALITY_LEVELS,
  QUALITY_THRESHOLDS,
  DEGRADATION_STRATEGIES,
  analyzeNetworkQuality,
  getQualityLevelForBandwidth,
  getMediaConstraints,
  applyQualityDegradation,
  createReconnectionStrategy,
  monitorConnectionHealth,
  autoApplyDegradation
} from './connectionDegradation';

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia
  }
});

describe('connectionDegradation utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('QUALITY_LEVELS', () => {
    test('contains all quality levels', () => {
      expect(QUALITY_LEVELS.HIGH).toBeDefined();
      expect(QUALITY_LEVELS.MEDIUM).toBeDefined();
      expect(QUALITY_LEVELS.LOW).toBeDefined();
      expect(QUALITY_LEVELS.AUDIO_ONLY).toBeDefined();
    });

    test('each quality level has required properties', () => {
      Object.values(QUALITY_LEVELS).forEach(level => {
        expect(level.audio).toBeDefined();
        expect(level.label).toBeDefined();
        expect(level.minBandwidth).toBeDefined();
      });
    });

    test('audio-only has no video constraints', () => {
      expect(QUALITY_LEVELS.AUDIO_ONLY.video).toBe(false);
    });
  });

  describe('analyzeNetworkQuality', () => {
    const createMockStats = (overrides = {}) => ({
      video: {
        inbound: {
          packetsReceived: 1000,
          packetsLost: 10,
          framesReceived: 300,
          framesDropped: 5,
          jitter: 0.01,
          ...overrides.videoInbound
        },
        outbound: {
          packetsSent: 950,
          bytesSent: 480000,
          ...overrides.videoOutbound
        }
      },
      audio: {
        inbound: {
          packetsReceived: 800,
          packetsLost: 5,
          jitter: 0.005,
          ...overrides.audioInbound
        },
        outbound: {
          packetsSent: 780,
          bytesSent: 100000,
          ...overrides.audioOutbound
        }
      },
      connection: {
        currentRoundTripTime: 0.05,
        availableOutgoingBitrate: 2000000,
        ...overrides.connection
      }
    });

    test('returns unknown quality for missing stats', () => {
      const result = analyzeNetworkQuality(null);
      expect(result.quality).toBe('unknown');
      expect(result.strategy).toBeNull();
    });

    test('analyzes excellent quality connection', () => {
      const stats = createMockStats({
        videoInbound: { packetsLost: 1, framesDropped: 0 },
        audioInbound: { packetsLost: 0 },
        connection: { currentRoundTripTime: 0.02 }
      });

      const result = analyzeNetworkQuality(stats);
      expect(result.quality).toBe('excellent');
      expect(result.strategy).toBeNull();
    });

    test('analyzes poor quality connection', () => {
      const stats = createMockStats({
        videoInbound: { packetsLost: 100, framesDropped: 50 },
        audioInbound: { packetsLost: 80 },
        connection: { currentRoundTripTime: 0.4 }
      });

      const result = analyzeNetworkQuality(stats);
      expect(result.quality).toBe('poor');
      expect(result.strategy).toBeDefined();
    });

    test('suggests audio-only for very low bandwidth', () => {
      const stats = createMockStats({
        videoInbound: { packetsLost: 100 },
        connection: { 
          currentRoundTripTime: 0.4,
          availableOutgoingBitrate: 50000 // Very low bandwidth
        }
      });

      const result = analyzeNetworkQuality(stats);
      expect(result.strategy).toBe(DEGRADATION_STRATEGIES.AUDIO_ONLY);
    });

    test('suggests reconnect for offline conditions', () => {
      const stats = createMockStats({
        connection: { 
          availableOutgoingBitrate: 10000 // Below audio-only threshold
        }
      });

      const result = analyzeNetworkQuality(stats);
      expect(result.strategy).toBe(DEGRADATION_STRATEGIES.RECONNECT);
    });

    test('calculates correct metrics', () => {
      const stats = createMockStats();
      const result = analyzeNetworkQuality(stats);

      expect(result.metrics.videoPacketLoss).toBeCloseTo(0.99, 2);
      expect(result.metrics.audioPacketLoss).toBeCloseTo(0.62, 2);
      expect(result.metrics.rtt).toBe(50);
      expect(result.metrics.frameDropRate).toBeCloseTo(1.67, 2);
    });
  });

  describe('getQualityLevelForBandwidth', () => {
    test('returns HIGH for high bandwidth', () => {
      const quality = getQualityLevelForBandwidth(3000000);
      expect(quality).toBe('HIGH');
    });

    test('returns MEDIUM for medium bandwidth', () => {
      const quality = getQualityLevelForBandwidth(1500000);
      expect(quality).toBe('MEDIUM');
    });

    test('returns LOW for low bandwidth', () => {
      const quality = getQualityLevelForBandwidth(700000);
      expect(quality).toBe('LOW');
    });

    test('returns AUDIO_ONLY for very low bandwidth', () => {
      const quality = getQualityLevelForBandwidth(50000);
      expect(quality).toBe('AUDIO_ONLY');
    });
  });

  describe('getMediaConstraints', () => {
    test('returns constraints for HIGH quality', () => {
      const constraints = getMediaConstraints('HIGH');
      
      expect(constraints.video.width.ideal).toBe(1280);
      expect(constraints.video.height.ideal).toBe(720);
      expect(constraints.audio.echoCancellation).toBe(true);
    });

    test('returns constraints for AUDIO_ONLY', () => {
      const constraints = getMediaConstraints('AUDIO_ONLY');
      
      expect(constraints.video).toBe(false);
      expect(constraints.audio.echoCancellation).toBe(true);
    });

    test('falls back to MEDIUM for unknown quality', () => {
      const constraints = getMediaConstraints('UNKNOWN');
      
      expect(constraints.video.width.ideal).toBe(640);
      expect(constraints.video.height.ideal).toBe(480);
    });
  });

  describe('applyQualityDegradation', () => {
    const mockStream = {
      getVideoTracks: jest.fn(() => [{ stop: jest.fn() }]),
      removeTrack: jest.fn(),
      addTrack: jest.fn()
    };

    const mockPeerConnection = {
      _pc: {
        getSenders: jest.fn(() => []),
        removeTrack: jest.fn()
      }
    };

    beforeEach(() => {
      mockStream.getVideoTracks.mockReturnValue([{ stop: jest.fn() }]);
      mockPeerConnection._pc.getSenders.mockReturnValue([]);
    });

    test('switches to audio-only mode', async () => {
      const result = await applyQualityDegradation(mockStream, 'AUDIO_ONLY', mockPeerConnection);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('audio-only mode');
      expect(mockStream.removeTrack).toHaveBeenCalled();
    });

    test('reduces video quality with new stream', async () => {
      const mockNewStream = {
        getVideoTracks: jest.fn(() => [{ id: 'new-track' }])
      };
      mockGetUserMedia.mockResolvedValue(mockNewStream);

      const mockSender = { replaceTrack: jest.fn() };
      mockPeerConnection._pc.getSenders.mockReturnValue([mockSender]);

      const result = await applyQualityDegradation(mockStream, 'MEDIUM', mockPeerConnection);
      
      expect(result.success).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalled();
      expect(mockSender.replaceTrack).toHaveBeenCalled();
    });

    test('handles getUserMedia failure gracefully', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Media error'));

      const result = await applyQualityDegradation(mockStream, 'MEDIUM', mockPeerConnection);
      
      // Should fall back to audio-only
      expect(result.success).toBe(true);
      expect(result.message).toContain('audio-only mode');
    });

    test('handles missing peer connection', async () => {
      const result = await applyQualityDegradation(mockStream, 'AUDIO_ONLY', null);
      
      expect(result.success).toBe(true);
    });

    test('handles errors during degradation', async () => {
      mockStream.removeTrack.mockImplementation(() => {
        throw new Error('Stream error');
      });

      const result = await applyQualityDegradation(mockStream, 'AUDIO_ONLY', mockPeerConnection);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('createReconnectionStrategy', () => {
    test('creates strategy for normal retry', () => {
      const strategy = createReconnectionStrategy('good', 0);
      
      expect(strategy.shouldRetry).toBe(true);
      expect(strategy.delay).toBe(1000);
      expect(strategy.strategy).toBe('normal_retry');
    });

    test('creates strategy for poor connection', () => {
      const strategy = createReconnectionStrategy('poor', 1);
      
      expect(strategy.shouldRetry).toBe(true);
      expect(strategy.delay).toBe(4000); // 2000 * 2 (exponential backoff + poor multiplier)
      expect(strategy.strategy).toBe('degraded_retry');
    });

    test('creates strategy for offline connection', () => {
      const strategy = createReconnectionStrategy('offline', 0);
      
      expect(strategy.shouldRetry).toBe(true);
      expect(strategy.delay).toBe(5000);
      expect(strategy.strategy).toBe('offline_retry');
    });

    test('stops retrying after max attempts', () => {
      const strategy = createReconnectionStrategy('good', 5);
      
      expect(strategy.shouldRetry).toBe(false);
      expect(strategy.strategy).toBe('give_up');
    });

    test('caps delay at maximum', () => {
      const strategy = createReconnectionStrategy('poor', 10);
      
      expect(strategy.delay).toBe(30000); // Capped at 30 seconds
    });
  });

  describe('monitorConnectionHealth', () => {
    const mockStats = {
      video: {
        inbound: { packetsReceived: 1000, packetsLost: 20, framesReceived: 300, framesDropped: 10 }
      },
      audio: {
        inbound: { packetsReceived: 800, packetsLost: 10 }
      },
      connection: {
        currentRoundTripTime: 0.1,
        availableOutgoingBitrate: 1500000
      }
    };

    test('provides comprehensive health analysis', () => {
      const health = monitorConnectionHealth(mockStats, 'HIGH');
      
      expect(health.quality).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.suggestions).toBeInstanceOf(Array);
    });

    test('suggests quality reduction for HIGH quality', () => {
      const health = monitorConnectionHealth(mockStats, 'HIGH');
      
      const reductionSuggestion = health.suggestions.find(s => s.action === 'reduce_to_medium');
      expect(reductionSuggestion).toBeDefined();
      expect(reductionSuggestion.targetQuality).toBe('MEDIUM');
    });

    test('suggests different actions for MEDIUM quality', () => {
      const health = monitorConnectionHealth(mockStats, 'MEDIUM');
      
      const reductionSuggestion = health.suggestions.find(s => s.action === 'reduce_to_low');
      expect(reductionSuggestion).toBeDefined();
      expect(reductionSuggestion.targetQuality).toBe('LOW');
    });

    test('provides network-specific suggestions', () => {
      const highLatencyStats = {
        ...mockStats,
        connection: { ...mockStats.connection, currentRoundTripTime: 0.6 }
      };

      const health = monitorConnectionHealth(highLatencyStats, 'HIGH');
      
      const networkSuggestion = health.suggestions.find(s => s.action === 'check_network');
      expect(networkSuggestion).toBeDefined();
    });

    test('provides system-specific suggestions', () => {
      const highFrameDropStats = {
        ...mockStats,
        video: {
          inbound: { ...mockStats.video.inbound, framesDropped: 50 }
        }
      };

      const health = monitorConnectionHealth(highFrameDropStats, 'HIGH');
      
      const systemSuggestion = health.suggestions.find(s => s.action === 'close_apps');
      expect(systemSuggestion).toBeDefined();
    });
  });

  describe('autoApplyDegradation', () => {
    const mockStats = {
      video: { inbound: { packetsReceived: 1000, packetsLost: 50 } },
      audio: { inbound: { packetsReceived: 800, packetsLost: 20 } },
      connection: { currentRoundTripTime: 0.2 }
    };

    const mockStream = { getVideoTracks: jest.fn(() => []) };
    const mockPeerConnection = { _pc: { getSenders: jest.fn(() => []) } };

    test('applies degradation when auto-degrade is enabled', async () => {
      const result = await autoApplyDegradation(
        mockStats,
        mockStream,
        'HIGH',
        mockPeerConnection,
        { autoDegrade: true, minQuality: 'AUDIO_ONLY' }
      );
      
      expect(result.applied).toBeDefined();
    });

    test('skips degradation when auto-degrade is disabled', async () => {
      const result = await autoApplyDegradation(
        mockStats,
        mockStream,
        'HIGH',
        mockPeerConnection,
        { autoDegrade: false }
      );
      
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('Auto-degradation disabled');
    });

    test('respects minimum quality setting', async () => {
      const result = await autoApplyDegradation(
        mockStats,
        mockStream,
        'LOW', // Already at low quality
        mockPeerConnection,
        { autoDegrade: true, minQuality: 'LOW' }
      );
      
      // Should not degrade below minimum
      expect(result.applied).toBe(false);
    });

    test('handles no applicable suggestions', async () => {
      const goodStats = {
        video: { inbound: { packetsReceived: 1000, packetsLost: 1 } },
        audio: { inbound: { packetsReceived: 800, packetsLost: 0 } },
        connection: { currentRoundTripTime: 0.02 }
      };

      const result = await autoApplyDegradation(
        goodStats,
        mockStream,
        'HIGH',
        mockPeerConnection,
        { autoDegrade: true }
      );
      
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('No applicable degradation strategy');
    });
  });

  describe('DEGRADATION_STRATEGIES', () => {
    test('contains all expected strategies', () => {
      expect(DEGRADATION_STRATEGIES.REDUCE_QUALITY).toBe('reduce_quality');
      expect(DEGRADATION_STRATEGIES.DISABLE_VIDEO).toBe('disable_video');
      expect(DEGRADATION_STRATEGIES.AUDIO_ONLY).toBe('audio_only');
      expect(DEGRADATION_STRATEGIES.RECONNECT).toBe('reconnect');
    });
  });

  describe('QUALITY_THRESHOLDS', () => {
    test('contains all quality thresholds', () => {
      expect(QUALITY_THRESHOLDS.EXCELLENT).toBeDefined();
      expect(QUALITY_THRESHOLDS.GOOD).toBeDefined();
      expect(QUALITY_THRESHOLDS.FAIR).toBeDefined();
      expect(QUALITY_THRESHOLDS.POOR).toBeDefined();
    });

    test('thresholds are in ascending order', () => {
      expect(QUALITY_THRESHOLDS.EXCELLENT.packetLoss).toBeLessThan(QUALITY_THRESHOLDS.GOOD.packetLoss);
      expect(QUALITY_THRESHOLDS.GOOD.packetLoss).toBeLessThan(QUALITY_THRESHOLDS.FAIR.packetLoss);
      expect(QUALITY_THRESHOLDS.FAIR.packetLoss).toBeLessThan(QUALITY_THRESHOLDS.POOR.packetLoss);
    });
  });
});