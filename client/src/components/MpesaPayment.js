import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Chip
} from '@mui/material';
import {
  PhoneAndroid as PhoneIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const MpesaPayment = ({ sessionId, amount, sessionDetails, onSuccess, onError }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [checkoutRequestID, setCheckoutRequestID] = useState('');
  const [transactionID, setTransactionID] = useState('');
  const [pollingStartTime, setPollingStartTime] = useState(null);
  const pollingIntervalRef = useRef(null);

  const steps = ['Enter Phone', 'Confirm on Phone', 'Payment Complete'];
  const [activeStep, setActiveStep] = useState(0);

  // Validate phone number in real-time
  const validatePhoneNumber = (phone) => {
    if (!phone) {
      return '';
    }

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Check for valid Kenyan phone number patterns
    const validPatterns = [
      /^254[17]\d{8}$/, // 254 format (12 digits)
      /^0[17]\d{8}$/,   // 0 format (10 digits)
    ];

    const isValid = validPatterns.some(pattern => pattern.test(cleaned));

    if (!isValid && cleaned.length >= 10) {
      return 'Please enter a valid Kenyan phone number (07XX or 01XX)';
    }

    return '';
  };

  // Poll payment status
  useEffect(() => {
    if (paymentStatus === 'processing' && checkoutRequestID) {
      setPollingStartTime(Date.now());
      
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const token = localStorage.getItem('token');
          const config = { headers: { 'x-auth-token': token } };
          
          const response = await axios.get(
            `${API_ENDPOINTS.MPESA}/status/${sessionId}`,
            config
          );

          if (response.data.paymentStatus === 'Paid') {
            setPaymentStatus('success');
            setActiveStep(2);
            setTransactionID(response.data.mpesaTransactionID || '');
            clearInterval(pollingIntervalRef.current);
            if (onSuccess) onSuccess(response.data);
          } else if (response.data.paymentStatus === 'Failed') {
            setPaymentStatus('failed');
            setError(response.data.mpesaResultDesc || 'Payment was cancelled or failed');
            clearInterval(pollingIntervalRef.current);
            if (onError) onError(new Error('Payment failed'));
          }

          // Check for timeout (120 seconds)
          if (Date.now() - pollingStartTime > 120000) {
            setPaymentStatus('timeout');
            setError('Payment request timed out. Please check your M-Pesa messages and try again if needed.');
            clearInterval(pollingIntervalRef.current);
          }
        } catch (err) {
          console.error('Status check error:', err);
        }
      }, 3000); // Poll every 3 seconds

      // Cleanup on unmount
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [paymentStatus, checkoutRequestID, sessionId, onSuccess, onError, pollingStartTime]);

  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    setError('');
    setValidationError('');
    
    // Final validation before submission
    const validationErr = validatePhoneNumber(phoneNumber);
    if (validationErr) {
      setValidationError(validationErr);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      const response = await axios.post(
        `${API_ENDPOINTS.MPESA}/initiate`,
        { sessionId, phoneNumber },
        config
      );

      setCheckoutRequestID(response.data.checkoutRequestID);
      setPaymentStatus('processing');
      setActiveStep(1);

    } catch (err) {
      console.error('Payment initiation error:', err);
      const errorMsg = err.response?.data?.msg || 'Failed to initiate payment';
      setError(errorMsg);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Auto-format based on input
    if (cleaned.startsWith('254')) {
      // Format: 254XXXXXXXXX (max 12 digits)
      return cleaned.slice(0, 12);
    } else if (cleaned.startsWith('0')) {
      // Format: 0XXXXXXXXX (max 10 digits)
      return cleaned.slice(0, 10);
    } else if (cleaned.length > 0) {
      // If starts with other digit, assume 0 prefix
      return '0' + cleaned.slice(0, 9);
    }
    return cleaned;
  };

  const handlePhoneNumberChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    
    // Real-time validation
    const validationErr = validatePhoneNumber(formatted);
    setValidationError(validationErr);
  };

  const handleRetry = () => {
    setPaymentStatus('idle');
    setActiveStep(0);
    setError('');
    setValidationError('');
    setCheckoutRequestID('');
    setTransactionID('');
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <PhoneIcon sx={{ mr: 1, color: 'success.main', fontSize: 32 }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Pay with M-Pesa
        </Typography>
      </Box>

      {/* Session Details */}
      {sessionDetails && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Session Details
          </Typography>
          {sessionDetails.therapistName && (
            <Typography variant="body2">
              <strong>Therapist:</strong> {sessionDetails.therapistName}
            </Typography>
          )}
          {sessionDetails.sessionType && (
            <Typography variant="body2">
              <strong>Type:</strong> {sessionDetails.sessionType}
            </Typography>
          )}
          {sessionDetails.scheduledDate && (
            <Typography variant="body2">
              <strong>Date:</strong> {new Date(sessionDetails.scheduledDate).toLocaleString()}
            </Typography>
          )}
        </Box>
      )}

      <Typography variant="h4" color="success.main" sx={{ mb: 3, fontWeight: 'bold' }}>
        KSh {amount.toLocaleString()}
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>
          {error}
        </Alert>
      )}

      {paymentStatus === 'idle' && (
        <form onSubmit={handleInitiatePayment}>
          <TextField
            fullWidth
            label="M-Pesa Phone Number"
            placeholder="0712345678 or 254712345678"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            required
            error={!!validationError}
            helperText={validationError || "Enter the phone number registered with M-Pesa"}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />

          <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
            <Typography variant="caption">
              <strong>Accepted formats:</strong> 0712345678, 0112345678, 254712345678, 254112345678
            </Typography>
          </Alert>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading || phoneNumber.length < 10 || !!validationError}
            sx={{ 
              py: 1.5, 
              fontSize: '1.1rem', 
              fontWeight: 'bold',
              backgroundColor: 'success.main',
              '&:hover': { backgroundColor: 'success.dark' }
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              `Pay KSh ${amount.toLocaleString()}`
            )}
          </Button>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
            🔒 Secure payment via Safaricom M-Pesa
          </Typography>
        </form>
      )}

      {paymentStatus === 'processing' && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CircularProgress size={60} sx={{ color: 'success.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Check Your Phone
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            An M-Pesa payment prompt has been sent to <strong>{phoneNumber}</strong>
          </Typography>
          <Alert severity="info" sx={{ textAlign: 'left', mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Next Steps:
            </Typography>
            <Typography variant="caption" component="div">
              1. Check your phone for M-Pesa prompt<br />
              2. Enter your M-Pesa PIN<br />
              3. Confirm the payment<br />
              4. Wait for confirmation (this page will update automatically)
            </Typography>
          </Alert>
          <Chip 
            label="Waiting for payment confirmation..." 
            color="primary" 
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 2 }}>
            This may take up to 2 minutes
          </Typography>
          <Button
            variant="outlined"
            onClick={handleRetry}
            sx={{ mt: 2 }}
          >
            Cancel & Try Again
          </Button>
        </Box>
      )}

      {paymentStatus === 'success' && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'success.main' }}>
            Payment Successful!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Your therapy session has been confirmed.
          </Typography>
          
          {transactionID && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.main' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                M-Pesa Transaction ID
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.dark', fontFamily: 'monospace' }}>
                {transactionID}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Save this for your records
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {paymentStatus === 'failed' && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'error.main' }}>
            Payment Failed
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {error || 'The payment was not completed'}
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Common reasons for payment failure:
            </Typography>
            <Typography variant="caption" component="div">
              • Insufficient M-Pesa balance<br />
              • Incorrect M-Pesa PIN entered<br />
              • Payment cancelled by user<br />
              • Network connectivity issues
            </Typography>
          </Alert>

          <Button
            variant="contained"
            onClick={handleRetry}
            sx={{ backgroundColor: 'success.main', '&:hover': { backgroundColor: 'success.dark' } }}
          >
            Try Again
          </Button>
        </Box>
      )}

      {paymentStatus === 'timeout' && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <ErrorIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'warning.main' }}>
            Payment Timeout
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The payment request timed out after 2 minutes.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              What to do next:
            </Typography>
            <Typography variant="caption" component="div">
              1. Check your M-Pesa messages for any payment confirmation<br />
              2. If payment was successful, your session will be confirmed automatically<br />
              3. If no payment was made, you can try again below
            </Typography>
          </Alert>

          <Button
            variant="contained"
            onClick={handleRetry}
            sx={{ backgroundColor: 'success.main', '&:hover': { backgroundColor: 'success.dark' } }}
          >
            Try Again
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default MpesaPayment;
