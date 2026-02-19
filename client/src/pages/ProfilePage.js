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
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import {
  PhotoCamera,
  Person,
  Email,
  Favorite,
  Edit,
  Save,
  Cancel,
  Schedule,
  Notifications,
  Security,
  AttachMoney
} from '@mui/icons-material';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import SecuritySettings from '../components/SecuritySettings';
import NotificationSettings from '../components/NotificationSettings';

// Tab Panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ProfilePage = () => {
  const { user, updateUser } = useContext(AuthContext);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [activeTab, setActiveTab] = useState(0);

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
    bio: '',
    // Psychologist-specific fields
    specializations: [],
    experience: ''
  });

  // Session rates for psychologists
  const [sessionRates, setSessionRates] = useState({
    individual: 2000,
    couples: 3500,
    family: 5000,
    group: 5000
  });

  const [editingSections, setEditingSections] = useState({
    basic: false,
    contact: false,
    personal: false,
    health: false,
    preferences: false,
    privacy: false,
    rates: false
  });

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

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
        bio: user.bio || user.psychologistDetails?.bio || '',
        specializations: user.psychologistDetails?.specializations || [],
        experience: user.psychologistDetails?.experience || ''
      });

      // Set session rates for psychologists
      if (user.role === 'psychologist' && user.sessionRates) {
        setSessionRates({
          individual: user.sessionRates.individual || 2000,
          couples: user.sessionRates.couples || 3500,
          family: user.sessionRates.family || 5000,
          group: user.sessionRates.group || 5000
        });
      }

      if (user.profilePicture) {
        const imageUrl = user.profilePicture.startsWith('http') 
          ? user.profilePicture 
          : `${API_ENDPOINTS.BASE_URL}${user.profilePicture}?t=${Date.now()}`;
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

  const handleRateChange = (field, value) => {
    setSessionRates(prev => ({
      ...prev,
      [field]: Number(value) || 0
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPG, PNG, and GIF images are allowed');
        return;
      }

      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload immediately
      await uploadProfilePicture(file);
    }
  };

  const uploadProfilePicture = async (file) => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const formDataWithFile = new FormData();
      formDataWithFile.append('profilePicture', file);

      const response = await axios.put(
        `${API_BASE_URL}/api/profile/picture`,
        formDataWithFile,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        const imageUrl = response.data.profilePicture.startsWith('http') 
          ? response.data.profilePicture 
          : `${API_ENDPOINTS.BASE_URL}${response.data.profilePicture}?t=${Date.now()}`;
        setImagePreview(imageUrl);
        updateUser({ ...user, profilePicture: response.data.profilePicture });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Profile picture upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setLoading(false);
      setProfileImage(null);
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

      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      // Clean the form data
      const cleanedFormData = { ...formData };
      const enumFields = ['gender', 'preferredTherapyType', 'profileVisibility'];
      enumFields.forEach(field => {
        if (cleanedFormData[field] === '') {
          delete cleanedFormData[field];
        }
      });

      if (!cleanedFormData.name || cleanedFormData.name.trim() === '') {
        setError('Name is required and cannot be empty.');
        return;
      }

      const response = await axios.put(`${API_BASE_URL}/api/profile`, cleanedFormData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        updateUser(response.data.user);
        setSuccess(true);

        if (section !== 'all') {
          setEditingSections(prev => ({ ...prev, [section]: false }));
        } else {
          setEditingSections({
            basic: false,
            contact: false,
            personal: false,
            health: false,
            preferences: false,
            privacy: false,
            rates: false
          });
        }

        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(response.data.message || 'Update failed');
      }

    } catch (err) {
      console.error('Profile update failed:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 400) {
        setError(err.response.data.message || 'Invalid data provided');
      } else {
        setError(err.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRates = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');

      const response = await axios.put(
        `${API_BASE_URL}/api/profile/rates`,
        sessionRates,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setEditingSections(prev => ({ ...prev, rates: false }));
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Session rates update failed:', err);
      setError(err.response?.data?.message || 'Failed to update session rates');
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

  const specializationOptions = [
    'Anxiety', 'Depression', 'Trauma & PTSD', 'Relationship Issues', 'Family Therapy',
    'Child & Adolescent', 'Couples Therapy', 'Grief & Loss', 'Addiction', 'Eating Disorders',
    'OCD', 'ADHD', 'Stress Management', 'Career Counseling', 'Life Coaching'
  ];

  // Determine which tabs to show based on user role
  const isPsychologist = user.role === 'psychologist';
  const tabs = [
    { label: 'Profile', icon: <Person /> },
    ...(isPsychologist ? [{ label: 'Availability', icon: <Schedule /> }] : []),
    { label: 'Notifications', icon: <Notifications /> },
    { label: 'Security', icon: <Security /> }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with Profile Picture */}
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
              disabled={loading}
            >
              <PhotoCamera />
            </IconButton>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/jpeg,image/jpg,image/png,image/gif"
              style={{ display: 'none' }}
            />
          </Box>
          <Box>
            <Typography variant="h4" gutterBottom>
              {formData.preferredName || formData.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user.role === 'psychologist' ? 'Psychologist' : user.role === 'admin' ? 'Administrator' : 'Client'}
              {formData.occupation && ` • ${formData.occupation}`}
              {' • '}Member since {new Date(user.createdAt).getFullYear()}
            </Typography>
            {formData.bio && (
              <Typography variant="body2" sx={{ mt: 1, maxWidth: 500 }}>
                {formData.bio}
              </Typography>
            )}
          </Box>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
            Profile updated successfully!
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              id={`profile-tab-${index}`}
              aria-controls={`profile-tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Profile Tab */}
      <TabPanel value={activeTab} index={0}>
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
                        <MenuItem value="">Not specified</MenuItem>
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
                      {loading ? 'Saving...' : 'Save Changes'}
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
                      disabled
                      helperText="Email cannot be changed"
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
                      {loading ? 'Saving...' : 'Save Changes'}
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

          {/* Psychologist-specific: Session Rates */}
          {isPsychologist && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AttachMoney sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Session Rates (KES)</Typography>
                    </Box>
                    <IconButton onClick={() => toggleEditSection('rates')}>
                      {editingSections.rates ? <Cancel /> : <Edit />}
                    </IconButton>
                  </Box>

                  {editingSections.rates ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="Individual Session"
                        type="number"
                        value={sessionRates.individual}
                        onChange={(e) => handleRateChange('individual', e.target.value)}
                        fullWidth
                        InputProps={{ inputProps: { min: 0 } }}
                      />
                      <TextField
                        label="Couples Session"
                        type="number"
                        value={sessionRates.couples}
                        onChange={(e) => handleRateChange('couples', e.target.value)}
                        fullWidth
                        InputProps={{ inputProps: { min: 0 } }}
                      />
                      <TextField
                        label="Family Session"
                        type="number"
                        value={sessionRates.family}
                        onChange={(e) => handleRateChange('family', e.target.value)}
                        fullWidth
                        InputProps={{ inputProps: { min: 0 } }}
                      />
                      <TextField
                        label="Group Session"
                        type="number"
                        value={sessionRates.group}
                        onChange={(e) => handleRateChange('group', e.target.value)}
                        fullWidth
                        InputProps={{ inputProps: { min: 0 } }}
                      />
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSaveRates}
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Rates'}
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography><strong>Individual:</strong> KES {sessionRates.individual.toLocaleString()}</Typography>
                      <Typography><strong>Couples:</strong> KES {sessionRates.couples.toLocaleString()}</Typography>
                      <Typography><strong>Family:</strong> KES {sessionRates.family.toLocaleString()}</Typography>
                      <Typography><strong>Group:</strong> KES {sessionRates.group.toLocaleString()}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Psychologist-specific: Specializations */}
          {isPsychologist && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Favorite sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Specializations</Typography>
                    </Box>
                    <IconButton onClick={() => toggleEditSection('personal')}>
                      {editingSections.personal ? <Cancel /> : <Edit />}
                    </IconButton>
                  </Box>

                  {editingSections.personal ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="Years of Experience"
                        name="experience"
                        type="number"
                        value={formData.experience}
                        onChange={handleInputChange}
                        fullWidth
                        InputProps={{ inputProps: { min: 0 } }}
                      />
                      <Typography variant="subtitle2">Select Specializations</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {specializationOptions.map((spec) => (
                          <Chip
                            key={spec}
                            label={spec}
                            onClick={() => {
                              const specs = formData.specializations.includes(spec)
                                ? formData.specializations.filter(s => s !== spec)
                                : [...formData.specializations, spec];
                              setFormData(prev => ({ ...prev, specializations: specs }));
                            }}
                            color={formData.specializations.includes(spec) ? 'primary' : 'default'}
                            variant={formData.specializations.includes(spec) ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={() => handleSubmit('personal')}
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography><strong>Experience:</strong> {formData.experience ? `${formData.experience} years` : 'Not set'}</Typography>
                      <Typography><strong>Specializations:</strong></Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {formData.specializations.length > 0 ? formData.specializations.map((spec) => (
                          <Chip key={spec} label={spec} size="small" />
                        )) : <Typography variant="body2" color="text.secondary">No specializations set</Typography>}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Health & Wellness (for clients) */}
          {!isPsychologist && (
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
                        {loading ? 'Saving...' : 'Save Changes'}
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
          )}

          {/* Save All Button */}
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                onClick={() => handleSubmit('all')}
                disabled={loading}
                sx={{ minWidth: 200 }}
              >
                {loading ? 'Saving...' : 'Save All Changes'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Availability Tab (Psychologist only) */}
      {isPsychologist && (
        <TabPanel value={activeTab} index={1}>
          <AvailabilityCalendar />
        </TabPanel>
      )}

      {/* Notifications Tab */}
      <TabPanel value={activeTab} index={isPsychologist ? 2 : 1}>
        <NotificationSettings />
      </TabPanel>

      {/* Security Tab */}
      <TabPanel value={activeTab} index={isPsychologist ? 3 : 2}>
        <SecuritySettings />
      </TabPanel>
    </Container>
  );
};

export default ProfilePage;
