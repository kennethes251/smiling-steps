import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Button,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Paper,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Analytics as AnalyticsIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  Compare as CompareIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const HistoricalTrendsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState('transaction_count');
  const [config, setConfig] = useState(null);

  // Filter state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [period, setPeriod] = useState('daily');

  // Chart colors
  const colors = {
    primary: '#1976d2',
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f',
    info: '#0288d1',
    secondary: '#9c27b0'
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (config) {
      fetchAnalytics();
    }
  }, [startDate, endDate, period, config]);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      const response = await axios.get(
        'https://smiling-steps.onrender.com/api/trends/config',
        config
      );

      setConfig(response.data.config);
    } catch (err) {
      console.error('Error fetching config:', err);
      setError('Failed to load configuration');
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      const params = new URLSearchParams({
        startDate,
        endDate,
        period
      });

      const response = await axios.get(
        `https://smiling-steps.onrender.com/api/trends/analytics?${params}`,
        config
      );

      setAnalytics(response.data.analytics);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportTrend = async (metric) => {
    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      };

      const params = new URLSearchParams({
        startDate,
        endDate,
        period
      });

      const response = await axios.get(
        `https://smiling-steps.onrender.com/api/trends/export/${metric}?${params}`,
        config
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mpesa-trend-${metric}-${startDate}-to-${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting trend:', err);
      alert('Failed to export trend data');
    }
  };

  const formatValue = (value, metric) => {
    switch (metric) {
      case 'revenue':
      case 'average_amount':
        return `KES ${value.toLocaleString()}`;
      case 'success_rate':
      case 'failure_rate':
        return `${value.toFixed(1)}%`;
      case 'processing_time':
        return `${value.toFixed(1)}s`;
      default:
        return value.toLocaleString();
    }
  };

  const getMetricColor = (metric) => {
    switch (metric) {
      case 'transaction_count':
        return colors.primary;
      case 'revenue':
        return colors.success;
      case 'success_rate':
        return colors.success;
      case 'failure_rate':
        return colors.error;
      case 'processing_time':
        return colors.warning;
      case 'average_amount':
        return colors.info;
      default:
        return colors.primary;
    }
  };

  const getTrendIcon = (growthRate) => {
    if (growthRate > 0) {
      return <TrendingUpIcon sx={{ color: colors.success }} />;
    } else if (growthRate < 0) {
      return <TrendingDownIcon sx={{ color: colors.error }} />;
    }
    return null;
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'positive':
        return <SuccessIcon sx={{ color: colors.success }} />;
      case 'warning':
        return <WarningIcon sx={{ color: colors.warning }} />;
      case 'info':
        return <InfoIcon sx={{ color: colors.info }} />;
      default:
        return <InfoIcon sx={{ color: colors.info }} />;
    }
  };

  const StatCard = ({ title, value, subtitle, trend, color, icon }) => (
    <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                {getTrendIcon(trend)}
                <Typography 
                  variant="body2" 
                  sx={{ 
                    ml: 0.5, 
                    color: trend > 0 ? colors.success : trend < 0 ? colors.error : 'textSecondary' 
                  }}
                >
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.7 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const TrendChart = ({ data, metric, title }) => {
    const chartData = data?.map(item => ({
      period: item.period,
      value: item.value,
      ...item.metrics
    })) || [];

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {title}
            </Typography>
            <Tooltip title="Export to CSV">
              <IconButton onClick={() => handleExportTrend(metric)} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip 
                formatter={(value) => [formatValue(value, metric), title]}
                labelStyle={{ color: '#666' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={getMetricColor(metric)} 
                strokeWidth={2}
                dot={{ fill: getMetricColor(metric), strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const InsightsPanel = ({ insights }) => (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
          <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Insights & Recommendations
        </Typography>
        
        {insights?.insights?.length > 0 ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              Key Insights
            </Typography>
            {insights.insights.map((insight, index) => (
              <Box key={index} display="flex" alignItems="flex-start" mb={2}>
                {getInsightIcon(insight.type)}
                <Box ml={1}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {insight.message}
                  </Typography>
                  <Chip 
                    label={`${insight.category} - ${insight.impact} impact`}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography color="textSecondary">No insights available for this period</Typography>
        )}

        {insights?.recommendations?.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              Recommendations
            </Typography>
            {insights.recommendations.map((rec, index) => (
              <Box key={index} mb={1}>
                <Typography variant="body2">
                  • {rec.message}
                </Typography>
                <Chip 
                  label={`${rec.priority} priority`}
                  size="small"
                  color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'default'}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );

  if (loading && !analytics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Historical Trends Analysis
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Analyze payment trends and patterns over time
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Period</InputLabel>
                <Select
                  value={period}
                  label="Period"
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  {config?.timePeriods?.map(p => (
                    <MenuItem key={p} value={p}>
                      {config.timePeriodsDescription[p]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={fetchAnalytics}
                fullWidth
                disabled={loading}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {analytics && (
        <>
          {/* Summary Statistics */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Transactions"
                value={analytics.overallMetrics.totalTransactions.toLocaleString()}
                trend={analytics.trends.transactions.statistics.growthRate}
                color={colors.primary}
                icon={<AnalyticsIcon sx={{ fontSize: 40 }} />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Revenue"
                value={`KES ${analytics.overallMetrics.totalRevenue.toLocaleString()}`}
                trend={analytics.trends.revenue.statistics.growthRate}
                color={colors.success}
                icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Success Rate"
                value={`${analytics.overallMetrics.successRate.toFixed(1)}%`}
                trend={analytics.trends.successRate.statistics.growthRate}
                color={colors.success}
                icon={<SuccessIcon sx={{ fontSize: 40 }} />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Avg Processing Time"
                value={`${analytics.overallMetrics.averageProcessingTime.toFixed(1)}s`}
                trend={analytics.trends.processingTime.statistics.growthRate}
                color={colors.warning}
                icon={<InfoIcon sx={{ fontSize: 40 }} />}
              />
            </Grid>
          </Grid>

          {/* Trend Charts */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <TrendChart
                data={analytics.trends.transactions.data}
                metric="transaction_count"
                title="Transaction Volume Trend"
              />
              <TrendChart
                data={analytics.trends.revenue.data}
                metric="revenue"
                title="Revenue Trend"
              />
              <TrendChart
                data={analytics.trends.successRate.data}
                metric="success_rate"
                title="Success Rate Trend"
              />
            </Grid>
            <Grid item xs={12} lg={4}>
              <InsightsPanel insights={analytics.insights} />
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default HistoricalTrendsDashboard;