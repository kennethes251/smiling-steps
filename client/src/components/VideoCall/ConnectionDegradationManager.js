import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  Snackbar,
  Typography,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  VideoOff as VideoOffIcon,
  Videocam as VideocamIcon,
  SignalWifi1Bar as PoorSignalIcon,
  SignalWifi2Bar as FairSignalIcon,
  SignalWifi3Bar as GoodSignalIcon,
  SignalWifi4Bar as ExcellentSignalIcon,
  TrendingDown as TrendingDownIcon,
  AutoMode as AutoModeIcon
} from '@mui/icons-material';
import {
  monitorConnectionHealth,
  autoApplyDegradation,
  QUALITY_LEVELS,
  DEGRADATION_STRATEGIES,
  createReconnectionStrategy
} from '../../utils/connectionDegradation';

const ConnectionDegradationManager = ({
  networkStats,
  currentStream,
  currentQuality,
  peerConnection,
  onQualityChange,
  onStreamChange,
  onReconnectNeeded,
  enabled = true
}) => {
  const [degradationState, setDegradationState] = useState({
    isMonitoring: false,
    currentAnalysis: null,
    appliedDegradations: [],
    autoMode: true,
    showSettings: false,
    lastDegradationTime: null,
    consecutivePoorReadings: 0
  });

  const [notifications, setNotifications] = useState([]);
  const [showDegradationDialog, setShowDegradationDialog] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] = useState(null);

  const monitoringIntervalRef = useRef();
  const degradationCooldownRef = useRef();
  const poorConnectionCountRef = useRef(0);

  // Configuration
  const config = {
    monitoringInterval: 3000, // 3 seconds
    degradationCooldown: 10000, // 10 seconds between auto-degradations
    poorConnectionThreshold: 3, // Number of consecutive poor readings before action
    autoReconnectThreshold: 5, // Number of consecutive critical readings before reconnect
    minQuality: 'AUDIO_ONLY'
  };

  useEffect(() => {
    if (enabled && networkStats) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => stopMonitoring();
  }, [enabled, networkStats]);

  const startMonitoring = useCallback(() => {
    if (degradationState.isMonitoring) return;

    setDegradationState(prev => ({ ...prev, isMonitoring: true }));

    monitoringIntervalRef.current = setInterval(() => {
      if (networkStats) {
        analyzeAndAct();
      }
    }, config.monitoringInterval);
  }, [networkStats, degradationState.isMonitoring]);

  const stopMonitoring = useCallback(() => {
    setDegradationState(prev => ({ ...prev, isMonitoring: false }));

    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }

    if (degradationCooldownRef.current) {
      clearTimeout(degradationCooldownRef.current);
      degradationCooldownRef.current = null;
    }
  }, []);

  const analyzeAndAct = useCallback(async () => {
    if (!networkStats || !currentStream) return;

    const analysis = monitorConnectionHealth(networkStats, currentQuality);
    
    setDegradationState(prev => ({
      ...prev,
      currentAnalysis: analysis
    }));

    // Track consecutive poor readings
    if (analysis.quality === 'poor' || analysis.quality === 'offline') {
      poorConnectionCountRef.current += 1;
    } else {
      poorConnectionCountRef.current = 0;
    }

    // Handle critical situations that need immediate action
    if (analysis.quality === 'offline' && poorConnectionCountRef.current >= config.autoReconnectThreshold) {
      handleCriticalConnection();
      return;
    }

    // Auto-apply degradation if enabled and conditions are met
    if (degradationState.autoMode && shouldApplyDegradation(analysis)) {
      await handleAutoDegradation(analysis);
    } else if (analysis.suggestions.length > 0) {
      // Show manual suggestions
      showDegradationSuggestions(analysis);
    }
  }, [networkStats, currentStream, currentQuality, degradationState.autoMode]);

  const shouldApplyDegradation = (analysis) => {
    // Don't auto-degrade if we recently applied one
    if (degradationState.lastDegradationTime && 
        Date.now() - degradationState.lastDegradationTime < config.degradationCooldown) {
      return false;
    }

    // Only auto-degrade for high priority suggestions
    const highPrioritySuggestions = analysis.suggestions.filter(s => 
      s.priority === 'high' || s.priority === 'critical'
    );

    return highPrioritySuggestions.length > 0 && poorConnectionCountRef.current >= config.poorConnectionThreshold;
  };

  const handleAutoDegradation = async (analysis) => {
    try {
      const result = await autoApplyDegradation(
        networkStats,
        currentStream,
        currentQuality,
        peerConnection,
        {
          autoDegrade: true,
          minQuality: config.minQuality
        }
      );

      if (result.applied) {
        const degradationRecord = {
          timestamp: Date.now(),
          fromQuality: currentQuality,
          toQuality: result.newQuality,
          reason: result.reason,
          suggestion: result.suggestion,
          automatic: true
        };

        setDegradationState(prev => ({
          ...prev,
          appliedDegradations: [...prev.appliedDegradations, degradationRecord],
          lastDegradationTime: Date.now()
        }));

        // Notify parent components
        if (onQualityChange) onQualityChange(result.newQuality);
        if (onStreamChange) onStreamChange(currentStream);

        // Show notification
        addNotification({
          type: 'info',
          title: 'Connection Optimized',
          message: result.reason,
          action: 'auto_degradation'
        });

        // Set cooldown
        degradationCooldownRef.current = setTimeout(() => {
          degradationCooldownRef.current = null;
        }, config.degradationCooldown);

      } else {
        console.log('Auto-degradation not applied:', result.reason);
      }
    } catch (error) {
      console.error('Error during auto-degradation:', error);
      addNotification({
        type: 'error',
        title: 'Optimization Failed',
        message: 'Unable to automatically optimize connection quality',
        action: 'auto_degradation_error'
      });
    }
  };

  const showDegradationSuggestions = (analysis) => {
    const highPrioritySuggestion = analysis.suggestions
      .filter(s => s.priority === 'high' || s.priority === 'critical')
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })[0];

    if (highPrioritySuggestion && !pendingSuggestion) {
      setPendingSuggestion(highPrioritySuggestion);
      setShowDegradationDialog(true);
    }
  };

  const handleCriticalConnection = () => {
    addNotification({
      type: 'error',
      title: 'Connection Lost',
      message: 'Your connection appears to be offline. Attempting to reconnect...',
      action: 'critical_connection',
      persistent: true
    });

    if (onReconnectNeeded) {
      const strategy = createReconnectionStrategy('offline', poorConnectionCountRef.current);
      onReconnectNeeded(strategy);
    }
  };

  const handleManualDegradation = async (suggestion) => {
    try {
      const result = await autoApplyDegradation(
        networkStats,
        currentStream,
        currentQuality,
        peerConnection,
        {
          autoDegrade: true,
          minQuality: config.minQuality
        }
      );

      if (result.applied) {
        const degradationRecord = {
          timestamp: Date.now(),
          fromQuality: currentQuality,
          toQuality: result.newQuality,
          reason: result.reason,
          suggestion: suggestion,
          automatic: false
        };

        setDegradationState(prev => ({
          ...prev,
          appliedDegradations: [...prev.appliedDegradations, degradationRecord]
        }));

        // Notify parent components
        if (onQualityChange) onQualityChange(result.newQuality);
        if (onStreamChange) onStreamChange(currentStream);

        addNotification({
          type: 'success',
          title: 'Quality Adjusted',
          message: result.reason,
          action: 'manual_degradation'
        });
      }
    } catch (error) {
      console.error('Error during manual degradation:', error);
      addNotification({
        type: 'error',
        title: 'Adjustment Failed',
        message: 'Unable to adjust connection quality',
        action: 'manual_degradation_error'
      });
    }

    setShowDegradationDialog(false);
    setPendingSuggestion(null);
  };

  const addNotification = (notification) => {
    const id = Date.now();
    const newNotification = {
      ...notification,
      id,
      timestamp: Date.now()
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove non-persistent notifications after 5 seconds
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getQualityIcon = (quality) => {
    switch (quality) {
      case 'excellent': return <ExcellentSignalIcon color="success" />;
      case 'good': return <GoodSignalIcon color="success" />;
      case 'fair': return <FairSignalIcon color="warning" />;
      case 'poor': return <PoorSignalIcon color="error" />;
      default: return <ErrorIcon color="error" />;
    }
  };

  const getSeverityIcon = (priority) => {
    switch (priority) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'high': return <WarningIcon color="warning" />;
      case 'medium': return <InfoIcon color="info" />;
      default: return <CheckCircleIcon color="success" />;
    }
  };

  if (!enabled) return null;

  return (
    <>
      {/* Connection Status Indicator */}
      {degradationState.currentAnalysis && (
        <Box
          sx={{
            position: 'absolute',
            top: 80,
            left: 20,
            zIndex: 1000
          }}
        >
          <Chip
            icon={getQualityIcon(degradationState.currentAnalysis.quality)}
            label={`Connection: ${degradationState.currentAnalysis.quality.toUpperCase()}`}
            size="small"
            sx={{
              bgcolor: 'rgba(0,0,0,0.8)',
              color: 'white',
              '& .MuiChip-icon': { color: 'inherit' }
            }}
          />
          
          {degradationState.currentAnalysis.suggestions.length > 0 && (
            <IconButton
              size="small"
              onClick={() => setDegradationState(prev => ({ ...prev, showSettings: true }))}
              sx={{
                ml: 1,
                bgcolor: 'rgba(255,152,0,0.8)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,152,0,1)' }
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}

      {/* Auto-degradation in progress indicator */}
      {degradationCooldownRef.current && (
        <Box
          sx={{
            position: 'absolute',
            top: 120,
            left: 20,
            right: 20,
            zIndex: 1000
          }}
        >
          <Alert severity="info" sx={{ bgcolor: 'rgba(0,0,0,0.8)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoModeIcon />
              <Typography variant="caption">
                Auto-optimization active - monitoring connection quality
              </Typography>
            </Box>
            <LinearProgress sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)' }} />
          </Alert>
        </Box>
      )}

      {/* Notifications */}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{ mt: 8 }}
        >
          <Alert
            severity={notification.type}
            onClose={() => removeNotification(notification.id)}
            sx={{ minWidth: 300 }}
          >
            <AlertTitle>{notification.title}</AlertTitle>
            {notification.message}
          </Alert>
        </Snackbar>
      ))}

      {/* Manual Degradation Suggestion Dialog */}
      <Dialog
        open={showDegradationDialog}
        onClose={() => setShowDegradationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingDownIcon color="warning" />
          Connection Quality Issue
        </DialogTitle>
        <DialogContent>
          {pendingSuggestion && (
            <Box>
              <Alert severity={pendingSuggestion.priority === 'critical' ? 'error' : 'warning'} sx={{ mb: 2 }}>
                <AlertTitle>
                  {pendingSuggestion.priority === 'critical' ? 'Critical' : 'Recommendation'}
                </AlertTitle>
                {pendingSuggestion.message}
              </Alert>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your connection quality has degraded. We recommend adjusting your video settings to maintain a stable call.
              </Typography>

              {degradationState.currentAnalysis?.metrics && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Current Connection Metrics:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Packet Loss"
                        secondary={`${degradationState.currentAnalysis.metrics.videoPacketLoss.toFixed(1)}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Latency"
                        secondary={`${Math.round(degradationState.currentAnalysis.metrics.rtt)}ms`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Frame Drops"
                        secondary={`${degradationState.currentAnalysis.metrics.frameDropRate.toFixed(1)}%`}
                      />
                    </ListItem>
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDegradationDialog(false)}>
            Keep Current Quality
          </Button>
          <Button
            variant="contained"
            onClick={() => handleManualDegradation(pendingSuggestion)}
            color={pendingSuggestion?.priority === 'critical' ? 'error' : 'warning'}
          >
            Apply Recommendation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Panel */}
      <Dialog
        open={degradationState.showSettings}
        onClose={() => setDegradationState(prev => ({ ...prev, showSettings: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Connection Management Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={degradationState.autoMode}
                  onChange={(e) => setDegradationState(prev => ({ 
                    ...prev, 
                    autoMode: e.target.checked 
                  }))}
                />
              }
              label="Automatic Quality Optimization"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Automatically adjust video quality when connection issues are detected
            </Typography>
          </Box>

          {degradationState.currentAnalysis?.suggestions && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Current Recommendations:
              </Typography>
              <List>
                {degradationState.currentAnalysis.suggestions.map((suggestion, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getSeverityIcon(suggestion.priority)}
                    </ListItemIcon>
                    <ListItemText
                      primary={suggestion.message}
                      secondary={`Priority: ${suggestion.priority}`}
                    />
                    {suggestion.targetQuality && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleManualDegradation(suggestion)}
                      >
                        Apply
                      </Button>
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {degradationState.appliedDegradations.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Recent Quality Adjustments:
              </Typography>
              <List>
                {degradationState.appliedDegradations.slice(-5).reverse().map((degradation, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {degradation.automatic ? <AutoModeIcon /> : <SettingsIcon />}
                    </ListItemIcon>
                    <ListItemText
                      primary={`${degradation.fromQuality} → ${degradation.toQuality}`}
                      secondary={`${degradation.reason} (${degradation.automatic ? 'Automatic' : 'Manual'})`}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(degradation.timestamp).toLocaleTimeString()}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDegradationState(prev => ({ ...prev, showSettings: false }))}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConnectionDegradationManager;