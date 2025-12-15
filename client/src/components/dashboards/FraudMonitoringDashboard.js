/**
 * Fraud Monitoring Dashboard
 * Real-time fraud detection metrics and alerts
 * Requirements: 19.1-19.6, 20.1-20.7
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Security,
  Warning,
  Block,
  CheckCircle,
  TrendingUp,
  Refresh,
  Search,
  Visibility,
  GetApp
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const FraudMonitoringDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    riskLevel: 'all',
    timeRange: '24h',
    status: 'all'
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [filters]);

  const loadDashboardData = async () => {
    try {
      const [metricsRes, transactionsRes, alertsRes] = await Promise.all([
        fetch('/api/fraud/metrics'),
        fetch(`/api/fraud/transactions?${new URLSearchParams(filters)}`),
        fetch('/api/fraud/alerts')
      ]);

      const metricsData = await metricsRes.json();
      const transactionsData = await transactionsRes.json();
      const alertsData = await alertsRes.json();

      setMetrics(metricsData);
      setTransactions(transactionsData);
      setAlerts(alertsData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load fraud dashboard data:', error);
      setLoading(false);
    }
  };

  const handleTransactionAction = async (transactionId, action) => {
    try {
      await fetch(`/api/fraud/transactions/${transactionId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      loadDashboardData(); // Refresh data
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Failed to perform transaction action:', error);
    }
  };

  const exportReport = async () => {
    try {
      const response = await fetch('/api/fraud/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fraud-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const getRiskColor = (riskScore) => {
    if (riskScore >= 90) return 'error';
    if (riskScore >= 70) return 'warning';
    if (riskScore >= 40) return 'info';
    return 'success';
  };

  const getRiskLabel = (riskScore) => {
    if (riskScore >= 90) return 'Critical';
    if (riskScore >= 70) return 'High';
    if (riskScore >= 40) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Fraud Monitoring Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  const pieData = [
    { name: 'Low Risk (0-39)', value: metrics?.riskDistribution?.low || 0, color: '#4caf50' },
    { name: 'Medium Risk (40-69)', value: metrics?.riskDistribution?.medium || 0, color: '#2196f3' },
    { name: 'High Risk (70-89)', value: metrics?.riskDistribution?.high || 0, color: '#ff9800' },
    { name: 'Critical Risk (90-100)', value: metrics?.riskDistribution?.critical || 0, color: '#f44336' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Fraud Monitoring Dashboard
        </Typography>
        <Box>
          <Button
            startIcon={<Refresh />}
            onClick={loadDashboardData}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            startIcon={<GetApp />}
            onClick={exportReport}
            variant="outlined"
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {/* Alert Banner */}
      {alerts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {alerts.length} active fraud alert(s) require attention
        </Alert>
      )}

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Security color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Transactions
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.totalTransactions || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Block color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Blocked Transactions
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.blockedTransactions || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Warning color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Under Review
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.underReview || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Detection Rate
                  </Typography>
                  <Typography variant="h4">
                    {((metrics?.detectionRate || 0) * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Model Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Model Performance
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Precision
                  </Typography>
                  <Typography variant="h6">
                    {((metrics?.modelMetrics?.precision || 0) * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Recall
                  </Typography>
                  <Typography variant="h6">
                    {((metrics?.modelMetrics?.recall || 0) * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    F1 Score
                  </Typography>
                  <Typography variant="h6">
                    {((metrics?.modelMetrics?.f1Score || 0) * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    False Positive Rate
                  </Typography>
                  <Typography variant="h6">
                    {((metrics?.modelMetrics?.falsePositiveRate || 0) * 100).toFixed(1)}%
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Risk Score Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different views */}
      <Card>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="High Risk Transactions" />
          <Tab label="Recent Alerts" />
          <Tab label="Blocked Users" />
        </Tabs>

        <CardContent>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              select
              label="Risk Level"
              value={filters.riskLevel}
              onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="critical">Critical (90+)</MenuItem>
              <MenuItem value="high">High (70-89)</MenuItem>
              <MenuItem value="medium">Medium (40-69)</MenuItem>
              <MenuItem value="low">Low (0-39)</MenuItem>
            </TextField>

            <TextField
              select
              label="Time Range"
              value={filters.timeRange}
              onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </TextField>

            <TextField
              select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
              <MenuItem value="review">Under Review</MenuItem>
              <MenuItem value="allowed">Allowed</MenuItem>
            </TextField>
          </Box>

          {/* Transaction Table */}
          {tabValue === 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Risk Score</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{transaction.userEmail}</TableCell>
                      <TableCell>KES {transaction.amount}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${transaction.riskScore} - ${getRiskLabel(transaction.riskScore)}`}
                          color={getRiskColor(transaction.riskScore)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.status}
                          color={transaction.status === 'BLOCKED' ? 'error' : 
                                 transaction.status === 'REVIEW' ? 'warning' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedTransaction(transaction)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Alerts Tab */}
          {tabValue === 1 && (
            <Box>
              {alerts.map((alert, index) => (
                <Alert key={index} severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">{alert.title}</Typography>
                  <Typography variant="body2">{alert.description}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {new Date(alert.timestamp).toLocaleString()}
                  </Typography>
                </Alert>
              ))}
            </Box>
          )}

          {/* Blocked Users Tab */}
          {tabValue === 2 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Phone Number</TableCell>
                    <TableCell>Blocked Date</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics?.blockedUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phoneNumber}</TableCell>
                      <TableCell>
                        {new Date(user.blockedDate).toLocaleString()}
                      </TableCell>
                      <TableCell>{user.reason}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleTransactionAction(user.id, 'unblock')}
                        >
                          Unblock
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

      {/* Transaction Detail Dialog */}
      <Dialog
        open={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Transaction Analysis Details</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Risk Score</Typography>
                  <Chip
                    label={`${selectedTransaction.riskScore} - ${getRiskLabel(selectedTransaction.riskScore)}`}
                    color={getRiskColor(selectedTransaction.riskScore)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip label={selectedTransaction.status} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Risk Factors</Typography>
                  {selectedTransaction.riskFactors?.map((factor, index) => (
                    <Chip key={index} label={factor} size="small" sx={{ mr: 1, mb: 1 }} />
                  ))}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">User History</Typography>
                  <Typography variant="body2">
                    Previous transactions: {selectedTransaction.userHistory?.transactionCount || 0}
                  </Typography>
                  <Typography variant="body2">
                    Average amount: KES {selectedTransaction.userHistory?.averageAmount || 0}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedTransaction?.status === 'REVIEW' && (
            <>
              <Button
                onClick={() => handleTransactionAction(selectedTransaction.id, 'approve')}
                color="success"
              >
                Approve
              </Button>
              <Button
                onClick={() => handleTransactionAction(selectedTransaction.id, 'block')}
                color="error"
              >
                Block
              </Button>
            </>
          )}
          <Button onClick={() => setSelectedTransaction(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FraudMonitoringDashboard;