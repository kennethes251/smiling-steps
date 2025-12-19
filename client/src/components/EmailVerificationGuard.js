import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Container
} from '@mui/material';
import { Email, Refresh } from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import Logo from './Logo';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const EmailVerificationGuard = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (user) {
      checkVerificationStatus();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const checkVerificationStatus = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.BASE_URL}/api/email-verification/status`);
      setVerificationStatus(response.data.verification);
    } catch (error) {
      console.error('Error checking verification status:', error);
      // If we can't check status, assume user needs to verify
      setVerificationStatus({
        isVerified: false,
        canAccessDashboard: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;

    try {
      setIsResending(true);
      setResendMessage('');

      const response = await axios.post(`${API_ENDPOINTS.BASE_URL}/api/email-verification/resend`, {
        email: user.email
      });

      if (response.data.success) {
        setResendMessage('Verification email sent! Please check your inbox.');
      } else {
        setResendMessage(response.data.message || 'Failed to send verification email.');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setResendMessage(
        error.response?.data?.message || 'Failed to send verification email. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Show loading while checking verification status
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // If user is not logged in, show children (login/register pages)
  if (!user) {
    return children;
  }

  // If user is verified or can access dashboard, show children
  if (verificationStatus?.isVerified || verificationStatus?.canAccessDashboard) {
    return children;
  }

  // Show verification required screen
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
          
          <Email sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          
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
            Email Verification Required
          </Typography>

          <Alert severity="info" sx={{ width: '100%', mb: 3, textAlign: 'center' }}>
            Please verify your email address to access your account.
          </Alert>

          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
            We've sent a verification email to <strong>{user.email}</strong>. 
            Please check your inbox and click the verification link to activate your account.
          </Typography>

          {resendMessage && (
            <Alert 
              severity={resendMessage.includes('sent') ? 'success' : 'error'} 
              sx={{ width: '100%', mb: 3 }}
            >
              {resendMessage}
            </Alert>
          )}

          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Button
              variant="contained"
              startIcon={isResending ? <CircularProgress size={20} /> : <Refresh />}
              onClick={handleResendVerification}
              disabled={isResending}
              sx={{ mb: 2, px: 4 }}
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </Button>

            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Need to use a different email address?
              </Typography>
              <Button
                variant="outlined"
                onClick={handleLogout}
                sx={{ textTransform: 'none' }}
              >
                Log Out & Register Again
              </Button>
            </Box>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Didn't receive the email?</strong>
              <br />
              Check your spam folder or try resending the verification email.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default EmailVerificationGuard;