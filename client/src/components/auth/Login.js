import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Container,
  Alert
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';
import Logo from '../Logo';



const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log('Attempting login with:', formData);
    
    try {
      const response = await login(formData.email, formData.password);
      console.log('Login response:', response);
      if (response && response.token) {
        console.log('Login successful, navigating to dashboard');
        navigate('/dashboard');
      } else {
        console.log('Login failed - no token in response');
        setError('Login failed - invalid response from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    }
  };

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