import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button, Alert, Container } from '@mui/material';
import VideoCallRoomNew from '../components/VideoCall/VideoCallRoomNew';
import VideoCallErrorDisplay from '../components/VideoCall/VideoCallErrorDisplay';
import { logError } from '../utils/videoCallErrors';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const VideoCallPageNew = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [canJoin, setCanJoin] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [sessionId]);

  const checkAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Check if user can join
      const canJoinRes = await axios.get(`${API_URL}/api/video-calls/can-join/${sessionId}`, {
        headers: { 'x-auth-token': token }
      });
      
      if (!canJoinRes.data.canJoin) {
        setError(canJoinRes.data.reason || 'Cannot join call at this time');
        setLoading(false);
        return;
      }
      
      // Get session details
      const sessionRes = await axios.get(`${API_URL}/api/video-calls/session/${sessionId}`, {
        headers: { 'x-auth-token': token }
      });
      
      setSession(sessionRes.data.session);
      setCanJoin(true);
      setLoading(false);
    } catch (err) {
      console.error('Access check failed:', err);
      
      // Log error for analytics
      logError(err, {
        action: 'access-check',
        sessionId,
        userAgent: navigator.userAgent
      });
      
      // Set appropriate error based on response
      let errorMessage = 'Failed to load session';
      if (err.response?.status === 404) {
        errorMessage = 'session-not-found';
      } else if (err.response?.status === 403) {
        errorMessage = 'unauthorized';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleCallEnd = () => {
    navigate('/dashboard');
  };

  const handleRetryAccess = () => {
    setError(null);
    setLoading(true);
    checkAccess();
  };

  const handleNavigateAway = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#1a1a1a' }}>
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6">Loading video call...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <VideoCallErrorDisplay
          error={error}
          onRetry={handleRetryAccess}
          onNavigateAway={handleNavigateAway}
          onClose={handleNavigateAway}
          context={{
            sessionId,
            action: 'page-access-check',
            userAgent: navigator.userAgent
          }}
          showAsDialog={false}
          autoRetry={false}
        />
      </Container>
    );
  }

  if (!canJoin || !session) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Unable to join video call
        </Alert>
        <Button variant="contained" fullWidth onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </Container>
    );
  }

  return <VideoCallRoomNew sessionId={sessionId} onCallEnd={handleCallEnd} />;
};

export default VideoCallPageNew;
