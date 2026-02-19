import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  ContentCopy as CopyIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import API_URL from '../config/api';

const ManualPaymentSubmit = ({ sessionId, onPaymentSubmitted, onClose }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchPaymentInstructions();
  }, [sessionId]);

  const fetchPaymentInstructions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/manual-payments/instructions/${sessionId}`,
        { headers: { 'x-auth-token': token } }
      );
      setPaymentInfo(response.data);
      
      if (response.data.hasSubmittedCode) {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load payment instructions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!confirmationCode.trim()) {
      setError('Please enter your M-Pesa confirmation code');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/manual-payments/submit-code/${sessionId}`,
        { confirmationCode: confirmationCode.trim() },
        { headers: { 'x-auth-token': token } }
      );
      
      enqueueSnackbar(response.data.msg, { variant: 'success' });
      setSubmitted(true);
      
      if (onPaymentSubmitted) {
        onPaymentSubmitted(response.data.session);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Failed to submit payment code';
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    enqueueSnackbar('Copied to clipboard!', { variant: 'info' });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (submitted) {
    return (
      <Card sx={{ maxWidth: 500, mx: 'auto' }}>
        <CardContent>
          <Box textAlign="center" py={3}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Payment Code Submitted!
            </Typography>
            <Typography color="textSecondary" paragraph>
              Your M-Pesa confirmation code has been submitted. Our admin team will verify your payment shortly.
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              You will receive a notification once your payment is verified and your session is confirmed.
            </Alert>
            {onClose && (
              <Button variant="contained" onClick={onClose} sx={{ mt: 3 }}>
                Close
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  const instructions = paymentInfo?.paymentInstructions;

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto' }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={3}>
          <PaymentIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
          <Typography variant="h5">
            Complete Your Payment
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Session Details */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Session Details
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="body2">
                Booking Reference: <strong>{paymentInfo?.bookingReference}</strong>
              </Typography>
              <Typography variant="body2">
                Psychologist: <strong>{paymentInfo?.psychologistName}</strong>
              </Typography>
              <Typography variant="body2">
                Date: <strong>{new Date(paymentInfo?.sessionDate).toLocaleDateString()}</strong>
              </Typography>
            </Box>
            <Chip 
              label={`KSh ${paymentInfo?.amount?.toLocaleString()}`}
              color="primary"
              size="large"
              sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}
            />
          </Box>
        </Paper>

        {/* Payment Instructions */}
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <PhoneIcon sx={{ mr: 1 }} />
          M-Pesa Payment Instructions
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          {instructions?.type === 'till' ? (
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="body1">
                  Till Number: <strong style={{ fontSize: '1.2rem' }}>{instructions.tillNumber}</strong>
                </Typography>
                <Button 
                  size="small" 
                  startIcon={<CopyIcon />}
                  onClick={() => copyToClipboard(instructions.tillNumber)}
                >
                  Copy
                </Button>
              </Box>
              <Typography variant="body1" mb={2}>
                Amount: <strong style={{ fontSize: '1.2rem' }}>KSh {instructions.amount?.toLocaleString()}</strong>
              </Typography>
              <Typography variant="body1" mb={2}>
                Business: <strong>{instructions.businessName}</strong>
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="body1" mb={1}>
                Paybill Number: <strong>{instructions?.paybillNumber}</strong>
              </Typography>
              <Typography variant="body1" mb={1}>
                Account Number: <strong>{instructions?.accountNumber}</strong>
              </Typography>
              <Typography variant="body1" mb={2}>
                Amount: <strong>KSh {instructions?.amount?.toLocaleString()}</strong>
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Stepper orientation="vertical" sx={{ mt: 2 }}>
            <Step active>
              <StepLabel>Open M-Pesa on your phone</StepLabel>
            </Step>
            <Step active>
              <StepLabel>Select "Lipa na M-Pesa"</StepLabel>
            </Step>
            <Step active>
              <StepLabel>
                {instructions?.type === 'till' 
                  ? 'Select "Buy Goods and Services"' 
                  : 'Select "Pay Bill"'}
              </StepLabel>
            </Step>
            <Step active>
              <StepLabel>
                Enter {instructions?.type === 'till' ? 'Till' : 'Business'} Number: {instructions?.tillNumber || instructions?.paybillNumber}
              </StepLabel>
            </Step>
            <Step active>
              <StepLabel>Enter Amount: KSh {instructions?.amount?.toLocaleString()}</StepLabel>
            </Step>
            <Step active>
              <StepLabel>Enter your M-Pesa PIN and confirm</StepLabel>
            </Step>
            <Step active>
              <StepLabel>
                <strong>Copy the confirmation code from the SMS</strong>
                <Typography variant="caption" display="block" color="textSecondary">
                  Example: RKJ7ABCD12
                </Typography>
              </StepLabel>
            </Step>
          </Stepper>
        </Paper>

        {/* Confirmation Code Input */}
        <Typography variant="h6" gutterBottom>
          Enter Your Confirmation Code
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="M-Pesa Confirmation Code"
            placeholder="e.g., RKJ7ABCD12"
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
            variant="outlined"
            sx={{ mb: 2 }}
            inputProps={{ 
              maxLength: 10,
              style: { textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }
            }}
            helperText="Enter the 10-character code from your M-Pesa confirmation SMS"
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={submitting || !confirmationCode.trim()}
            startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {submitting ? 'Submitting...' : 'Submit Payment Code'}
          </Button>
        </form>

        <Alert severity="info" sx={{ mt: 3 }}>
          After submitting, our team will verify your payment against our M-Pesa records. 
          You'll receive a confirmation once verified.
        </Alert>
      </CardContent>
    </Card>
  );
};

export default ManualPaymentSubmit;
