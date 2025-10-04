import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Container,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  CallEnd as CallEndIcon
} from '@mui/icons-material';
import axios from 'axios';

const VideoCallPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [callStarted, setCallStarted] = useState(false);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/sessions/${sessionId}`, {
        headers: { 'x-auth-token': token }
      });
      
      setSession(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch session:', err);
      setError('Session not found or you do not have permission to access it.');
      setLoading(false);
    }
  };

  const startVideoCall = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/sessions/${sessionId}/start-call`, {}, {
        headers: { 'x-auth-token': token }
      });
      
      setCallStarted(true);
      // In a real implementation, this would initialize WebRTC
      console.log('Video call started for session:', sessionId);
    } catch (err) {
      console.error('Failed to start video call:', err);
      setError('Failed to start video call');
    }
  };

  const endVideoCall = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/sessions/${sessionId}/end-call`, {}, {
        headers: { 'x-auth-token': token }
      });
      
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to end video call:', err);
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading video call...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </Container>
    );
  }

  if (!callStarted) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <VideocamIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            
            <Typography variant="h4" gutterBottom>
              Video Call Ready
            </Typography>
            
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {session.sessionType} Session
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
              <Chip 
                icon={<PersonIcon />}
                label={user.role === 'client' ? session.psychologist?.name : session.client?.name}
                color="primary"
              />
              <Chip 
                icon={<ScheduleIcon />}
                label={new Date(session.sessionDate).toLocaleString()}
                color="secondary"
              />
            </Box>
            
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>Before starting the call:</strong>
                <br />• Make sure your camera and microphone are working
                <br />• Find a quiet, private space
                <br />• Ensure stable internet connection
                <br />• Close unnecessary applications
              </Typography>
            </Alert>
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="large"
                startIcon={<VideocamIcon />}
                onClick={startVideoCall}
              >
                Start Video Call
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Video call interface (simplified for demo)
  return (
    <Box sx={{ height: '100vh', bgcolor: '#1a1a1a', color: 'white', position: 'relative' }}>
      {/* Header */}
      <Box sx={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        p: 2, 
        bgcolor: 'rgba(0,0,0,0.8)',
        zIndex: 10
      }}>
        <Typography variant="h6">
          Video Call - {session.sessionType} Session
        </Typography>
        <Typography variant="body2" color="grey.400">
          {user.role === 'client' ? `with ${session.psychologist?.name}` : `with ${session.client?.name}`}
        </Typography>
      </Box>

      {/* Video Area */}
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        pt: 8
      }}>
        <Paper sx={{ 
          width: '80%', 
          maxWidth: 800, 
          height: '60%', 
          bgcolor: '#2a2a2a', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 4
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <VideocamIcon sx={{ fontSize: 100, mb: 2, opacity: 0.5 }} />
            <Typography variant="h5" gutterBottom>
              Video Call Active
            </Typography>
            <Typography variant="body1" color="grey.400">
              This is a demo video call interface.
              <br />
              In production, this would show live video streams.
            </Typography>
          </Box>
        </Paper>

        {/* Controls */}
        <Button
          variant="contained"
          color="error"
          size="large"
          startIcon={<CallEndIcon />}
          onClick={endVideoCall}
        >
          End Call
        </Button>
      </Box>

      {/* Demo Notice */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 20, 
        left: 20, 
        right: 20,
        textAlign: 'center'
      }}>
        <Alert severity="info" sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', color: 'white' }}>
          <Typography variant="body2">
            🎥 <strong>Demo Mode:</strong> This is a simplified video call interface. 
            In production, this would include full WebRTC video/audio streaming, 
            screen sharing, chat, and recording capabilities.
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default VideoCallPage;