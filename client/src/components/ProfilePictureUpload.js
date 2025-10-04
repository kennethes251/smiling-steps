import React, { useState, useRef } from 'react';
import {
  Box,
  Avatar,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const ProfilePictureUpload = ({ 
  currentImage, 
  userName, 
  onImageUpdate, 
  size = 120 
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target.result);
      setDialogOpen(true);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    handleFileSelect(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const uploadImage = async () => {
    if (!previewImage) return;

    setUploading(true);
    try {
      // Convert base64 to blob
      const response = await fetch(previewImage);
      const blob = await response.blob();
      
      // Create FormData
      const formData = new FormData();
      formData.append('profilePicture', blob, 'profile.jpg');

      // Upload to server
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      };

      const uploadResponse = await axios.post(`${API_ENDPOINTS.UPLOAD}/profile-picture`, formData, config);
      
      // Update parent component
      if (onImageUpdate) {
        onImageUpdate(uploadResponse.data.profilePicture);
      }

      setDialogOpen(false);
      setPreviewImage(null);
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      await axios.delete(`${API_ENDPOINTS.UPLOAD}/profile-picture`, config);
      
      if (onImageUpdate) {
        onImageUpdate(null);
      }
    } catch (error) {
      console.error('Remove image error:', error);
      setError('Failed to remove image');
    }
  };

  return (
    <>
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        {/* Profile Avatar */}
        <Avatar
          src={currentImage ? (currentImage.startsWith('http') ? currentImage : `${API_ENDPOINTS.BASE_URL}${currentImage}?t=${Date.now()}`) : null}
          sx={{
            width: size,
            height: size,
            fontSize: size / 3,
            fontWeight: 'bold',
            cursor: 'pointer',
            border: '3px solid',
            borderColor: 'primary.main',
            '&:hover': {
              opacity: 0.8
            }
          }}
          onClick={() => setDialogOpen(true)}
        >
          {getInitials(userName)}
        </Avatar>

        {/* Edit Button Overlay */}
        <IconButton
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            backgroundColor: 'primary.main',
            color: 'white',
            width: 32,
            height: 32,
            '&:hover': {
              backgroundColor: 'primary.dark'
            }
          }}
          onClick={() => setDialogOpen(true)}
        >
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Profile Picture</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Current/Preview Image */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Avatar
              src={previewImage || (currentImage ? (currentImage.startsWith('http') ? currentImage : `${API_ENDPOINTS.BASE_URL}${currentImage}?t=${Date.now()}`) : null)}
              sx={{
                width: 150,
                height: 150,
                mx: 'auto',
                mb: 2,
                fontSize: '3rem'
              }}
            >
              {getInitials(userName)}
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              {previewImage ? 'Preview' : 'Current Picture'}
            </Typography>
          </Box>

          {/* Upload Area */}
          <Box
            sx={{
              border: '2px dashed',
              borderColor: dragOver ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              backgroundColor: dragOver ? 'primary.light' : 'grey.50',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Drag & drop an image here
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              or click to select a file
            </Typography>
            <Button variant="outlined" startIcon={<PhotoCameraIcon />}>
              Choose Image
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Supported: JPG, PNG, GIF (max 5MB)
            </Typography>
          </Box>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          {currentImage && (
            <Button onClick={removeImage} color="error">
              Remove Picture
            </Button>
          )}
          {previewImage && (
            <Button 
              onClick={uploadImage} 
              variant="contained" 
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProfilePictureUpload;