import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Button,
  Alert
} from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      setStatus('verifying');
      
      const response = await axios.get(`${API_ENDPOINTS.USERS}/verify-email/${token}`);
      
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage('An error occurred during verification. Please try again.');
      }
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleResendVerification = () => {
    // TODO: Implement resend verification
    alert('Resend verification feature coming soon!');
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <CircularProgress size={60} sx={{ mb: 3, color: 'primary.main' }} />
            <Typography variant="h5" gutterBottom>
              Verifying Your Email
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please wait while we verify your email address...
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="success.main">
              Email Verified!
            </Typography>
            <Alert severity="success" sx={{ mb: 3 }}>
              {message}
            </Alert>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Your email has been successfully verified. You can now login to your account.
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              onClick={handleGoToLogin}
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="error.main">
              Verification Failed
            </Typography>
            <Alert severity="error" sx={{ mb: 3 }}>
              {message}
            </Alert>
            <Typography variant="body1" sx={{ mb: 3 }}>
              The verification link may be invalid or expired. Please try registering again or contact support.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/register')}
              >
                Register Again
              </Button>
              <Button 
                variant="contained" 
                onClick={handleResendVerification}
              >
                Resend Verification
              </Button>
            </Box>
          </>
        )}

        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            Need help? Contact us at support@smilingsteps.com
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default EmailVerification;