import { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { Container, Typography, Button, Grid, Paper, List, ListItem, ListItemText, Divider, CircularProgress, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Rating, Chip } from '@mui/material';
import { Videocam as VideocamIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import QuickActions from '../shared/QuickActions';
import QuickVideoCall from '../VideoCall/QuickVideoCall';
import CompactProfile from '../CompactProfile';
import Logo from '../Logo';

const ClientDashboard = () => {
  const { user } = useContext(AuthContext);
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

  useEffect(() => {
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
          axios.get('http://localhost:5000/api/sessions', config),
          axios.get('http://localhost:5000/api/feedback/client', config).catch(() => ({ data: [] })),
          axios.get('http://localhost:5000/api/users/psychologists', config).catch(() => ({ data: { data: [] } })),
          axios.get('http://localhost:5000/api/company/my-company', config).catch(() => ({ data: null }))
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

    fetchData();
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
      await axios.delete(`http://localhost:5000/api/sessions/${selectedSession._id}`, config);

      // Refresh sessions list after cancellation
      const res = await axios.get('http://localhost:5000/api/sessions', config);
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
      const body = { sessionId: selectedSession._id, rating, comment };
      await axios.post('http://localhost:5000/api/feedback', body, config);
      alert('Feedback submitted successfully!');
      setSubmittedFeedback([...submittedFeedback, selectedSession._id]);
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

  const isSessionLive = (session) => {
    const sessionTime = new Date(session.sessionDate);
    const now = new Date();
    const timeDiff = Math.abs(now - sessionTime);
    return timeDiff <= 30 * 60 * 1000; // Within 30 minutes
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
          <Grid size={{ xs: 12, md: 8 }}>
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
            <Grid size={{ xs: 12 }}>
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

            {/* Session Lists */}
            <Grid size={{ xs: 12 }} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" component="h2" gutterBottom>Pending Approval</Typography>
                {sessions.filter(s => s.status === 'Pending').length > 0 ? (
                  <List dense>
                    {sessions.filter(s => s.status === 'Pending').map(session => (
                      <ListItem
                        key={session._id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
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
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            With: {session.psychologist?.name || 'Therapist'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(session.sessionDate).toLocaleString()}
                          </Typography>
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
                    You have no pending session requests.
                  </Typography>
                )}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12 }} md={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" component="h2" gutterBottom>Upcoming Sessions</Typography>
                {sessions.filter(s => s.status === 'Booked' && new Date(s.sessionDate) > new Date()).length > 0 ? (
                  <List dense>
                    {sessions
                      .filter(s => s.status === 'Booked' && new Date(s.sessionDate) > new Date())
                      .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate))
                      .map(session => (
                        <ListItem
                          key={session._id}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            mb: 1,
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
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              With: {session.psychologist?.name || 'Therapist'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {new Date(session.sessionDate).toLocaleString()}
                            </Typography>
                            {session.meetingLink && (
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
                            )}
                          </Box>
                          <Box sx={{ flexShrink: 0, display: 'flex', gap: 1, flexDirection: 'column' }}>
                            {isSessionLive(session) && (
                              <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                startIcon={<VideocamIcon fontSize="small" />}
                                onClick={() => handleVideoCallClick(session)}
                                sx={{ minWidth: 100 }}
                              >
                                Join
                              </Button>
                            )}
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
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
                    You have no upcoming sessions.
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Session History */}
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" component="h2" gutterBottom>Session History</Typography>
                {sessions.filter(s => s.status === 'Booked' && new Date(s.sessionDate) < new Date()).length > 0 ? (
                  <List dense>
                    {sessions
                      .filter(s => s.status === 'Booked' && new Date(s.sessionDate) < new Date())
                      .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate))
                      .map(session => (
                        <ListItem
                          key={session._id}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            mb: 1,
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
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              With: {session.psychologist?.name || 'Therapist'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(session.sessionDate).toLocaleString()}
                            </Typography>
                          </Box>
                          <Box sx={{ flexShrink: 0 }}>
                            {submittedFeedback.includes(session._id) ? (
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
    </Container>
  );
};

export default ClientDashboard;
