import React, { useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import API_BASE_URL, { API_ENDPOINTS } from '../config/api';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Avatar,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  IconButton
} from '@mui/material';
import {
  PhotoCamera,
  Person,
  Email,
  Work,
  Favorite,
  School,
  Security,
  Edit,
  Save,
  Cancel
} from '@mui/icons-material';

const ProfilePage = () => {
  const { user, updateUser } = useContext(AuthContext);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    preferredName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    occupation: '',
    education: '',
    emergencyContact: '',
    emergencyPhone: '',
    medicalConditions: [],
    medications: [],
    allergies: [],
    therapyGoals: [],
    preferredTherapyType: '',
    preferredLanguage: '',
    timeZone: '',
    profileVisibility: 'private',
    emailNotifications: true,
    smsNotifications: false,
    reminderNotifications: true,
    bio: ''
  });

  const [editingSections, setEditingSections] = useState({
    basic: false,
    contact: false,
    personal: false,
    health: false,
    preferences: false,
    privacy: false
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        preferredName: user.preferredName || '',
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || '',
        country: user.country || 'United States',
        occupation: user.occupation || '',
        education: user.education || '',
        emergencyContact: user.emergencyContact || '',
        emergencyPhone: user.emergencyPhone || '',
        medicalConditions: user.medicalConditions || [],
        medications: user.medications || [],
        allergies: user.allergies || [],
        therapyGoals: user.therapyGoals || [],
        preferredTherapyType: user.preferredTherapyType || '',
        preferredLanguage: user.preferredLanguage || 'English',
        timeZone: user.timeZone || 'America/New_York',
        profileVisibility: user.profileVisibility || 'private',
        emailNotifications: user.emailNotifications !== false,
        smsNotifications: user.smsNotifications || false,
        reminderNotifications: user.reminderNotifications !== false,
        bio: user.bio || ''
      });

      if (user.profilePicture) {
        // Convert relative path to full URL with cache busting
        const imageUrl = user.profilePicture.startsWith('http') 
          ? user.profilePicture 
          : `${API_ENDPOINTS.BASE_URL}${user.profilePicture}?t=${Date.now()}`;
        console.log('🖼️ Setting profile picture URL:', imageUrl);
        setImagePreview(imageUrl);
      }
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleArrayFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value.split(',').map(item => item.trim()).filter(item => item)
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleEditSection = (section) => {
    setEditingSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSubmit = async (section = 'all') => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      
      console.log('🔄 Updating profile...', { section, formData });
      console.log('🔑 Token exists:', !!token);

      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      // Clean the form data - remove empty strings for enum fields
      const cleanedFormData = { ...formData };
      const enumFields = ['gender', 'preferredTherapyType', 'profileVisibility'];
      enumFields.forEach(field => {
        if (cleanedFormData[field] === '') {
          delete cleanedFormData[field];
        }
      });

      // Ensure name is never empty (required field)
      if (!cleanedFormData.name || cleanedFormData.name.trim() === '') {
        setError('Name is required and cannot be empty.');
        return;
      }

      console.log('🧹 Cleaned form data:', cleanedFormData);

      // Handle file upload if image is selected
      if (profileImage) {
        const formDataWithFile = new FormData();
        formDataWithFile.append('profilePicture', profileImage);
        
        // Add other form fields to FormData
        Object.keys(cleanedFormData).forEach(key => {
          if (Array.isArray(cleanedFormData[key])) {
            formDataWithFile.append(key, JSON.stringify(cleanedFormData[key]));
          } else {
            formDataWithFile.append(key, cleanedFormData[key]);
          }
        });

        const response = await axios.put(`${API_BASE_URL}/api/users/profile`, formDataWithFile, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        console.log('✅ Profile update with image response:', response.data);

        if (response.data.success) {
          updateUser(response.data.user);
          setSuccess(true);
          setProfileImage(null);
          
          // Update image preview with the new profile picture
          if (response.data.user.profilePicture) {
            const imageUrl = response.data.user.profilePicture.startsWith('http') 
              ? response.data.user.profilePicture 
              : `${API_ENDPOINTS.BASE_URL}${response.data.user.profilePicture}?t=${Date.now()}`;
            console.log('🖼️ Updated profile picture URL:', imageUrl);
            setImagePreview(imageUrl);
          }
          
          if (section !== 'all') {
            setEditingSections(prev => ({ ...prev, [section]: false }));
          } else {
            setEditingSections({
              basic: false,
              contact: false,
              personal: false,
              health: false,
              preferences: false,
              privacy: false
            });
          }

          setTimeout(() => setSuccess(false), 3000);
        } else {
          setError(response.data.message || 'Update failed');
        }
        return;
      }

      // For JSON-only updates (no file upload)
      const response = await axios.put(`${API_BASE_URL}/api/users/profile`, cleanedFormData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Profile update response:', response.data);

      if (response.data.success) {
        updateUser(response.data.user);
        setSuccess(true);
        setProfileImage(null);
        
        // Update image preview if profile picture was updated
        if (response.data.user.profilePicture) {
          const imageUrl = response.data.user.profilePicture.startsWith('http') 
            ? response.data.user.profilePicture 
            : `${API_ENDPOINTS.BASE_URL}${response.data.user.profilePicture}?t=${Date.now()}`;
          console.log('🖼️ Updated profile picture URL (JSON):', imageUrl);
          setImagePreview(imageUrl);
        }

        if (section !== 'all') {
          setEditingSections(prev => ({ ...prev, [section]: false }));
        } else {
          setEditingSections({
            basic: false,
            contact: false,
            personal: false,
            health: false,
            preferences: false,
            privacy: false
          });
        }

        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(response.data.message || 'Update failed');
      }

    } catch (err) {
      console.error('❌ Profile update failed:', err);
      console.error('Error response:', err.response?.data);
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 400) {
        setError(err.response.data.message || 'Invalid data provided');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading profile...</Typography>
      </Container>
    );
  }

  const therapyGoalOptions = [
    'Anxiety Management', 'Depression Support', 'Stress Reduction', 'Relationship Issues',
    'Self-Esteem Building', 'Trauma Recovery', 'Grief Counseling', 'Career Guidance',
    'Life Transitions', 'Addiction Recovery', 'Sleep Issues', 'Anger Management'
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative', mr: 3 }}>
            <Avatar
              src={imagePreview}
              sx={{ width: 120, height: 120, fontSize: '3rem' }}
            >
              {user.name?.charAt(0)?.toUpperCase()}
            </Avatar>
            <IconButton
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: 'primary.main',
                color: 'white',
                '&:hover': { backgroundColor: 'primary.dark' }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <PhotoCamera />
            </IconButton>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </Box>
          <Box>
            <Typography variant="h4" gutterBottom>
              {formData.preferredName || formData.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {formData.occupation && `${formData.occupation} • `}
              Member since {new Date(user.createdAt).getFullYear()}
            </Typography>
            {formData.bio && (
              <Typography variant="body2" sx={{ mt: 1, maxWidth: 400 }}>
                {formData.bio}
              </Typography>
            )}
          </Box>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Profile updated successfully!
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Person sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Basic Information</Typography>
                </Box>
                <IconButton onClick={() => toggleEditSection('basic')}>
                  {editingSections.basic ? <Cancel /> : <Edit />}
                </IconButton>
              </Box>

              {editingSections.basic ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Preferred Name"
                    name="preferredName"
                    value={formData.preferredName}
                    onChange={handleInputChange}
                    fullWidth
                    helperText="Name displayed to others for privacy"
                  />
                  <TextField
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      label="Gender"
                    >
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                      <MenuItem value="non-binary">Non-binary</MenuItem>
                      <MenuItem value="prefer-not-to-say">Prefer not to say</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Tell us a bit about yourself..."
                  />
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={() => handleSubmit('basic')}
                    disabled={loading}
                  >
                    Save Changes
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography><strong>Name:</strong> {formData.name}</Typography>
                  <Typography><strong>Preferred Name:</strong> {formData.preferredName || 'Not set'}</Typography>
                  <Typography><strong>Date of Birth:</strong> {formData.dateOfBirth || 'Not set'}</Typography>
                  <Typography><strong>Gender:</strong> {formData.gender || 'Not specified'}</Typography>
                  {formData.bio && <Typography><strong>Bio:</strong> {formData.bio}</Typography>}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Contact Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Email sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Contact Information</Typography>
                </Box>
                <IconButton onClick={() => toggleEditSection('contact')}>
                  {editingSections.contact ? <Cancel /> : <Edit />}
                </IconButton>
              </Box>

              {editingSections.contact ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    fullWidth
                  />
                  <TextField
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    fullWidth
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      fullWidth
                    />
                    <TextField
                      label="State"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="ZIP Code"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      fullWidth
                    />
                    <TextField
                      label="Country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={() => handleSubmit('contact')}
                    disabled={loading}
                  >
                    Save Changes
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography><strong>Email:</strong> {formData.email}</Typography>
                  <Typography><strong>Phone:</strong> {formData.phone || 'Not set'}</Typography>
                  <Typography><strong>Address:</strong> {formData.address || 'Not set'}</Typography>
                  <Typography><strong>City:</strong> {formData.city || 'Not set'}</Typography>
                  <Typography><strong>State:</strong> {formData.state || 'Not set'}</Typography>
                  <Typography><strong>ZIP:</strong> {formData.zipCode || 'Not set'}</Typography>
                  <Typography><strong>Country:</strong> {formData.country}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Health & Wellness */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Favorite sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Health & Wellness</Typography>
                </Box>
                <IconButton onClick={() => toggleEditSection('health')}>
                  {editingSections.health ? <Cancel /> : <Edit />}
                </IconButton>
              </Box>

              {editingSections.health ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Medical Conditions"
                    value={formData.medicalConditions.join(', ')}
                    onChange={(e) => handleArrayFieldChange('medicalConditions', e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    helperText="Separate multiple conditions with commas"
                  />
                  <TextField
                    label="Current Medications"
                    value={formData.medications.join(', ')}
                    onChange={(e) => handleArrayFieldChange('medications', e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    helperText="Separate multiple medications with commas"
                  />
                  <TextField
                    label="Allergies"
                    value={formData.allergies.join(', ')}
                    onChange={(e) => handleArrayFieldChange('allergies', e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    helperText="Separate multiple allergies with commas"
                  />
                  <Typography variant="subtitle2">Therapy Goals</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {therapyGoalOptions.map((goal) => (
                      <Chip
                        key={goal}
                        label={goal}
                        onClick={() => {
                          const goals = formData.therapyGoals.includes(goal)
                            ? formData.therapyGoals.filter(g => g !== goal)
                            : [...formData.therapyGoals, goal];
                          setFormData(prev => ({ ...prev, therapyGoals: goals }));
                        }}
                        color={formData.therapyGoals.includes(goal) ? 'primary' : 'default'}
                        variant={formData.therapyGoals.includes(goal) ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={() => handleSubmit('health')}
                    disabled={loading}
                  >
                    Save Changes
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography><strong>Medical Conditions:</strong> {formData.medicalConditions.length ? formData.medicalConditions.join(', ') : 'None listed'}</Typography>
                  <Typography><strong>Medications:</strong> {formData.medications.length ? formData.medications.join(', ') : 'None listed'}</Typography>
                  <Typography><strong>Allergies:</strong> {formData.allergies.length ? formData.allergies.join(', ') : 'None listed'}</Typography>
                  <Typography><strong>Therapy Goals:</strong></Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {formData.therapyGoals.length ? formData.therapyGoals.map((goal) => (
                      <Chip key={goal} label={goal} size="small" />
                    )) : <Typography variant="body2" color="text.secondary">No goals set</Typography>}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Save All Button */}
        <Grid item xs={12}>
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              onClick={() => handleSubmit('all')}
              disabled={loading}
              sx={{ minWidth: 200 }}
            >
              {loading ? 'Saving...' : 'Save All Changes'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProfilePage;