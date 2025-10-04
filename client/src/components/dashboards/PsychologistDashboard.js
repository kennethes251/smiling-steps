import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/api';
import { Container, Typography, Grid, Paper, List, ListItem, ListItemText, Divider, Button, CircularProgress, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Chip } from '@mui/material';
import { Videocam as VideocamIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import QuickActions from '../shared/QuickActions';
import CompactProfile from '../CompactProfile';
import QuickVideoCall from '../VideoCall/QuickVideoCall';
import Logo from '../Logo';

const PsychologistDashboard = () => {
  const { user } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [clientAssessments, setClientAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for dialogs
  const [selectedSession, setSelectedSession] = useState(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  // State for form inputs
  const [meetingLink, setMeetingLink] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionProof, setSessionProof] = useState('');
  
  // Video call state
  const [videoCallDialogOpen, setVideoCallDialogOpen] = useState(false);
  const [selectedSessionForCall, setSelectedSessionForCall] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const [sessionsRes, clientsRes] = await Promise.all([
        axios.get(`${API_ENDPOINTS.SESSIONS}`, config),
        axios.get(`${API_ENDPOINTS.USERS}/clients`, config)
      ]);

      const sortedSessions = sessionsRes.data.sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
      setSessions(sortedSessions);
      
      const clientIds = clientsRes.data.map(client => client._id);
      const assessmentPromises = clientIds.map(clientId => 
        axios.get(`http://localhost:5000/api/assessments/results/client/${clientId}`, config)
          .catch(err => ({ data: [] }))
      );
      
      const assessmentResults = await Promise.all(assessmentPromises);
      const allClientAssessments = assessmentResults
        .flatMap(res => res.data)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
      
      setClientAssessments(allClientAssessments);

    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveSession = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      await axios.put(`http://localhost:5000/api/sessions/${sessionId}/approve`, {}, config);
      setSessions(prev => prev.map(s => s._id === sessionId ? { ...s, status: 'Booked' } : s));
      alert('Session approved successfully!');
    } catch (err) {
      console.error('Failed to approve session', err);
      alert(err.response?.data?.msg || 'Failed to approve session.');
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
      const res = await axios.put(`http://localhost:5000/api/sessions/${selectedSession._id}/link`, body, config);
      setSessions(prev => prev.map(s => s._id === selectedSession._id ? res.data : s));
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
      const res = await axios.post(`http://localhost:5000/api/sessions/${selectedSession._id}/complete`, body, config);
      setSessions(prev => prev.map(s => s._id === selectedSession._id ? res.data : s));
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

  const isSessionLive = (session) => {
    const sessionTime = new Date(session.sessionDate);
    const now = new Date();
    const timeDiff = Math.abs(now - sessionTime);
    return timeDiff <= 30 * 60 * 1000; // Within 30 minutes
  };

  const generateVideoCallLink = async (sessionId) => {
    try {
      const videoCallLink = `${window.location.origin}/video-call/${sessionId}`;
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      await axios.put(`http://localhost:5000/api/sessions/${sessionId}/link`, {
        meetingLink: videoCallLink
      }, config);
      
      // Update local state
      setSessions(prev => prev.map(s => 
        s._id === sessionId ? { ...s, meetingLink: videoCallLink } : s
      ));
      
      // Copy to clipboard
      navigator.clipboard.writeText(videoCallLink);
      alert('Video call link generated and copied to clipboard!');
    } catch (err) {
      console.error('Failed to generate video call link:', err);
      alert('Failed to generate video call link');
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
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {/* Pending Sessions */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, border: sessions.filter(s => s.status === 'Pending').length > 0 ? '2px solid #ff9800' : 'none' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Pending Session Requests
                {sessions.filter(s => s.status === 'Pending').length > 0 && (
                  <Box sx={{ 
                    backgroundColor: '#ff9800', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: 24, 
                    height: 24, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {sessions.filter(s => s.status === 'Pending').length}
                  </Box>
                )}
              </Typography>
              <List>
                {sessions.filter(s => s.status === 'Pending').length > 0 ? (
                  sessions.filter(s => s.status === 'Pending').map(session => (
                    <ListItem 
                      key={session._id} 
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        display: 'flex',
                        alignItems: 'flex-start',
                        p: 2
                      }}
                    >
                      <Box sx={{ flexGrow: 1, mr: 2 }}>
                        <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {session.sessionType} Session with {session.client.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Requested for: {new Date(session.sessionDate).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ flexShrink: 0 }}>
                        <Button 
                          variant="contained" 
                          color="primary" 
                          size="small"
                          onClick={() => handleApproveSession(session._id)}
                          sx={{ minWidth: 100 }}
                        >
                          Approve
                        </Button>
                      </Box>
                    </ListItem>
                  ))
                ) : (
                  <Typography>No pending session requests.</Typography>
                )}
              </List>
            </Paper>
          </Grid>

          {/* Upcoming Sessions */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Upcoming Confirmed Sessions</Typography>
              <List>
                {sessions.filter(s => s.status === 'Booked').length > 0 ? (
                  sessions.filter(s => s.status === 'Booked').map(session => (
                    <ListItem 
                      key={session._id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        display: 'flex',
                        alignItems: 'flex-start',
                        p: 2,
                        flexDirection: 'column',
                        gap: 2
                      }}
                    >
                      <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
                        <Box sx={{ flexGrow: 1, mr: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
                              {session.sessionType} Session with {session.client.name}
                            </Typography>
                            {isSessionLive(session) && <Chip label="LIVE" color="success" size="small" />}
                            {session.isVideoCall && <Chip label="Video Call" color="primary" size="small" />}
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Time: {new Date(session.sessionDate).toLocaleString()}
                          </Typography>
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
                        {isSessionLive(session) && (
                          <Button 
                            size="small" 
                            variant="contained" 
                            color="success" 
                            startIcon={<VideocamIcon />}
                            onClick={() => handleVideoCallClick(session)}
                          >
                            Start Video Call
                          </Button>
                        )}
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={() => generateVideoCallLink(session._id)}
                        >
                          Generate Video Link
                        </Button>
                        <Button size="small" onClick={() => handleOpenLinkDialog(session)}>
                          {session.meetingLink ? 'Edit Link' : 'Add Link'}
                        </Button>
                        <Button size="small" variant="contained" color="success" onClick={() => handleOpenCompleteDialog(session)}>
                          Complete
                        </Button>
                      </Box>
                    </ListItem>
                  ))
                ) : (
                  <Typography>No upcoming confirmed sessions.</Typography>
                )}
              </List>
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
    </Container>
  );
};

export default PsychologistDashboard;
