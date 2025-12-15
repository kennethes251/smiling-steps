/**
 * Connection Degradation Utilities
 * Implements graceful degradation for poor network connections
 */

// Quality levels for adaptive streaming
export const QUALITY_LEVELS = {
  HIGH: {
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    label: 'High Quality (720p)',
    minBandwidth: 2000000 // 2 Mbps
  },
  MEDIUM: {
    video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    label: 'Medium Quality (480p)',
    minBandwidth: 1000000 // 1 Mbps
  },
  LOW: {
    video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    label: 'Low Quality (240p)',
    minBandwidth: 500000 // 500 Kbps
  },
  AUDIO_ONLY: {
    video: false,
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    label: 'Audio Only',
    minBandwidth: 64000 // 64 Kbps
  }
};

// Network quality thresholds
export const QUALITY_THRESHOLDS = {
  EXCELLENT: { packetLoss: 0.5, rtt: 50, jitter: 10 },
  GOOD: { packetLoss: 1.0, rtt: 100, jitter: 20 },
  FAIR: { packetLoss: 2.0, rtt: 200, jitter: 40 },
  POOR: { packetLoss: 5.0, rtt: 300, jitter: 80 }
};

// Degradation strategies
export const DEGRADATION_STRATEGIES = {
  REDUCE_QUALITY: 'reduce_quality',
  DISABLE_VIDEO: 'disable_video',
  AUDIO_ONLY: 'audio_only',
  RECONNECT: 'reconnect'
};

/**
 * Analyze network statistics and determine appropriate quality level
 */
export const analyzeNetworkQuality = (stats) => {
  if (!stats || !stats.connection) {
    return { quality: 'unknown', strategy: null };
  }

  const videoIn = stats.video?.inbound || {};
  const audioIn = stats.audio?.inbound || {};
  const connection = stats.connection;

  // Calculate metrics
  const videoPacketLoss = videoIn.packetsReceived > 0 
    ? (videoIn.packetsLost / (videoIn.packetsReceived + videoIn.packetsLost)) * 100 
    : 0;
  
  const audioPacketLoss = audioIn.packetsReceived > 0 
    ? (audioIn.packetsLost / (audioIn.packetsReceived + audioIn.packetsLost)) * 100 
    : 0;

  const rtt = (connection.currentRoundTripTime || 0) * 1000;
  const videoJitter = (videoIn.jitter || 0) * 1000;
  const audioJitter = (audioIn.jitter || 0) * 1000;
  const frameDropRate = videoIn.framesReceived > 0 
    ? (videoIn.framesDropped / videoIn.framesReceived) * 100 
    : 0;

  const availableBandwidth = connection.availableOutgoingBitrate || 0;

  // Determine quality level
  let quality = 'excellent';
  let strategy = null;

  if (videoPacketLoss > QUALITY_THRESHOLDS.POOR.packetLoss || 
      audioPacketLoss > QUALITY_THRESHOLDS.POOR.packetLoss ||
      rtt > QUALITY_THRESHOLDS.POOR.rtt ||
      frameDropRate > 10) {
    quality = 'poor';
    
    // Determine degradation strategy
    if (availableBandwidth < QUALITY_LEVELS.AUDIO_ONLY.minBandwidth) {
      strategy = DEGRADATION_STRATEGIES.RECONNECT;
    } else if (availableBandwidth < QUALITY_LEVELS.LOW.minBandwidth || frameDropRate > 20) {
      strategy = DEGRADATION_STRATEGIES.AUDIO_ONLY;
    } else if (videoPacketLoss > 3 || frameDropRate > 15) {
      strategy = DEGRADATION_STRATEGIES.DISABLE_VIDEO;
    } else {
      strategy = DEGRADATION_STRATEGIES.REDUCE_QUALITY;
    }
  } else if (videoPacketLoss > QUALITY_THRESHOLDS.FAIR.packetLoss || 
             rtt > QUALITY_THRESHOLDS.FAIR.rtt ||
             frameDropRate > 5) {
    quality = 'fair';
    strategy = DEGRADATION_STRATEGIES.REDUCE_QUALITY;
  } else if (videoPacketLoss > QUALITY_THRESHOLDS.GOOD.packetLoss || 
             rtt > QUALITY_THRESHOLDS.GOOD.rtt) {
    quality = 'good';
  }

  return {
    quality,
    strategy,
    metrics: {
      videoPacketLoss,
      audioPacketLoss,
      rtt,
      videoJitter,
      audioJitter,
      frameDropRate,
      availableBandwidth
    }
  };
};

