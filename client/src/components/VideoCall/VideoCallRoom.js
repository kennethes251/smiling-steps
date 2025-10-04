import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  CallEnd as CallEndIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';

const VideoCallRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  // Video call state
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, ended
  const [participants, setParticipants] = useState([]);
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Session notes (for psychologists)
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  
  // Video refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const roomContainerRef = useRef(null);

  // Initialize video call
  useEffect(() => {
    initializeVideoCall();
    return () => {
      cleanup();
    };
  }, [sessionId]);

  const initializeVideoCall = async () => {
    try {
      setLoading(true);
      
      // Fetch session details
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_ENDPOINTS.SESSIONS}/${sessionId}`, {
        headers: { 'x-auth-token': token }
      });
      
      setSession(response.data);
      
      // Initialize media devices
      await initializeMedia();
      
      // Set up WebRTC (simplified for demo)
      setupWebRTC();
      
      setCallStatus('connected');
      setLoading(false);
      
    } catch (err) {
      console.error('Failed to initialize video call:', err);
      setError('Failed to initialize video call. Please check your camera and microphone permissions.');
      setLoading(false);
    }
  };

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Add participant (self)
      setParticipants(prev => [...prev, {
        id: user.id,
        name: user.name,
        role: user.role,
        stream: stream
      }]);
      
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Unable to access camera or microphone. Please check your permissions.');
    }
  };

  const setupWebRTC = () => {
    // Simplified WebRTC setup for demo
    // In production, you'd use a signaling server (Socket.io, WebSocket)
    console.log('Setting up WebRTC connection...');
    
    // For demo purposes, simulate remote participant after 2 seconds
    setTimeout(() => {
      if (session) {
        const remoteParticipant = {
          id: user.role === 'client' ? session.psychologist._id : session.client._id,
          name: user.role === 'client' ? session.psychologist.name : session.client.name,
          role: user.role === 'client' ? 'psychologist' : 'client',
          stream: null // In real implementation, this would be the remote stream
        };
        
        setParticipants(prev => [...prev, remoteParticipant]);
      }
    }, 2000);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Replace video track with screen share
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        
        // Listen for screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          // Switch back to camera
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        };
      } else {
        // Stop screen sharing and switch back to camera
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        setIsScreenSharing(false);
      }
    } catch (err) {
      console.error('Error with screen sharing:', err);
      setError('Screen sharing failed. Please try again.');
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (roomContainerRef.current?.requestFullscreen) {
        roomContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const endCall = async () => {
    try {
      // Mark session as completed if psychologist
      if (user.role === 'psychologist' && session) {
        const token = localStorage.getItem('token');
        await axios.post(`${API_ENDPOINTS.SESSIONS}/${sessionId}/complete`, {
          sessionNotes: sessionNotes || 'Video call completed successfully'
        }, {
          headers: { 'x-auth-token': token }
        });
      }
      
      cleanup();
      navigate('/dashboard');
    } catch (err) {
      console.error('Error ending call:', err);
      cleanup();
      navigate('/dashboard');
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    setCallStatus('ended');
  };

  const sendChatMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        sender: user.name,
        senderRole: user.role,
        message: newMessage.trim(),
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const saveSessionNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_ENDPOINTS.SESSIONS}/${sessionId}/complete`, {
        sessionNotes
      }, {
        headers: { 'x-auth-token': token }
      });
      
      setShowNotesDialog(false);
      alert('Session notes saved successfully!');
    } catch (err) {
      console.error('Error saving notes:', err);
      setError('Failed to save session notes');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Connecting to video call...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box ref={roomContainerRef} sx={{ height: '100vh', bgcolor: '#1a1a1a', color: 'white', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">
            {session?.sessionType} Session
          </Typography>
          <Typography variant="body2" color="grey.400">
            {session && `with ${user.role === 'client' ? session.psychologist?.name : session.client?.name}`}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip 
            label={`${participants.length} participant${participants.length !== 1 ? 's' : ''}`}
            color="primary" 
            size="small" 
          />
          <Chip 
            label={callStatus} 
            color={callStatus === 'connected' ? 'success' : 'warning'} 
            size="small" 
          />
        </Box>
      </Box>

      {/* Video Grid */}
      <Box sx={{ flex: 1, p: 2, height: 'calc(100vh - 140px)' }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Local Video */}
          <Grid size={{ xs: 12, md: showChat ? 8 : 6 }}>
            <Paper sx={{ height: '100%', bgcolor: '#2a2a2a', position: 'relative', overflow: 'hidden' }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: '#000'
                }}
              />
              <Box sx={{ 
                position: 'absolute', 
                bottom: 8, 
                left: 8, 
                bgcolor: 'rgba(0,0,0,0.7)', 
                px: 1, 
                py: 0.5, 
                borderRadius: 1 
              }}>
                <Typography variant="caption">
                  You ({user.role})
                </Typography>
              </Box>
              {!isVideoEnabled && (
                <Box sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <VideocamOffIcon sx={{ fontSize: 60, mb: 1 }} />
                  <Typography>Camera Off</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Remote Video */}
          <Grid size={{ xs: 12, md: showChat ? 4 : 6 }}>
            <Paper sx={{ height: '100%', bgcolor: '#2a2a2a', position: 'relative', overflow: 'hidden' }}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: '#000'
                }}
              />
              <Box sx={{ 
                position: 'absolute', 
                bottom: 8, 
                left: 8, 
                bgcolor: 'rgba(0,0,0,0.7)', 
                px: 1, 
                py: 0.5, 
                borderRadius: 1 
              }}>
                <Typography variant="caption">
                  {participants.length > 1 ? participants[1].name : 'Waiting for participant...'}
                </Typography>
              </Box>
              {participants.length === 1 && (
                <Box sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography>Waiting for other participant...</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Chat Panel */}
          {showChat && (
            <Grid item xs={12} md={4}>
              <Paper sx={{ height: '100%', bgcolor: '#2a2a2a', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid #444' }}>
                  <Typography variant="h6">Chat</Typography>
                </Box>
                
                <Box sx={{ flex: 1, p: 1, overflowY: 'auto' }}>
                  {chatMessages.map((msg) => (
                    <Box key={msg.id} sx={{ mb: 1, p: 1, bgcolor: msg.senderRole === user.role ? '#1976d2' : '#444', borderRadius: 1 }}>
                      <Typography variant="caption" color="grey.300">
                        {msg.sender}
                      </Typography>
                      <Typography variant="body2">
                        {msg.message}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                
                <Box sx={{ p: 2, borderTop: '1px solid #444', display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        color: 'white',
                        '& fieldset': { borderColor: '#444' }
                      }
                    }}
                  />
                  <Button variant="contained" size="small" onClick={sendChatMessage}>
                    Send
                  </Button>
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Controls */}
      <Box sx={{ 
        position: 'fixed', 
        bottom: 20, 
        left: '50%', 
        transform: 'translateX(-50%)',
        display: 'flex', 
        gap: 1,
        bgcolor: 'rgba(0,0,0,0.8)',
        p: 1,
        borderRadius: 2
      }}>
        <IconButton 
          onClick={toggleVideo} 
          sx={{ 
            bgcolor: isVideoEnabled ? 'primary.main' : 'error.main',
            color: 'white',
            '&:hover': { bgcolor: isVideoEnabled ? 'primary.dark' : 'error.dark' }
          }}
        >
          {isVideoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
        </IconButton>

        <IconButton 
          onClick={toggleAudio}
          sx={{ 
            bgcolor: isAudioEnabled ? 'primary.main' : 'error.main',
            color: 'white',
            '&:hover': { bgcolor: isAudioEnabled ? 'primary.dark' : 'error.dark' }
          }}
        >
          {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
        </IconButton>

        <IconButton onClick={toggleScreenShare} sx={{ bgcolor: 'grey.700', color: 'white' }}>
          {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
        </IconButton>

        <IconButton onClick={() => setShowChat(!showChat)} sx={{ bgcolor: 'grey.700', color: 'white' }}>
          <ChatIcon />
        </IconButton>

        <IconButton onClick={toggleFullscreen} sx={{ bgcolor: 'grey.700', color: 'white' }}>
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </IconButton>

        {user.role === 'psychologist' && (
          <IconButton onClick={() => setShowNotesDialog(true)} sx={{ bgcolor: 'grey.700', color: 'white' }}>
            <SettingsIcon />
          </IconButton>
        )}

        <IconButton 
          onClick={endCall}
          sx={{ 
            bgcolor: 'error.main',
            color: 'white',
            '&:hover': { bgcolor: 'error.dark' }
          }}
        >
          <CallEndIcon />
        </IconButton>
      </Box>

      {/* Session Notes Dialog (Psychologist only) */}
      <Dialog open={showNotesDialog} onClose={() => setShowNotesDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Session Notes</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            placeholder="Enter session notes..."
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNotesDialog(false)}>Cancel</Button>
          <Button onClick={saveSessionNotes} variant="contained">Save Notes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoCallRoom;