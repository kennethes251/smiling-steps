import React, { useState, useContext } from 'react';
import {
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Edit as EditIcon,
  Close as CloseIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PsychologistProfile from './PsychologistProfile';


const CompactProfile = ({ userType = 'psychologist' }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getDisplayName = () => {
    if (userType === 'psychologist') {
      return `Dr. ${user?.name || 'User'}`;
    }
    return user?.name || 'User';
  };

  const getSubtitle = () => {
    if (userType === 'psychologist') {
      return 'Licensed Psychologist';
    }
    return 'Client';
  };

  return (
    <>
      <Card sx={{ 
        mb: 3, 
        background: 'linear-gradient(135deg, #663399 0%, #9C27B0 100%)',
        color: 'white'
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Profile Picture (Display Only) */}
            <Avatar
              src={user?.profilePicture ? (user.profilePicture.startsWith('http') ? user.profilePicture : `http://localhost:5000${user.profilePicture}?t=${Date.now()}`) : null}
              sx={{
                width: 64,
                height: 64,
                fontSize: '1.5rem',
                fontWeight: 'bold',
                border: '3px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              {getInitials(user?.name)}
            </Avatar>

            {/* Name and Title */}
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {getDisplayName()}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {getSubtitle()}
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<PersonIcon />}
                onClick={() => setProfileDialogOpen(true)}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                View Profile
              </Button>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => navigate('/profile')}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                Edit Profile
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Full Profile Dialog */}
      <Dialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, #663399 0%, #9C27B0 100%)',
          color: 'white'
        }}>
          <Typography variant="h6">Professional Profile</Typography>
          <IconButton
            onClick={() => setProfileDialogOpen(false)}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {userType === 'psychologist' ? (
            <PsychologistProfile />
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Client Profile
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Client profile details would go here. This can be expanded to show
                client-specific information, preferences, and settings.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProfileDialogOpen(false)}>
            Close
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setProfileDialogOpen(false);
              navigate('/profile');
            }}
          >
            Edit Profile
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CompactProfile;