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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  TextField,
  MenuItem,
  Button,
  Pagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  HourglassEmpty as ProcessingIcon
} from '@mui/icons-material';

const AdminPaymentDashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Filter and pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchPaymentData();
  }, [page, status, startDate, endDate]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      // Fetch transactions and stats in parallel
      const [transactionsRes, statsRes] = await Promise.all([
        axios.get(`https://smiling-steps.onrender.com/api/admin/payments?${params}`, config),
        axios.get(`https://smiling-steps.onrender.com/api/admin/payments/stats?${params}`, config)
      ]);

      setTransactions(transactionsRes.data.transactions || []);
      setTotalPages(transactionsRes.data.pagination?.pages || 1);
      setStats(statsRes.data.stats || {});
      setError(null);
    } catch (err) {
      console.error('Error fetching payment data:', err);
      setError(err.response?.data?.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchPaymentData();
  };

  const handleReset = () => {
    setSearch('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleViewDetails = async (transactionId) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      const response = await axios.get(
        `https://smiling-steps.onrender.com/api/admin/payments/${transactionId}`,
        config
      );

      setSelectedTransaction(response.data.payment);
      setDetailsOpen(true);
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      alert('Failed to load transaction details');
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      };

      // Build query parameters
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await axios.get(
        `https://smiling-steps.onrender.com/api/admin/payments/export?${params}`,
        config
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mpesa-transactions-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export transactions');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Failed':
        return 'error';
      case 'Processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid':
        return <SuccessIcon fontSize="small" />;
      case 'Failed':
        return <ErrorIcon fontSize="small" />;
      case 'Processing':
        return <ProcessingIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.7 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading && !transactions.length) {
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
          M-Pesa Payment Management
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Monitor and manage all M-Pesa transactions
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Transactions"
              value={stats.totalTransactions || 0}
              icon={<MoneyIcon sx={{ fontSize: 40 }} />}
              color="#1976d2"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Successful Payments"
              value={stats.successfulPayments || 0}
              icon={<SuccessIcon sx={{ fontSize: 40 }} />}
              color="#2e7d32"
              subtitle={`${stats.successRate || 0}% success rate`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Failed Payments"
              value={stats.failedPayments || 0}
              icon={<ErrorIcon sx={{ fontSize: 40 }} />}
              color="#d32f2f"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Revenue"
              value={`KES ${(stats.totalRevenue || 0).toLocaleString()}`}
              icon={<MoneyIcon sx={{ fontSize: 40 }} />}
              color="#9c27b0"
            />
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                placeholder="Client, therapist, or transaction ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  endAdornment: <SearchIcon color="action" />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                select
                size="small"
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Failed">Failed</MenuItem>
                <MenuItem value="Processing">Processing</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
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
            <Grid item xs={12} md={2}>
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
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  startIcon={<FilterIcon />}
                  onClick={handleSearch}
                  fullWidth
                >
                  Filter
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleReset}
                >
                  Reset
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Transactions ({transactions.length})
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchPaymentData}
                size="small"
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExportCSV}
                size="small"
              >
                Export CSV
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Transaction ID</strong></TableCell>
                  <TableCell><strong>Client</strong></TableCell>
                  <TableCell><strong>Therapist</strong></TableCell>
                  <TableCell><strong>Amount</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary">No transactions found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id} hover>
                      <TableCell>
                        {new Date(transaction.paymentVerifiedAt || transaction.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {transaction.transactionID}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{transaction.client?.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {transaction.client?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{transaction.therapist?.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          KES {transaction.amount?.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(transaction.paymentStatus)}
                          label={transaction.paymentStatus}
                          color={getStatusColor(transaction.paymentStatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(transaction.id)}
                          color="primary"
                        >
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Transaction Details
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTransaction && (
            <Box>
              {/* Payment Information */}
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Payment Information
              </Typography>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Transaction ID</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {selectedTransaction.transactionID}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Checkout Request ID</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {selectedTransaction.checkoutRequestID}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Amount</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    KES {selectedTransaction.amount?.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Phone Number</Typography>
                  <Typography variant="body1">{selectedTransaction.phoneNumber}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <Chip
                    label={selectedTransaction.payment?.status}
                    color={getStatusColor(selectedTransaction.payment?.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Result</Typography>
                  <Typography variant="body2">{selectedTransaction.payment?.resultDesc}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Client Information */}
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Client Information
              </Typography>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Name</Typography>
                  <Typography variant="body1">{selectedTransaction.client?.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Email</Typography>
                  <Typography variant="body1">{selectedTransaction.client?.email}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Therapist Information */}
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Therapist Information
              </Typography>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Name</Typography>
                  <Typography variant="body1">{selectedTransaction.therapist?.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Email</Typography>
                  <Typography variant="body1">{selectedTransaction.therapist?.email}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Session Information */}
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Session Information
              </Typography>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Session Type</Typography>
                  <Typography variant="body1">{selectedTransaction.session?.type}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Session Date</Typography>
                  <Typography variant="body1">
                    {new Date(selectedTransaction.session?.date).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Timeline */}
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Timeline
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Payment Initiated</Typography>
                  <Typography variant="body1">
                    {selectedTransaction.payment?.initiatedAt 
                      ? new Date(selectedTransaction.payment.initiatedAt).toLocaleString()
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Payment Verified</Typography>
                  <Typography variant="body1">
                    {selectedTransaction.payment?.verifiedAt 
                      ? new Date(selectedTransaction.payment.verifiedAt).toLocaleString()
                      : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>

              {/* Payment Attempts */}
              {selectedTransaction.attempts && selectedTransaction.attempts.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Payment Attempts ({selectedTransaction.attempts.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Timestamp</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Result</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedTransaction.attempts.map((attempt, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {new Date(attempt.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Chip label={attempt.status} size="small" />
                            </TableCell>
                            <TableCell>{attempt.resultDesc || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPaymentDashboard;
