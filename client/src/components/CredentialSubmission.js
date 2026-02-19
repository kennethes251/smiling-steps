import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Grid,
  Paper
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  CheckCircle,
  Pending,
  Error as ErrorIcon,
  Info
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const CredentialSubmission = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [files, setFiles] = useState([]);
  const [professionalInfo, setProfessionalInfo] = useState({
    licenseNumber: '',
    specializations: [],
    experience: '',
    education: ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  // Available specializations
  const availableSpecializations = [
    'Cognitive Behavioral Therapy (CBT)',
    'Dialectical Behavior Therapy (DBT)',
    'Psychodynamic Therapy',
    'Humanistic Therapy',
    'EMDR',
    'Family Therapy',
    'Couples Therapy',
    'Group Therapy',
    'Anxiety Disorders',
    'Depression',
    'Trauma and PTSD',
    'Addiction Counseling',
    'Child Psychology',
    'Adolescent Psychology',
    'Geriatric Psychology',
    'Eating Disorders',
    'Personality Disorders',
    'Grief Counseling',
    'Career Counseling',
    'Relationship Counseling'
  ];

  useEffect(() => {
    fetchRequirements();
    fetchSubmissionStatus();
  }, []);

  const fetchRequirements = async () => {
    try {
      const response = await axios.get('/api/credentials/requirements');
      setRequirements(response.data.requirements);
    } catch (error) {
      console.error('Error fetching requirements:', error);
    }
  };

  const fetchSubmissionStatus = async () => {
    try {
      const response = await axios.get('/api/credentials/status');
      setSubmissionStatus(response.data);
      
      if (response.data.professionalInfo) {
        setProfessionalInfo({
          licenseNumber: response.data.professionalInfo.licenseNumber || '',
          specializations: response.data.professionalInfo.specializations || [],
          experience: response.data.professionalInfo.experience || '',
          education: response.data.professionalInfo.education || ''
        });
      }
    } catch (error) {
      console.error('Error fetching submission status:', error);
    }
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const newFiles = selectedFiles.map(file => ({
      file,
      type: 'license', // Default type
      id: Math.random().toString(36).substr(2, 9)
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setErrors(prev => ({ ...prev, files: '' }));
  };

  const handleFileTypeChange = (fileId, type) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, type } : f
    ));
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSpecializationChange = (event) => {
    const value = event.target.value;
    setProfessionalInfo(prev => ({
      ...prev,
      specializations: typeof value === 'string' ? value.split(',') : value
    }));
    setErrors(prev => ({ ...prev, specializations: '' }));
  };

  const handleInputChange = (field, value) => {
    setProfessionalInfo(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!professionalInfo.licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required';
    }

    if (professionalInfo.specializations.length === 0) {
      newErrors.specializations = 'At least one specialization is required';
    }

    if (!professionalInfo.experience.trim()) {
      newErrors.experience = 'Experience information is required';
    }

    if (files.length === 0) {
      newErrors.files = 'At least one credential document is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSuccess('');
    setErrors({});

    try {
      const formData = new FormData();
      
      // Add files
      files.forEach(fileObj => {
        formData.append('credentialFiles', fileObj.file);
      });

      // Add file types
      const credentialTypes = files.map(f => f.type);
      formData.append('credentialTypes', JSON.stringify(credentialTypes));

      // Add professional information
      formData.append('professionalInfo', JSON.stringify(professionalInfo));

      const response = await axios.post('/api/credentials/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Credentials submitted successfully! Your application is now under review.');
      setFiles([]);
      await fetchSubmissionStatus();

    } catch (error) {
      console.error('Submission error:', error);
      setErrors({
        submit: error.response?.data?.message || 'Error submitting credentials'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle color="success" />;
      case 'pending':
        return <Pending color="warning" />;
      case 'rejected':
        return <ErrorIcon color="error" />;
      default:
        return <Info color="info" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'info';
    }
  };

  if (!user || user.role !== 'psychologist') {
    return (
      <Alert severity="error">
        Only therapists can access credential submission.
      </Alert>
    );
  }

  if (!user.isVerified) {
    return (
      <Alert severity="warning">
        Please verify your email address before submitting credentials.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Professional Credential Submission
      </Typography>

      {/* Current Status */}
      {submissionStatus && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              {getStatusIcon(submissionStatus.approvalStatus)}
              <Typography variant="h6">
                Current Status: {submissionStatus.approvalStatus?.toUpperCase()}
              </Typography>
            </Box>
            
            {submissionStatus.credentialsSubmitted && (
              <Alert severity={getStatusColor(submissionStatus.approvalStatus)} sx={{ mb: 2 }}>
                {submissionStatus.approvalStatus === 'approved' && 
                  'Congratulations! Your credentials have been approved.'}
                {submissionStatus.approvalStatus === 'pending' && 
                  'Your credentials are under review. We will notify you once the review is complete.'}
                {submissionStatus.approvalStatus === 'rejected' && 
                  'Your credentials were not approved. Please review the feedback and resubmit.'}
              </Alert>
            )}

            {/* Clarification Requests Button */}
            <Box display="flex" gap={2} mt={2}>
              <Button
                variant="outlined"
                onClick={() => window.location.href = '/clarifications'}
                startIcon={<Info />}
              >
                View Clarification Requests
              </Button>
            </Box>

            {submissionStatus.credentials?.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Submitted Documents:
                </Typography>
                <List dense>
                  {submissionStatus.credentials.map((cred, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={cred.originalName}
                        secondary={`Type: ${cred.type} | Uploaded: ${new Date(cred.uploadedAt).toLocaleDateString()}`}
                      />
                      {cred.verified && <CheckCircle color="success" />}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      {requirements && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Submission Requirements
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Required Documents:
                </Typography>
                <List dense>
                  {requirements.requiredDocuments.map((doc, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={doc} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  File Requirements:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary={`Formats: ${requirements.fileTypes.join(', ')}`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary={`Max size: ${requirements.maxFileSize} per file`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary={`Max files: ${requirements.maxFiles}`} />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Submission Form */}
      {(!submissionStatus?.credentialsSubmitted || submissionStatus?.approvalStatus === 'rejected') && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Submit Your Credentials
            </Typography>

            {/* Professional Information */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Professional Information
              </Typography>
              
              <TextField
                fullWidth
                label="License Number"
                value={professionalInfo.licenseNumber}
                onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                error={!!errors.licenseNumber}
                helperText={errors.licenseNumber}
                sx={{ mb: 2 }}
                required
              />

              <FormControl fullWidth sx={{ mb: 2 }} error={!!errors.specializations}>
                <InputLabel>Specializations *</InputLabel>
                <Select
                  multiple
                  value={professionalInfo.specializations}
                  onChange={handleSpecializationChange}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {availableSpecializations.map((spec) => (
                    <MenuItem key={spec} value={spec}>
                      {spec}
                    </MenuItem>
                  ))}
                </Select>
                {errors.specializations && (
                  <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    {errors.specializations}
                  </Typography>
                )}
              </FormControl>

              <TextField
                fullWidth
                label="Years of Experience"
                value={professionalInfo.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                error={!!errors.experience}
                helperText={errors.experience}
                sx={{ mb: 2 }}
                required
              />

              <TextField
                fullWidth
                label="Educational Background (Optional)"
                value={professionalInfo.education}
                onChange={(e) => handleInputChange('education', e.target.value)}
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* File Upload */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Upload Documents
              </Typography>

              <input
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                id="credential-upload"
                multiple
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="credential-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUpload />}
                  sx={{ mb: 2 }}
                >
                  Select Files
                </Button>
              </label>

              {errors.files && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.files}
                </Alert>
              )}

              {files.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Files:
                  </Typography>
                  <List>
                    {files.map((fileObj) => (
                      <ListItem key={fileObj.id}>
                        <ListItemText
                          primary={fileObj.file.name}
                          secondary={`${(fileObj.file.size / 1024 / 1024).toFixed(2)} MB`}
                        />
                        <FormControl size="small" sx={{ minWidth: 120, mr: 1 }}>
                          <Select
                            value={fileObj.type}
                            onChange={(e) => handleFileTypeChange(fileObj.id, e.target.value)}
                          >
                            <MenuItem value="license">License</MenuItem>
                            <MenuItem value="certification">Certification</MenuItem>
                            <MenuItem value="degree">Degree</MenuItem>
                            <MenuItem value="other">Other</MenuItem>
                          </Select>
                        </FormControl>
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => removeFile(fileObj.id)}
                          >
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>

            {/* Submit Button */}
            <Box sx={{ mt: 3 }}>
              {loading && <LinearProgress sx={{ mb: 2 }} />}
              
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}

              {errors.submit && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.submit}
                </Alert>
              )}

              <Button
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Submitting...' : 'Submit Credentials for Review'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CredentialSubmission;