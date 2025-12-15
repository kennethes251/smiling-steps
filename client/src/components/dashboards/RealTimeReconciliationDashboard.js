import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Snackbar
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/api';

const RealTimeReconciliationDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProcessed: 0,
    successfulReconciliations: 0,
    failedReconciliations: 0,
    discrepanciesDetected: 0,
    averageProcessingTime: 0,
    activeReconciliations: 0,
    queueLength: 0,
    connectedClients: 0,
    lastProcessedAt: null
  });
  
  const [recentResults, setRecentResults] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    if (user?.role === 'admin') {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user]);

  const connectWebSocket = () => {
    try {
      const token = localStorage.getItem('token');
      const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:5000'}/ws/real-time-reconciliation?token=${token}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ Real-time reconciliation WebSocket connected');
        setIsConnected(true);
        
        // Request initial stats
        wsRef.current.send(JSON.stringify({ type: 'get_stats' }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ WebSocket message parsing error:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('📡 Real-time reconciliation WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 5 seconds
        if (autoRefresh) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      setIsConnected(false);
    }
  };

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'connected':
        showSnackbar('Connected to real-time reconciliation service', 'success');
        break;

      case 'reconciliation_stats':
        setStats(message.data);
        break;

      case 'reconciliation_result':
        setRecentResults(prev => [message.data, ...prev.slice(0, 19)]); // Keep last 20 results
        
        // Show notification for discrepancies
        if (message.data.status === 'discrepancy') {
          showSnackbar(`Discrepancy detected in session ${message.data.sessionId}`, 'warning');
        }
        break;

      case 'discrepancy_alert':
        setAlerts(prev => [message.data, ...prev.slice(0, 9)]); // Keep last 10 alerts
        showSnackbar(`URGENT: Discrepancy detected in session ${message.data.sessionId}`, 'error');
        break;

      case 'bulk_reconciliation_completed':
        showSnackbar(`Bulk reconciliation completed: ${message.data.results} sessions processed`, 'info');
        break;

      case 'reconciliation_queued':
        showSnackbar(`Session ${message.data.sessionId} queued for reconciliation`, 'info');
        break;

      case 'pong':
        // Keep-alive response
        break;

      case 'error':
        showSnackbar(`WebSocket error: ${message.message}`, 'error');
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Manual reconciliation
  const handleReconcileSession = async () => {
    if (!sessionId.trim()) {
      showSnackbar('Please enter a session ID', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/real-time-reconciliation/session/${sessionId}`, {
        trigger: 'manual_dashboard'
      });

      if (response.data.success) {
        showSnackbar('Reconciliation completed successfully', 'success');
        setSessionId('');
      }
    } catch (error) {
      console.error('❌ Manual reconciliation error:', error);
      showSnackbar(error.response?.data?.msg || 'Reconciliation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Queue session for reconciliation via WebSocket
  const handleQueueSession = () => {
    if (!sessionId.trim()) {
      showSnackbar('Please enter a session ID', 'warning');
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reconcile_session',
        sessionId: sessionId.trim()
      }));
      setSessionId('');
    } else {
      showSnackbar('WebSocket not connected', 'error');
    }
  };

  // Refresh stats manually
  const handleRefreshStats = async () => {
    setLoading(true);
    try {
      const response = await api.get('/real-time-reconciliation/stats');
      if (response.data.success) {
        setStats(response.data.stats);
        showSnackbar('Stats refreshed', 'success');
      }
    } catch (error) {
      console.error('❌ Stats refresh error:', error);
      showSnackbar('Failed to refresh stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Send WebSocket ping
  const handlePing = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
      showSnackbar('Ping sent', 'info');
    } else {
      showSnackbar('WebSocket not connected', 'error');
    }
  };

  // Toggle auto-refresh
  const handleAutoRefreshToggle = (event) => {
    setAutoRefresh(event.target.checked);
    
    if (!event.target.checked && wsRef.current) {
      wsRef.current.close();
    } else if (event.target.checked && !isConnected) {
      connectWebSocket();
    }
  };

  // View result details
  const handleViewDetails = (result) => {
    setSelectedResult(result);
    setDetailsOpen(true);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'matched': return 'success';
      case 'discrepancy': return 'error';
      case 'unmatched': return 'warning';
      case 'pending_verification': return 'info';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  // Get severity color for alerts
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Real-Time Payment Reconciliation
      </Typography>

      {/* Connection Status */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          icon={isConnected ? <CheckCircleIcon /> : <ErrorIcon />}
          label={isConnected ? 'Connected' : 'Disconnected'}
          color={isConnected ? 'success' : 'error'}
          variant="outlined"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={autoRefresh}
              onChange={handleAutoRefreshToggle}
              color="primary"
            />
          }
          label="Auto-refresh"
        />

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefreshStats}
          disabled={loading}
        >
          Refresh Stats
        </Button>

        <Button
          variant="outlined"
          onClick={handlePing}
          disabled={!isConnected}
        >
          Ping
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Processed
              </Typography>
              <Typography variant="h4">
                {stats.totalProcessed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Success Rate
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.totalProcessed > 0 
                  ? Math.round((stats.successfulReconciliations / stats.totalProcessed) * 100)
                  : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Discrepancies
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.discrepanciesDetected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Processing Time
              </Typography>
              <Typography variant="h4">
                {Math.round(stats.averageProcessingTime)}ms
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Reconciliations
              </Typography>
              <Typography variant="h4">
                {stats.activeReconciliations}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Queue Length
              </Typography>
              <Typography variant="h4">
                {stats.queueLength}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Connected Clients
              </Typography>
              <Typography variant="h4">
                {stats.connectedClients}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Last Processed
              </Typography>
              <Typography variant="body2">
                {formatTimestamp(stats.lastProcessedAt)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Manual Reconciliation */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Manual Reconciliation
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Session ID"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Enter session ID to reconcile"
              size="small"
              sx={{ flexGrow: 1 }}
            />
            
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={handleReconcileSession}
              disabled={loading || !sessionId.trim()}
            >
              Reconcile Now
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<TimelineIcon />}
              onClick={handleQueueSession}
              disabled={!isConnected || !sessionId.trim()}
            >
              Queue
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Active Alerts
            </Typography>
            
            {alerts.map((alert, index) => (
              <Alert
                key={index}
                severity={getSeverityColor(alert.severity)}
                sx={{ mb: 1 }}
                action={
                  <Button
                    size="small"
                    onClick={() => handleViewDetails(alert)}
                  >
                    View
                  </Button>
                }
              >
                <Typography variant="body2">
                  <strong>Session {alert.sessionId}:</strong> {alert.issues?.map(i => i.message).join(', ')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {formatTimestamp(alert.timestamp)}
                </Typography>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Results */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Reconciliation Results
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Session ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Processing Time</TableCell>
                  <TableCell>Trigger</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="textSecondary">
                        No recent reconciliation results
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {result.sessionId?.toString().slice(-8)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={result.status}
                          color={getStatusColor(result.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{result.sessionDetails?.client || 'N/A'}</TableCell>
                      <TableCell>KES {result.sessionDetails?.amount || 'N/A'}</TableCell>
                      <TableCell>
                        {result.reconciliationMetadata?.processingTime 
                          ? `${result.reconciliationMetadata.processingTime}ms`
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={result.reconciliationMetadata?.trigger || 'unknown'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {formatTimestamp(result.reconciliationMetadata?.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(result)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Reconciliation Details
        </DialogTitle>
        <DialogContent>
          {selectedResult && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Session Information
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Session ID</Typography>
                  <Typography variant="body1" fontFamily="monospace">
                    {selectedResult.sessionId}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <Chip
                    label={selectedResult.status}
                    color={getStatusColor(selectedResult.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Client</Typography>
                  <Typography variant="body1">
                    {selectedResult.sessionDetails?.client || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Psychologist</Typography>
                  <Typography variant="body1">
                    {selectedResult.sessionDetails?.psychologist || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Amount</Typography>
                  <Typography variant="body1">
                    KES {selectedResult.sessionDetails?.amount || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Transaction ID</Typography>
                  <Typography variant="body1" fontFamily="monospace">
                    {selectedResult.sessionDetails?.transactionId || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>

              {selectedResult.issues && selectedResult.issues.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Issues Detected
                  </Typography>
                  {selectedResult.issues.map((issue, index) => (
                    <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        <strong>{issue.type}:</strong> {issue.message}
                      </Typography>
                    </Alert>
                  ))}
                </>
              )}

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Reconciliation Metadata
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Trigger</Typography>
                  <Typography variant="body1">
                    {selectedResult.reconciliationMetadata?.trigger || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Processing Time</Typography>
                  <Typography variant="body1">
                    {selectedResult.reconciliationMetadata?.processingTime 
                      ? `${selectedResult.reconciliationMetadata.processingTime}ms`
                      : 'N/A'
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">Timestamp</Typography>
                  <Typography variant="body1">
                    {formatTimestamp(selectedResult.reconciliationMetadata?.timestamp)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RealTimeReconciliationDashboard;