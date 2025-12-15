/**
 * Video Call Metrics Dashboard Component
 * Displays call success rates, quality metrics, and performance indicators
 * Requirements: Monitor call success rates and quality metrics
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Refresh,
  Download,
  Security,
  Phone,
  Timer,
  Payment,
  Warning,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

const VideoCallMetricsDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [trendDays, setTrendDays] = useState(7);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchMetrics();
    fetchTrends();
    fetchHealth();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMetrics();
      fetchHealth();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [timeRange, trendDays]);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/video-call-metrics/summary?timeRange=${timeRange}`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const data = await response.json();
      setMetrics(data.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchTrends = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/video-call-metrics/trends?days=${trendDays}`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch trends');
      }
      
      const data = await response.json();
      setTrends(data.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/video-call-metrics/health', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch health status');
      }
      
      const data = await response.json();
      setHealth(data.data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/video-call-metrics/export?format=${format}`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export metrics');
      }
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-call-metrics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-call-metrics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'critical': return <Error color="error" />;
      default: return null;
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return <TrendingUp color="success" />;
      case 'decreasing': return <TrendingDown color="error" />;
      case 'stable': return <TrendingFlat color="action" />;
      default: return null;
    }
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const createTrendChart = () => {
    if (!trends || !trends.trends) return null;

    const data = {
      labels: trends.trends.map(t => new Date(t.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Connection Success Rate',
          data: trends.trends.map(t => t.connectionSuccessRate * 100),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        },
        {
          label: 'Call Drop Rate',
          data: trends.trends.map(t => t.callDropRate * 100),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1
        }
      ]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Performance Trends'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      }
    };

    return <Line data={data} options={options} />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading metrics: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Video Call Metrics Dashboard
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="1h">1 Hour</MenuItem>
              <MenuItem value="24h">24 Hours</MenuItem>
              <MenuItem value="7d">7 Days</MenuItem>
              <MenuItem value="30d">30 Days</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh Data">
            <IconButton onClick={() => { fetchMetrics(); fetchHealth(); }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export CSV">
            <IconButton onClick={() => handleExport('csv')}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Last Updated */}
      {lastUpdated && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          Last updated: {lastUpdated.toLocaleString()}
        </Typography>
      )}

      {/* Overall Health Status */}
      {health && (
        <Alert 
          severity={health.overallStatus === 'healthy' ? 'success' : health.overallStatus === 'warning' ? 'warning' : 'error'}
          sx={{ mb: 3 }}
        >
          <Typography variant="h6">
            System Status: {health.overallStatus.toUpperCase()}
          </Typography>
          {health.issues.length > 0 && (
            <Typography variant="body2">
              {health.issues.length} issue(s) detected
            </Typography>
          )}
        </Alert>
      )}

      {/* Key Metrics Cards */}
      {metrics && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Phone sx={{ mr: 1 }} />
                  <Typography variant="h6">Connection Success</Typography>
                  {getStatusIcon(metrics.metrics.connectionSuccessRate.status)}
                </Box>
                <Typography variant="h4" color={getStatusColor(metrics.metrics.connectionSuccessRate.status)}>
                  {formatPercentage(metrics.metrics.connectionSuccessRate.value)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Target: {formatPercentage(metrics.metrics.connectionSuccessRate.target)}
                </Typography>
                <Typography variant="body2">
                  {metrics.metrics.connectionSuccessRate.count.successful} / {metrics.metrics.connectionSuccessRate.count.total} attempts
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Warning sx={{ mr: 1 }} />
                  <Typography variant="h6">Call Drop Rate</Typography>
                  {getStatusIcon(metrics.metrics.callDropRate.status)}
                </Box>
                <Typography variant="h4" color={getStatusColor(metrics.metrics.callDropRate.status)}>
                  {formatPercentage(metrics.metrics.callDropRate.value)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Target: &lt; {formatPercentage(metrics.metrics.callDropRate.target)}
                </Typography>
                <Typography variant="body2">
                  {metrics.metrics.callDropRate.count.dropped} / {metrics.metrics.callDropRate.count.total} calls
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Timer sx={{ mr: 1 }} />
                  <Typography variant="h6">Avg Connection Time</Typography>
                  {getStatusIcon(metrics.metrics.avgConnectionTime.status)}
                </Box>
                <Typography variant="h4" color={getStatusColor(metrics.metrics.avgConnectionTime.status)}>
                  {formatDuration(metrics.metrics.avgConnectionTime.value)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Target: &lt; {formatDuration(metrics.metrics.avgConnectionTime.target)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Security sx={{ mr: 1 }} />
                  <Typography variant="h6">Security Incidents</Typography>
                  {getStatusIcon(metrics.metrics.securityIncidents.status)}
                </Box>
                <Typography variant="h4" color={getStatusColor(metrics.metrics.securityIncidents.status)}>
                  {metrics.metrics.securityIncidents.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Target: {metrics.metrics.securityIncidents.target}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Additional Metrics */}
      {metrics && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Payment sx={{ mr: 1 }} />
                  <Typography variant="h6">Payment Validation</Typography>
                  {getStatusIcon(metrics.metrics.paymentValidationRate.status)}
                </Box>
                <Typography variant="h4" color={getStatusColor(metrics.metrics.paymentValidationRate.status)}>
                  {formatPercentage(metrics.metrics.paymentValidationRate.value)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Target: {formatPercentage(metrics.metrics.paymentValidationRate.target)}
                </Typography>
                <Typography variant="body2">
                  {metrics.metrics.paymentValidationRate.count.valid} / {metrics.metrics.paymentValidationRate.count.total} validations
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Active Calls</Typography>
                <Typography variant="h4" color="primary">
                  {metrics.activeCalls}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Currently in progress
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Total Sessions</Typography>
                <Typography variant="body2">
                  Attempted: {metrics.totalSessions.attempted}
                </Typography>
                <Typography variant="body2">
                  Successful: {metrics.totalSessions.successful}
                </Typography>
                <Typography variant="body2">
                  Completed: {metrics.totalSessions.completed}
                </Typography>
                <Typography variant="body2">
                  Active: {metrics.totalSessions.active}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Trends Chart */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Performance Trends</Typography>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Days</InputLabel>
                  <Select
                    value={trendDays}
                    label="Days"
                    onChange={(e) => setTrendDays(e.target.value)}
                  >
                    <MenuItem value={7}>7 Days</MenuItem>
                    <MenuItem value={14}>14 Days</MenuItem>
                    <MenuItem value={30}>30 Days</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              {createTrendChart()}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Trend Indicators</Typography>
              {health && health.trends && (
                <Box>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ mr: 1 }}>Connection Success:</Typography>
                    {getTrendIcon(health.trends.connectionSuccessRate)}
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {health.trends.connectionSuccessRate}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ mr: 1 }}>Call Drop Rate:</Typography>
                    {getTrendIcon(health.trends.callDropRate)}
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {health.trends.callDropRate}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 1 }}>Total Calls:</Typography>
                    {getTrendIcon(health.trends.totalCalls)}
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {health.trends.totalCalls}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Issues and Recommendations */}
      {health && health.issues.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>Issues & Recommendations</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    <TableCell>Current</TableCell>
                    <TableCell>Target</TableCell>
                    <TableCell>Severity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {health.issues.map((issue, index) => (
                    <TableRow key={index}>
                      <TableCell>{issue.metric}</TableCell>
                      <TableCell>
                        {typeof issue.current === 'number' && issue.current < 1 
                          ? formatPercentage(issue.current)
                          : issue.current
                        }
                      </TableCell>
                      <TableCell>
                        {typeof issue.target === 'number' && issue.target < 1 
                          ? formatPercentage(issue.target)
                          : issue.target
                        }
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={issue.severity} 
                          color={getStatusColor(issue.severity)} 
                          size="small" 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {health && health.recommendations.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Recommendations</Typography>
            {health.recommendations.map((rec, index) => (
              <Alert 
                key={index} 
                severity={rec.priority === 'critical' ? 'error' : rec.priority === 'high' ? 'warning' : 'info'}
                sx={{ mb: 1 }}
              >
                <Typography variant="body2">
                  <strong>{rec.priority.toUpperCase()}:</strong> {rec.message}
                </Typography>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default VideoCallMetricsDashboard;