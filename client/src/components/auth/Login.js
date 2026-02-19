import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Container,
  Alert,
  Paper
} from '@mui/material';
import {
  HourglassEmpty,
  CheckCircle,
  Email
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import Logo from '../Logo';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(false);
  const [rejectedApplication, setRejectedApplication] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPendingApproval(false);
    setRejectedApplication(false);
    console.log('Attempting login with:', formData);
    
    try {
      // First, make a direct API call to check for specific error responses
      const res = await axios.post(`${API_BASE_URL}/api/users/login`, {
        email: formData.email,
        password: formData.password
      });
      
      // If we get here, login was successful - use the AuthContext login
      const response = await login(formData.email, formData.password);
      console.log('Login response:', response);
      
      if (response && response.id) {
        console.log('Login successful, navigating to dashboard');
        navigate('/dashboard');
      } else {
        console.log('Login failed - no user data in response');
        setError('Login failed - invalid response from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Check for specific error responses from server
      const statusCode = err.response?.status;
      const errorResponse = err.response?.data;
      
      console.log('Error status:', statusCode);
      console.log('Error response:', errorResponse);
      
      // Handle pending approval (403 with specific message)
      if (statusCode === 403) {
        if (errorResponse?.message === 'Account pending approval') {
          setPendingApproval(true);
          return;
        }
        if (errorResponse?.message === 'Application rejected') {
          setRejectedApplication(true);
          return;
        }
        if (errorResponse?.message === 'Account disabled') {
          setError('Your account has been disabled. Please contact support for assistance.');
          return;
        }
      }
      
      // Handle email not verified (400 with requiresVerification)
      if (errorResponse?.requiresVerification) {
        setError('Please verify your email before logging in. Check your inbox for the verification link.');
        return;
      }
      
      // Handle other errors
      const errorMessage = errorResponse?.message || errorResponse?.errors?.[0] || err.message || 'Login failed. Please try again.';
      setError(errorMessage);
    }
  };

  // Pending Approval UI
  if (pendingApproval) {
    return (
      <Container component="main" maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            marginTop: 8,
            p: 4,
            borderRadius: 3,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%)',
            border: '1px solid #ffc107'
          }}
        >
          <HourglassEmpty sx={{ fontSize: 80, color: '#ff9800', mb: 2 }} />
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#e65100' }}>
            Application Under Review
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Your application is under review! We'll email you once approved.
          </Typography>
          
          <Box sx={{ 
            bgcolor: 'white', 
            p: 3, 
            borderRadius: 2, 
            mb: 3,
            border: '1px solid #e0e0e0'
          }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>What happens next?</strong>
            </Typography>
            <Box sx={{ textAlign: 'left', pl: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
                Our team is reviewing your credentials
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Email sx={{ color: 'primary.main', fontSize: 18 }} />
                You'll receive an email once approved
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HourglassEmpty sx={{ color: 'warning.main', fontSize: 18 }} />
                This usually takes 1-2 business days
              </Typography>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Questions? Contact us at <strong>support@smilingsteps.co.ke</strong>
          </Typography>
          
          <Button 
            variant="outlined" 
            onClick={() => {
              setPendingApproval(false);
              setFormData({ email: '', password: '' });
            }}
            sx={{ mt: 1 }}
          >
            Back to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  // Rejected Application UI
  if (rejectedApplication) {
    return (
      <Container component="main" maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            marginTop: 8,
            p: 4,
            borderRadius: 3,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
            border: '1px solid #f44336'
          }}
        >
          <Box sx={{ 
            width: 80, 
            height: 80, 
            borderRadius: '50%', 
            bgcolor: '#ffcdd2', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mx: 'auto',
            mb: 2
          }}>
            <Typography variant="h3">❌</Typography>
          </Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#c62828' }}>
            Application Not Approved
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Unfortunately, your psychologist application was not approved at this time.
          </Typography>
          
          <Box sx={{ 
            bgcolor: 'white', 
            p: 3, 
            borderRadius: 2, 
            mb: 3,
            border: '1px solid #e0e0e0'
          }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>What can you do?</strong>
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'left' }}>
              • Check your email for details about the decision<br/>
              • Contact support if you have questions<br/>
              • You may reapply with updated credentials
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Need help? Contact <strong>support@smilingsteps.co.ke</strong>
          </Typography>
          
          <Button 
            variant="outlined" 
            onClick={() => {
              setRejectedApplication(false);
              setFormData({ email: '', password: '' });
            }}
            sx={{ mt: 1 }}
          >
            Back to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 4,
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 30px rgba(102, 51, 153, 0.15)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Logo size={60} sx={{ mb: 2 }} />
          <Typography 
            component="h1" 
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #663399 30%, #9C27B0 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
              mb: 1
            }}
          >
            Welcome Back
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to continue your healing journey
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign In
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;