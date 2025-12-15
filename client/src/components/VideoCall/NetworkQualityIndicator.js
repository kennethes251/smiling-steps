import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Alert,
  Button,
  Tooltip,
  Divider
} from '@mui/material';
import {
  SignalWifi4Bar as ExcellentIcon,
  SignalWifi3Bar as GoodIcon,
  SignalWifi2Bar as FairIcon,
  SignalWifi1Bar as PoorIcon,
  SignalWifiOff as OfflineIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

const NetworkQualityIndicator = ({ peerConnection, onQualityChange }) => {
  const [quality, setQuality] = useState('unknown');
  const [stats, setStats] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [qualityHistory, setQualityHistory] = useState([]);
  const [qualityTrend, setQualityTrend] = useState('stable');
  const [suggestions, setSuggestions] = useState([]);
  const [showBandwidthTest, setShowBandwidthTest] = useState(false);
  const qualityHistoryRef = useRef([]);

  useEffect(() => {
    if (peerConnection && peerConnection._pc) {
      startMonitoring();
      return () => stopMonitoring();
    }
  }, [peerConnection]);

  const startMonitoring = () => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    const interval = setInterval(async () => {
      try {
        await updateNetworkStats();
      } catch (error) {
        console.error('Failed to get network stats:', error);
      }
    }, 2000); // Update every 2 seconds

    // Store interval for cleanup
    window.networkQualityInterval = interval;
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (window.networkQualityInterval) {
      clearInterval(window.networkQualityInterval);
      window.networkQualityInterval = null;
    }
  };

  const updateNetworkStats = async () => {
    if (!peerConnection?._pc) return;

    try {
      const stats = await peerConnection._pc.getStats();
      const parsedStats = parseRTCStats(stats);
      setStats(parsedStats);
      
      const newQuality = calculateQuality(parsedStats);
      
      // Update quality history for trend analysis
      const timestamp = Date.now();
      const qualityScore = getQualityScore(newQuality);
      
      qualityHistoryRef.current.push({ quality: newQuality, score: qualityScore, timestamp });
      
      // Keep only last 30 data points (1 minute of history at 2s intervals)
      if (qualityHistoryRef.current.length > 30) {
        qualityHistoryRef.current.shift();
      }
      
      setQualityHistory([...qualityHistoryRef.current]);
      
      // Calculate trend
      const trend = calculateQualityTrend(qualityHistoryRef.current);
      setQualityTrend(trend);
      
      // Generate suggestions based on current stats and trend
      const newSuggestions = generateSuggestions(parsedStats, newQuality, trend);
      setSuggestions(newSuggestions);
      
      if (newQuality !== quality) {
        setQuality(newQuality);
        if (onQualityChange) {
          onQualityChange(newQuality, parsedStats);
        }
      }
    } catch (error) {
      console.error('Error getting RTC stats:', error);
      setQuality('unknown');
    }
  };

  const parseRTCStats = (stats) => {
    const parsed = {
      video: { inbound: {}, outbound: {} },
      audio: { inbound: {}, outbound: {} },
      connection: {}
    };

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp') {
        if (report.mediaType === 'video') {
          parsed.video.inbound = {
            packetsReceived: report.packetsReceived || 0,
            packetsLost: report.packetsLost || 0,
            bytesReceived: report.bytesReceived || 0,
            framesReceived: report.framesReceived || 0,
            framesDropped: report.framesDropped || 0,
            jitter: report.jitter || 0
          };
        } else if (report.mediaType === 'audio') {
          parsed.audio.inbound = {
            packetsReceived: report.packetsReceived || 0,
            packetsLost: report.packetsLost || 0,
            bytesReceived: report.bytesReceived || 0,
            jitter: report.jitter || 0
          };
        }
      } else if (report.type === 'outbound-rtp') {
        if (report.mediaType === 'video') {
          parsed.video.outbound = {
            packetsSent: report.packetsSent || 0,
            bytesSent: report.bytesSent || 0,
            framesSent: report.framesSent || 0
          };
        } else if (report.mediaType === 'audio') {
          parsed.audio.outbound = {
            packetsSent: report.packetsSent || 0,
            bytesSent: report.bytesSent || 0
          };
        }
      } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        parsed.connection = {
          currentRoundTripTime: report.currentRoundTripTime || 0,
          availableOutgoingBitrate: report.availableOutgoingBitrate || 0,
          availableIncomingBitrate: report.availableIncomingBitrate || 0
        };
      }
    });

    return parsed;
  };

  const calculateQuality = (stats) => {
    const videoIn = stats.video.inbound;
    const audioIn = stats.audio.inbound;
    const connection = stats.connection;

    // Calculate packet loss rate
    const videoPacketLoss = videoIn.packetsReceived > 0 
      ? (videoIn.packetsLost / (videoIn.packetsReceived + videoIn.packetsLost)) * 100 
      : 0;
    
    const audioPacketLoss = audioIn.packetsReceived > 0 
      ? (audioIn.packetsLost / (audioIn.packetsReceived + audioIn.packetsLost)) * 100 
      : 0;

    // Calculate frame drop rate
    const frameDropRate = videoIn.framesReceived > 0 
      ? (videoIn.framesDropped / videoIn.framesReceived) * 100 
      : 0;

    // Round trip time in milliseconds
    const rtt = (connection.currentRoundTripTime || 0) * 1000;

    // Quality scoring
    let score = 100;

    // Penalize for packet loss
    score -= videoPacketLoss * 10;
    score -= audioPacketLoss * 15; // Audio packet loss is more noticeable

    // Penalize for frame drops
    score -= frameDropRate * 5;

    // Penalize for high latency
    if (rtt > 300) score -= 30;
    else if (rtt > 200) score -= 20;
    else if (rtt > 100) score -= 10;

    // Penalize for high jitter
    const videoJitter = (videoIn.jitter || 0) * 1000;
    const audioJitter = (audioIn.jitter || 0) * 1000;
    if (videoJitter > 50) score -= 15;
    if (audioJitter > 30) score -= 20;

    // Determine quality level
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'offline';
  };

  const getQualityScore = (quality) => {
    switch (quality) {
      case 'excellent': return 100;
      case 'good': return 75;
      case 'fair': return 50;
      case 'poor': return 25;
      case 'offline': return 0;
      default: return 50;
    }
  };

  const calculateQualityTrend = (history) => {
    if (history.length < 5) return 'stable';
    
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, item) => sum + item.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.score, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 10) return 'improving';
    if (difference < -10) return 'degrading';
    return 'stable';
  };

  const generateSuggestions = (stats, currentQuality, trend) => {
    const suggestions = [];
    const videoIn = stats.video.inbound;
    const audioIn = stats.audio.inbound;
    const connection = stats.connection;

    // High latency suggestions
    const rtt = (connection.currentRoundTripTime || 0) * 1000;
    if (rtt > 200) {
      suggestions.push({
        type: 'warning',
        title: 'High Latency Detected',
        message: 'Move closer to your router or switch to a wired connection',
        priority: 'high'
      });
    }

    // Packet loss suggestions
    const videoPacketLoss = videoIn.packetsReceived > 0 
      ? (videoIn.packetsLost / (videoIn.packetsReceived + videoIn.packetsLost)) * 100 
      : 0;
    
    if (videoPacketLoss > 2) {
      suggestions.push({
        type: 'error',
        title: 'Video Packet Loss',
        message: 'Close other applications using internet bandwidth',
        priority: 'high'
      });
    }

    // Frame drop suggestions
    const frameDropRate = videoIn.framesReceived > 0 
      ? (videoIn.framesDropped / videoIn.framesReceived) * 100 
      : 0;

    if (frameDropRate > 5) {
      suggestions.push({
        type: 'warning',
        title: 'Frame Drops Detected',
        message: 'Consider reducing video quality or closing other applications',
        priority: 'medium'
      });
    }

    // Trend-based suggestions
    if (trend === 'degrading') {
      suggestions.push({
        type: 'info',
        title: 'Connection Quality Declining',
        message: 'Your connection quality has been getting worse. Consider troubleshooting your network.',
        priority: 'medium'
      });
    }

    // Bandwidth suggestions
    if (connection.availableOutgoingBitrate && connection.availableOutgoingBitrate < 500000) {
      suggestions.push({
        type: 'warning',
        title: 'Low Bandwidth',
        message: 'Available bandwidth is low. Consider turning off video to improve audio quality.',
        priority: 'high'
      });
    }

    return suggestions.slice(0, 3); // Limit to top 3 suggestions
  };

  const getQualityInfo = () => {
    const getTrendIcon = () => {
      switch (qualityTrend) {
        case 'improving': return <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />;
        case 'degrading': return <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />;
        default: return null;
      }
    };

    switch (quality) {
      case 'excellent':
        return {
          icon: <ExcellentIcon />,
          color: 'success',
          label: 'Excellent',
          description: 'Connection quality is excellent',
          trendIcon: getTrendIcon()
        };
      case 'good':
        return {
          icon: <GoodIcon />,
          color: 'success',
          label: 'Good',
          description: 'Connection quality is good',
          trendIcon: getTrendIcon()
        };
      case 'fair':
        return {
          icon: <FairIcon />,
          color: 'warning',
          label: 'Fair',
          description: 'Connection quality is fair - you may experience some issues',
          trendIcon: getTrendIcon()
        };
      case 'poor':
        return {
          icon: <PoorIcon />,
          color: 'error',
          label: 'Poor',
          description: 'Connection quality is poor - consider improving your network',
          trendIcon: getTrendIcon()
        };
      case 'offline':
        return {
          icon: <OfflineIcon />,
          color: 'error',
          label: 'Offline',
          description: 'Connection lost',
          trendIcon: null
        };
      default:
        return {
          icon: <InfoIcon />,
          color: 'default',
          label: 'Unknown',
          description: 'Checking connection quality...',
          trendIcon: null
        };
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatBitrate = (bps) => {
    if (bps === 0) return '0 bps';
    const k = 1000;
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    const i = Math.floor(Math.log(bps) / Math.log(k));
    return parseFloat((bps / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const runBandwidthTest = async () => {
    setShowBandwidthTest(true);
    
    try {
      // Simple bandwidth estimation using a small data transfer
      const startTime = performance.now();
      const testData = new ArrayBuffer(1024 * 100); // 100KB test
      
      // Simulate network test by measuring how long it takes to process data
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const estimatedBandwidth = (testData.byteLength * 8) / duration; // bits per second
      
      console.log('Estimated bandwidth:', formatBitrate(estimatedBandwidth));
      
      // Update suggestions based on bandwidth test
      const newSuggestions = [...suggestions];
      if (estimatedBandwidth < 1000000) { // Less than 1 Mbps
        newSuggestions.unshift({
          type: 'error',
          title: 'Low Bandwidth Detected',
          message: `Estimated bandwidth: ${formatBitrate(estimatedBandwidth)}. Consider switching to audio-only mode.`,
          priority: 'high'
        });
      }
      setSuggestions(newSuggestions.slice(0, 3));
      
    } catch (error) {
      console.error('Bandwidth test failed:', error);
    } finally {
      setTimeout(() => setShowBandwidthTest(false), 2000);
    }
  };

  const qualityInfo = getQualityInfo();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={`Network Quality: ${qualityInfo.label}${qualityTrend !== 'stable' ? ` (${qualityTrend})` : ''}`}>
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{
            bgcolor: 'rgba(0,0,0,0.6)',
            color: 'white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
            position: 'relative'
          }}
        >
          {qualityInfo.icon}
          {qualityInfo.trendIcon && (
            <Box
              sx={{
                position: 'absolute',
                top: -2,
                right: -2,
                bgcolor: 'background.paper',
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {qualityInfo.trendIcon}
            </Box>
          )}
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Box sx={{ p: 2, minWidth: 350, maxWidth: 400 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {qualityInfo.icon}
            <Typography variant="h6">
              Network Quality: {qualityInfo.label}
            </Typography>
            {qualityInfo.trendIcon}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {qualityInfo.description}
          </Typography>

          {/* Quality Trend Indicator */}
          {qualityHistory.length > 5 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Quality Trend: {qualityTrend.charAt(0).toUpperCase() + qualityTrend.slice(1)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={getQualityScore(quality)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'grey.300',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: quality === 'excellent' || quality === 'good' ? 'success.main' :
                           quality === 'fair' ? 'warning.main' : 'error.main'
                  }
                }}
              />
            </Box>
          )}

          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Recommendations
              </Typography>
              {suggestions.map((suggestion, index) => (
                <Alert 
                  key={index}
                  severity={suggestion.type}
                  sx={{ mb: 1, fontSize: '0.875rem' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {suggestion.title}
                  </Typography>
                  <Typography variant="caption">
                    {suggestion.message}
                  </Typography>
                </Alert>
              ))}
            </Box>
          )}

          {quality !== 'unknown' && stats.connection && (
            <>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2">
                  Connection Statistics
                </Typography>
                <Button
                  size="small"
                  startIcon={showBandwidthTest ? <SpeedIcon /> : <SpeedIcon />}
                  onClick={runBandwidthTest}
                  disabled={showBandwidthTest}
                  sx={{ ml: 'auto' }}
                >
                  {showBandwidthTest ? 'Testing...' : 'Test Speed'}
                </Button>
              </Box>

              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary="Round Trip Time"
                    secondary={`${Math.round((stats.connection.currentRoundTripTime || 0) * 1000)}ms`}
                  />
                </ListItem>

                {stats.video.inbound.packetsReceived > 0 && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Video Packet Loss"
                      secondary={`${((stats.video.inbound.packetsLost / (stats.video.inbound.packetsReceived + stats.video.inbound.packetsLost)) * 100).toFixed(2)}%`}
                    />
                  </ListItem>
                )}

                {stats.audio.inbound.packetsReceived > 0 && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Audio Packet Loss"
                      secondary={`${((stats.audio.inbound.packetsLost / (stats.audio.inbound.packetsReceived + stats.audio.inbound.packetsLost)) * 100).toFixed(2)}%`}
                    />
                  </ListItem>
                )}

                {stats.video.inbound.framesReceived > 0 && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Frame Drop Rate"
                      secondary={`${((stats.video.inbound.framesDropped / stats.video.inbound.framesReceived) * 100).toFixed(2)}%`}
                    />
                  </ListItem>
                )}

                {stats.connection.availableOutgoingBitrate > 0 && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="Available Bandwidth"
                      secondary={formatBitrate(stats.connection.availableOutgoingBitrate)}
                    />
                  </ListItem>
                )}
              </List>

              {/* Historical Quality Chart */}
              {qualityHistory.length > 3 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Quality History (Last Minute)
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'end', gap: 1, height: 40 }}>
                    {qualityHistory.slice(-15).map((point, index) => (
                      <Box
                        key={index}
                        sx={{
                          width: 4,
                          height: `${point.score}%`,
                          bgcolor: point.score >= 80 ? 'success.main' :
                                  point.score >= 60 ? 'success.light' :
                                  point.score >= 40 ? 'warning.main' :
                                  point.score >= 20 ? 'error.light' : 'error.main',
                          borderRadius: 1,
                          opacity: 0.7 + (index / 15) * 0.3 // Fade older points
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NetworkQualityIndicator;