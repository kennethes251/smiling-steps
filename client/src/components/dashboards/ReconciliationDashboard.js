import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../../config/api';

const ReconciliationDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [reconciliationResults, setReconciliationResults] = useState(null);
  const [orphanedPayments, setOrphanedPayments] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [detailsDialog, setDetailsDialog] = useState({ open: false, data: null });

  useEffect(() => {
    loadSummary();
    loadOrphanedPayments();
  }, []);

  const loadSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reconciliation/summary`, {
        headers: { 'x-auth-token': token }
      });
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const loadOrphanedPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/reconciliation/orphaned`, {
        headers: { 'x-auth-token': token }
      });
      setOrphanedPayments(response.data.orphanedPayments || []);
    } catch (error) {
      console.error('Failed to load orphaned payments:', error);
    }
  };

  const runReconciliation = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/reconciliation/run`,
        dateRange,
        { headers: { 'x-auth-token': token } }
      );
      setReconciliationResults(response.data);
    } catch (error) {
      console.error('Reconciliation failed:', error);
      alert('Failed to run reconciliation: ' + (error.response?.data?.msg || error.message));
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/reconciliation/report`,
        {
          params: dateRange,
          headers: { 'x-auth-token': token },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reconciliation_${dateRange.startDate}_${dateRange.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report');
    }
  };

  const viewDetails = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/reconciliation/session/${sessionId}`,
        { headers: { 'x-auth-token': token } }
      );
      setDetailsDialog({ open: true, data: response.data });
    } catch (error) {
      console.error('Failed to load details:', error);
      alert('Failed to load session details');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'matched':
        return 'success';
      case 'unmatched':
        return 'warning';
      case 'discrepancy':
        return 'error';
      case 'pending_verification':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'matched':
        return <CheckCircleIcon />;
      case 'unmatched':
        return <WarningIcon />;
      case 'discrepancy':
        return <ErrorIcon />;
      case 'pending_verification':
        return <InfoIcon />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Payment Reconciliation
      </Typography>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Today
                </Typography>
                <Typography variant="h5">
                  {summary.today.count} payments
                </Typography>
                <Typography variant="body2">
                  KES {summary.today.totalAmount?.toLocaleString() || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  This Week
                </Typography>
                <Typography variant="h5">
                  {summary.thisWeek.count} payments
                </Typography>
                <Typography variant="body2">
                  KES {summary.thisWeek.totalAmount?.toLocaleString() || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  This Month
                </Typography>
                <Typography variant="h5">
                  {summary.thisMonth.count} payments
                </Typography>
                <Typography variant="body2">
                  KES {summary.thisMonth.totalAmount?.toLocaleString() || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Orphaned Payments
                </Typography>
                <Typography variant="h5" color={orphanedPayments.length > 0 ? 'error' : 'success'}>
                  {orphanedPayments.length}
                </Typography>
                <Typography variant="body2">
                  Require attention
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Reconciliation Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Run Reconciliation
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              onClick={runReconciliation}
              disabled={loading}
            >
              Run Reconciliation
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Reconciliation Results */}
      {reconciliationResults && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Reconciliation Results
            </Typography>
            <Button
              startIcon={<DownloadIcon />}
              onClick={downloadReport}
              variant="outlined"
            >
              Download Report
            </Button>
          </Box>

          {/* Summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={2}>
              <Alert severity="info">
                <Typography variant="body2">Total</Typography>
                <Typography variant="h6">{reconciliationResults.summary.totalTransactions}</Typography>
              </Alert>
            </Grid>
            <Grid item xs={6} md={2}>
              <Alert severity="success">
                <Typography variant="body2">Matched</Typography>
                <Typography variant="h6">{reconciliationResults.summary.matched}</Typography>
              </Alert>
            </Grid>
            <Grid item xs={6} md={2}>
              <Alert severity="warning">
                <Typography variant="body2">Unmatched</Typography>
                <Typography variant="h6">{reconciliationResults.summary.unmatched}</Typography>
              </Alert>
            </Grid>
            <Grid item xs={6} md={2}>
              <Alert severity="error">
                <Typography variant="body2">Discrepancies</Typography>
                <Typography variant="h6">{reconciliationResults.summary.discrepancies}</Typography>
              </Alert>
            </Grid>
            <Grid item xs={6} md={2}>
              <Alert severity="info">
                <Typography variant="body2">Pending</Typography>
                <Typography variant="h6">{reconciliationResults.summary.pendingVerification}</Typography>
              </Alert>
            </Grid>
            <Grid item xs={6} md={2}>
              <Alert severity="info">
                <Typography variant="body2">Total Amount</Typography>
                <Typography variant="h6">KES {reconciliationResults.summary.totalAmount?.toLocaleString()}</Typography>
              </Alert>
            </Grid>
          </Grid>

          {/* Discrepancies Table */}
          {reconciliationResults.results.discrepancies.length > 0 && (
            <>
              <Typography variant="h6" color="error" gutterBottom>
                Discrepancies Requiring Attention
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Session ID</TableCell>
                      <TableCell>Transaction ID</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Issues</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reconciliationResults.results.discrepancies.map((result) => (
                      <TableRow key={result.sessionId}>
                        <TableCell>{result.sessionId}</TableCell>
                        <TableCell>{result.transactionId || 'N/A'}</TableCell>
                        <TableCell>KES {result.amount}</TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(result.status)}
                            label={result.status}
                            color={getStatusColor(result.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {result.issues?.length || 0} issue(s)
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => viewDetails(result.sessionId)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      )}

      {/* Orphaned Payments */}
      {orphanedPayments.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" color="warning.main" gutterBottom>
            Orphaned Payments
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Session ID</TableCell>
                  <TableCell>Transaction ID</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Payment Status</TableCell>
                  <TableCell>Session Status</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orphanedPayments.map((payment) => (
                  <TableRow key={payment.sessionId}>
                    <TableCell>{payment.sessionId}</TableCell>
                    <TableCell>{payment.transactionId}</TableCell>
                    <TableCell>KES {payment.amount}</TableCell>
                    <TableCell>
                      <Chip label={payment.paymentStatus} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={payment.sessionStatus} size="small" />
                    </TableCell>
                    <TableCell>{payment.client}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => viewDetails(payment.sessionId)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Details Dialog */}
      <Dialog
        open={detailsDialog.open}
        onClose={() => setDetailsDialog({ open: false, data: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Session Reconciliation Details</DialogTitle>
        <DialogContent>
          {detailsDialog.data && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Session Information
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Session ID</Typography>
                  <Typography>{detailsDialog.data.session?.id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Client</Typography>
                  <Typography>{detailsDialog.data.session?.client}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Psychologist</Typography>
                  <Typography>{detailsDialog.data.session?.psychologist}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Amount</Typography>
                  <Typography>KES {detailsDialog.data.session?.price}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Payment Status</Typography>
                  <Chip label={detailsDialog.data.session?.paymentStatus} size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Session Status</Typography>
                  <Chip label={detailsDialog.data.session?.status} size="small" />
                </Grid>
              </Grid>

              {detailsDialog.data.issues && detailsDialog.data.issues.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom color="error">
                    Issues Found
                  </Typography>
                  {detailsDialog.data.issues.map((issue, index) => (
                    <Alert key={index} severity="error" sx={{ mb: 1 }}>
                      <Typography variant="body2">{issue.message}</Typography>
                      {issue.type && (
                        <Typography variant="caption" display="block">
                          Type: {issue.type}
                        </Typography>
                      )}
                    </Alert>
                  ))}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog({ open: false, data: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReconciliationDashboard;