/**
 * Get appropriate quality level based on available bandwidth
 */
export const getQualityLevelForBandwidth = (bandwidth) => {
  if (bandwidth >= QUALITY_LEVELS.HIGH.minBandwidth) {
    return 'HIGH';
  } else if (bandwidth >= QUALITY_LEVELS.MEDIUM.minBandwidth) {
    return 'MEDIUM';
  } else if (bandwidth >= QUALITY_LEVELS.LOW.minBandwidth) {
    return 'LOW';
  } else {
    return 'AUDIO_ONLY';
  }
};

/**
 * Get media constraints for a specific quality level
 */
export const getMediaConstraints = (qualityLevel) => {
  const quality = QUALITY_LEVELS[qualityLevel] || QUALITY_LEVELS.MEDIUM;
  
  return {
    video: quality.video,
    audio: quality.audio
  };
};

/**
 * Apply quality degradation to existing stream
 */
export const applyQualityDegradation = async (currentStream, targetQuality, peerConnection) => {
  try {
    const constraints = getMediaConstraints(targetQuality);
    
    if (targetQuality === 'AUDIO_ONLY') {
      // Disable video track
      const videoTrack = currentStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        currentStream.removeTrack(videoTrack);
        
        // Remove video sender from peer connection
        if (peerConnection && peerConnection._pc) {
          const videoSender = peerConnection._pc.getSenders().find(s => s.track?.kind === 'video');
          if (videoSender) {
            await peerConnection._pc.removeTrack(videoSender);
          }
        }
      }
      
      return {
        success: true,
        stream: currentStream,
        message: 'Switched to audio-only mode to improve connection quality'
      };
    }
    
    // For video quality reduction, we need to get a new stream with lower constraints
    if (constraints.video) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        const newVideoTrack = newStream.getVideoTracks()[0];
        const oldVideoTrack = currentStream.getVideoTracks()[0];
        
        if (newVideoTrack && oldVideoTrack) {
          // Replace the video track
          currentStream.removeTrack(oldVideoTrack);
          currentStream.addTrack(newVideoTrack);
          oldVideoTrack.stop();
          
          // Update peer connection
          if (peerConnection && peerConnection._pc) {
            const videoSender = peerConnection._pc.getSenders().find(s => s.track?.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(newVideoTrack);
            }
          }
          
          return {
            success: true,
            stream: currentStream,
            message: `Reduced video quality to ${QUALITY_LEVELS[targetQuality].label} to improve connection`
          };
        }
      } catch (error) {
        console.error('Failed to get new stream with reduced quality:', error);
        // Fall back to disabling video
        return await applyQualityDegradation(currentStream, 'AUDIO_ONLY', peerConnection);
      }
    }
    
    return {
      success: false,
      stream: currentStream,
      message: 'Unable to apply quality degradation'
    };
    
  } catch (error) {
    console.error('Error applying quality degradation:', error);
    return {
      success: false,
      stream: currentStream,
      message: 'Failed to apply quality degradation',
      error
    };
  }
};

/**
 * Enhanced reconnection logic for poor connections
 */
export const createReconnectionStrategy = (networkQuality, retryCount = 0) => {
  const maxRetries = 5;
  const baseDelay = 1000; // 1 second
  
  if (retryCount >= maxRetries) {
    return {
      shouldRetry: false,
      delay: 0,
      strategy: 'give_up'
    };
  }
  
  let delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
  let strategy = 'normal_retry';
  
  // Adjust strategy based on network quality
  switch (networkQuality) {
    case 'poor':
      delay *= 2; // Longer delays for poor connections
      strategy = 'degraded_retry';
      break;
    case 'offline':
      delay = 5000; // 5 second delay for offline
      strategy = 'offline_retry';
      break;
    case 'fair':
      delay *= 1.5;
      strategy = 'cautious_retry';
      break;
  }
  
  // Cap maximum delay at 30 seconds
  delay = Math.min(delay, 30000);
  
  return {
    shouldRetry: true,
    delay,
    strategy,
    retryCount: retryCount + 1
  };
};

