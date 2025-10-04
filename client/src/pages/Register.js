import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Grid,
  FormHelperText
} from '@mui/material';
import Logo from '../components/Logo';

const Register = () => {
  const { register, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client'
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }
    
    // Role is automatically set to 'client' - no validation needed
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    if (!validate()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Attempting registration with:', { 
        name: formData.name,
        email: formData.email,
        role: formData.role
        // Note: Not logging password for security
      });
      
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      // The useEffect will handle the redirect when isAuthenticated becomes true
    } catch (error) {
      console.error('Registration error:', error);
      setSubmitError(error.response?.data?.msg || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 4,
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
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Logo size={80} sx={{ mb: 2 }} />
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
              mb: 2
            }}
          >
            Join Smiling Steps
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph textAlign="center">
            Begin your healing journey with compassionate, professional support rooted in respect, empowerment, and hope.
          </Typography>
        </Box>
        
        {submitError && (
          <Typography color="error" variant="body2" sx={{ mb: 3, textAlign: 'center' }}>
            {submitError}
          </Typography>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                autoComplete="name"
                name="name"
                required
                fullWidth
                id="name"
                label="Full Name"
                autoFocus
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                disabled={isLoading}
              />
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <TextField
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                disabled={isLoading}
              />
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password || 'At least 4 characters'}
                disabled={isLoading}
              />
            </Grid>
            
            {/* Role is now fixed as client - no selection needed */}
            <input type="hidden" name="role" value="client" />
          </Grid>
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={isLoading}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Create Account'
            )}
          </Button>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Button 
                variant="text" 
                size="small" 
                onClick={() => navigate('/login')}
                disabled={isLoading}
                sx={{ textTransform: 'none' }}
              >
                Sign in
              </Button>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Register;