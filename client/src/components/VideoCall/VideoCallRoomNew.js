import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography, Paper, CircularProgress, Alert, Chip } from '@mui/material';
import {
  Videocam, VideocamOff, Mic, MicOff, CallEnd, 
  ScreenShare, StopScreenShare
} from '@mui/icons-material';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import axios from 'axios';
import VideoCallErrorDisplay from './VideoCallErrorDisplay';
import PermissionRequestFlow from './PermissionRequestFlow';
import NetworkQualityIndicator from './NetworkQualityIndicator';
import QuickHelpPanel from './QuickHelpPanel';
import TroubleshootingGuide from './TroubleshootingGuide';
import ConnectionDegradationManager from './ConnectionDegradationManager';
import { logError } from '../../utils/videoCallErrors';
import { 
  getMediaConstraints, 
  createReconnectionStrategy,
  QUALITY_LEVELS 
} from '../../utils/connectionDegradation';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const VideoCallRoomNew = ({ sessionId, onCallEnd }) => {
  // State management
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [iceServers, setIceServers] = useState([]);
  const [showPermissionFlow, setShowPermissionFlow] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [networkQuality, setNetworkQuality] = useState('unknown');
  const [showTroubleshootingGuide, setShowTroubleshootingGuide] = useState(false);
  const [currentVideoQuality, setCurrentVideoQuality] = useState('HIGH');
  const [networkStats, setNetworkStats] = useState(null);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [degradationEnabled, setDegradationEnabled] = useState(true);
  
  // Refs
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const socketRef = useRef();
  const callStartTimeRef = useRef();
  const durationIntervalRef = useRef();
  const screenStreamRef = useRef();

  useEffect(() => {
    initializeCall();
    return () => cleanup();
  }, [sessionId]);

  const initializeCall = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Get WebRTC config and room info
      const token = localStorage.getItem('token');
      const [configRes, roomRes] = await Promise.all([
        axios.get(`${API_URL}/api/video-calls/config`, {
          headers: { 'x-auth-token': token }
        }),
        axios.post(`${API_URL}/api/video-calls/generate-room/${sessionId}`, {}, {
          headers: { 'x-auth-token': token }
        })
      ]);
      
      setIceServers(configRes.data.iceServers);
      setRoomData(roomRes.data);
      
      console.log('🎥 Room generated:', roomRes.data.roomId);
      console.log('🌐 ICE servers:', configRes.data.iceServers.length);
      
      // Get user media with adaptive quality based on network conditions
      let stream;
      try {
        // Start with high quality, degradation manager will adjust if needed
        const constraints = getMediaConstraints(currentVideoQuality);
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaError) {
        console.error('Media access error:', mediaError);
        
        // Handle specific media errors
        if (mediaError.name === 'NotAllowedError') {
          setShowPermissionFlow(true);
          setPermissionError(mediaError);
          return;
        } else if (mediaError.name === 'OverconstrainedError') {
          // Try with progressively lower quality settings
          try {
            let fallbackStream = null;
            const fallbackQualities = ['MEDIUM', 'LOW', 'AUDIO_ONLY'];
            
            for (const quality of fallbackQualities) {
              try {
                const fallbackConstraints = getMediaConstraints(quality);
                fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                setCurrentVideoQuality(quality);
                console.log(`📹 Using fallback video quality: ${QUALITY_LEVELS[quality].label}`);
                break;
              } catch (fallbackError) {
                console.warn(`Failed to get ${quality} quality:`, fallbackError);
                continue;
              }
            }
            
            if (!fallbackStream) {
              throw new Error('Unable to get media with any quality level');
            }
            
            stream = fallbackStream;
          } catch (fallbackError) {
            throw fallbackError;
          }
        } else {
          throw mediaError;
        }
      }
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      console.log('📹 Local stream acquired');
      
      // Connect to signaling server
      connectToSignalingServer(roomRes.data.roomId, stream, configRes.data.iceServers);
      
      // Start call timer
      callStartTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        setCallDuration(elapsed);
      }, 1000);
      
      // Notify backend that call started
      await axios.post(`${API_URL}/api/video-calls/start/${sessionId}`, {}, {
        headers: { 'x-auth-token': token }
      });
      
      console.log('✅ Call initialized successfully');
      
    } catch (err) {
      console.error('❌ Failed to initialize call:', err);
      
      // Log error for analytics
      logError(err, {
        action: 'initialize-call',
        sessionId,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      
      // Set appropriate error message
      let errorMessage = 'Failed to initialize video call';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.name) {
        errorMessage = err.name;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setConnectionStatus('failed');
    }
  };

  const connectToSignalingServer = (roomId, stream, servers) => {
    // Enhanced Socket.io connection with security
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      auth: { 
        token: localStorage.getItem('token')
      },
      query: {
        token: localStorage.getItem('token') // Fallback for auth
      },
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 10000,
      // Force secure transport in production
      secure: process.env.NODE_ENV === 'production',
      upgrade: true
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('🔐 Securely connected to signaling server');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      socket.emit('join-room', {
        roomId,
        sessionId: sessionId
      });
    });
    
    // Handle successful join
    socket.on('join-success', ({ participantCount, secureConnection }) => {
      console.log(`✅ Successfully joined room. Participants: ${participantCount}, Secure: ${secureConnection}`);
      setConnectionStatus('connected');
    });
    
    // Handle join errors
    socket.on('join-error', ({ error }) => {
      console.error('❌ Failed to join room:', error);
      logError(new Error(error), {
        action: 'join-room',
        sessionId,
        roomId: roomId
      });
      setError('signaling-error');
      setConnectionStatus('failed');
    });
    
    socket.on('existing-participants', (participants) => {
      console.log('👥 Existing participants:', participants.length);
      if (participants.length > 0) {
        // Create peer as initiator
        createPeer(participants[0].socketId, stream, servers, true);
      }
      setConnectionStatus('waiting');
    });
    
    socket.on('user-joined', ({ socketId, userName }) => {
      console.log('👤 User joined:', userName);
      // Create peer as receiver
      createPeer(socketId, stream, servers, false);
    });
    
    socket.on('offer', ({ offer, from, roomId: offerRoomId, timestamp }) => {
      console.log(`🔐 Received secure offer from: ${from} at ${timestamp}`);
      if (offerRoomId === roomId) {
        handleOffer(offer, from, stream, servers);
      } else {
        console.warn('🔒 Rejected offer from different room');
      }
    });
    
    socket.on('answer', ({ answer, roomId: answerRoomId, timestamp }) => {
      console.log(`🔐 Received secure answer at ${timestamp}`);
      if (answerRoomId === roomId && peerRef.current) {
        peerRef.current.signal(answer);
      }
    });
    
    socket.on('ice-candidate', ({ candidate, roomId: candidateRoomId, timestamp }) => {
      console.log(`🔐 Received secure ICE candidate at ${timestamp}`);
      if (candidateRoomId === roomId && peerRef.current && candidate) {
        peerRef.current.signal(candidate);
      } else if (candidateRoomId !== roomId) {
        console.warn('🔒 Rejected ICE candidate from different room');
      }
    });
    
    // Handle signaling errors
    socket.on('signaling-error', ({ error }) => {
      console.error('🔒 Signaling security error:', error);
      logError(new Error(error), {
        action: 'signaling-error',
        sessionId,
        roomId: roomId
      });
      setError('signaling-error');
    });
    
    socket.on('user-left', ({ userName }) => {
      console.log('👋 User left:', userName);
      setConnectionStatus('disconnected');
      setRemoteStream(null);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    });

    // Handle call lifecycle events
    socket.on('call-started', ({ startTime, sessionId }) => {
      console.log('🎥 Call started:', startTime);
      callStartTimeRef.current = new Date(startTime).getTime();
      setConnectionStatus('connected');
    });

    socket.on('call-ended', ({ endTime, duration, sessionId }) => {
      console.log('🎥 Call ended. Duration:', duration, 'minutes');
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      setCallDuration(duration * 60); // Convert to seconds for display
    });

    socket.on('call-status', ({ status, startTime }) => {
      if (status === 'in-progress' && startTime) {
        callStartTimeRef.current = new Date(startTime).getTime();
        setConnectionStatus('connected');
      }
    });

    socket.on('call-error', ({ error }) => {
      console.error('Call error:', error);
      logError(new Error(error), {
        action: 'call-error',
        sessionId,
        roomId: roomId
      });
      setError('system-error');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      logError(err, {
        action: 'socket-connect-error',
        sessionId
      });
      setError('signaling-error');
    });
  };

  const createPeer = (targetSocketId, stream, servers, initiator) => {
    console.log(`🔗 Creating peer connection (initiator: ${initiator})`);
    
    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
      config: { iceServers: servers }
    });
    
    peer.on('signal', (signal) => {
      const eventName = signal.type === 'offer' ? 'offer' : 
                       signal.type === 'answer' ? 'answer' : 'ice-candidate';
      
      console.log(`📤 Sending secure ${eventName}`);
      socketRef.current.emit(eventName, {
        [signal.type || 'candidate']: signal,
        to: targetSocketId,
        roomId: roomData?.roomId // Include roomId for security validation
      });
    });
    
    peer.on('stream', (remoteStream) => {
      console.log('📺 Received remote stream');
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setConnectionStatus('connected');
    });
    
    peer.on('error', (err) => {
      console.error('❌ Peer error:', err);
      logError(err, {
        action: 'peer-connection-error',
        sessionId,
        roomId: roomData?.roomId
      });
      setError('connection-failed');
    });
    
    peer.on('close', () => {
      console.log('🔌 Peer connection closed');
      setConnectionStatus('disconnected');
    });
    
    peerRef.current = peer;
  };

  const handleOffer = (offer, from, stream, servers) => {
    console.log('📨 Handling offer from:', from);
    
    const peer = new Peer({
      initiator: false,
      trickle: true,
      stream,
      config: { iceServers: servers }
    });
    
    peer.on('signal', (signal) => {
      console.log('📤 Sending answer');
      socketRef.current.emit('answer', { answer: signal, to: from });
    });
    
    peer.on('stream', (remoteStream) => {
      console.log('📺 Received remote stream');
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setConnectionStatus('connected');
    });
    
    peer.on('error', (err) => {
      console.error('❌ Peer error:', err);
      logError(err, {
        action: 'peer-answer-error',
        sessionId,
        roomId: roomData?.roomId
      });
      setError('connection-failed');
    });
    
    peer.signal(offer);
    peerRef.current = peer;
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log(`📹 Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log(`🎤 Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });
        
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track in peer connection
        if (peerRef.current && peerRef.current._pc) {
          const sender = peerRef.current._pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }
        
        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        // Handle screen share stop
        screenTrack.onended = () => {
          stopScreenShare();
        };
        
        setIsScreenSharing(true);
        console.log('🖥️ Screen sharing started');
      } else {
        stopScreenShare();
      }
    } catch (err) {
      console.error('Screen share error:', err);
      logError(err, {
        action: 'screen-share-error',
        sessionId
      });
      
      if (err.name === 'NotAllowedError') {
        setError('screen-share-denied');
      } else {
        setError('screen-share-error');
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Restore camera video
    if (localStream && peerRef.current && peerRef.current._pc) {
      const videoTrack = localStream.getVideoTracks()[0];
      const sender = peerRef.current._pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
    }
    
    // Restore local video display
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    
    setIsScreenSharing(false);
    console.log('🖥️ Screen sharing stopped');
  };

  const endCall = async () => {
    try {
      // Notify via socket for real-time updates
      if (socketRef.current && roomData) {
        socketRef.current.emit('end-call', {
          roomId: roomData.roomId,
          sessionId: sessionId
        });
      }
      
      // Also call the REST API as backup
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/video-calls/end/${sessionId}`, {}, {
        headers: { 'x-auth-token': token }
      });
      console.log('📞 Call ended');
    } catch (err) {
      console.error('Failed to end call:', err);
    }
    
    cleanup();
    if (onCallEnd) onCallEnd();
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up...');
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connecting': return 'Connecting...';
      case 'waiting': return 'Waiting for other participant...';
      case 'connected': return 'Connected';
      case 'disconnected': return 'Participant disconnected';
      case 'failed': return 'Connection failed';
      default: return 'Unknown status';
    }
  };

  const handlePermissionsGranted = () => {
    setShowPermissionFlow(false);
    setPermissionError(null);
    // Retry initialization
    initializeCall();
  };

  const handlePermissionsDenied = (error) => {
    setShowPermissionFlow(false);
    setPermissionError(error);
    setError('NotAllowedError');
    setConnectionStatus('failed');
  };

  const handleRetryConnection = () => {
    setError(null);
    setConnectionStatus('connecting');
    initializeCall();
  };

  const handleNavigateAway = () => {
    cleanup();
    if (onCallEnd) onCallEnd();
  };

  const handleNetworkQualityChange = (quality, stats) => {
    const previousQuality = networkQuality;
    setNetworkQuality(quality);
    setNetworkStats(stats);
    
    // Log quality changes for monitoring
    if (quality === 'poor' || quality === 'offline') {
      logError(new Error(`Network quality degraded: ${quality}`), {
        action: 'network-quality-change',
        sessionId,
        quality,
        stats,
        previousQuality,
        timestamp: new Date().toISOString()
      });
    }
    
    // Show notifications for significant quality changes
    if (previousQuality !== 'unknown' && previousQuality !== quality) {
      if (quality === 'poor' || quality === 'offline') {
        console.warn(`Network quality changed from ${previousQuality} to ${quality}`);
        // Degradation manager will handle this automatically
      } else if (quality === 'excellent' && (previousQuality === 'poor' || previousQuality === 'fair')) {
        console.log(`Network quality improved from ${previousQuality} to ${quality}`);
      }
    }
  };

  const handleQualityChange = (newQuality) => {
    console.log(`📹 Video quality changed: ${currentVideoQuality} → ${newQuality}`);
    setCurrentVideoQuality(newQuality);
  };

  const handleStreamChange = (newStream) => {
    console.log('📹 Stream updated by degradation manager');
    setLocalStream(newStream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = newStream;
    }
  };

  const handleReconnectionNeeded = async (strategy) => {
    if (isReconnecting) return;
    
    console.log('🔄 Reconnection needed:', strategy);
    setIsReconnecting(true);
    setReconnectionAttempts(prev => prev + 1);
    
    try {
      // Wait for the recommended delay
      if (strategy.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, strategy.delay));
      }
      
      // Attempt to reinitialize the call
      await initializeCall();
      
      console.log('✅ Reconnection successful');
      setReconnectionAttempts(0);
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      
      // Try again if we haven't exceeded max attempts
      if (strategy.shouldRetry) {
        const nextStrategy = createReconnectionStrategy(networkQuality, reconnectionAttempts);
        if (nextStrategy.shouldRetry) {
          setTimeout(() => handleReconnectionNeeded(nextStrategy), 1000);
        } else {
          // Give up and show error
          setError('connection-failed');
          setConnectionStatus('failed');
        }
      }
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <Box sx={{ height: '100vh', bgcolor: '#1a1a1a', position: 'relative', overflow: 'hidden' }}>
      {/* Remote Video (Main) */}
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        {remoteStream ? (
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
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: 'white',
            gap: 2
          }}>
            {connectionStatus !== 'failed' && <CircularProgress sx={{ mb: 2 }} />}
            <Typography variant="h6">{getStatusMessage()}</Typography>
            {roomData && (
              <Typography variant="body2" color="grey.400">
                Room: {roomData.roomId.substring(0, 20)}...
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Session Status Indicator */}
      {connectionStatus === 'connected' && (
        <Paper
          sx={{
            position: 'absolute',
            top: 20,
            right: 280,
            px: 2,
            py: 1,
            bgcolor: 'rgba(76, 175, 80, 0.9)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderRadius: 2,
            animation: 'slideIn 0.5s ease-out',
            '@keyframes slideIn': {
              '0%': { transform: 'translateX(100%)', opacity: 0 },
              '100%': { transform: 'translateX(0)', opacity: 1 }
            }
          }}
        >
          <Box sx={{ 
            width: 6, 
            height: 6, 
            borderRadius: '50%', 
            bgcolor: 'white',
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 }
            }
          }} />
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            Session In Progress
          </Typography>
        </Paper>
      )}

      {/* Local Video (Picture-in-Picture) */}
      {localStream && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 240,
            height: 180,
            overflow: 'hidden',
            borderRadius: 2,
            border: '2px solid',
            borderColor: connectionStatus === 'connected' ? 'success.main' : 'primary.main'
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              transform: isScreenSharing ? 'none' : 'scaleX(-1)',
              backgroundColor: '#000'
            }}
          />
          {!isVideoEnabled && (
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.8)',
              color: 'white'
            }}>
              <VideocamOff />
            </Box>
          )}
        </Paper>
      )}

      {/* Call Duration and Status */}
      <Paper
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          px: 2,
          py: 1,
          bgcolor: 'rgba(0,0,0,0.8)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 0.5,
          minWidth: 200
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            bgcolor: connectionStatus === 'connected' ? 'success.main' : 'error.main',
            animation: connectionStatus === 'connected' ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 }
            }
          }} />
          <Typography variant="h6">{formatDuration(callDuration)}</Typography>
          {connectionStatus === 'connected' && peerRef.current && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NetworkQualityIndicator
                peerConnection={peerRef.current}
                onQualityChange={handleNetworkQualityChange}
              />
              {networkQuality !== 'unknown' && networkQuality !== 'excellent' && (
                <Chip
                  label={networkQuality.toUpperCase()}
                  size="small"
                  color={
                    networkQuality === 'good' ? 'success' :
                    networkQuality === 'fair' ? 'warning' : 'error'
                  }
                  sx={{ 
                    fontSize: '0.7rem',
                    height: 20,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    '& .MuiChip-label': { px: 1 }
                  }}
                />
              )}
            </Box>
          )}
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {getStatusMessage()}
        </Typography>
        {roomData && (
          <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.7rem' }}>
            Session: {roomData.sessionType}
          </Typography>
        )}
      </Paper>

      {/* Controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 2,
          bgcolor: 'rgba(0,0,0,0.8)',
          p: 2,
          borderRadius: 3,
          backdropFilter: 'blur(10px)'
        }}
      >
        <IconButton
          onClick={toggleVideo}
          sx={{ 
            bgcolor: isVideoEnabled ? 'primary.main' : 'error.main',
            color: 'white',
            '&:hover': { bgcolor: isVideoEnabled ? 'primary.dark' : 'error.dark' },
            width: 56,
            height: 56
          }}
        >
          {isVideoEnabled ? <Videocam /> : <VideocamOff />}
        </IconButton>

        <IconButton
          onClick={toggleAudio}
          sx={{ 
            bgcolor: isAudioEnabled ? 'primary.main' : 'error.main',
            color: 'white',
            '&:hover': { bgcolor: isAudioEnabled ? 'primary.dark' : 'error.dark' },
            width: 56,
            height: 56
          }}
        >
          {isAudioEnabled ? <Mic /> : <MicOff />}
        </IconButton>

        <IconButton
          onClick={toggleScreenShare}
          sx={{ 
            bgcolor: isScreenSharing ? 'success.main' : 'primary.main',
            color: 'white',
            '&:hover': { bgcolor: isScreenSharing ? 'success.dark' : 'primary.dark' },
            width: 56,
            height: 56
          }}
        >
          {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
        </IconButton>

        <IconButton
          onClick={endCall}
          sx={{ 
            bgcolor: 'error.main',
            color: 'white',
            '&:hover': { bgcolor: 'error.dark' },
            width: 56,
            height: 56
          }}
        >
          <CallEnd />
        </IconButton>
      </Box>

      {/* Permission Request Flow */}
      {showPermissionFlow && (
        <PermissionRequestFlow
          onPermissionsGranted={handlePermissionsGranted}
          onPermissionsDenied={handlePermissionsDenied}
          onClose={() => setShowPermissionFlow(false)}
          showAsDialog={true}
        />
      )}

      {/* Network Quality Warning */}
      {networkQuality === 'poor' && connectionStatus === 'connected' && (
        <Alert
          severity="warning"
          sx={{
            position: 'absolute',
            top: 80,
            left: 20,
            right: 20,
            zIndex: 1000,
            animation: 'slideDown 0.5s ease-out',
            '@keyframes slideDown': {
              '0%': { transform: 'translateY(-100%)', opacity: 0 },
              '100%': { transform: 'translateY(0)', opacity: 1 }
            }
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Poor Network Quality Detected
          </Typography>
          <Typography variant="caption">
            You may experience audio/video issues. Consider moving closer to your router or switching to audio-only mode.
          </Typography>
        </Alert>
      )}

      {/* Error Display */}
      {error && !showPermissionFlow && (
        <VideoCallErrorDisplay
          error={error}
          onRetry={handleRetryConnection}
          onNavigateAway={handleNavigateAway}
          onClose={() => setError(null)}
          context={{
            sessionId,
            roomId: roomData?.roomId,
            connectionStatus,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }}
          showAsDialog={false}
          autoRetry={true}
        />
      )}

      {/* Quick Help Panel */}
      <QuickHelpPanel onOpenFullGuide={() => setShowTroubleshootingGuide(true)} />

      {/* Troubleshooting Guide Dialog */}
      <TroubleshootingGuide
        open={showTroubleshootingGuide}
        onClose={() => setShowTroubleshootingGuide(false)}
        error={error}
        context={{
          sessionId,
          roomId: roomData?.roomId,
          connectionStatus,
          networkQuality,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }}
      />

      {/* Connection Degradation Manager */}
      <ConnectionDegradationManager
        networkStats={networkStats}
        currentStream={localStream}
        currentQuality={currentVideoQuality}
        peerConnection={peerRef.current}
        onQualityChange={handleQualityChange}
        onStreamChange={handleStreamChange}
        onReconnectNeeded={handleReconnectionNeeded}
        enabled={degradationEnabled && connectionStatus === 'connected'}
      />

      {/* Reconnection Indicator */}
      {isReconnecting && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10000,
            bgcolor: 'rgba(0,0,0,0.9)',
            color: 'white',
            p: 3,
            borderRadius: 2,
            textAlign: 'center',
            minWidth: 300
          }}
        >
          <CircularProgress sx={{ mb: 2, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Reconnecting...
          </Typography>
          <Typography variant="body2" color="grey.400">
            Attempt {reconnectionAttempts} - Please wait
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default VideoCallRoomNew;
