import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
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

// Constants for verification states
const VERIFICATION_STATES = {
  INITIAL: 'initial',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  RESEND: 'resend',
  ALREADY_VERIFIED: 'already_verified'
};

// Minimum expected token length (typical JWT/hash tokens are 32+ chars)
const MIN_TOKEN_LENGTH = 32;

// Error messages
const ERROR_MESSAGES = {
  ALREADY_VERIFIED: 'This email has already been verified. You can log in to your account.',
  EXPIRED: 'This verification link has expired. Please request a new one.',
  INVALID: 'Invalid verification link. Please request a new verification email.',
  UNEXPECTED: 'An unexpected error occurred. Please try again later.',
  DEFAULT: 'Verification failed. Please try again.'
};

/**
 * Categorizes verification error messages and returns appropriate state and message
 * @param {string} errorMessage - The error message from the API
 * @returns {{ state: string, message: string }}
 */
const categorizeVerificationError = (errorMessage) => {
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes('already verified')) {
    return { state: VERIFICATION_STATES.ALREADY_VERIFIED, message: ERROR_MESSAGES.ALREADY_VERIFIED };
  }
  if (lowerMessage.includes('expired')) {
    return { state: VERIFICATION_STATES.ERROR, message: ERROR_MESSAGES.EXPIRED };
  }
  if (lowerMessage.includes('invalid')) {
    return { state: VERIFICATION_STATES.ERROR, message: ERROR_MESSAGES.INVALID };
  }
  return { state: VERIFICATION_STATES.ERROR, message: errorMessage || ERROR_MESSAGES.DEFAULT };
};

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [verificationState, setVerificationState] = useState(VERIFICATION_STATES.INITIAL);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const hasAttemptedVerification = useRef(false);
  const isMountedRef = useRef(true);

  const token = searchParams.get('token');

  // Get email from navigation state or session storage
  useEffect(() => {
    const emailFromState = location.state?.email;
    const emailFromSession = sessionStorage.getItem('pendingVerificationEmail');
    const messageFromState = location.state?.message;
    
    if (emailFromState) {
      setEmail(emailFromState);
      sessionStorage.setItem('pendingVerificationEmail', emailFromState);
    } else if (emailFromSession) {
      setEmail(emailFromSession);
    }
    
    if (messageFromState) {
      setMessage(messageFromState);
    }
  }, [location.state]);

  const verifyEmail = useCallback(async (verificationToken) => {
    // Validate token format before making API call
    if (!verificationToken || verificationToken.length < MIN_TOKEN_LENGTH) {
      setVerificationState(VERIFICATION_STATES.ERROR);
      setMessage(ERROR_MESSAGES.INVALID);
      return;
    }

    try {
      setVerificationState(VERIFICATION_STATES.LOADING);
      
      const response = await axios.post(`${API_ENDPOINTS.BASE_URL}/api/email-verification/verify`, {
        token: verificationToken
      });

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;

      if (response.data.success) {
        setVerificationState(VERIFICATION_STATES.SUCCESS);
        setMessage('Your email has been verified successfully! You can now log in to your account.');
        // Clear the pending verification email from session storage
        sessionStorage.removeItem('pendingVerificationEmail');
      } else {
        const { state, message: errorMsg } = categorizeVerificationError(
          response.data.message || ERROR_MESSAGES.DEFAULT
        );
        setVerificationState(state);
        setMessage(errorMsg);
      }
    } catch (error) {
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;

      if (error.response?.status === 400) {
        const { state, message: errorMsg } = categorizeVerificationError(
          error.response?.data?.message || ERROR_MESSAGES.DEFAULT
        );
        setVerificationState(state);
        setMessage(errorMsg);
      } else {
        console.error('Email verification error:', error);
        setVerificationState(VERIFICATION_STATES.ERROR);
        setMessage(ERROR_MESSAGES.UNEXPECTED);
      }
    }
  }, []);

  useEffect(() => {
    // Reset mounted ref on mount
    isMountedRef.current = true;

    // Prevent duplicate verification attempts (React StrictMode double-mount)
    if (hasAttemptedVerification.current) {
      return;
    }

    if (token && token.trim()) {
      hasAttemptedVerification.current = true;
      verifyEmail(token.trim());
    } else {
      // No token provided - check if we have an email from registration
      const emailFromSession = sessionStorage.getItem('pendingVerificationEmail');
      if (emailFromSession && !email) {
        setEmail(emailFromSession);
        setVerificationState(VERIFICATION_STATES.RESEND);
        setMessage('Please check your email for a verification link, or request a new one below.');
      } else {
        // Show resend form without making API call
        setVerificationState(VERIFICATION_STATES.RESEND);
        setMessage('No verification token found. Enter your email to receive a new verification link.');
      }
    }

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMountedRef.current = false;
    };
  }, [token, verifyEmail, email]);

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
      case VERIFICATION_STATES.SUCCESS:
      case VERIFICATION_STATES.ALREADY_VERIFIED:
        return <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />;
      case VERIFICATION_STATES.ERROR:
        return <Error sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />;
      case VERIFICATION_STATES.RESEND:
        return <Email sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />;
      case VERIFICATION_STATES.INITIAL:
      case VERIFICATION_STATES.LOADING:
      default:
        return <CircularProgress size={64} sx={{ mb: 2 }} />;
    }
  };

  const getTitle = () => {
    switch (verificationState) {
      case VERIFICATION_STATES.SUCCESS:
        return 'Email Verified!';
      case VERIFICATION_STATES.ALREADY_VERIFIED:
        return 'Already Verified';
      case VERIFICATION_STATES.ERROR:
        return 'Verification Failed';
      case VERIFICATION_STATES.RESEND:
        return 'Verify Your Email';
      case VERIFICATION_STATES.INITIAL:
      case VERIFICATION_STATES.LOADING:
      default:
        return 'Verifying Email...';
    }
  };

  const getAlertSeverity = () => {
    switch (verificationState) {
      case VERIFICATION_STATES.SUCCESS:
      case VERIFICATION_STATES.ALREADY_VERIFIED:
        return 'success';
      case VERIFICATION_STATES.ERROR:
        return 'error';
      case VERIFICATION_STATES.RESEND:
        return 'info';
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

          {verificationState === VERIFICATION_STATES.SUCCESS && (
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

          {verificationState === VERIFICATION_STATES.ALREADY_VERIFIED && (
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
                Your account is ready to use.
              </Typography>
            </Box>
          )}

          {verificationState === VERIFICATION_STATES.ERROR && (
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <Button
                variant="outlined"
                onClick={() => setVerificationState(VERIFICATION_STATES.RESEND)}
                sx={{ mt: 2, mb: 2, px: 4 }}
              >
                Resend Verification Email
              </Button>
              <Typography variant="body2" color="text.secondary">
                The verification link may have expired. You can request a new one.
              </Typography>
            </Box>
          )}

          {verificationState === VERIFICATION_STATES.RESEND && (
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

          {(verificationState === VERIFICATION_STATES.LOADING || verificationState === VERIFICATION_STATES.INITIAL) && (
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