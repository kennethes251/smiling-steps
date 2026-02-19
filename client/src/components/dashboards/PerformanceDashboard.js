/**
 * Performance Dashboard Component
 * 
 * Displays real-time performance metrics, booking funnel analytics,
 * payment success rates, and system health indicators
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  Payment as PaymentIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeWindow, setTimeWindow] = useState(24);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch performance data
  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      
      const [
        summaryResponse,
        funnelResponse,
        paymentResponse,
        responseTimeResponse,
        alertsResponse
      ] = await Promise.all([
        axios.get('/api/performance-metrics/summary'),
        axios.get(`/api/performance-metrics/booking-funnel?timeWindow=${timeWindow}`),
        axios.get(`/api/performance-metrics/payment-analytics?timeWindow=${timeWindow}`),
        axios.get(`/api/performance-metrics/response-times?timeWindow=${timeWindow}`),
        axios.get('/api/performance-metrics/alerts?limit=10')
      ]);

      setMetrics({
        summary: summaryResponse.data.data,
        funnel: funnelResponse.data.data,
        payments: paymentResponse.data.data,
        responseTimes: responseTimeResponse.data.data
      });
      
      setAlerts(alertsResponse.data.data.alerts);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchPerformanceData();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchPerformanceData, 60000); // Refresh every minute
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeWindow, autoRefresh]);

  // Acknowledge alert
  const acknowledgeAlert = async (alertId) => {
    try {
      await axios.post(`/api/performance-metrics/alerts/${alertId}/acknowledge`);
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      default: return 'default';
    }
  };

  // Get health status color
  const getHealthColor = (value, threshold, inverse = false) => {
    const isGood = inverse ? value < threshold : value > threshold;
    return isGood ? 'success' : 'error';
  };

  // Format response time
  const formatResponseTime = (ms) => {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading && !metrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Performance Dashboard</Typography>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading performance metrics...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchPerformanceData} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Performance Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Window</InputLabel>
            <Select
              value={timeWindow}
              label="Time Window"
              onChange={(e) => setTimeWindow(e.target.value)}
            >
              <MenuItem value={1}>1 Hour</MenuItem>
              <MenuItem value={6}>6 Hours</MenuItem>
              <MenuItem value={24}>24 Hours</MenuItem>
              <MenuItem value={168}>7 Days</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={() => setAutoRefresh(!autoRefresh)}
            color={autoRefresh ? 'primary' : 'default'}
          >
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <IconButton onClick={fetchPerformanceData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Active Alerts */}
      {alerts.filter(alert => !alert.acknowledged).length > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => setAlertDialogOpen(true)}>
              View All ({alerts.filter(alert => !alert.acknowledged).length})
            </Button>
          }
        >
          {alerts.filter(alert => !alert.acknowledged).length} active performance alert(s) require attention
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* System Health Overview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SpeedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                System Health Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color={getHealthColor(parseFloat(metrics?.summary?.bookingConversionRate || 0), 20)}>
                      {metrics?.summary?.bookingConversionRate?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Booking Conversion Rate
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color={getHealthColor(parseFloat(metrics?.summary?.paymentSuccessRate || 0), 90)}>
                      {metrics?.summary?.paymentSuccessRate?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Payment Success Rate
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color={getHealthColor(metrics?.summary?.averageResponseTimes?.bookingPage || 0, 2000, true)}>
                      {formatResponseTime(metrics?.summary?.averageResponseTimes?.bookingPage || 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Booking Page Load
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color={getHealthColor(metrics?.summary?.averageBookingCompletionTime || 0, 300000, true)}>
                      {formatResponseTime(metrics?.summary?.averageBookingCompletionTime || 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Booking Completion
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Booking Funnel Analytics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Booking Funnel ({timeWindow}h)
              </Typography>
              {metrics?.funnel && (
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Conversion Rate: {metrics.funnel.conversionRate}
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[
                      { step: 'Started', count: metrics.funnel.funnelSteps.started },
                      { step: 'Submitted', count: metrics.funnel.funnelSteps.submitted },
                      { step: 'Completed', count: metrics.funnel.funnelSteps.completed }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="step" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#1976d2" />
                    </BarChart>
                  </ResponsiveContainer>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Drop-off Rates:
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Started → Submitted: {metrics.funnel.dropoffRates['started_to_submitted']}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Submitted → Completed: {metrics.funnel.dropoffRates['submitted_to_completed']}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Analytics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <PaymentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Payment Analytics ({timeWindow}h)
              </Typography>
              {metrics?.payments && (
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="h5" color="success.main">
                        {metrics.payments.successfulPayments}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Successful
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="h5" color="error.main">
                        {metrics.payments.failedPayments}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Failed
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {Object.keys(metrics.payments.errorCodeBreakdown).length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Error Breakdown:
                      </Typography>
                      {Object.entries(metrics.payments.errorCodeBreakdown).map(([code, count]) => (
                        <Chip
                          key={code}
                          label={`${code}: ${count}`}
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                          color="error"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Amount: KES {metrics.payments.amountStatistics.totalAmount?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Average: KES {parseFloat(metrics.payments.amountStatistics.averageAmount || 0).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Response Time Analytics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Response Time Analytics ({timeWindow}h)
              </Typography>
              {metrics?.responseTimes && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="h6">Booking Page</Typography>
                      <Typography variant="h4" color={getHealthColor(parseFloat(metrics.responseTimes.averageResponseTimes.bookingPage.replace('ms', '')), 2000, true)}>
                        {metrics.responseTimes.averageResponseTimes.bookingPage}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Threshold: {metrics.responseTimes.thresholds.bookingPage}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          Min: {formatResponseTime(metrics.responseTimes.detailedStats.bookingPage.min)} | 
                          Max: {formatResponseTime(metrics.responseTimes.detailedStats.bookingPage.max)} | 
                          P95: {formatResponseTime(metrics.responseTimes.detailedStats.bookingPage.p95)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="h6">Booking Submission</Typography>
                      <Typography variant="h4" color={getHealthColor(parseFloat(metrics.responseTimes.averageResponseTimes.bookingSubmission.replace('ms', '')), 1000, true)}>
                        {metrics.responseTimes.averageResponseTimes.bookingSubmission}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Threshold: {metrics.responseTimes.thresholds.bookingSubmission}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          Min: {formatResponseTime(metrics.responseTimes.detailedStats.bookingSubmission.min)} | 
                          Max: {formatResponseTime(metrics.responseTimes.detailedStats.bookingSubmission.max)} | 
                          P95: {formatResponseTime(metrics.responseTimes.detailedStats.bookingSubmission.p95)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="h6">M-Pesa Initiation</Typography>
                      <Typography variant="h4" color={getHealthColor(parseFloat(metrics.responseTimes.averageResponseTimes.mpesaInitiation.replace('ms', '')), 3000, true)}>
                        {metrics.responseTimes.averageResponseTimes.mpesaInitiation}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Threshold: {metrics.responseTimes.thresholds.mpesaInitiation}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          Min: {formatResponseTime(metrics.responseTimes.detailedStats.mpesaInitiation.min)} | 
                          Max: {formatResponseTime(metrics.responseTimes.detailedStats.mpesaInitiation.max)} | 
                          P95: {formatResponseTime(metrics.responseTimes.detailedStats.mpesaInitiation.p95)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Alerts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Recent Alerts
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setAlertDialogOpen(true)}
                >
                  View All
                </Button>
              </Box>
              
              {alerts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography variant="body1" color="textSecondary">
                    No recent alerts - system is running smoothly
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Message</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {alerts.slice(0, 5).map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            {new Date(alert.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>{alert.type}</TableCell>
                          <TableCell>
                            <Chip
                              label={alert.severity}
                              size="small"
                              color={getSeverityColor(alert.severity)}
                            />
                          </TableCell>
                          <TableCell>{alert.message}</TableCell>
                          <TableCell>
                            {alert.acknowledged ? (
                              <Chip label="Acknowledged" size="small" color="success" />
                            ) : (
                              <Chip label="Active" size="small" color="warning" />
                            )}
                          </TableCell>
                          <TableCell>
                            {!alert.acknowledged && (
                              <Button
                                size="small"
                                onClick={() => acknowledgeAlert(alert.id)}
                              >
                                Acknowledge
                              </Button>
                            )}
                            <Button
                              size="small"
                              onClick={() => {
                                setSelectedAlert(alert);
                                setAlertDialogOpen(true);
                              }}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert Details Dialog */}
      <Dialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Performance Alerts
          {selectedAlert && ` - ${selectedAlert.type}`}
        </DialogTitle>
        <DialogContent>
          {selectedAlert ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Alert Details
              </Typography>
              <Typography><strong>Type:</strong> {selectedAlert.type}</Typography>
              <Typography><strong>Severity:</strong> {selectedAlert.severity}</Typography>
              <Typography><strong>Message:</strong> {selectedAlert.message}</Typography>
              <Typography><strong>Time:</strong> {new Date(selectedAlert.timestamp).toLocaleString()}</Typography>
              
              {selectedAlert.details && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>Details</Typography>
                  {Object.entries(selectedAlert.details).map(([key, value]) => (
                    <Typography key={key}>
                      <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> {value}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>{new Date(alert.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{alert.type}</TableCell>
                      <TableCell>
                        <Chip
                          label={alert.severity}
                          size="small"
                          color={getSeverityColor(alert.severity)}
                        />
                      </TableCell>
                      <TableCell>
                        {alert.acknowledged ? (
                          <Chip label="Acknowledged" size="small" color="success" />
                        ) : (
                          <Chip label="Active" size="small" color="warning" />
                        )}
                      </TableCell>
                      <TableCell>
                        {!alert.acknowledged && (
                          <Button
                            size="small"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          size="small"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAlertDialogOpen(false);
            setSelectedAlert(null);
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PerformanceDashboard;