/**
 * Monitor connection and suggest degradation actions
 */
export const monitorConnectionHealth = (stats, currentQuality = 'HIGH') => {
  const analysis = analyzeNetworkQuality(stats);
  const suggestions = [];
  
  if (analysis.strategy) {
    switch (analysis.strategy) {
      case DEGRADATION_STRATEGIES.REDUCE_QUALITY:
        if (currentQuality === 'HIGH') {
          suggestions.push({
            action: 'reduce_to_medium',
            message: 'Reduce video quality to Medium (480p) to improve stability',
            priority: 'medium',
            targetQuality: 'MEDIUM'
          });
        } else if (currentQuality === 'MEDIUM') {
          suggestions.push({
            action: 'reduce_to_low',
            message: 'Reduce video quality to Low (240p) to improve stability',
            priority: 'medium',
            targetQuality: 'LOW'
          });
        }
        break;
        
      case DEGRADATION_STRATEGIES.DISABLE_VIDEO:
        suggestions.push({
          action: 'disable_video',
          message: 'Turn off video to improve audio quality',
          priority: 'high',
          targetQuality: 'AUDIO_ONLY'
        });
        break;
        
      case DEGRADATION_STRATEGIES.AUDIO_ONLY:
        suggestions.push({
          action: 'audio_only',
          message: 'Switch to audio-only mode for better connection stability',
          priority: 'high',
          targetQuality: 'AUDIO_ONLY'
        });
        break;
        
      case DEGRADATION_STRATEGIES.RECONNECT:
        suggestions.push({
          action: 'reconnect',
          message: 'Connection is very poor. Consider reconnecting or checking your internet',
          priority: 'critical'
        });
        break;
    }
  }
  
  // Additional suggestions based on specific metrics
  if (analysis.metrics.rtt > 500) {
    suggestions.push({
      action: 'check_network',
      message: 'High latency detected. Move closer to your router or use a wired connection',
      priority: 'medium'
    });
  }
  
  if (analysis.metrics.frameDropRate > 10) {
    suggestions.push({
      action: 'close_apps',
      message: 'High frame drop rate. Close other applications to free up system resources',
      priority: 'medium'
    });
  }
  
  return {
    quality: analysis.quality,
    strategy: analysis.strategy,
    metrics: analysis.metrics,
    suggestions
  };
};

/**
 * Auto-apply degradation based on connection monitoring
 */
export const autoApplyDegradation = async (
  stats, 
  currentStream, 
  currentQuality, 
  peerConnection,
  options = { autoDegrade: true, minQuality: 'AUDIO_ONLY' }
) => {
  if (!options.autoDegrade) {
    return { applied: false, reason: 'Auto-degradation disabled' };
  }
  
  const monitoring = monitorConnectionHealth(stats, currentQuality);
  
  // Find the highest priority suggestion that we can apply
  const applicableSuggestion = monitoring.suggestions
    .filter(s => s.targetQuality && s.targetQuality !== currentQuality)
    .sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })[0];
  
  if (!applicableSuggestion) {
    return { applied: false, reason: 'No applicable degradation strategy' };
  }
  
  // Check if target quality is above minimum allowed
  const qualityOrder = ['HIGH', 'MEDIUM', 'LOW', 'AUDIO_ONLY'];
  const currentIndex = qualityOrder.indexOf(currentQuality);
  const targetIndex = qualityOrder.indexOf(applicableSuggestion.targetQuality);
  const minIndex = qualityOrder.indexOf(options.minQuality);
  
  if (targetIndex > minIndex) {
    return { applied: false, reason: `Target quality below minimum (${options.minQuality})` };
  }
  
  if (targetIndex <= currentIndex) {
    // Apply the degradation
    const result = await applyQualityDegradation(
      currentStream, 
      applicableSuggestion.targetQuality, 
      peerConnection
    );
    
    return {
      applied: result.success,
      reason: result.message,
      newQuality: applicableSuggestion.targetQuality,
      suggestion: applicableSuggestion,
      error: result.error
    };
  }
  
  return { applied: false, reason: 'No degradation needed' };
};

export default {
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
};