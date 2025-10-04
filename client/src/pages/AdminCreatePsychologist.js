import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const AdminCreatePsychologist = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    specializations: [],
    experience: '',
    education: '',
    bio: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_ENDPOINTS.USERS}/create-psychologist`, formData);
      
      if (response.data.success) {
        setSuccess(`✅ Psychologist account created successfully!\n\nLogin Credentials:\nEmail: ${formData.email}\nPassword: ${formData.password}\n\nThe psychologist can now login and access their dashboard.`);
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          password: '',
          specializations: [],
          experience: '',
          education: '',
          bio: ''
        });
      }
    } catch (err) {
      console.error('Error creating psychologist:', err);
      setError(err.response?.data?.message || 'Failed to create psychologist account');
    } finally {
      setLoading(false);
    }
  };

  const createSamplePsychologists = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    const samplePsychologists = [
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@smilingsteps.com',
        password: 'secure123',
        specializations: ['Anxiety Disorders', 'Depression', 'Cognitive Behavioral Therapy'],
        experience: '8 years',
        education: 'PhD in Clinical Psychology, Harvard University',
        bio: 'Specializing in anxiety and depression treatment with a focus on CBT techniques.'
      },
      {
        name: 'Dr. Michael Chen',
        email: 'michael.chen@smilingsteps.com',
        password: 'secure123',
        specializations: ['Family Therapy', 'Couples Counseling', 'Relationship Issues'],
        experience: '12 years',
        education: 'PhD in Family Psychology, Stanford University',
        bio: 'Expert in family dynamics and relationship counseling with over a decade of experience.'
      },
      {
        name: 'Dr. Emily Rodriguez',
        email: 'emily.rodriguez@smilingsteps.com',
        password: 'secure123',
        specializations: ['Child Psychology', 'Adolescent Therapy', 'ADHD'],
        experience: '6 years',
        education: 'PhD in Child Psychology, UCLA',
        bio: 'Dedicated to helping children and adolescents navigate mental health challenges.'
      }
    ];

    try {
      let successCount = 0;
      let errorMessages = [];

      for (const psychologist of samplePsychologists) {
        try {
          const response = await axios.post(`${API_ENDPOINTS.USERS}/create-psychologist`, psychologist);
          if (response.data.success) {
            successCount++;
          }
        } catch (err) {
          errorMessages.push(`${psychologist.name}: ${err.response?.data?.message || 'Failed'}`);
        }
      }

      if (successCount > 0) {
        setSuccess(`✅ Created ${successCount} sample psychologist accounts!\n\nAll accounts use password: secure123\n\nPsychologists can now login with their email addresses.`);
      }
      
      if (errorMessages.length > 0) {
        setError(`Some accounts failed to create:\n${errorMessages.join('\n')}`);
      }

    } catch (err) {
      setError('Failed to create sample psychologists');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <PsychologyIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Create Psychologist Account
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Admin interface to create psychologist accounts
            </Typography>
          </Box>

          {success && (
            <Alert severity="success" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
              {success}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={createSamplePsychologists}
              disabled={loading}
            >
              Create Sample Psychologists
            </Button>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  placeholder="Dr. John Smith"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  placeholder="john.smith@smilingsteps.com"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  placeholder="Minimum 4 characters"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Years of Experience"
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  placeholder="e.g., 5 years"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
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

              <Grid size={{ xs: 12 }}>
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

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Professional Bio"
                  multiline
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Brief description of expertise and approach..."
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={<PersonAddIcon />}
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Psychologist Account'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              📋 Instructions
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Creating Psychologist Accounts:</strong>
              <br />• Fill out the form above to create individual accounts
              <br />• Use "Create Sample Psychologists" for demo accounts
              <br />• All created accounts are automatically approved
              <br />• Psychologists can login immediately after creation
              <br />• They will have access to the full psychologist dashboard
              <br />
              <br /><strong>Account Access:</strong>
              <br />• Psychologists login at /login with their email/password
              <br />• They get redirected to the psychologist dashboard
              <br />• Full access to session management and video calls
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AdminCreatePsychologist;