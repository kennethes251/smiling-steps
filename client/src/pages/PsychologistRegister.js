import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Paper,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';
import Logo from '../components/Logo';

const PsychologistRegister = () => {
  const { register, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    specializations: [],
    experience: '',
    education: '',
    bio: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const steps = ['Basic Information', 'Professional Details', 'Review & Submit'];

  const specializationOptions = [
    'Anxiety Disorders',
    'Depression',
    'PTSD',
    'Relationship Issues',
    'Addiction',
    'Eating Disorders',
    'Grief Counseling',
    'Child Psychology',
    'Adolescent Therapy',
    'Cognitive Behavioral Therapy (CBT)',
    'Dialectical Behavior Therapy (DBT)',
    'Mindfulness-Based Therapy',
    'Family Systems Therapy',
    'Couples Counseling',
    'Trauma Therapy',
    'ADHD',
    'Bipolar Disorder',
    'OCD',
    'Panic Disorders',
    'Substance Abuse',
    'Behavioral Therapy',
    'Psychodynamic Therapy'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for the field being edited
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
    setSubmitError('');
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 0) {
      // Basic Information validation
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      } else if (formData.name.length < 2) {
        newErrors.name = 'Name must be at least 2 characters';
      }
      
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
      
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (step === 1) {
      // Professional Details validation
      if (formData.specializations.length === 0) {
        newErrors.specializations = 'Please select at least one specialization';
      }
      
      if (!formData.experience.trim()) {
        newErrors.experience = 'Experience information is required';
      }
      
      if (!formData.education.trim()) {
        newErrors.education = 'Education information is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    if (!validateStep(1)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Attempting therapist registration with:', { 
        name: formData.name,
        email: formData.email,
        role: 'psychologist'
        // Note: Not logging password for security
      });
      
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'psychologist',
        psychologistDetails: {
          specializations: formData.specializations,
          experience: formData.experience,
          education: formData.education,
          bio: formData.bio,
          approvalStatus: 'pending',
          isActive: false
        },
        skipVerification: false // Enable email verification for security
      });
      
      console.log('Registration result:', result);
      
      // Always redirect to email verification page for new registrations
      if (result.requiresVerification) {
        // Store email in sessionStorage for verification page
        sessionStorage.setItem('pendingVerificationEmail', formData.email);
        navigate('/verify-email', { 
          state: { 
            email: formData.email,
            message: 'Registration successful! Please check your email to verify your account before we can review your application.',
            userType: 'therapist'
          }
        });
      } else {
        // Fallback - shouldn't happen for therapist registration
        console.log('Registration successful - user logged in:', result);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      // Get the specific error message from backend
      let errorMessage = 'Registration failed. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && error.response.data.errors.length > 0) {
        errorMessage = error.response.data.errors[0];
      } else if (error.response?.data?.msg) {
        errorMessage = error.response.data.msg;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSubmitError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="Dr. John Smith"
                error={!!errors.name}
                helperText={errors.name}
                disabled={isLoading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                placeholder="john.smith@example.com"
                error={!!errors.email}
                helperText={errors.email || 'We\'ll send a verification link to this email'}
                disabled={isLoading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                placeholder="Minimum 6 characters"
                error={!!errors.password}
                helperText={errors.password || 'At least 6 characters'}
                disabled={isLoading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                disabled={isLoading}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth required error={!!errors.specializations}>
                <InputLabel>Specializations</InputLabel>
                <Select
                  multiple
                  value={formData.specializations}
                  onChange={(e) => handleInputChange('specializations', e.target.value)}
                  input={<OutlinedInput label="Specializations" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  disabled={isLoading}
                >
                  {specializationOptions.map((spec) => (
                    <MenuItem key={spec} value={spec}>
                      {spec}
                    </MenuItem>
                  ))}
                </Select>
                {errors.specializations && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                    {errors.specializations}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Years of Experience"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                placeholder="e.g., 5 years in clinical psychology"
                required
                error={!!errors.experience}
                helperText={errors.experience}
                disabled={isLoading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Education & Qualifications"
                multiline
                rows={3}
                value={formData.education}
                onChange={(e) => handleInputChange('education', e.target.value)}
                placeholder="e.g., PhD in Clinical Psychology, University of California; Licensed Clinical Psychologist"
                required
                error={!!errors.education}
                helperText={errors.education}
                disabled={isLoading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Professional Bio"
                multiline
                rows={4}
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Brief description of your expertise, approach, and what makes you unique as a therapist..."
                disabled={isLoading}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Review Your Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Name:</Typography>
                      <Typography variant="body1">{formData.name}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">Email:</Typography>
                      <Typography variant="body1">{formData.email}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Specializations:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {formData.specializations.map((spec) => (
                          <Chip key={spec} label={spec} size="small" />
                        ))}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Experience:</Typography>
                      <Typography variant="body1">{formData.experience}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Education:</Typography>
                      <Typography variant="body1">{formData.education}</Typography>
                    </Grid>
                    {formData.bio && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">Bio:</Typography>
                        <Typography variant="body1">{formData.bio}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  📧 Next Steps After Registration:
                </Typography>
                <Typography variant="body2" component="div">
                  1. <strong>Verify your email</strong> - Check your inbox for a verification link
                  <br />
                  2. <strong>Send credentials</strong> - Email your CV, license, and credentials to <strong>hr@smilingsteps.com</strong>
                  <br />
                  3. <strong>Admin review</strong> - Our team will review your application (1-2 business days)
                  <br />
                  4. <strong>Get approved</strong> - Receive approval email and start helping clients
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          marginBottom: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 4,
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 8px 30px rgba(102, 51, 153, 0.15)',
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Logo size={60} sx={{ mb: 2 }} />
          <PsychologyIcon sx={{ fontSize: 50, color: 'primary.main', mb: 1 }} />
          <Typography
            component="h1"
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #663399 30%, #9C27B0 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Join as a Therapist
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Help clients on their healing journey with professional mental health services
          </Typography>
          
          {/* Trust Indicators */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 2, 
              flexWrap: 'wrap',
              mt: 2 
            }}
          >
            <Chip
              icon={<SecurityIcon fontSize="small" />}
              label="Secure Registration"
              size="small"
              sx={{ 
                bgcolor: 'rgba(102, 51, 153, 0.08)',
                color: 'primary.main',
                fontWeight: 500
              }}
            />
            <Chip
              icon={<EmailIcon fontSize="small" />}
              label="Email Verification"
              size="small"
              sx={{ 
                bgcolor: 'rgba(46, 125, 50, 0.08)',
                color: 'success.main',
                fontWeight: 500
              }}
            />
            <Chip
              icon={<VerifiedIcon fontSize="small" />}
              label="Admin Approval"
              size="small"
              sx={{ 
                bgcolor: 'rgba(255, 152, 0, 0.08)',
                color: 'warning.main',
                fontWeight: 500
              }}
            />
          </Box>
        </Box>

        {/* Stepper */}
        <Box sx={{ width: '100%', mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Error Display */}
        {submitError && (
          <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
            {submitError}
          </Alert>
        )}

        {/* Important Notice */}
        {activeStep === 0 && (
          <Alert severity="info" sx={{ mb: 3, width: '100%' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Application Review Process:
            </Typography>
            <Typography variant="body2" component="div">
              • Your application will be reviewed by our admin team
              <br />
              • <strong>Important:</strong> After registration, email your CV, professional license, and credentials to <strong>hr@smilingsteps.com</strong>
              <br />
              • Upon approval, you will receive an email with platform policies and terms
              <br />
              • Review typically takes 1-2 business days
            </Typography>
          </Alert>
        )}

        {/* Form Content */}
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          {renderStepContent(activeStep)}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0 || isLoading}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            
            <Box sx={{ flex: '1 1 auto' }} />
            
            {activeStep === steps.length - 1 ? (
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
                sx={{ minWidth: 200 }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={isLoading}
              >
                Next
              </Button>
            )}
          </Box>

          {/* Sign In Link */}
          <Box sx={{ textAlign: 'center', mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#663399', textDecoration: 'none', fontWeight: 'bold' }}>
                Sign in here
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default PsychologistRegister;
