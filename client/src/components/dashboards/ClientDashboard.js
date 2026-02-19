import { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import API_BASE_URL from '../../config/api';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Typography, Button, Grid, Paper, List, ListItem, ListItemText, Divider, CircularProgress, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Rating, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Videocam as VideocamIcon, Schedule as ScheduleIcon, Receipt as ReceiptIcon, Download as DownloadIcon, Chat as ChatIcon } from '@mui/icons-material';
import QuickActions from '../shared/QuickActions';
import QuickVideoCall from '../VideoCall/QuickVideoCall';
import CompactProfile from '../CompactProfile';
import PaymentNotification from '../PaymentNotification';
import MpesaPayment from '../MpesaPayment';
import SessionHistory from '../SessionHistory';
import Logo from '../Logo';

const ClientDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState([]);
  const [videoCallDialogOpen, setVideoCallDialogOpen] = useState(false);
  const [selectedSessionForCall, setSelectedSessionForCall] = useState(null);
  const [psychologists, setPsychologists] = useState([]);
  const [company, setCompany] = useState(null);
  const [subscription, setSubscription] = useState(null);
  
  // Payment notification state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSession, setPaymentSession] = useState(null);
  
  // M-Pesa payment state
  const [mpesaDialogOpen, setMpesaDialogOpen] = useState(false);
  const [selectedPaymentSession, setSelectedPaymentSession] = useState(null);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { 'x-auth-token': token },
      };

      // Fetch all data in parallel
      const [
        sessionsRes,
        feedbackRes,
        psychologistsRes,
        companyRes
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/sessions`, config),
        axios.get(`${API_BASE_URL}/api/feedback/client`, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/users/psychologists`, config).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE_URL}/api/company/my-company`, config).catch(() => ({ data: null }))
      ]);

      // Process sessions
      if (sessionsRes.data && Array.isArray(sessionsRes.data)) {
        const sortedSessions = sessionsRes.data.sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
        setSessions(sortedSessions);
        setSubmittedFeedback(feedbackRes.data?.map(f => f.session) || []);
      } else {
        setSessions([]);
      }

      // Set psychologists
      setPsychologists(psychologistsRes.data?.data || []);

      // Set company and subscription if available
      if (companyRes?.data) {
        setCompany(companyRes.data);
        if (companyRes.data.subscription) {
          setSubscription(companyRes.data.subscription);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
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

  const handleCancelClick = (session) => {
    setSelectedSession(session);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedSession) return;

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      await axios.delete(`${API_BASE_URL}/api/sessions/${selectedSession._id || selectedSession.id}`, config);

      // Refresh sessions list after cancellation
      const res = await axios.get(`${API_BASE_URL}/api/sessions`, config);
      const sortedSessions = res.data.sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
      setSessions(sortedSessions);
      setCancelDialogOpen(false);
    } catch (err) {
      console.error('Failed to cancel session', err);
      alert('Failed to cancel session. Please try again.');
    }
  };

  const handleCancelClose = () => {
    setCancelDialogOpen(false);
    setSelectedSession(null);
  };

  const handleFeedbackClick = (session) => {
    setSelectedSession(session);
    setFeedbackDialogOpen(true);
  };

  const handleFeedbackClose = () => {
    setFeedbackDialogOpen(false);
    setSelectedSession(null);
    setRating(0);
    setComment('');
  };

  const handleFeedbackSubmit = async () => {
    if (!selectedSession || rating === 0) {
      alert('Please provide a rating.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const body = { sessionId: selectedSession._id || selectedSession.id, rating, comment };
      await axios.post(`${API_BASE_URL}/api/feedback`, body, config);
      alert('Feedback submitted successfully!');
      setSubmittedFeedback([...submittedFeedback, selectedSession._id || selectedSession.id]);
      handleFeedbackClose();
    } catch (err) {
      console.error('Failed to submit feedback', err);
      alert(err.response?.data?.msg || 'Failed to submit feedback.');
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

  // Payment notification functions
  const handlePaymentNotification = (session) => {
    setPaymentSession(session);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSent = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      await axios.put(`${API_BASE_URL}/api/sessions/${paymentSession._id || paymentSession.id}/payment-sent`, {}, config);
      
      // Update session status locally
      setSessions(prev => prev.map(s => 
        (s._id || s.id) === (paymentSession._id || paymentSession.id) 
          ? { ...s, paymentStatus: 'Paid' }
          : s
      ));
      
      alert('Payment notification sent! Your session will be confirmed once payment is verified.');
      setPaymentDialogOpen(false);
      setPaymentSession(null);
      
    } catch (err) {
      console.error('Failed to notify payment', err);
      alert('Failed to send payment notification. Please try again.');
    }
  };

  // M-Pesa payment handlers
  const handlePayNow = (session) => {
    setSelectedPaymentSession(session);
    setMpesaDialogOpen(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    // Refresh sessions to get updated payment status
    await fetchData();
    setMpesaDialogOpen(false);
    setSelectedPaymentSession(null);
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    // Keep dialog open so user can retry
  };

  const downloadReceipt = (session) => {
    // Generate receipt data
    const receiptData = {
      bookingReference: session.bookingReference || 'N/A',
      sessionType: session.sessionType,
      therapist: session.psychologist?.name || 'Therapist',
      date: new Date(session.sessionDate).toLocaleString(),
      amount: session.mpesaAmount || session.price || 0,
      transactionID: session.mpesaTransactionID || 'N/A',
      paymentDate: session.paymentVerifiedAt ? new Date(session.paymentVerifiedAt).toLocaleString() : 'N/A',
      status: session.paymentStatus || 'Unknown'
    };

    // Create receipt text
    const receiptText = `
