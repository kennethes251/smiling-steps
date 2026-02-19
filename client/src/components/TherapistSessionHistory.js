import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
  Pagination,
  Card,
  CardContent,
  Collapse,
  Divider,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tab,
  Tabs,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Notes as NotesIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Videocam as VideocamIcon,
  History as HistoryIcon,
  Clear as ClearIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import API_BASE_URL from '../config/api';


/**
 * TherapistSessionHistory Component
 * 
 * Displays session history for therapists with advanced filtering,
 * client intake form viewing, and session notes management.
 * 
 * Requirements: 11.1, 11.2, 11.4
 */
const TherapistSessionHistory = () => {
  // State for sessions and loading
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;
  
  // Filter state
  const [filters, setFilters] = useState({
    clientName: '',
    clientId: '',
    startDate: null,
    endDate: null,
    sessionType: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [availableClients, setAvailableClients] = useState([]);
  
  // Session detail dialog state
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState(0);
  
  // Expanded session state
  const [expandedSession, setExpandedSession] = useState(null);
  
  // Export state
  const [exportLoading, setExportLoading] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Handle PDF export for a session
  const handleExportPdf = async (sessionId, bookingReference, encrypted = false) => {
    try {
      setExportLoading(prev => ({ ...prev, [sessionId]: true }));
      
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/session-export/${sessionId}/report?encrypted=${encrypted}`,
        {
          headers: { 'x-auth-token': token },
          responseType: encrypted ? 'json' : 'blob'
        }
      );
      
      if (encrypted) {
        // Handle encrypted response - store for later decryption
        const blob = new Blob([JSON.stringify(response.data)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.data.filename || `encrypted-report-${bookingReference || sessionId}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setSnackbar({ open: true, message: 'Encrypted report downloaded successfully', severity: 'success' });
      } else {
        // Handle PDF blob response
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `session-report-${bookingReference || sessionId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setSnackbar({ open: true, message: 'Session report downloaded successfully', severity: 'success' });
      }
    } catch (err) {
      console.error('Error exporting session:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.msg || 'Failed to export session report', 
        severity: 'error' 
      });
    } finally {
      setExportLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const fetchSessions = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      // Build query params
      const params = new URLSearchParams();
      params.append('limit', itemsPerPage);
      params.append('offset', (pageNum - 1) * itemsPerPage);
      
      if (filters.clientName) params.append('clientName', filters.clientName);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.sessionType) params.append('sessionType', filters.sessionType);
      if (filters.status) params.append('status', filters.status);
      
      const response = await axios.get(
        `${API_BASE_URL}/api/sessions/therapist/history?${params.toString()}`,
        config
      );
      
      if (response.data.success) {
        setSessions(response.data.sessions);
        setTotalCount(response.data.pagination.total);
        setTotalPages(Math.ceil(response.data.pagination.total / itemsPerPage));
        setAvailableClients(response.data.filters.available.clients || []);
      }
    } catch (err) {
      console.error('Error fetching session history:', err);
      setError(err.response?.data?.msg || 'Failed to fetch session history');
    } finally {
      setLoading(false);
    }
  }, [filters]);


  useEffect(() => {
    fetchSessions(1);
  }, []);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    fetchSessions(newPage);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    setPage(1);
    fetchSessions(1);
  };

  const clearFilters = () => {
    setFilters({
      clientName: '',
      clientId: '',
      startDate: null,
      endDate: null,
      sessionType: '',
      status: ''
    });
    setPage(1);
    fetchSessions(1);
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      setDetailsLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const response = await axios.get(
        `${API_BASE_URL}/api/sessions/therapist/session/${sessionId}/details`,
        config
      );
      
      if (response.data.success) {
        setSessionDetails(response.data);
      }
    } catch (err) {
      console.error('Error fetching session details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    setDetailsTab(0);
    fetchSessionDetails(session._id);
  };

  const handleCloseDetails = () => {
    setSelectedSession(null);
    setSessionDetails(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Completed': 'success',
      'In Progress': 'error',
      'Confirmed': 'primary',
      'Approved': 'info',
      'Payment Submitted': 'warning',
      'Pending': 'default',
      'Pending Approval': 'default',
      'Cancelled': 'error',
      'Declined': 'error'
    };
    return colors[status] || 'default';
  };


  // Render filter section
  const renderFilters = () => (
    <Collapse in={showFilters}>
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Search by Client Name"
              value={filters.clientName}
              onChange={(e) => handleFilterChange('clientName', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Client</InputLabel>
              <Select
                value={filters.clientId}
                label="Client"
                onChange={(e) => handleFilterChange('clientId', e.target.value)}
              >
                <MenuItem value="">All Clients</MenuItem>
                {availableClients.map(client => (
                  <MenuItem key={client._id} value={client._id}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Session Type</InputLabel>
              <Select
                value={filters.sessionType}
                label="Session Type"
                onChange={(e) => handleFilterChange('sessionType', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="Individual">Individual</MenuItem>
                <MenuItem value="Couples">Couples</MenuItem>
                <MenuItem value="Family">Family</MenuItem>
                <MenuItem value="Group">Group</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="upcoming">Upcoming</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => handleFilterChange('startDate', date)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => handleFilterChange('endDate', date)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
          </LocalizationProvider>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={applyFilters} startIcon={<SearchIcon />}>
                Search
              </Button>
              <Button variant="outlined" onClick={clearFilters} startIcon={<ClearIcon />}>
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Collapse>
  );


  // Render session card
  const renderSessionCard = (session) => (
    <Card 
      key={session._id} 
      sx={{ 
        mb: 2, 
        cursor: 'pointer',
        '&:hover': { boxShadow: 3 },
        border: expandedSession === session._id ? '2px solid' : '1px solid',
        borderColor: expandedSession === session._id ? 'primary.main' : 'divider'
      }}
    >
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          {/* Client Info */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={session.client?.profilePicture}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {session.client?.name || 'Unknown Client'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {session.client?.email}
                </Typography>
                {session.bookingReference && (
                  <Typography variant="caption" color="primary">
                    Ref: {session.bookingReference}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>
          
          {/* Session Info */}
          <Grid item xs={12} sm={4}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <ScheduleIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  {formatDate(session.sessionDate)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                <Chip label={session.sessionType} size="small" variant="outlined" />
                <Chip 
                  label={session.status} 
                  size="small" 
                  color={getStatusColor(session.status)}
                />
                {session.hasNotes && (
                  <Chip 
                    icon={<NotesIcon fontSize="small" />}
                    label="Notes" 
                    size="small" 
                    color="info"
                    variant="outlined"
                  />
                )}
                {session.intakeForm?.hasIntakeForm && (
                  <Chip 
                    icon={<AssignmentIcon fontSize="small" />}
                    label="Intake" 
                    size="small" 
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </Grid>
          
          {/* Actions */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
              {session.callData?.duration && (
                <Chip 
                  icon={<VideocamIcon fontSize="small" />}
                  label={`${session.callData.duration} min`}
                  size="small"
                  variant="outlined"
                />
              )}
              <Tooltip title="Export PDF Report">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportPdf(session._id, session.bookingReference);
                  }}
                  disabled={exportLoading[session._id]}
                >
                  {exportLoading[session._id] ? (
                    <CircularProgress size={20} />
                  ) : (
                    <PdfIcon />
                  )}
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleSessionClick(session)}
              >
                View Details
              </Button>
              <IconButton
                size="small"
                onClick={() => setExpandedSession(
                  expandedSession === session._id ? null : session._id
                )}
              >
                {expandedSession === session._id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Grid>
        </Grid>
        
        {/* Expanded Quick View */}
        <Collapse in={expandedSession === session._id}>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Quick Info</Typography>
              <Typography variant="body2">
                <strong>Price:</strong> KES {session.price?.toLocaleString() || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Payment:</strong> {session.paymentStatus || 'N/A'}
              </Typography>
              {session.callData?.hasCallData && (
                <Typography variant="body2">
                  <strong>Call Duration:</strong> {session.callData.duration || 0} minutes
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Notes Summary</Typography>
              {session.notes?.length > 0 ? (
                session.notes.map((note, idx) => (
                  <Chip 
                    key={idx}
                    label={note.noteType.replace('_', ' ')}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No notes yet
                </Typography>
              )}
            </Grid>
          </Grid>
        </Collapse>
      </CardContent>
    </Card>
  );


  // Render session details dialog
  const renderDetailsDialog = () => (
    <Dialog 
      open={!!selectedSession} 
      onClose={handleCloseDetails}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Session Details
            {selectedSession?.bookingReference && (
              <Typography component="span" variant="body2" color="primary" sx={{ ml: 1 }}>
                ({selectedSession.bookingReference})
              </Typography>
            )}
          </Typography>
          {detailsLoading && <CircularProgress size={24} />}
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {sessionDetails ? (
          <>
            <Tabs 
              value={detailsTab} 
              onChange={(e, v) => setDetailsTab(v)}
              sx={{ mb: 2 }}
            >
              <Tab label="Session Info" />
              <Tab label="Intake Form" />
              <Tab label="Session Notes" />
              <Tab label="History" />
            </Tabs>
            
            {/* Session Info Tab */}
            {detailsTab === 0 && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Client Information</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar src={sessionDetails.client?.profilePicture} sx={{ width: 56, height: 56 }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {sessionDetails.client?.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {sessionDetails.client?.email}
                          </Typography>
                          {sessionDetails.client?.phone && (
                            <Typography variant="body2" color="text.secondary">
                              {sessionDetails.client.phone}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Typography variant="body2">
                        <strong>Member Since:</strong> {formatDate(sessionDetails.client?.memberSince)}
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Session Details</Typography>
                      <Typography variant="body2">
                        <strong>Type:</strong> {sessionDetails.session?.sessionType}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Date:</strong> {formatDate(sessionDetails.session?.sessionDate)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Status:</strong> {sessionDetails.session?.status}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Payment:</strong> {sessionDetails.session?.paymentStatus}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Price:</strong> KES {sessionDetails.session?.price?.toLocaleString()}
                      </Typography>
                      {sessionDetails.session?.callData?.duration && (
                        <Typography variant="body2">
                          <strong>Call Duration:</strong> {sessionDetails.session.callData.duration} minutes
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            {/* Intake Form Tab */}
            {detailsTab === 1 && (
              <Box>
                {sessionDetails.intakeForm ? (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Client Intake Form</Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="primary">Reason for Therapy</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {sessionDetails.intakeForm.reasonForTherapy || 'Not provided'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="primary">Therapy Goals</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {sessionDetails.intakeForm.therapyGoals || 'Not provided'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="primary">Previous Therapy Experience</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {sessionDetails.intakeForm.previousTherapyExperience || 'None reported'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="primary">Current Symptoms</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {sessionDetails.intakeForm.currentSymptoms || 'Not provided'}
                        </Typography>
                        {sessionDetails.intakeForm.symptomSeverity && (
                          <Chip 
                            label={`Severity: ${sessionDetails.intakeForm.symptomSeverity}`}
                            size="small"
                            color={
                              sessionDetails.intakeForm.symptomSeverity === 'Severe' ? 'error' :
                              sessionDetails.intakeForm.symptomSeverity === 'Moderate' ? 'warning' : 'success'
                            }
                          />
                        )}
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="primary">Medical Information</Typography>
                        <Typography variant="body2">
                          <strong>Medications:</strong> {sessionDetails.intakeForm.currentMedications || 'None'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Conditions:</strong> {sessionDetails.intakeForm.medicalConditions || 'None'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="primary">Emergency Contact</Typography>
                        <Typography variant="body2">
                          {sessionDetails.intakeForm.emergencyContactName} ({sessionDetails.intakeForm.emergencyContactRelationship}) - {sessionDetails.intakeForm.emergencyContactPhone}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">
                      No intake form submitted for this session
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            
            {/* Session Notes Tab */}
            {detailsTab === 2 && (
              <Box>
                {sessionDetails.notes?.length > 0 ? (
                  <List>
                    {sessionDetails.notes.map((note, idx) => (
                      <Paper key={idx} sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={note.noteType.replace('_', ' ')} 
                              size="small" 
                              color="primary"
                            />
                            <Typography variant="caption" color="text.secondary">
                              v{note.version}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(note.createdAt)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {note.content}
                        </Typography>
                        {note.isClientVisible && (
                          <Chip 
                            label="Visible to Client" 
                            size="small" 
                            color="success" 
                            variant="outlined"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Paper>
                    ))}
                  </List>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <NotesIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">
                      No notes for this session yet
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
            
            {/* History Tab */}
            {detailsTab === 3 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Previous Sessions with {sessionDetails.client?.name}
                </Typography>
                
                {sessionDetails.previousSessions?.length > 0 ? (
                  <List>
                    {sessionDetails.previousSessions.map((prevSession, idx) => (
                      <ListItem key={idx} divider>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.light' }}>
                            <HistoryIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${prevSession.sessionType} Session`}
                          secondary={
                            <>
                              {formatDate(prevSession.sessionDate)}
                              {prevSession.duration && ` • ${prevSession.duration} min`}
                            </>
                          }
                        />
                        <Chip label={prevSession.status} size="small" color={getStatusColor(prevSession.status)} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">
                    No previous sessions with this client
                  </Typography>
                )}
                
                {sessionDetails.previousNotes?.length > 0 && (
                  <>
                    <Typography variant="subtitle1" sx={{ mt: 3 }} gutterBottom>
                      Notes from Previous Sessions
                    </Typography>
                    {sessionDetails.previousNotes.map((note, idx) => (
                      <Paper key={idx} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="primary">
                            {note.sessionType} - {formatDate(note.sessionDate)}
                          </Typography>
                          <Chip label={note.noteType.replace('_', ' ')} size="small" />
                        </Box>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {note.content}
                        </Typography>
                      </Paper>
                    ))}
                  </>
                )}
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button
          variant="outlined"
          startIcon={exportLoading[selectedSession?._id] ? <CircularProgress size={16} /> : <PdfIcon />}
          onClick={() => handleExportPdf(selectedSession?._id, selectedSession?.bookingReference)}
          disabled={exportLoading[selectedSession?._id]}
        >
          Export PDF
        </Button>
        <Button
          variant="outlined"
          startIcon={exportLoading[`${selectedSession?._id}_enc`] ? <CircularProgress size={16} /> : <DownloadIcon />}
          onClick={() => {
            setExportLoading(prev => ({ ...prev, [`${selectedSession?._id}_enc`]: true }));
            handleExportPdf(selectedSession?._id, selectedSession?.bookingReference, true)
              .finally(() => setExportLoading(prev => ({ ...prev, [`${selectedSession?._id}_enc`]: false })));
          }}
          disabled={exportLoading[`${selectedSession?._id}_enc`]}
        >
          Export Encrypted
        </Button>
        <Button onClick={handleCloseDetails}>Close</Button>
      </DialogActions>
    </Dialog>
  );


  // Main render
  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="primary" />
            <Typography variant="h6">Session History</Typography>
            <Chip label={`${totalCount} sessions`} size="small" />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={showFilters ? 'contained' : 'outlined'}
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              size="small"
            >
              Filters
            </Button>
            <Tooltip title="Refresh">
              <IconButton onClick={() => fetchSessions(page)} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>
      
      {/* Filters */}
      {renderFilters()}
      
      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
          <Button onClick={() => fetchSessions(page)} sx={{ mt: 2 }}>
            Try Again
          </Button>
        </Paper>
      ) : sessions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <HistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No sessions found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Object.values(filters).some(v => v) 
              ? 'Try adjusting your filters'
              : 'Sessions will appear here once you have appointments'
            }
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Session List */}
          {sessions.map(session => renderSessionCard(session))}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
      
      {/* Session Details Dialog */}
      {renderDetailsDialog()}
      
      {/* Export Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TherapistSessionHistory;
