import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  TextField
} from '@mui/material';
import { CheckCircle, Error, Email } from '@mui/icons-material';
import Logo from '../components/Logo';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationState, setVerificationState] = useState('loading'); // loading, success, error, resend
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setVerificationState('resend');
      setMessage('No verification token provided. Please enter your email to resend verification.');
    }
  }, [token]);

  const verifyEmail = async (verificationToken) => {
    try {
      setVerificationState('loading');
      
      const response = await axios.post(`${API_ENDPOINTS.BASE_URL}/api/email-verification/verify`, {
        token: verificationToken
      });

      if (response.data.success) {
        setVerificationState('success');
        setMessage('Your email has been verified successfully! You can now log in to your account.');
      } else {
        setVerificationState('error');
        setMessage(response.data.message || 'Verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setVerificationState('error');
      
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Verification failed. The link may be invalid or expired.');
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setMessage('Please enter your email address.');
      return;
    }

    try {
      setIsResending(true);
      
      const response = await axios.post(`${API_ENDPOINTS.BASE_URL}/api/email-verification/resend`, {
        email: email
      });

      if (response.data.success) {
        setMessage('Verification email sent successfully! Please check your inbox.');
      } else {
        setMessage(response.data.message || 'Failed to send verification email.');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Failed to send verification email. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const getIcon = () => {
    switch (verificationState) {
      case 'success':
        return <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />;
      case 'error':
        return <Error sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />;
      case 'resend':
        return <Email sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />;
      default:
        return <CircularProgress size={64} sx={{ mb: 2 }} />;
    }
  };

  const getTitle = () => {
    switch (verificationState) {
      case 'success':
        return 'Email Verified!';
      case 'error':
        return 'Verification Failed';
      case 'resend':
        return 'Resend Verification';
      default:
        return 'Verifying Email...';
    }
  };

  const getAlertSeverity = () => {
    switch (verificationState) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Logo size={60} sx={{ mb: 3 }} />
          
          {getIcon()}
          
          <Typography
            component="h1"
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #663399 30%, #9C27B0 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
              textAlign: 'center',
              mb: 3
            }}
          >
            {getTitle()}
          </Typography>

          {message && (
            <Alert 
              severity={getAlertSeverity()} 
              sx={{ width: '100%', mb: 3, textAlign: 'center' }}
            >
              {message}
            </Alert>
          )}

          {verificationState === 'success' && (
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/login')}
                sx={{ mt: 2, mb: 2, px: 4 }}
              >
                Go to Login
              </Button>
              <Typography variant="body2" color="text.secondary">
                You can now log in with your verified account.
              </Typography>
            </Box>
          )}

          {verificationState === 'error' && (
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Button
                variant="outlined"
                onClick={() => setVerificationState('resend')}
                sx={{ mt: 2, mb: 2, px: 4 }}
              >
                Resend Verification Email
              </Button>
              <Typography variant="body2" color="text.secondary">
                The verification link may have expired. You can request a new one.
              </Typography>
            </Box>
          )}

          {verificationState === 'resend' && (
            <Box sx={{ width: '100%' }}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 3 }}
                placeholder="Enter your email address"
              />
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleResendVerification}
                disabled={isResending || !email}
                sx={{ mb: 2 }}
              >
                {isResending ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Sending...
                  </>
                ) : (
                  'Send Verification Email'
                )}
              </Button>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Already verified?
                </Typography>
                <Button
                  variant="text"
                  onClick={() => navigate('/login')}
                  sx={{ textTransform: 'none' }}
                >
                  Go to Login
                </Button>
              </Box>
            </Box>
          )}

          {verificationState === 'loading' && (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
              Please wait while we verify your email address...
            </Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default EmailVerificationPage;