SMILING STEPS THERAPY
Payment Receipt
=====================================

Booking Reference: ${receiptData.bookingReference}
Session Type: ${receiptData.sessionType}
Therapist: ${receiptData.therapist}
Session Date: ${receiptData.date}

Amount Paid: KES ${receiptData.amount}
M-Pesa Transaction ID: ${receiptData.transactionID}
Payment Date: ${receiptData.paymentDate}
Status: ${receiptData.status}

=====================================
Thank you for your payment!
    `.trim();

    // Create and download file - use booking reference in filename if available
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileRef = session.bookingReference || session._id || session.id;
    a.download = `receipt-${fileRef}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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

  // Render company badge if user is part of a company
  const renderCompanyBadge = () => {
    if (!company) return null;

    return (
      <Box sx={{
        mb: 4,
        p: 2,
        bgcolor: 'primary.light',
        borderRadius: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box>
          <Typography variant="subtitle1" color="primary.contrastText">
            {company.name}
          </Typography>
          {subscription && (
            <Typography variant="body2" color="primary.contrastText">
              {subscription.tier} Plan • {subscription.employeeLimit} Employees •
              {subscription.billingCycle === 'monthly' ? 'Monthly Billing' : 'Annual Billing'}
            </Typography>
          )}
        </Box>
        {subscription && (
          <Chip
            label={`${subscription.tier.toUpperCase()} PLAN`}
            color="primary"
            variant="outlined"
            sx={{ color: 'white', borderColor: 'white' }}
          />
        )}
      </Box>
    );
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        py: { xs: 3, md: 4 },
        maxWidth: '1200px',
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
        position: 'relative'
      }}
    >
      {/* Quick Actions */}
      <Box sx={{
        mb: { xs: 3, md: 4 },
        '& .MuiButton-root': {
          minWidth: '120px',
          '&:not(:last-child)': {
            mr: 2
          }
        }
      }}>
        <QuickActions userRole="Client" />
      </Box>

      {/* Header Section */}
      <Box sx={{
        mb: { xs: 3, md: 4 },
        '& .MuiGrid-item': {
          py: 1
        }
      }}>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={8}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                mb: 1.5,
                background: 'linear-gradient(45deg, #663399 30%, #9C27B0 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block'
              }}
            >
              Welcome back, {user?.name?.split(' ')[0] || 'Client'}! <Logo size={24} sx={{ ml: 1, display: 'inline-flex' }} />
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                fontSize: '1.1rem',
                maxWidth: '600px',
                lineHeight: 1.6
              }}
            >
              Here's what's happening with your sessions and activities today.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: "auto" }} sx={{ mt: { xs: 2, md: 0 } }}>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              '& .MuiButton-root': {
                px: 3,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.9375rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }
              }
            }}>
              <Button
                onClick={() => handleVideoCallClick()}
                variant="outlined"
                color="secondary"
                startIcon={<VideocamIcon />}
                sx={{
                  borderWidth: '2px',
                  '&:hover': {
                    borderWidth: '2px',
                    bgcolor: 'rgba(156, 39, 176, 0.04)'
                  }
                }}
              >
                Quick Video Call
              </Button>
              <Button
                component={Link}
                to="/bookings"
                variant="contained"
                color="primary"
                startIcon={<ScheduleIcon />}
                sx={{
                  bgcolor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                  }
                }}
              >
                New Session
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Company Badge */}
        {company && (
          <Box sx={{ mt: 3 }}>
            {renderCompanyBadge()}
          </Box>
        )}
      </Box>

      {/* Content Section */}
      {/* Compact Profile Section */}
      <CompactProfile userType="client" />

      <Box sx={{
        mb: 4,
        '& > * + *': {
          mt: 3
        }
      }}>
        {loading ? (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Mental Health Assessments */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" component="h2">Mental Health Assessments</Typography>
                    <Button
                      component={Link}
                      to="/assessment-results"
                      variant="outlined"
                      size="small"
                      sx={{ ml: 2 }}
                    >
                      View My Results
                    </Button>
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Take regular assessments to track your mental health progress. Your therapist can use these results to provide better care.
                  </Typography>
                  <Box sx={{ mt: 'auto' }}>
                    <Button
                      component={Link}
                      to="/assessments"
                      variant="contained"
                      color="primary"
                      size="small"
                    >
                      Take New Assessment
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Session Lists - New Workflow */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', border: sessions.filter(s => s.status === 'Pending Approval').length > 0 ? '2px solid #ff9800' : 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="h6" component="h2">Pending Approval</Typography>
                  {sessions.filter(s => s.status === 'Pending Approval').length > 0 && (
                    <Chip 
                      label={sessions.filter(s => s.status === 'Pending Approval').length} 
                      color="warning" 
                      size="small" 
                    />
                  )}
                </Box>
                {sessions.filter(s => s.status === 'Pending Approval').length > 0 ? (
                  <List dense>
                    {sessions.filter(s => s.status === 'Pending Approval').map(session => (
                      <ListItem
                        key={session._id || session.id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'warning.main',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: 'warning.lighter',
                          '&:last-child': { mb: 0 },
                          display: 'flex',
                          alignItems: 'flex-start',
                          p: 2
                        }}
                      >
                        <Box sx={{ flexGrow: 1, mr: 2 }}>
                          <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                            {session.sessionType} Session
                          </Typography>
                          {session.bookingReference && (
                            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                              Ref: {session.bookingReference}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            With: {session.psychologist?.name || 'Therapist'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(session.sessionDate).toLocaleString()}
                          </Typography>
                          <Chip label="Awaiting Therapist Approval" color="warning" size="small" sx={{ mt: 1 }} />
                        </Box>
                        <Box sx={{ flexShrink: 0 }}>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleCancelClick(session)}
                            sx={{ minWidth: 100 }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No sessions awaiting approval.
                  </Typography>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', border: sessions.filter(s => s.status === 'Approved').length > 0 ? '2px solid #2196f3' : 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="h6" component="h2">Approved - Payment Required</Typography>
                  {sessions.filter(s => s.status === 'Approved').length > 0 && (
                    <Chip 
                      label={sessions.filter(s => s.status === 'Approved').length} 
                      color="info" 
                      size="small" 
                    />
                  )}
                </Box>
                {sessions.filter(s => s.status === 'Approved').length > 0 ? (
                  <List dense>
                    {sessions.filter(s => s.status === 'Approved').map(session => (
                      <ListItem
                        key={session._id || session.id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'info.main',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: 'info.lighter',
                          '&:last-child': { mb: 0 },
                          display: 'flex',
                          alignItems: 'flex-start',
                          p: 2
                        }}
                      >
                        <Box sx={{ flexGrow: 1, mr: 2 }}>
                          <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                            {session.sessionType} Session
                          </Typography>
                          {session.bookingReference && (
                            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                              Ref: {session.bookingReference}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            With: {session.psychologist?.name || 'Therapist'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {new Date(session.sessionDate).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
                            Amount: KES {session.price || session.sessionRate || 0}
                          </Typography>
                          <Chip label="Approved - Submit Payment" color="info" size="small" />
                        </Box>
                        <Box sx={{ flexShrink: 0, display: 'flex', gap: 1, flexDirection: 'column' }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handlePayNow(session)}
                            sx={{ minWidth: 120 }}
                          >
                            Pay Now
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={() => handleCancelClick(session)}
                            sx={{ minWidth: 120 }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No approved sessions awaiting payment.
                  </Typography>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="h6" component="h2">Payment Submitted</Typography>
                  {sessions.filter(s => s.status === 'Payment Submitted').length > 0 && (
                    <Chip 
                      label={sessions.filter(s => s.status === 'Payment Submitted').length} 
                      color="primary" 
                      size="small" 
                    />
                  )}
                </Box>
                {sessions.filter(s => s.status === 'Payment Submitted').length > 0 ? (
                  <List dense>
                    {sessions.filter(s => s.status === 'Payment Submitted').map(session => (
                      <ListItem
                        key={session._id || session.id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'primary.main',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: 'primary.lighter',
                          '&:last-child': { mb: 0 },
                          display: 'flex',
                          alignItems: 'flex-start',
                          p: 2
                        }}
                      >
                        <Box sx={{ flexGrow: 1, mr: 2 }}>
                          <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                            {session.sessionType} Session
                          </Typography>
                          {session.bookingReference && (
                            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                              Ref: {session.bookingReference}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            With: {session.psychologist?.name || 'Therapist'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {new Date(session.sessionDate).toLocaleString()}
                          </Typography>
                          <Chip label="Awaiting Payment Verification" color="primary" size="small" />
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No payments pending verification.
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* In Progress Sessions */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', border: sessions.filter(s => s.status === 'In Progress' || (s.videoCallStarted && !s.videoCallEnded)).length > 0 ? '2px solid #ff5722' : 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="h6" component="h2">Active Sessions</Typography>
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
                {sessions.filter(s => s.status === 'In Progress' || (s.videoCallStarted && !s.videoCallEnded)).length > 0 ? (
                  <List dense>
                    {sessions.filter(s => s.status === 'In Progress' || (s.videoCallStarted && !s.videoCallEnded)).map(session => (
                      <ListItem
                        key={session._id || session.id}
                        sx={{
                          border: '2px solid',
                          borderColor: 'error.main',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: 'error.lighter',
                          '&:last-child': { mb: 0 },
                          display: 'flex',
                          alignItems: 'flex-start',
                          p: 2,
                          animation: 'glow 3s ease-in-out infinite alternate',
                          '@keyframes glow': {
                            '0%': { boxShadow: '0 0 5px rgba(255, 87, 34, 0.5)' },
                            '100%': { boxShadow: '0 0 20px rgba(255, 87, 34, 0.8)' }
                          }
                        }}
                      >
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
                          {session.bookingReference && (
                            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                              Ref: {session.bookingReference}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            With: {session.psychologist?.name || 'Therapist'}
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
                        <Box sx={{ flexShrink: 0 }}>
                          <Button
                            component="a"
                            href={session.meetingLink || `/video-call/${session._id || session.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="contained"
                            color="error"
                            size="small"
                            startIcon={<VideocamIcon />}
                            sx={{ minWidth: 120, fontWeight: 'bold' }}
                          >
                            Rejoin Call
                          </Button>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No active sessions.
                  </Typography>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="h6" component="h2">Confirmed Sessions</Typography>
                  {sessions.filter(s => s.status === 'Confirmed' && new Date(s.sessionDate) > new Date()).length > 0 && (
                    <Chip 
                      label={sessions.filter(s => s.status === 'Confirmed' && new Date(s.sessionDate) > new Date()).length} 
                      color="success" 
                      size="small" 
                    />
                  )}
                </Box>
                {sessions.filter(s => s.status === 'Confirmed' && new Date(s.sessionDate) > new Date()).length > 0 ? (
                  <List dense>
                    {sessions
                      .filter(s => s.status === 'Confirmed' && new Date(s.sessionDate) > new Date())
                      .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate))
                      .map(session => (
                        <ListItem
                          key={session._id || session.id}
                          sx={{
                            border: '1px solid',
                            borderColor: 'success.main',
                            borderRadius: 1,
                            mb: 1,
                            bgcolor: 'success.lighter',
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
                              {canJoinVideoCall(session) && <Chip label="CAN JOIN" color="success" size="small" />}
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
                            </Box>
                            {session.bookingReference && (
                              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                                Ref: {session.bookingReference}
                              </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              With: {session.psychologist?.name || 'Therapist'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {new Date(session.sessionDate).toLocaleString()}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                              <Chip label="Confirmed & Paid" color="success" size="small" />
                              {session.videoCallStarted && !session.videoCallEnded && (
                                <Chip 
                                  label="Video Call Active" 
                                  color="error" 
                                  size="small"
                                  sx={{ fontWeight: 'bold' }}
                                />
                              )}
                            </Box>
                            
                            {/* Video Call Status Information */}
                            {session.videoCallStarted && (
                              <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(25, 118, 210, 0.1)', borderRadius: 1, border: '1px solid rgba(25, 118, 210, 0.2)' }}>
                                <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5 }}>
                                  📹 Video Call Information
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Started: {new Date(session.videoCallStarted).toLocaleString()}
                                </Typography>
                                {session.videoCallEnded ? (
                                  <>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                      Ended: {new Date(session.videoCallEnded).toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 'bold' }}>
                                      Duration: {session.callDuration || 0} minutes
                                    </Typography>
                                  </>
                                ) : (
                                  <Typography variant="caption" color="warning.main" sx={{ display: 'block', fontWeight: 'bold' }}>
                                    ⏱️ Call in progress...
                                  </Typography>
                                )}
                              </Box>
                            )}
                            
                            {session.meetingLink && (
                              <Box>
                                <Button
                                  component="a"
                                  href={session.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  variant="text"
                                  size="small"
                                  color="primary"
                                  startIcon={<VideocamIcon fontSize="small" />}
                                  sx={{ p: 0, minWidth: 'auto' }}
                                >
                                  Join Meeting
                                </Button>
                              </Box>
                            )}
                          </Box>
                          <Box sx={{ flexShrink: 0, display: 'flex', gap: 1, flexDirection: 'column' }}>
                            {canJoinVideoCall(session) ? (
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                startIcon={<VideocamIcon fontSize="small" />}
                                component={Link}
                                to={`/video-call/${session._id || session.id}`}
                                sx={{ 
                                  minWidth: 120,
                                  bgcolor: 'success.main',
                                  '&:hover': { bgcolor: 'success.dark' }
                                }}
                              >
                                Join Call
                              </Button>
                            ) : (
                              <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                startIcon={<VideocamIcon fontSize="small" />}
                                disabled
                                sx={{ minWidth: 120 }}
                                title={getVideoCallAccessMessage(session)}
                              >
                                Join Call
                              </Button>
                            )}
                            <Button
                              variant="outlined"
                              color="secondary"
                              size="small"
                              startIcon={<ChatIcon fontSize="small" />}
                              onClick={() => {
                                const psychologistId = session.psychologist?._id || session.psychologist;
                                navigate(`/chat/${psychologistId}`);
                              }}
                              sx={{ minWidth: 100 }}
                            >
                              Message
                            </Button>
                            {session.mpesaTransactionID && (
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<ReceiptIcon fontSize="small" />}
                                onClick={() => downloadReceipt(session)}
                                sx={{ minWidth: 120 }}
                              >
                                Receipt
                              </Button>
                            )}
                          </Box>
                        </ListItem>
                      ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No confirmed upcoming sessions.
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Payment History */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ReceiptIcon color="primary" />
                  <Typography variant="h6" component="h2">Payment History</Typography>
                </Box>
                {sessions.filter(s => s.paymentStatus === 'Paid' || s.mpesaTransactionID).length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Session Type</strong></TableCell>
                          <TableCell><strong>Therapist</strong></TableCell>
                          <TableCell align="right"><strong>Amount</strong></TableCell>
                          <TableCell><strong>Transaction ID</strong></TableCell>
                          <TableCell align="center"><strong>Receipt</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sessions
                          .filter(s => s.paymentStatus === 'Paid' || s.mpesaTransactionID)
                          .sort((a, b) => new Date(b.paymentVerifiedAt || b.sessionDate) - new Date(a.paymentVerifiedAt || a.sessionDate))
                          .map(session => (
                            <TableRow key={session._id || session.id} hover>
                              <TableCell>
                                {session.paymentVerifiedAt 
                                  ? new Date(session.paymentVerifiedAt).toLocaleDateString()
                                  : new Date(session.sessionDate).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{session.sessionType}</TableCell>
                              <TableCell>{session.psychologist?.name || 'Therapist'}</TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                  KES {session.mpesaAmount || session.price || session.sessionRate || 0}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                  {session.mpesaTransactionID || 'N/A'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<DownloadIcon />}
                                  onClick={() => downloadReceipt(session)}
                                  sx={{ minWidth: 100 }}
                                >
                                  Download
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No payment history found.
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Call History and Duration Display */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <VideocamIcon color="primary" />
                  <Typography variant="h6" component="h2">Call History & Session Records</Typography>
                </Box>
                {sessions.filter(s => (s.status === 'Confirmed' || s.status === 'Completed') && new Date(s.sessionDate) < new Date()).length > 0 ? (
                  <List dense>
                    {sessions
                      .filter(s => (s.status === 'Confirmed' || s.status === 'Completed') && new Date(s.sessionDate) < new Date())
                      .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))
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
                            {session.bookingReference && (
                              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                                Ref: {session.bookingReference}
                              </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              With: {session.psychologist?.name || 'Therapist'}
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
                            
                            {session.mpesaTransactionID && (
                              <Chip 
                                label="Paid" 
                                color="success" 
                                size="small" 
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                          <Box sx={{ flexShrink: 0, display: 'flex', gap: 1, flexDirection: 'column' }}>
                            {session.mpesaTransactionID && (
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<ReceiptIcon />}
                                onClick={() => downloadReceipt(session)}
                                sx={{ minWidth: 140 }}
                              >
                                Receipt
                              </Button>
                            )}
                            {submittedFeedback.includes(session._id || session.id) ? (
                              <Button
                                variant="contained"
                                disabled
                                size="small"
                                sx={{ minWidth: 140 }}
                              >
                                Feedback Submitted
                              </Button>
                            ) : (
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleFeedbackClick(session)}
                                sx={{ minWidth: 140 }}
                              >
                                Leave Feedback
                              </Button>
                            )}
                          </Box>
                        </ListItem>
                      ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No past sessions found.
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Session History */}
      <Box sx={{ mt: 4 }}>
        <SessionHistory userRole="client" maxItems={10} showPagination={true} />
      </Box>

      {/* Cancel Session Dialog */}
      <Dialog open={cancelDialogOpen} onClose={handleCancelClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Cancel Session
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to cancel this session with {selectedSession?.psychologist?.name} on {selectedSession && new Date(selectedSession.sessionDate).toLocaleString()}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelClose}>No, Keep It</Button>
          <Button onClick={handleCancelConfirm} color="error" autoFocus>
            Yes, Cancel Session
          </Button>
        </DialogActions>
      </Dialog>


      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onClose={handleFeedbackClose} fullWidth maxWidth="sm">
        <DialogTitle>Leave Feedback for your session with {selectedSession?.psychologist?.name}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Please rate your session from 1 to 5 stars and leave a comment about your experience.
          </DialogContentText>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Rating
              name="session-rating"
              value={rating}
              onChange={(event, newValue) => {
                setRating(newValue);
              }}
              size="large"
            />
          </Box>
          <TextField
            autoFocus
            margin="dense"
            label="Your Comment (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFeedbackClose}>Cancel</Button>
          <Button onClick={handleFeedbackSubmit} variant="contained">Submit Feedback</Button>
        </DialogActions>
      </Dialog>

      {/* Video Call Dialog */}
      <QuickVideoCall
        open={videoCallDialogOpen}
        onClose={() => setVideoCallDialogOpen(false)}
        session={selectedSessionForCall}
        psychologists={psychologists}
      />

      {/* M-Pesa Payment Dialog */}
      {selectedPaymentSession && (
        <MpesaPayment
          open={mpesaDialogOpen}
          onClose={() => setMpesaDialogOpen(false)}
          sessionId={selectedPaymentSession._id || selectedPaymentSession.id}
          amount={selectedPaymentSession.price || selectedPaymentSession.sessionRate || 0}
          sessionType={selectedPaymentSession.sessionType}
          psychologistName={selectedPaymentSession.psychologist?.name || 'Therapist'}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      )}

      {/* Payment Notification Dialog (Legacy fallback) */}
      <PaymentNotification
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        sessionDetails={paymentSession}
        psychologistName={paymentSession?.psychologist?.name}
        sessionRate={paymentSession?.paymentAmount}
        onPaymentSent={handlePaymentSent}
      />
    </Container>
  );
};

export default ClientDashboard;
