import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  CircularProgress,
  TextField,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  QuestionAnswer as QuestionIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import axios from 'axios';

const ClarificationRequests = () => {
  const [clarificationRequests, setClarificationRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responseDialog, setResponseDialog] = useState({ open: false, request: null });
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClarificationRequests();
  }, []);

  const fetchClarificationRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/credentials/clarifications', {
        headers: { 'x-auth-token': token }
      });

      setClarificationRequests(response.data.clarificationRequests || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching clarification requests:', err);
      setError(err.response?.data?.message || 'Failed to load clarification requests');
      setLoading(false);
    }
  };

  const handleOpenResponseDialog = (request) => {
    setResponseDialog({ open: true, request });
    setResponse(request.response || '');
  };

  const handleCloseResponseDialog = () => {
    setResponseDialog({ open: false, request: null });
    setResponse('');
  };

  const handleSubmitResponse = async () => {
    if (!response.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/credentials/clarifications/${responseDialog.request.id}/respond`,
        { response: response.trim() },
        { headers: { 'x-auth-token': token } }
      );

      // Refresh the clarification requests
      await fetchClarificationRequests();
      handleCloseResponseDialog();
      
      // Show success message (you could add a snackbar here)
      console.log('Response submitted successfully');
    } catch (err) {
      console.error('Error submitting response:', err);
      setError(err.response?.data?.message || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <PendingIcon color="warning" />;
      case 'responded':
        return <CheckIcon color="success" />;
      default:
        return <QuestionIcon color="primary" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'responded':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (clarificationRequests.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <QuestionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No Clarification Requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You don't have any pending clarification requests at this time.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <QuestionIcon />
        Clarification Requests
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review and respond to clarification requests from our admin team regarding your application.
      </Typography>

      {clarificationRequests.map((request, index) => (
        <Card key={request.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                {getStatusIcon(request.status)}
                <Typography variant="h6">
                  Clarification Request #{index + 1}
                </Typography>
              </Box>
              <Chip
                label={request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                color={getStatusColor(request.status)}
                size="small"
              />
            </Box>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              Requested on {formatDate(request.requestedAt)}
              {request.requestedBy && ` by ${request.requestedBy.name}`}
            </Typography>

            <Box sx={{ backgroundColor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Request:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {request.message}
              </Typography>
            </Box>

            {request.status === 'responded' && request.response && (
              <Box sx={{ backgroundColor: 'success.light', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Your Response (submitted on {formatDate(request.respondedAt)}):
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {request.response}
                </Typography>
              </Box>
            )}

            {request.status === 'pending' && (
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={() => handleOpenResponseDialog(request)}
                >
                  Respond
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Response Dialog */}
      <Dialog
        open={responseDialog.open}
        onClose={handleCloseResponseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Respond to Clarification Request
        </DialogTitle>
        <DialogContent>
          {responseDialog.request && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Original Request:
              </Typography>
              <Box sx={{ backgroundColor: 'grey.50', p: 2, borderRadius: 1, mb: 3 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {responseDialog.request.message}
                </Typography>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={6}
                label="Your Response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Please provide the requested information or clarification..."
                variant="outlined"
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResponseDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitResponse}
            variant="contained"
            disabled={!response.trim() || submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {submitting ? 'Submitting...' : 'Submit Response'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClarificationRequests;