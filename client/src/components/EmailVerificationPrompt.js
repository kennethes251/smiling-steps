import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  TextField,
  Divider
} from '@mui/material';
import { Email, Refresh, CheckCircle } from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

/**
 * EmailVerificationPrompt - A reusable component for prompting users to verify their email
 * Can be used in different contexts (registration success, login attempts, etc.)
 */
const EmailVerificationPrompt = ({ 
  email, 
  onEmailChange, 
  title = "Verify Your Email Address",
  subtitle = "We've sent a verification link to your email address.",
  showEmailInput = false,
  variant = "default", // "default", "compact", "inline"
  onVerificationSent,
  className
}) => {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');
  const [localEmail, setLocalEmail] = useState(email || '');

  const handleResendVerification = async () => {
    const emailToUse = email || localEmail;
    
    if (!emailToUse) {
      setMessage('Please enter your email address.');
      return;
    }

    try {
      setIsResending(true);
      setMessage('');

      const response = await axios.post(`${API_ENDPOINTS.BASE_URL}/api/email-verification/resend`, {
        email: emailToUse
      });

      if (response.data.success) {
        setMessage('Verification email sent successfully! Please check your inbox.');
        if (onVerificationSent) {
          onVerificationSent(emailToUse);
        }
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

  const handleEmailInputChange = (e) => {
    const newEmail = e.target.value;
    setLocalEmail(newEmail);
    if (onEmailChange) {
      onEmailChange(newEmail);
    }
  };

  // Compact variant for inline use
  if (variant === "compact") {
    return (
      <Box className={className} sx={{ textAlign: 'center', p: 2 }}>
        <Email sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
        
        {message && (
          <Alert 
            severity={message.includes('sent') ? 'success' : 'error'} 
            sx={{ mb: 2, fontSize: '0.875rem' }}
          >
            {message}
          </Alert>
        )}

        <Button
          variant="outlined"
          size="small"
          startIcon={isResending ? <CircularProgress size={16} /> : <Refresh />}
          onClick={handleResendVerification}
          disabled={isResending}
        >
          {isResending ? 'Sending...' : 'Resend Email'}
        </Button>
      </Box>
    );
  }

  // Inline variant for embedding in forms
  if (variant === "inline") {
    return (
      <Alert 
        severity="info" 
        className={className}
        sx={{ 
          mb: 2,
          '& .MuiAlert-message': { width: '100%' }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Typography variant="body2">
            📧 Please check your email and click the verification link
          </Typography>
          <Button
            variant="text"
            size="small"
            startIcon={isResending ? <CircularProgress size={16} /> : <Refresh />}
            onClick={handleResendVerification}
            disabled={isResending}
            sx={{ ml: 2, minWidth: 'auto' }}
          >
            {isResending ? 'Sending...' : 'Resend'}
          </Button>
        </Box>
        
        {message && (
          <Typography variant="caption" color={message.includes('sent') ? 'success.main' : 'error.main'} sx={{ mt: 1, display: 'block' }}>
            {message}
          </Typography>
        )}
      </Alert>
    );
  }

  // Default variant - full component
  return (
    <Paper
      elevation={2}
      className={className}
      sx={{
        p: 4,
        textAlign: 'center',
        borderRadius: 3,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Email sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
      
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontWeight: 600,
          color: 'primary.main',
          mb: 2
        }}
      >
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {subtitle}
      </Typography>

      {email && (
        <Typography variant="body2" sx={{ mb: 3, fontWeight: 500 }}>
          Verification email sent to: <strong>{email}</strong>
        </Typography>
      )}

      {showEmailInput && (
        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={localEmail}
          onChange={handleEmailInputChange}
          sx={{ mb: 3 }}
          placeholder="Enter your email address"
        />
      )}

      {message && (
        <Alert 
          severity={message.includes('sent') ? 'success' : 'error'} 
          sx={{ mb: 3 }}
        >
          {message}
        </Alert>
      )}

      <Button
        variant="contained"
        startIcon={isResending ? <CircularProgress size={20} /> : <Refresh />}
        onClick={handleResendVerification}
        disabled={isResending || (!email && !localEmail)}
        sx={{ mb: 2, px: 4 }}
      >
        {isResending ? 'Sending...' : 'Resend Verification Email'}
      </Button>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <strong>Didn't receive the email?</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          • Check your spam/junk folder
          <br />
          • Make sure the email address is correct
          <br />
          • Wait a few minutes and try resending
          <br />
          • Contact support if you continue having issues
        </Typography>
      </Box>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(102, 51, 153, 0.05)', borderRadius: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle sx={{ fontSize: 16, mr: 1, color: 'success.main' }} />
          Email verification helps keep your account secure
        </Typography>
      </Box>
    </Paper>
  );
};

export default EmailVerificationPrompt;