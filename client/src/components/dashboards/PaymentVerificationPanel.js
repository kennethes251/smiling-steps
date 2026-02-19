import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Badge,
  Divider
} from '@mui/material';
import {
  CheckCircle as VerifyIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Payment as PaymentIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import API_URL from '../../config/api';

const PaymentVerificationPanel = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  
  // Dialog states
  const [verifyDialog, setVerifyDialog] = useState({ open: false, session: null });
  const [rejectDialog, setRejectDialog] = useState({ open: false, session: null });
  const [rejectReason, setRejectReason] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      const [paymentsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/manual-payments/pending`, config),
        axios.get(`${API_URL}/api/manual-payments/stats`, config)
      ]);

      setPendingPayments(paymentsRes.data.pendingPayments || []);
      setStats(statsRes.data.stats);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVerify = async () => {
    if (!verifyDialog.session) return;
    
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${API_URL}/api/manual-payments/verify/${verifyDialog.session._id}`,
        { notes: verifyNotes },
        { headers: { 'x-auth-token': token } }
      );
      
      enqueueSnackbar('Payment verified successfully!', { variant: 'success' });
      setVerifyDialog({ open: false, session: null });
      setVerifyNotes('');
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.msg || 'Failed to verify payment', { variant: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.session || !rejectReason.trim()) {
      enqueueSnackbar('Please provide a rejection reason', { variant: 'warning' });
      return;
    }
    
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${API_URL}/api/manual-payments/reject/${rejectDialog.session._id}`,
        { reason: rejectReason },
        { headers: { 'x-auth-token': token } }
      );
      
      enqueueSnackbar('Payment rejected. Client can submit a new code.', { variant: 'info' });
      setRejectDialog({ open: false, session: null });
      setRejectReason('');
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.msg || 'Failed to reject payment', { variant: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    enqueueSnackbar('Copied to clipboard!', { variant: 'info' });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center">
            <Badge badgeContent={pendingPayments.length} color="error" sx={{ mr: 2 }}>
              <PaymentIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            </Badge>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Payment Verification
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {/* Stats */}
        {stats && (
          <Box display="flex" gap={2} mb={3} flexWrap="wrap">
            <Chip 
              icon={<PendingIcon />}
              label={`${stats.pendingVerification} Pending`}
              color="warning"
              variant="outlined"
            />
            <Chip 
              label={`${stats.verifiedToday} Verified Today`}
              color="success"
              variant="outlined"
            />
            <Chip 
              label={`${stats.verifiedThisMonth} This Month`}
              color="info"
              variant="outlined"
            />
            <Chip 
              label={`KSh ${stats.totalRevenue?.toLocaleString() || 0} Total`}
              color="primary"
              variant="outlined"
            />
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Pending Payments Table */}
        {pendingPayments.length === 0 ? (
          <Alert severity="info">
            No payments pending verification. All caught up! 🎉
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Booking Ref</strong></TableCell>
                  <TableCell><strong>Client</strong></TableCell>
                  <TableCell><strong>Psychologist</strong></TableCell>
                  <TableCell><strong>Amount</strong></TableCell>
                  <TableCell><strong>M-Pesa Code</strong></TableCell>
                  <TableCell><strong>Submitted</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingPayments.map((payment) => (
                  <TableRow key={payment._id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {payment.bookingReference}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{payment.client?.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {payment.client?.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{payment.psychologist?.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        KSh {payment.amount?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace', 
                            fontWeight: 'bold',
                            backgroundColor: '#fff3e0',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1
                          }}
                        >
                          {payment.confirmationCode}
                        </Typography>
                        <Tooltip title="Copy code">
                          <IconButton 
                            size="small" 
                            onClick={() => copyToClipboard(payment.confirmationCode)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(payment.submittedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        <Tooltip title="Verify Payment">
                          <IconButton 
                            color="success" 
                            size="small"
                            onClick={() => setVerifyDialog({ open: true, session: payment })}
                          >
                            <VerifyIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject Payment">
                          <IconButton 
                            color="error" 
                            size="small"
                            onClick={() => setRejectDialog({ open: true, session: payment })}
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Verify Dialog */}
        <Dialog open={verifyDialog.open} onClose={() => setVerifyDialog({ open: false, session: null })}>
          <DialogTitle>Verify Payment</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Please verify this M-Pesa code against your M-Pesa statement before confirming.
            </Alert>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">Booking Reference</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {verifyDialog.session?.bookingReference}
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">M-Pesa Code</Typography>
              <Typography variant="h6" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                {verifyDialog.session?.confirmationCode}
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">Amount</Typography>
              <Typography variant="h6" sx={{ color: 'success.main' }}>
                KSh {verifyDialog.session?.amount?.toLocaleString()}
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="Verification Notes (Optional)"
              multiline
              rows={2}
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              placeholder="e.g., Verified against M-Pesa statement dated..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVerifyDialog({ open: false, session: null })}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="success" 
              onClick={handleVerify}
              disabled={processing}
              startIcon={processing ? <CircularProgress size={16} /> : <VerifyIcon />}
            >
              Verify Payment
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, session: null })}>
          <DialogTitle>Reject Payment</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              The client will be notified and can submit a new confirmation code.
            </Alert>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">M-Pesa Code Being Rejected</Typography>
              <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                {rejectDialog.session?.confirmationCode}
              </Typography>
            </Box>
            <TextField
              fullWidth
              required
              label="Rejection Reason"
              multiline
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Code not found in M-Pesa statement, Amount mismatch, etc."
              helperText="This reason will be shared with the client"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectDialog({ open: false, session: null })}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="error" 
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
              startIcon={processing ? <CircularProgress size={16} /> : <RejectIcon />}
            >
              Reject Payment
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PaymentVerificationPanel;
