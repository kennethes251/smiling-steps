import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import API_BASE_URL from '../../config/api';
import { Container, Typography, Grid, Paper, List, ListItem, ListItemText, Divider, Button, CircularProgress, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Chip, Tooltip, Tabs, Tab } from '@mui/material';
import { Videocam as VideocamIcon, Schedule as ScheduleIcon, CheckCircle as CheckCircleIcon, HourglassEmpty as HourglassEmptyIcon, Error as ErrorIcon, Receipt as ReceiptIcon, AdminPanelSettings as AdminIcon, AttachMoney as MoneyIcon, Chat as ChatIcon } from '@mui/icons-material';
import QuickActions from '../shared/QuickActions';
import CompactProfile from '../CompactProfile';
import QuickVideoCall from '../VideoCall/QuickVideoCall';
import SessionHistory from '../SessionHistory';
import TherapistSessionHistory from '../TherapistSessionHistory';
import EarningsDashboard from './EarningsDashboard';
import SessionRateManager from '../SessionRateManager';
import Logo from '../Logo';

const PsychologistDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [clientAssessments, setClientAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for dialogs
  const [selectedSession, setSelectedSession] = useState(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);

  // State for form inputs
  const [meetingLink, setMeetingLink] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionProof, setSessionProof] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  
  // Video call state
  const [videoCallDialogOpen, setVideoCallDialogOpen] = useState(false);
  
  // Session rate management
  const [sessionRate, setSessionRate] = useState(0);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [selectedSessionForCall, setSelectedSessionForCall] = useState(null);
  
  // Tab state for dashboard sections
  const [activeTab, setActiveTab] = useState(0);

  // Helper function to get payment status display information
  const getPaymentStatusInfo = (session) => {
    const paymentStatus = session.paymentStatus || 'Pending';
    
    switch (paymentStatus) {
      case 'Paid':
      case 'Confirmed':
        return {
          label: 'Paid',
          color: 'success',
          icon: <CheckCircleIcon fontSize="small" />,
          bgcolor: 'success.lighter',
          borderColor: 'success.main'
        };
      case 'Processing':
        return {
          label: 'Processing',
          color: 'warning',
          icon: <HourglassEmptyIcon fontSize="small" />,
          bgcolor: 'warning.lighter',
          borderColor: 'warning.main'
        };
      case 'Failed':
        return {
          label: 'Failed',
          color: 'error',
          icon: <ErrorIcon fontSize="small" />,
          bgcolor: 'error.lighter',
          borderColor: 'error.main'
        };
      case 'Pending':
      default:
        return {
          label: 'Pending Payment',
          color: 'default',
          icon: <HourglassEmptyIcon fontSize="small" />,
          bgcolor: 'grey.100',
          borderColor: 'grey.400'
        };
    }
  };

  // Helper component for admin-created indicator - Requirements: 15.7
  const AdminCreatedIndicator = ({ session }) => {
    if (!session.createdByAdmin) return null;
    
    return (
      <Tooltip 
        title={
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Admin Booking
            </Typography>
            {session.adminName && (
              <Typography variant="caption" display="block">
                Created by: {session.adminName}
              </Typography>
            )}
            {session.adminBookingReason && (
              <Typography variant="caption" display="block">
                Reason: {session.adminBookingReason}
              </Typography>
            )}
          </Box>
        }
        arrow
      >
        <Chip
          icon={<AdminIcon fontSize="small" />}
          label="Admin Booked"
          size="small"
          color="secondary"
          variant="outlined"
          sx={{ cursor: 'help', ml: 1 }}
        />
      </Tooltip>
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const sessionsRes = await axios.get(`${API_BASE_URL}/api/sessions`, config);

      const sortedSessions = sessionsRes.data.sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
      setSessions(sortedSessions);
      
      // Assessment feature temporarily disabled
      setClientAssessments([]);

      // Fetch current session rate
      const profileRes = await axios.get(`${API_BASE_URL}/api/users/profile`, config);
      const rate = profileRes.data.user?.psychologistDetails?.sessionRate || 
                   profileRes.data.psychologistDetails?.sessionRate || 
                   2500; // Default rate
      setSessionRate(rate);

    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds for real-time sync
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleApproveSession = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      // Use _id if id is not available (MongoDB compatibility)
      const id = sessionId || '';
      if (!id) {
        console.error('Session ID is undefined');
        alert('Error: Session ID is missing');
        return;
      }
      
      await axios.put(`${API_BASE_URL}/api/sessions/${id}/approve`, {
        sessionRate: sessionRate || 0
      }, config);
      
      // Refresh data to show updated status
      await fetchData();
      
      alert('Session approved! Client will be notified to submit payment.');
    } catch (err) {
      console.error('Failed to approve session', err);
      alert(err.response?.data?.msg || 'Failed to approve session.');
    }
  };

  // --- Handlers for Decline Dialog ---
  const handleOpenDeclineDialog = (session) => {
    setSelectedSession(session);
    setDeclineReason('');
    setDeclineDialogOpen(true);
  };

  const handleCloseDeclineDialog = () => {
    setDeclineDialogOpen(false);
    setSelectedSession(null);
    setDeclineReason('');
  };

  const handleDeclineSession = async () => {
    if (!selectedSession) return;
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const id = selectedSession._id || selectedSession.id;
      if (!id) {
        console.error('Session ID is undefined');
        alert('Error: Session ID is missing');
        return;
      }
      
      await axios.put(`${API_BASE_URL}/api/sessions/${id}/decline`, {
        reason: declineReason || 'Not available at this time'
      }, config);
      
      // Refresh data to show updated status
      await fetchData();
      
      handleCloseDeclineDialog();
      alert('Session declined. Client will be notified.');
    } catch (err) {
      console.error('Failed to decline session', err);
      alert(err.response?.data?.msg || 'Failed to decline session.');
    }
  };

  const handleVerifyPayment = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      await axios.put(`${API_BASE_URL}/api/sessions/${sessionId}/verify-payment`, {}, config);
      
      // Refresh data to show updated status
      await fetchData();
      
      alert('Payment verified! Session is now confirmed.');
    } catch (err) {
      console.error('Failed to verify payment', err);
      alert(err.response?.data?.msg || 'Failed to verify payment.');
    }
  };

  // --- Handlers for Link Dialog ---
  const handleOpenLinkDialog = (session) => {
    setSelectedSession(session);
    setMeetingLink(session.meetingLink || '');
    setLinkDialogOpen(true);
  };

  const handleCloseLinkDialog = () => {
    setLinkDialogOpen(false);
    setSelectedSession(null);
    setMeetingLink('');
  };

  const handleSaveLink = async () => {
    if (!selectedSession) return;
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const body = { meetingLink };
      const res = await axios.put(`${API_BASE_URL}/api/sessions/${selectedSession._id || selectedSession.id}/link`, body, config);
      setSessions(prev => prev.map(s => (s._id || s.id) === (selectedSession._id || selectedSession.id) ? res.data : s));
      alert('Meeting link updated!');
      handleCloseLinkDialog();
    } catch (err) {
      console.error('Failed to update meeting link', err);
      alert('Failed to update meeting link.');
    }
  };

  // --- Handlers for Complete Session Dialog ---
  const handleOpenCompleteDialog = (session) => {
    setSelectedSession(session);
    setSessionNotes('');
    setSessionProof('');
    setCompleteDialogOpen(true);
  };

  const handleCloseCompleteDialog = () => {
    setCompleteDialogOpen(false);
    setSelectedSession(null);
    setSessionNotes('');
    setSessionProof('');
  };

  const handleSaveCompletion = async () => {
    if (!selectedSession) return;
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const body = { sessionNotes, sessionProof };
      const res = await axios.post(`${API_BASE_URL}/api/sessions/${selectedSession._id || selectedSession.id}/complete`, body, config);
      setSessions(prev => prev.map(s => (s._id || s.id) === (selectedSession._id || selectedSession.id) ? res.data : s));
      alert('Session marked as complete!');
      handleCloseCompleteDialog();
    } catch (err) {
      console.error('Failed to complete session', err);
      alert('Failed to complete session.');
    }
  };

  const handleVideoCallClick = (session = null) => {
    setSelectedSessionForCall(session);
    setVideoCallDialogOpen(true);
  };

  // Validate video call access and provide detailed error messages
  const getVideoCallAccessMessage = (session) => {
    if (!session) return 'Session not found';
    
    if (session.status !== 'Confirmed') {
      return `Session must be confirmed (current status: ${session.status})`;
    }
    
    if (!['Confirmed', 'Paid', 'Verified'].includes(session.paymentStatus)) {
      return `Payment must be confirmed (current status: ${session.paymentStatus || 'Unknown'})`;
    }
    
    const now = new Date();
    const sessionDate = new Date(session.sessionDate);
    
    if (isNaN(sessionDate.getTime())) {
      return 'Invalid session date';
    }
    
    const timeDiffMinutes = (sessionDate - now) / (1000 * 60);
    
    if (timeDiffMinutes > 15) {
      return `Available ${getTimeUntilSession(session)} (15 min before session)`;
    }
    
    if (timeDiffMinutes < -120) {
      return 'Session access expired (2 hours after session time)';
    }
    
    return 'Ready to join';
  };

  const isSessionLive = (session) => {
    const sessionTime = new Date(session.sessionDate);
    const now = new Date();
    const timeDiff = Math.abs(now - sessionTime);
    return timeDiff <= 30 * 60 * 1000; // Within 30 minutes
  };

  // Check if user can join video call based on requirements
  const canJoinVideoCall = (session) => {
    if (!session) return false;
    if (session.status !== 'Confirmed') return false;
    if (!['Confirmed', 'Paid', 'Verified'].includes(session.paymentStatus)) return false;
    
    const now = new Date();
    const sessionDate = new Date(session.sessionDate);
    
    // Validate session date
    if (isNaN(sessionDate.getTime())) return false;
    
    const timeDiffMinutes = (sessionDate - now) / (1000 * 60);
    
    // Can join 15 minutes before to 2 hours after session time
    return timeDiffMinutes <= 15 && timeDiffMinutes >= -120;
  };

  // Get time until session for display
  const getTimeUntilSession = (session) => {
    if (!session || !session.sessionDate) return 'Unknown';
    
    const now = new Date();
    const sessionDate = new Date(session.sessionDate);
    
    // Validate session date
    if (isNaN(sessionDate.getTime())) return 'Invalid date';
    
    const timeDiffMinutes = (sessionDate - now) / (1000 * 60);
    
    if (timeDiffMinutes > 0) {
      if (timeDiffMinutes < 60) {
        return `${Math.round(timeDiffMinutes)} minutes`;
      } else {
        return `${Math.round(timeDiffMinutes / 60)} hours`;
      }
    } else {
      const absMinutes = Math.abs(timeDiffMinutes);
      if (absMinutes < 60) {
        return `${Math.round(absMinutes)} minutes ago`;
      } else {
        return `${Math.round(absMinutes / 60)} hours ago`;
      }
    }
  };

  const generateVideoCallLink = async (sessionId) => {
    try {
      const videoCallLink = `${window.location.origin}/video-call/${sessionId}`;
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      await axios.put(`${API_BASE_URL}/api/sessions/${sessionId}/link`, {
        meetingLink: videoCallLink
      }, config);
      
      // Update local state
      setSessions(prev => prev.map(s => 
        (s._id || s.id) === sessionId ? { ...s, meetingLink: videoCallLink } : s
      ));
      
      // Copy to clipboard
      navigator.clipboard.writeText(videoCallLink);
      alert('Video call link generated and copied to clipboard!');
    } catch (err) {
      console.error('Failed to generate video call link:', err);
      alert('Failed to generate video call link');
    }
  };

  // Update session rate
  const updateSessionRate = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      await axios.put(`${API_BASE_URL}/api/users/session-rate`, {
        sessionRate: parseFloat(newRate)
      }, config);
      
      setSessionRate(parseFloat(newRate));
      setRateDialogOpen(false);
      setNewRate('');
      alert('Session rate updated successfully!');
    } catch (err) {
      console.error('Failed to update session rate:', err);
      alert('Failed to update session rate');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}><QuickActions userRole="Psychologist" /></Box>
      <Typography 
        variant="h4" 
        gutterBottom
        sx={{
          fontWeight: 700,
          background: 'linear-gradient(45deg, #663399 30%, #9C27B0 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'inline-block',
          mb: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Logo size={32} />
          Psychologist Dashboard
        </Box>
      </Typography>
      <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', color: 'text.secondary' }}>
        Welcome, Dr. {user?.name}. Manage your client sessions, schedule, and profile with compassionate care.
      </Typography>
      
      {/* Compact Profile Section */}
      <CompactProfile userType="psychologist" />
      
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} aria-label="dashboard tabs">
          <Tab label="Sessions Overview" />
          <Tab label="Rate Management" />
          <Tab label="Session History" />
          <Tab label="Earnings" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
      <>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {/* Pending Approval */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, border: sessions.filter(s => s.status === 'Pending Approval').length > 0 ? '2px solid #ff9800' : 'none' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6">Pending Approval</Typography>
                {sessions.filter(s => s.status === 'Pending Approval').length > 0 && (
                  <Chip 
                    label={sessions.filter(s => s.status === 'Pending Approval').length} 
                    color="warning" 
                    size="small" 
                  />
                )}
              </Box>
              <List>
                {sessions.filter(s => s.status === 'Pending Approval').length > 0 ? (
                  sessions.filter(s => s.status === 'Pending Approval').map(session => {
                    const paymentInfo = getPaymentStatusInfo(session);
                    return (
                      <ListItem 
                        key={session._id || session.id} 
                        sx={{
                          border: '1px solid',
                          borderColor: 'warning.main',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: 'warning.lighter',
                          display: 'flex',
                          alignItems: 'flex-start',
                          p: 2
                        }}
                      >
                        <Box sx={{ flexGrow: 1, mr: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
                              {session.sessionType} Session
                            </Typography>
                            <Chip 
                              icon={paymentInfo.icon}
                              label={paymentInfo.label}
                              color={paymentInfo.color}
                              size="small"
                            />
                            <AdminCreatedIndicator session={session} />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Client: {session.client?.name || 'Unknown'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {new Date(session.sessionDate).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            Rate: KES {sessionRate}
                          </Typography>
                        </Box>
                        <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Button 
                            variant="contained" 
                            color="success" 
                            size="small"
                            onClick={() => handleApproveSession(session._id || session.id)}
                            sx={{ minWidth: 100 }}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small"
                            onClick={() => handleOpenDeclineDialog(session)}
                            sx={{ minWidth: 100 }}
                          >
                            Decline
                          </Button>
                        </Box>
                      </ListItem>
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No pending requests.
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>

          {/* Payment Verification Needed */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, border: sessions.filter(s => s.status === 'Payment Submitted' || s.paymentStatus === 'Processing').length > 0 ? '2px solid #2196f3' : 'none' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6">Payment Processing</Typography>
                {sessions.filter(s => s.status === 'Payment Submitted' || s.paymentStatus === 'Processing').length > 0 && (
                  <Chip 
                    label={sessions.filter(s => s.status === 'Payment Submitted' || s.paymentStatus === 'Processing').length} 
                    color="info" 
                    size="small" 
                  />
                )}
              </Box>
              <List>
                {sessions.filter(s => s.status === 'Payment Submitted' || s.paymentStatus === 'Processing').length > 0 ? (
                  sessions.filter(s => s.status === 'Payment Submitted' || s.paymentStatus === 'Processing').map(session => {
                    const paymentInfo = getPaymentStatusInfo(session);
                    return (
                      <ListItem 
                        key={session._id || session.id} 
                        sx={{
                          border: '1px solid',
                          borderColor: paymentInfo.borderColor,
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: paymentInfo.bgcolor,
                          display: 'flex',
                          alignItems: 'flex-start',
                          p: 2
                        }}
                      >
                        <Box sx={{ flexGrow: 1, mr: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
                              {session.sessionType} Session
                            </Typography>
                            <Chip 
                              icon={paymentInfo.icon}
                              label={paymentInfo.label}
                              color={paymentInfo.color}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Client: {session.client?.name || 'Unknown'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {new Date(session.sessionDate).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Amount: <strong>KES {session.price?.toLocaleString() || session.mpesaAmount?.toLocaleString()}</strong>
                          </Typography>
                          {session.mpesaCheckoutRequestID && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Checkout ID: {session.mpesaCheckoutRequestID.substring(0, 20)}...
                            </Typography>
                          )}
                          {session.paymentInitiatedAt && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Initiated: {new Date(session.paymentInitiatedAt).toLocaleString()}
                            </Typography>
                          )}
                        </Box>
                        {session.status === 'Payment Submitted' && (
                          <Box sx={{ flexShrink: 0 }}>
                            <Button 
                              variant="contained" 
                              color="primary" 
                              size="small"
                              onClick={() => handleVerifyPayment(session._id || session.id)}
                              sx={{ minWidth: 100 }}
                            >
                              Verify
                            </Button>
                          </Box>
                        )}
                      </ListItem>
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No payments processing.
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>

          {/* Active Sessions */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, border: sessions.filter(s => s.status === 'In Progress' || (s.videoCallStarted && !s.videoCallEnded)).length > 0 ? '2px solid #ff5722' : 'none' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6">Active Sessions</Typography>
                {sessions.filter(s => s.status === 'In Progress' || (s.videoCallStarted && !s.videoCallEnded)).length > 0 && (
                  <Chip 
                    label={sessions.filter(s => s.status === 'In Progress' || (s.videoCallStarted && !s.videoCallEnded)).length} 
                    color="error" 
                    size="small" 
                    sx={{ 
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.7 },
                        '100%': { opacity: 1 }
                      }
                    }}
                  />
                )}
              </Box>
              <List>
                {sessions.filter(s => s.status === 'In Progress' || (s.videoCallStarted && !s.videoCallEnded)).length > 0 ? (
                  sessions.filter(s => s.status === 'In Progress' || (s.videoCallStarted && !s.videoCallEnded)).map(session => {
                    const paymentInfo = getPaymentStatusInfo(session);
                    return (
                      <ListItem 
                        key={session._id || session.id}
                        sx={{
                          border: '2px solid',
                          borderColor: 'error.main',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: 'error.lighter',
                          display: 'flex',
                          alignItems: 'flex-start',
                          p: 2,
                          flexDirection: 'column',
                          gap: 2,
                          animation: 'glow 3s ease-in-out infinite alternate',
                          '@keyframes glow': {
                            '0%': { boxShadow: '0 0 5px rgba(255, 87, 34, 0.5)' },
                            '100%': { boxShadow: '0 0 20px rgba(255, 87, 34, 0.8)' }
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
                          <Box sx={{ flexGrow: 1, mr: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
                                {session.sessionType} Session
                              </Typography>
                              <Chip 
                                label="🔴 LIVE NOW" 
                                color="error" 
                                size="small" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  animation: 'pulse 1.5s infinite'
                                }}
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Client: {session.client?.name || 'Unknown'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Started: {session.videoCallStarted ? new Date(session.videoCallStarted).toLocaleString() : 'Recently'}
                            </Typography>
                            
                            {/* Live Call Information */}
                            <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(255, 87, 34, 0.1)', borderRadius: 1, border: '1px solid rgba(255, 87, 34, 0.3)' }}>
                              <Typography variant="caption" color="error.main" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5 }}>
                                🎥 Video Call Active
                              </Typography>
                              {session.videoCallStarted && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Duration: {Math.round((new Date() - new Date(session.videoCallStarted)) / 60000)} minutes
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
                          <Button 
                            size="small" 
                            variant="contained" 
                            color="error" 
                            startIcon={<VideocamIcon />}
                            component={Link}
                            to={`/video-call/${session._id || session.id}`}
                            sx={{
                              bgcolor: 'error.main',
                              '&:hover': { bgcolor: 'error.dark' },
                              fontWeight: 'bold'
                            }}
                          >
                            Rejoin Call
                          </Button>
                          <Button 
                            size="small" 
                            variant="outlined"
                            color="error"
                            onClick={() => handleOpenCompleteDialog(session)}
                          >
                            End Session
                          </Button>
                        </Box>
                      </ListItem>
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No active sessions.
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>

          {/* Confirmed Sessions */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6">Confirmed Upcoming Sessions</Typography>
                {sessions.filter(s => s.status === 'Confirmed' && new Date(s.sessionDate) > new Date()).length > 0 && (
                  <Chip 
                    label={sessions.filter(s => s.status === 'Confirmed' && new Date(s.sessionDate) > new Date()).length} 
                    color="success" 
                    size="small" 
                  />
                )}
              </Box>
              <List>
                {sessions.filter(s => s.status === 'Confirmed' && new Date(s.sessionDate) > new Date()).length > 0 ? (
                  sessions.filter(s => s.status === 'Confirmed' && new Date(s.sessionDate) > new Date()).map(session => {
                    const paymentInfo = getPaymentStatusInfo(session);
                    return (
                      <ListItem 
                        key={session._id || session.id}
                        sx={{
                          border: '2px solid',
                          borderColor: paymentInfo.borderColor,
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: paymentInfo.bgcolor,
                          display: 'flex',
                          alignItems: 'flex-start',
                          p: 2,
                          flexDirection: 'column',
                          gap: 2
                        }}
                      >
                        <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
                          <Box sx={{ flexGrow: 1, mr: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
                                {session.sessionType} Session
                              </Typography>
                              {canJoinVideoCall(session) && <Chip label="CAN JOIN" color="success" size="small" />}
                              {isSessionLive(session) && <Chip label="LIVE" color="error" size="small" />}
                              {session.videoCallStarted && !session.videoCallEnded && (
                                <Chip 
                                  label="IN PROGRESS" 
                                  color="warning" 
                                  size="small" 
                                  sx={{ 
                                    animation: 'pulse 2s infinite',
                                    '@keyframes pulse': {
                                      '0%': { opacity: 1 },
                                      '50%': { opacity: 0.7 },
                                      '100%': { opacity: 1 }
                                    }
                                  }}
                                />
                              )}
                              <Chip 
                                icon={paymentInfo.icon}
                                label={paymentInfo.label}
                                color={paymentInfo.color}
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Client: {session.client?.name || 'Unknown'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Time: {new Date(session.sessionDate).toLocaleString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Amount: <strong>KES {session.price?.toLocaleString() || session.mpesaAmount?.toLocaleString() || 'N/A'}</strong>
                            </Typography>
                            {session.mpesaTransactionID && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <ReceiptIcon fontSize="small" color="success" />
                                <Tooltip title="M-Pesa Transaction ID">
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                    Transaction ID: {session.mpesaTransactionID}
                                  </Typography>
                                </Tooltip>
                              </Box>
                            )}
                            {session.paymentVerifiedAt && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Payment verified: {new Date(session.paymentVerifiedAt).toLocaleString()}
                              </Typography>
                            )}
                            {session.meetingLink && (
                              <Typography variant="body2" color="text.secondary">
                                <strong>Meeting Link:</strong>{' '}
                                <a href={session.meetingLink} target="_blank" rel="noopener noreferrer">
                                  Join Session
                                </a>
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
                          {canJoinVideoCall(session) ? (
                            <Button 
                              size="small" 
                              variant="contained" 
                              color="success" 
                              startIcon={<VideocamIcon />}
                              component={Link}
                              to={`/video-call/${session._id || session.id}`}
                              sx={{
                                bgcolor: 'success.main',
                                '&:hover': { bgcolor: 'success.dark' }
                              }}
                            >
                              Join Video Call
                            </Button>
                          ) : (
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="primary"
                              startIcon={<VideocamIcon />}
                              disabled
                              title={getVideoCallAccessMessage(session)}
                            >
                              Join Video Call
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            startIcon={<ChatIcon />}
                            onClick={() => {
                              const clientId = session.client?._id || session.client;
                              navigate(`/chat/${clientId}`);
                            }}
                          >
                            Message Client
                          </Button>
                          <Button 
                            size="small" 
                            variant="outlined"
                            onClick={() => generateVideoCallLink(session._id || session.id)}
                          >
                            Generate Video Link
                          </Button>
                          <Button size="small" onClick={() => handleOpenLinkDialog(session)}>
                            {session.meetingLink ? 'Edit Link' : 'Add Link'}
                          </Button>
                          <Button size="small" variant="contained" color="primary" onClick={() => handleOpenCompleteDialog(session)}>
                            Complete
                          </Button>
                        </Box>
                      </ListItem>
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No confirmed upcoming sessions.
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>

          {/* Payment Status Overview */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Payment Status Overview</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Track payment status for all your sessions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, bgcolor: 'success.lighter', border: '1px solid', borderColor: 'success.main' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckCircleIcon color="success" />
                      <Typography variant="h6" color="success.main">
                        {sessions.filter(s => s.paymentStatus === 'Paid' || s.paymentStatus === 'Confirmed').length}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Paid Sessions
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, bgcolor: 'warning.lighter', border: '1px solid', borderColor: 'warning.main' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <HourglassEmptyIcon color="warning" />
                      <Typography variant="h6" color="warning.main">
                        {sessions.filter(s => s.paymentStatus === 'Processing').length}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Processing
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.100', border: '1px solid', borderColor: 'grey.400' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <HourglassEmptyIcon color="action" />
                      <Typography variant="h6" color="text.secondary">
                        {sessions.filter(s => s.paymentStatus === 'Pending' || !s.paymentStatus).length}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Pending Payment
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.main' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <ErrorIcon color="error" />
                      <Typography variant="h6" color="error.main">
                        {sessions.filter(s => s.paymentStatus === 'Failed').length}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Failed Payments
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Recent Payment Transactions */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Recent Payment Transactions</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View M-Pesa transaction details for paid sessions
              </Typography>
              <List>
                {sessions.filter(s => s.mpesaTransactionID).length > 0 ? (
                  sessions
                    .filter(s => s.mpesaTransactionID)
                    .sort((a, b) => new Date(b.paymentVerifiedAt || b.createdAt) - new Date(a.paymentVerifiedAt || a.createdAt))
                    .slice(0, 5)
                    .map(session => (
                      <ListItem 
                        key={session._id || session.id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'success.main',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: 'success.lighter',
                          p: 2
                        }}
                      >
                        <Box sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <ReceiptIcon fontSize="small" color="success" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {session.sessionType} Session - {session.client?.name || 'Unknown'}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Transaction ID: <strong>{session.mpesaTransactionID}</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Amount: <strong>KES {session.mpesaAmount?.toLocaleString() || session.price?.toLocaleString()}</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Date: {new Date(session.paymentVerifiedAt || session.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                        <Chip 
                          icon={<CheckCircleIcon />}
                          label="Paid"
                          color="success"
                          size="small"
                        />
                      </ListItem>
                    ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No payment transactions yet.
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>

          {/* Call History and Duration Display */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <VideocamIcon color="primary" />
                <Typography variant="h6" component="h2">Call History & Completed Sessions</Typography>
              </Box>
              {sessions.filter(s => (s.status === 'Confirmed' || s.status === 'Completed') && new Date(s.sessionDate) < new Date()).length > 0 ? (
                <List dense>
                  {sessions
                    .filter(s => (s.status === 'Confirmed' || s.status === 'Completed') && new Date(s.sessionDate) < new Date())
                    .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))
                    .slice(0, 10) // Show last 10 sessions
                    .map(session => (
                      <ListItem
                        key={session._id || session.id}
                        sx={{
                          border: '1px solid',
                          borderColor: session.callDuration ? 'success.main' : 'divider',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: session.callDuration ? 'success.lighter' : 'background.paper',
                          '&:last-child': { mb: 0 },
                          display: 'flex',
                          alignItems: 'flex-start',
                          p: 2
                        }}
                      >
                        <Box sx={{ flexGrow: 1, mr: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
                              {session.sessionType} Session
                            </Typography>
                            {session.callDuration && (
                              <Chip 
                                label={`${session.callDuration} min call`} 
                                color="success" 
                                size="small"
                                icon={<VideocamIcon fontSize="small" />}
                              />
                            )}
                            {session.status === 'Completed' && (
                              <Chip 
                                label="Completed" 
                                color="primary" 
                                size="small"
                              />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Client: {session.client?.name || 'Unknown'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Session Date: {new Date(session.sessionDate).toLocaleString()}
                          </Typography>
                          
                          {/* Video Call Duration Information */}
                          {session.videoCallStarted && (
                            <Box sx={{ mt: 1, p: 1.5, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1, border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                              <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5 }}>
                                📹 Video Call Completed
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Started: {new Date(session.videoCallStarted).toLocaleString()}
                              </Typography>
                              {session.videoCallEnded && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Ended: {new Date(session.videoCallEnded).toLocaleString()}
                                </Typography>
                              )}
                              {session.callDuration && (
                                <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 'bold', mt: 0.5 }}>
                                  ⏱️ Duration: {session.callDuration} minutes
                                </Typography>
                              )}
                              {!session.videoCallEnded && (
                                <Typography variant="caption" color="warning.main" sx={{ display: 'block', fontWeight: 'bold', mt: 0.5 }}>
                                  ⚠️ Call ended unexpectedly
                                </Typography>
                              )}
                            </Box>
                          )}
                          
                          {/* Payment Information */}
                          {session.mpesaTransactionID && (
                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ReceiptIcon fontSize="small" color="success" />
                              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                Paid: KES {session.mpesaAmount || session.price || 'N/A'}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ flexShrink: 0, display: 'flex', gap: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(session.sessionDate).toLocaleDateString()}
                          </Typography>
                          {session.sessionNotes && (
                            <Tooltip title="Session notes available">
                              <Chip 
                                label="Notes" 
                                color="info" 
                                size="small"
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </ListItem>
                    ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No completed sessions found.
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Client Assessment Results */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Recent Client Assessments</Typography>
              <List>
                {clientAssessments.length > 0 ? (
                  clientAssessments.slice(0, 5).map((result) => (
                    <ListItem key={result._id}>
                      <ListItemText
                        primary={`${result.user.name} - ${result.assessment.title}`}
                        secondary={`Score: ${result.totalScore} | Interpretation: ${result.interpretation} | Completed: ${new Date(result.completedAt).toLocaleDateString()}`}
                      />
                    </ListItem>
                  ))
                ) : (
                  <Typography>No client assessment results available.</Typography>
                )}
              </List>
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button variant="outlined" size="small" component={Link} to="/client-assessments">View All Client Assessments</Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
      </>
      )}

      {/* Rate Management Tab */}
      {activeTab === 1 && (
        <SessionRateManager />
      )}

      {/* Session History Tab */}
      {activeTab === 2 && (
        <TherapistSessionHistory />
      )}

      {/* Earnings Tab */}
      {activeTab === 3 && (
        <EarningsDashboard />
      )}

      {/* Session History */}
      <Box sx={{ mt: 4 }}>
        <SessionHistory userRole="psychologist" maxItems={10} showPagination={true} />
      </Box>

      {/* Advanced Session History with Filtering */}
      <Box sx={{ mt: 4 }}>
        <TherapistSessionHistory />
      </Box>

      {/* Earnings Dashboard */}
      <Box sx={{ mt: 4 }}>
        <EarningsDashboard />
      </Box>

      {/* Add/Edit Link Dialog */}
      <Dialog open={linkDialogOpen} onClose={handleCloseLinkDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add/Edit Meeting Link</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Meeting Link (e.g., Google Meet, Zoom)" type="url" fullWidth variant="outlined" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLinkDialog}>Cancel</Button>
          <Button onClick={handleSaveLink} variant="contained">Save Link</Button>
        </DialogActions>
      </Dialog>

      {/* Complete Session Dialog */}
      <Dialog open={completeDialogOpen} onClose={handleCloseCompleteDialog} fullWidth maxWidth="sm">
        <DialogTitle>Complete Session</DialogTitle>
        <DialogContent>
          <DialogContentText>To complete the session, please add any relevant notes and a link to the proof of completion (e.g., a screenshot).</DialogContentText>
          <TextField autoFocus margin="dense" label="Session Notes" type="text" fullWidth multiline rows={4} variant="outlined" value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} />
          <TextField margin="dense" label="Link to Session Proof" type="url" fullWidth variant="outlined" value={sessionProof} onChange={(e) => setSessionProof(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompleteDialog}>Cancel</Button>
          <Button onClick={handleSaveCompletion} variant="contained">Mark as Complete</Button>
        </DialogActions>
      </Dialog>

      {/* Video Call Dialog */}
      <QuickVideoCall
        open={videoCallDialogOpen}
        onClose={() => setVideoCallDialogOpen(false)}
        session={selectedSessionForCall}
        psychologists={[]} // Psychologists don't need this for their own calls
      />

      {/* Session Rate Dialog */}
      <Dialog open={rateDialogOpen} onClose={() => setRateDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Update Session Rate</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Set your rate per therapy session. This will be displayed to clients when they book sessions.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Session Rate (KES)"
            type="number"
            fullWidth
            variant="outlined"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            inputProps={{ min: 0, step: 50 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateDialogOpen(false)}>Cancel</Button>
          <Button onClick={updateSessionRate} variant="contained">Update Rate</Button>
        </DialogActions>
      </Dialog>

      {/* Decline Session Dialog */}
      <Dialog open={declineDialogOpen} onClose={handleCloseDeclineDialog} fullWidth maxWidth="sm">
        <DialogTitle>Decline Booking Request</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Please provide a reason for declining this booking request. The client will be notified.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for declining"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="e.g., Not available at this time, Schedule conflict, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeclineDialog}>Cancel</Button>
          <Button onClick={handleDeclineSession} variant="contained" color="error">Decline Booking</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PsychologistDashboard;
