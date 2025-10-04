import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import axios from 'axios';

const QuickVideoCall = ({ open, onClose, session = null, psychologists = [] }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPsychologist, setSelectedPsychologist] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');

  const startVideoCall = async () => {
    try {
      setLoading(true);
      setError('');

      if (session) {
        // Join existing session
        navigate(`/video-call/${session._id}`);
      } else {
        // For now, redirect to booking page for new sessions
        // In future, we can implement instant sessions
        setError('Please book a session first to start a video call');
        setTimeout(() => {
          navigate('/bookings');
        }, 2000);
      }
    } catch (err) {
      console.error('Error starting video call:', err);
      setError(err.response?.data?.message || 'Failed to start video call');
    } finally {
      setLoading(false);
    }
  };

  const generateMeetingLink = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Generate a meeting link for the session
      const meetingLink = `${window.location.origin}/video-call/${session._id}`;
      
      await axios.put(`http://localhost:5000/api/sessions/${session._id}/link`, {
        meetingLink
      }, {
        headers: { 'x-auth-token': token }
      });

      // Copy to clipboard
      navigator.clipboard.writeText(meetingLink);
      alert('Meeting link copied to clipboard!');
      onClose();
    } catch (err) {
      console.error('Error generating meeting link:', err);
      setError('Failed to generate meeting link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <VideocamIcon color="primary" />
        {session ? 'Join Video Call' : 'Start Video Call'}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {session ? (
          // Existing session
          <Box>
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Session Details
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PersonIcon fontSize="small" />
                <Typography variant="body2">
                  {user.role === 'client' ? session.psychologist?.name : session.client?.name}
                </Typography>
                <Chip 
                  label={session.sessionType} 
                  size="small" 
                  color="primary" 
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon fontSize="small" />
                <Typography variant="body2">
                  {new Date(session.sessionDate).toLocaleString()}
                </Typography>
                <Chip 
                  label={session.status} 
                  size="small" 
                  color={session.status === 'Booked' ? 'success' : 'warning'} 
                />
              </Box>
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Click "Join Call" to enter the video session. Make sure your camera and microphone are working properly.
            </Typography>

            {user.role === 'psychologist' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                As the psychologist, you can generate a meeting link to share with your client.
              </Alert>
            )}
          </Box>
        ) : (
          // New session needed
          <Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              To start a video call, you need to book a session first.
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>How to start a video call:</strong>
                <br />1. Book a session with a psychologist
                <br />2. Wait for approval
                <br />3. Join the video call when it's time
              </Typography>
            </Alert>

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> Video calls are available for booked sessions only. 
                This ensures proper scheduling and preparation for both parties.
              </Typography>
            </Alert>
          </Box>
        )}

        {/* System Requirements */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            📋 System Requirements:
          </Typography>
          <Typography variant="body2" component="div">
            • Modern web browser (Chrome, Firefox, Safari, Edge)
            <br />
            • Camera and microphone access
            <br />
            • Stable internet connection (minimum 1 Mbps)
            <br />
            • Quiet, private environment
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        
        {session && user.role === 'psychologist' && (
          <Button 
            onClick={generateMeetingLink} 
            disabled={loading}
            variant="outlined"
          >
            Generate Link
          </Button>
        )}
        
        <Button 
          onClick={startVideoCall} 
          variant="contained" 
          disabled={loading}
          startIcon={<VideocamIcon />}
        >
          {loading ? 'Starting...' : session ? 'Join Call' : 'Book Session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickVideoCall;