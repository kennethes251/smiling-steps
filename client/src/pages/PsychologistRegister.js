import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
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
  Paper
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import Logo from '../components/Logo';

const PsychologistRegister = () => {
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

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
    'Cognitive Behavioral Therapy',
    'Mindfulness-Based Therapy',
    'Family Systems Therapy',
    'Couples Counseling',
    'Trauma Therapy',
    'ADHD',
    'Bipolar Disorder',
    'OCD',
    'Panic Disorders'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (formData.specializations.length === 0) {
      setError('Please select at least one specialization');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_ENDPOINTS.USERS}/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'psychologist',
        psychologistDetails: {
          specializations: formData.specializations,
          experience: formData.experience,
          education: formData.education,
          bio: formData.bio,
          approvalStatus: 'pending', // Pending admin approval
          isActive: false // Not active until approved
        }
      });

      if (response.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 4,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 30px rgba(102, 51, 153, 0.15)',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'success.main' }}>
            Application Submitted!
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
            Thank you for applying to join Smiling Steps as a psychologist.
          </Typography>
          <Paper sx={{ p: 3, bgcolor: 'info.light', width: '100%', mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              What happens next?
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Step 1:</strong> Send your credentials to HR
              <br />
              Email your CV, professional license, and credentials to:
              <br />
              <strong style={{ color: '#663399', fontSize: '1.1em' }}>hr@smilingsteps.com</strong>
              <br />
              <em>(This significantly increases your approval chances)</em>
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Step 2:</strong> Admin team reviews your application
              <br />
              We verify your qualifications and credentials
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Step 3:</strong> Receive approval email
              <br />
              You'll get an email with:
              <br />
              • Account activation confirmation
              <br />
              • Platform policies and terms
              <br />
              • Guidelines for working with clients
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Step 4:</strong> Login and start helping clients
              <br />
              Access your dashboard and begin accepting sessions
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 2, color: 'primary.main' }}>
              ⏱️ Review typically takes 1-2 business days
            </Typography>
          </Paper>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            fullWidth
          >
            Return to Home
          </Button>
        </Box>
      </Container>
    );
  }

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
            Join as a Psychologist
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Help clients on their healing journey
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3, width: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Application Review Process:
          </Typography>
          <Typography variant="body2" component="div">
            • Your application will be reviewed by our admin team
            <br />
            • <strong>Important:</strong> To increase your chances of approval, please email your CV, professional license, and credentials to <strong>hr@smilingsteps.com</strong>
            <br />
            • Upon approval, you will receive an email with our platform policies and terms
            <br />
            • Review typically takes 1-2 business days
          </Typography>
        </Alert>

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="Dr. John Smith"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                placeholder="john.smith@example.com"
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
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
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
                >
                  {specializationOptions.map((spec) => (
                    <MenuItem key={spec} value={spec}>
                      {spec}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Years of Experience"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                placeholder="e.g., 5 years"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Education & Qualifications"
                multiline
                rows={2}
                value={formData.education}
                onChange={(e) => handleInputChange('education', e.target.value)}
                placeholder="e.g., PhD in Clinical Psychology, University of California"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Professional Bio"
                multiline
                rows={3}
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Brief description of your expertise and approach..."
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  📧 Important: Send Your Credentials
                </Typography>
                <Typography variant="body2">
                  After submitting this form, please email your CV, professional license, and credentials to <strong>hr@smilingsteps.com</strong> to complete your application and increase approval chances.
                </Typography>
              </Alert>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? 'Submitting Application...' : 'Submit Application'}
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" textAlign="center" color="text.secondary">
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#663399', textDecoration: 'none', fontWeight: 'bold' }}>
                  Login here
                </Link>
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};

export default PsychologistRegister;
