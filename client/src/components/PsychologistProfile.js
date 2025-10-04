import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Avatar,
  Card,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  Save as SaveIcon,
  Edit as EditIcon
} from '@mui/icons-material';

const PsychologistProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState({
    profilePictureUrl: '',
    age: '',
    bio: '',
    specializations: [],
    therapyTypes: [],
    experience: '',
    education: '',
    languages: []
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMethod, setUploadMethod] = useState('file'); // 'file' or 'url'

  const therapyTypeOptions = ['Individual', 'Couples', 'Family', 'Group'];
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
    'Family Systems Therapy'
  ];
  const languageOptions = ['English', 'Swahili', 'French', 'Spanish', 'Arabic'];

  useEffect(() => {
    if (user?.psychologistDetails) {
      setProfile({
        profilePictureUrl: user.psychologistDetails.profilePictureUrl || '',
        age: user.psychologistDetails.age || '',
        bio: user.psychologistDetails.bio || '',
        specializations: user.psychologistDetails.specializations || [],
        therapyTypes: user.psychologistDetails.therapyTypes || [],
        experience: user.psychologistDetails.experience || '',
        education: user.psychologistDetails.education || '',
        languages: user.psychologistDetails.languages || []
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      await axios.put('http://localhost:5000/api/users/profile/psychologist', profile, config);

      setSuccess('Profile updated successfully!');
      setEditMode(false);

      // Update user context if needed
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImageUrl(previewUrl);
    }
  };

  const handleImageUpload = async () => {
    try {
      setLoading(true);

      if (uploadMethod === 'file' && selectedFile) {
        // Upload file to server
        const formData = new FormData();
        formData.append('profilePicture', selectedFile);

        const token = localStorage.getItem('token');
        const config = {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'multipart/form-data'
          }
        };

        // Try upload endpoint first, fallback to showing message if not available
        try {
          const response = await axios.put('http://localhost:5000/api/users/profile/upload', formData, config);
          if (response.data.success && response.data.user.profilePicture) {
            handleInputChange('profilePictureUrl', `http://localhost:5000${response.data.user.profilePicture}`);
            setSuccess('Profile picture updated successfully!');
          }
        } catch (uploadError) {
          if (uploadError.response?.status === 404) {
            setError('Profile picture upload requires server restart. Please restart the server to enable file uploads.');
          } else {
            throw uploadError; // Re-throw other errors
          }
        }
      } else if (uploadMethod === 'url' && imageUrl.trim()) {
        // Use URL method
        handleInputChange('profilePictureUrl', imageUrl.trim());
        setSuccess('Profile picture URL updated successfully!');
      }

      setImageDialogOpen(false);
      setImageUrl('');
      setSelectedFile(null);

      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile picture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Professional Profile
        </Typography>
        <Button
          variant={editMode ? "outlined" : "contained"}
          startIcon={<EditIcon />}
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? 'Cancel' : 'Edit Profile'}
        </Button>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Left Column - Profile Picture & Basic Info */}
        <Grid item xs={12} lg={3}>
          <Card sx={{ textAlign: 'center', p: 2, mb: 2 }}>
            <Avatar
              src={profile.profilePictureUrl}
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 2,
                bgcolor: 'primary.main',
                fontSize: '2rem'
              }}
            >
              {user?.name?.charAt(0)}
            </Avatar>
            {editMode && (
              <Button
                variant="outlined"
                startIcon={<PhotoCameraIcon />}
                onClick={() => setImageDialogOpen(true)}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              >
                Change Photo
              </Button>
            )}
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Dr. {user?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Licensed Psychologist
            </Typography>

            {/* Quick Stats */}
            <Box sx={{ textAlign: 'left', mt: 2 }}>
              {profile.age && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Age:</strong> {profile.age} years
                </Typography>
              )}
              {profile.experience && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Experience:</strong> {profile.experience}
                </Typography>
              )}
              {profile.languages.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    Languages:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {profile.languages.map((lang) => (
                      <Chip key={lang} label={lang} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Right Column - Detailed Information */}
        <Grid item xs={12} lg={9}>
          <Grid container spacing={2}>
            {/* Basic Information Row */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                Basic Information
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Age"
                type="number"
                value={profile.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                disabled={!editMode}
                slotProps={{ htmlInput: { min: 18, max: 100 } }}
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Years of Experience"
                value={profile.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                disabled={!editMode}
                placeholder="e.g., 5 years"
                size="small"
              />
            </Grid>

            {/* Education & Bio Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 2, color: 'primary.main' }}>
                Professional Background
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Education & Qualifications"
                multiline
                rows={2}
                value={profile.education}
                onChange={(e) => handleInputChange('education', e.target.value)}
                disabled={!editMode}
                placeholder="e.g., PhD in Clinical Psychology, University of Nairobi"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Professional Bio"
                multiline
                rows={3}
                value={profile.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                disabled={!editMode}
                placeholder="Tell clients about your approach and experience..."
                slotProps={{ htmlInput: { maxLength: 500 } }}
                helperText={`${profile.bio.length}/500 characters`}
              />
            </Grid>

            {/* Specializations & Services Section */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, mt: 2, color: 'primary.main' }}>
                Specializations & Services
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!editMode}>
                <InputLabel>Therapy Types Offered</InputLabel>
                <Select
                  multiple
                  value={profile.therapyTypes}
                  onChange={(e) => handleInputChange('therapyTypes', e.target.value)}
                  input={<OutlinedInput label="Therapy Types Offered" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {therapyTypeOptions.map((type) => (
                    <MenuItem key={type} value={type}>
                      <Checkbox checked={profile.therapyTypes.indexOf(type) > -1} />
                      <ListItemText primary={type} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!editMode}>
                <InputLabel>Languages</InputLabel>
                <Select
                  multiple
                  value={profile.languages}
                  onChange={(e) => handleInputChange('languages', e.target.value)}
                  input={<OutlinedInput label="Languages" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {languageOptions.map((language) => (
                    <MenuItem key={language} value={language}>
                      <Checkbox checked={profile.languages.indexOf(language) > -1} />
                      <ListItemText primary={language} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth disabled={!editMode}>
                <InputLabel>Areas of Specialization</InputLabel>
                <Select
                  multiple
                  value={profile.specializations}
                  onChange={(e) => handleInputChange('specializations', e.target.value)}
                  input={<OutlinedInput label="Areas of Specialization" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" color="primary" />
                      ))}
                    </Box>
                  )}
                >
                  {specializationOptions.map((spec) => (
                    <MenuItem key={spec} value={spec}>
                      <Checkbox checked={profile.specializations.indexOf(spec) > -1} />
                      <ListItemText primary={spec} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {editMode && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setEditMode(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    Save Changes
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>

      {/* Image Upload Dialog */}
      <Dialog open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Profile Picture</DialogTitle>
        <DialogContent>
          {/* Upload Method Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Choose Upload Method
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant={uploadMethod === 'file' ? 'contained' : 'outlined'}
                onClick={() => setUploadMethod('file')}
                size="small"
              >
                📁 Upload File
              </Button>
              <Button
                variant={uploadMethod === 'url' ? 'contained' : 'outlined'}
                onClick={() => setUploadMethod('url')}
                size="small"
              >
                🔗 Use URL
              </Button>
            </Box>
          </Box>

          {uploadMethod === 'file' ? (
            /* File Upload Section */
            <Box>
              <Typography variant="body1" gutterBottom>
                Select a photo from your computer:
              </Typography>
              <Box sx={{ mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="profile-picture-upload"
                  type="file"
                  onChange={handleFileSelect}
                />
                <label htmlFor="profile-picture-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoCameraIcon />}
                    fullWidth
                    sx={{ py: 2 }}
                  >
                    {selectedFile ? selectedFile.name : 'Choose Photo'}
                  </Button>
                </label>
              </Box>

              <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>📸 File Requirements:</strong><br />
                  • Supported formats: JPG, PNG, GIF<br />
                  • Maximum file size: 5MB<br />
                  • Recommended: Professional headshot photo<br />
                  • Square images work best for profile pictures
                </Typography>
              </Box>
            </Box>
          ) : (
            /* URL Upload Section */
            <Box>
              <Typography variant="body1" gutterBottom>
                Enter the URL of your profile photo:
              </Typography>

              <TextField
                fullWidth
                label="Image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/your-photo.jpg"
                sx={{ mb: 2 }}
              />

              <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  🔗 Quick URL Sources:
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>Google Drive:</strong> Upload → Share → "Anyone with link" → Copy link<br />
                  <strong>Free hosting:</strong> imgur.com, postimg.cc (no account needed)<br />
                  <strong>Social media:</strong> Right-click photo → "Copy image address"
                </Typography>
              </Box>
            </Box>
          )}

          {/* Image Preview */}
          {(imageUrl || selectedFile) && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="subtitle2" gutterBottom>
                Preview:
              </Typography>
              <Avatar
                src={imageUrl}
                sx={{
                  width: 100,
                  height: 100,
                  mx: 'auto',
                  border: '3px solid',
                  borderColor: 'primary.main'
                }}
              >
                {user?.name?.charAt(0)}
              </Avatar>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {selectedFile ? `File: ${selectedFile.name}` : 'URL Preview'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setImageDialogOpen(false);
              setImageUrl('');
              setSelectedFile(null);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImageUpload}
            variant="contained"
            disabled={loading || (!imageUrl && !selectedFile)}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Uploading...' : 'Update Photo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PsychologistProfile;