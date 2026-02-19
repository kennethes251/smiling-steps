/**
 * PendingRescheduleRequests Component
 * 
 * Displays pending reschedule requests for therapists to approve/reject.
 * Requirements: 9.2 from Cancellation & Rescheduling
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const PendingRescheduleRequests = ({ onRequestHandled }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectDialog, setRejectDialog] = useState({ open: false, sessionId: null });
  const [rejectReason, setRejectReason] = useState('');

  const fetchPendingRequests = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const response = await axios.get(`${API_BASE_URL}/api/reschedule/pending`, config);
      setRequests(response.data);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
      enqueueSnackbar('Failed to load pending requests', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handleApprove = async (sessionId) => {
    setActionLoading(sessionId);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const response = await axios.post(`${API_BASE_URL}/api/sessions/${sessionId}/reschedule/approve`, {}, config);
      enqueueSnackbar(response.data.message, { variant: 'success' });
      setRequests(prev => prev.filter(r => r.sessionId !== sessionId));
      if (onRequestHandled) onRequestHandled();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to approve', { variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      enqueueSnackbar('Please provide a reason for rejection', { variant: 'warning' });
      return;
    }

    setActionLoading(rejectDialog.sessionId);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const response = await axios.post(`${API_BASE_URL}/api/sessions/${rejectDialog.sessionId}/reschedule/reject`, {
        reason: rejectReason
      }, config);
      enqueueSnackbar(response.data.message, { variant: 'success' });
      setRequests(prev => prev.filter(r => r.sessionId !== rejectDialog.sessionId));
      setRejectDialog({ open: false, sessionId: null });
      setRejectReason('');
      if (onRequestHandled) onRequestHandled();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to reject', { variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUrgencyColor = (hoursUntil) => {
    if (hoursUntil < 6) return 'error';
    if (hoursUntil < 12) return 'warning';
    return 'info';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (requests.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No pending reschedule requests
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={requests.length} color="warning">
            <ScheduleIcon />
          </Badge>
          Pending Reschedule Requests
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchPendingRequests} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {requests.map((request) => (
        <Card key={request.sessionId} sx={{ mb: 2 }} variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="action" />
                <Typography variant="subtitle1" fontWeight="bold">
                  {request.client?.name || 'Client'}
                </Typography>
              </Box>
              <Chip
                icon={<AccessTimeIcon />}
                label={`${Math.round(request.hoursUntilCurrentSession)} hrs until session`}
                color={getUrgencyColor(request.hoursUntilCurrentSession)}
                size="small"
              />
            </Box>

            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, my: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Current Date
                </Typography>
                <Typography variant="body2">
                  {formatDate(request.currentDate)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Requested New Date
                </Typography>
                <Typography variant="body2" color="primary.main" fontWeight="bold">
                  {formatDate(request.requestedNewDate)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Reason
              </Typography>
              <Typography variant="body2">
                {request.reason?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Typography>
            </Box>

            {request.notes && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  "{request.notes}"
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => setRejectDialog({ open: true, sessionId: request.sessionId })}
                disabled={actionLoading === request.sessionId}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={actionLoading === request.sessionId ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                onClick={() => handleApprove(request.sessionId)}
                disabled={actionLoading === request.sessionId}
              >
                Approve
              </Button>
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* Reject Dialog */}
      <Dialog 
        open={rejectDialog.open} 
        onClose={() => setRejectDialog({ open: false, sessionId: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Reschedule Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this reschedule request. The client will be notified.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason *"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., The requested time conflicts with another appointment..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRejectDialog({ open: false, sessionId: null });
            setRejectReason('');
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleReject}
            disabled={!rejectReason.trim() || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Reject Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingRescheduleRequests;
