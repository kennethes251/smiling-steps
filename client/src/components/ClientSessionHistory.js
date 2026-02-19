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
  Tab,
  Tabs,
  Snackbar,
  Alert,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Notes as NotesIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Videocam as VideocamIcon,
  History as HistoryIcon,
  Clear as ClearIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  PlayCircle as PlayIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import API_BASE_URL from '../config/api';

/**
 * ClientSessionHistory Component
 * 
 * Displays session history for clients with timeline view,
 * therapist-approved notes, and session recording access.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */
const ClientSessionHistory = () => {
  // State for sessions and loading
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;
  
  // Filter state
  const [filters, setFilters] = useState({
    therapistId: '',
    startDate: null,
    endDate: null,
    sessionType: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [availableTherapists, setAvailableTherapists] = useState([]);
  
  // Session detail dialog state
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState(0);
  
  // View mode state
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'timeline'
  
  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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
      
      if (filters.therapistId) params.append('therapistId', filters.therapistId);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.sessionType) params.append('sessionType', filters.sessionType);
      if (filters.status) params.append('status', filters.status);
      
      const response = await axios.get(
        `${API_BASE_URL}/api/sessions/my-history?${params.toString()}`,
        config
      );
      
      if (response.data.success) {
        setSessions(response.data.sessions);
        setTotalCount(response.data.pagination.total);
        setTotalPages(Math.ceil(response.data.pagination.total / itemsPerPage));
        setAvailableTherapists(response.data.filters.available.therapists || []);
        setStats(response.data.stats);
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
      therapistId: '',
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
        `${API_BASE_URL}/api/sessions/my-session/${sessionId}`,
        config
      );
      
      if (response.data.success) {
        setSessionDetails(response.data);
      }
    } catch (err) {
      console.error('Error fetching session details:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.msg || 'Failed to load session details', 
        severity: 'error' 
      });
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

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handle recording access (Requirement 12.3)
  const handleAccessRecording = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/sessions/my-session/${sessionId}/recording`,
        { headers: { 'x-auth-token': token } }
      );
      
      if (response.data.success) {
        // Open recording in new tab
        window.open(response.data.recording.accessUrl, '_blank');
        setSnackbar({ open: true, message: 'Recording access granted', severity: 'success' });
      }
    } catch (err) {
      console.error('Error accessing recording:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.msg || 'Failed to access recording', 
        severity: 'error' 
      });
    }
  };

  // Handle PDF export (Requirement 12.5)
  const handleExportHistory = async () => {
    try {
      setExportLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${API_BASE_URL}/api/client-export/my-history`,
        {
          headers: { 'x-auth-token': token },
          responseType: 'blob'
        }
      );
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `session-history-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSnackbar({ open: true, message: 'Session history exported successfully', severity: 'success' });
    } catch (err) {
      console.error('Error exporting history:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.msg || 'Failed to export session history', 
        severity: 'error' 
      });
    } finally {
      setExportLoading(false);
    }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircleIcon color="success" />;
      case 'Cancelled':
      case 'Declined':
        return <CancelIcon color="error" />;
      case 'Confirmed':
      case 'In Progress':
        return <VideocamIcon color="primary" />;
      default:
        return <PendingIcon color="action" />;
    }
  };


  // Render stats summary
  const renderStats = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={6} sm={3}>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
          <Typography variant="h4">{stats?.totalSessions || 0}</Typography>
          <Typography variant="body2">Total Sessions</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
          <Typography variant="h4">{stats?.completedSessions || 0}</Typography>
          <Typography variant="body2">Completed</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
          <Typography variant="h4">{stats?.upcomingSessions || 0}</Typography>
          <Typography variant="body2">Upcoming</Typography>
        </Paper>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.400', color: 'white' }}>
          <Typography variant="h4">{stats?.cancelledSessions || 0}</Typography>
          <Typography variant="body2">Cancelled</Typography>
        </Paper>
      </Grid>
    </Grid>
  );

  // Render filter section
  const renderFilters = () => (
    <Collapse in={showFilters}>
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Therapist</InputLabel>
              <Select
                value={filters.therapistId}
                label="Therapist"
                onChange={(e) => handleFilterChange('therapistId', e.target.value)}
              >
                <MenuItem value="">All Therapists</MenuItem>
                {availableTherapists.map(therapist => (
                  <MenuItem key={therapist._id} value={therapist._id}>
                    {therapist.name}
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
                <MenuItem value="cancelled">Cancelled</MenuItem>
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
        borderLeft: 4,
        borderColor: getStatusColor(session.status) + '.main'
      }}
      onClick={() => handleSessionClick(session)}
    >
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          {/* Therapist Info */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={session.therapist?.profilePicture}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {session.therapist?.name || 'Unknown Therapist'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {session.therapist?.specializations?.slice(0, 2).join(', ') || 'Therapist'}
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
                {session.hasSharedNotes && (
                  <Chip 
                    icon={<NotesIcon fontSize="small" />}
                    label="Notes" 
                    size="small" 
                    color="info"
                    variant="outlined"
                  />
                )}
                {session.hasRecording && (
                  <Chip 
                    icon={<PlayIcon fontSize="small" />}
                    label="Recording" 
                    size="small" 
                    color="secondary"
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
              {session.hasRecording && (
                <Tooltip title="Watch Recording">
                  <IconButton
                    size="small"
                    color="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAccessRecording(session._id);
                    }}
                  >
                    <PlayIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSessionClick(session);
                }}
              >
                View Details
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  // Render timeline view (Requirement 12.1)
  const renderTimeline = () => (
    <Box sx={{ pl: 2 }}>
      {sessions.map((session, index) => (
        <Box 
          key={session._id}
          sx={{ 
            display: 'flex', 
            mb: 3,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
            borderRadius: 1,
            p: 1
          }}
          onClick={() => handleSessionClick(session)}
        >
          {/* Timeline dot and line */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              bgcolor: getStatusColor(session.status) + '.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              {getStatusIcon(session.status)}
            </Box>
            {index < sessions.length - 1 && (
              <Box sx={{ width: 2, flexGrow: 1, bgcolor: 'divider', my: 1 }} />
            )}
          </Box>
          
          {/* Content */}
          <Paper sx={{ flexGrow: 1, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {session.sessionType} Session with {session.therapist?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(session.sessionDate)}
                </Typography>
                {session.bookingReference && (
                  <Typography variant="caption" color="primary">
                    Ref: {session.bookingReference}
                  </Typography>
                )}
              </Box>
              <Chip 
                label={session.status} 
                size="small" 
                color={getStatusColor(session.status)}
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              {session.callData?.duration && (
                <Chip 
                  icon={<VideocamIcon fontSize="small" />}
                  label={`${session.callData.duration} min`}
                  size="small"
                  variant="outlined"
                />
              )}
              {session.hasSharedNotes && (
                <Chip 
                  icon={<NotesIcon fontSize="small" />}
                  label="Notes Available" 
                  size="small" 
                  color="info"
                  variant="outlined"
                />
              )}
              {session.hasRecording && (
                <Chip 
                  icon={<PlayIcon fontSize="small" />}
                  label="Recording Available" 
                  size="small" 
                  color="secondary"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccessRecording(session._id);
                  }}
                />
              )}
            </Box>
          </Paper>
        </Box>
      ))}
    </Box>
  );


  // Render session details dialog (Requirements 12.2, 12.4)
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
              <Tab label="Therapist Notes" />
              {sessionDetails.session?.hasRecording && <Tab label="Recording" />}
              <Tab label="History" />
            </Tabs>
            
            {/* Session Info Tab */}
            {detailsTab === 0 && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Therapist Information</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar src={sessionDetails.therapist?.profilePicture} sx={{ width: 56, height: 56 }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="bold">
                            {sessionDetails.therapist?.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {sessionDetails.therapist?.email}
                          </Typography>
                          {sessionDetails.therapist?.specializations?.length > 0 && (
                            <Typography variant="caption" color="primary">
                              {sessionDetails.therapist.specializations.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      {sessionDetails.therapist?.bio && (
                        <Typography variant="body2" color="text.secondary">
                          {sessionDetails.therapist.bio}
                        </Typography>
                      )}
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
                          <strong>Duration:</strong> {sessionDetails.session.callData.duration} minutes
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            {/* Therapist Notes Tab (Requirement 12.4 - only therapist-approved notes) */}
            {detailsTab === 1 && (
              <Box>
                {sessionDetails.sharedNotes?.length > 0 ? (
                  <List>
                    {sessionDetails.sharedNotes.map((note, idx) => (
                      <Paper key={idx} sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={note.noteType?.replace('_', ' ') || 'Note'} 
                              size="small" 
                              color="primary"
                            />
                            <Typography variant="caption" color="text.secondary">
                              by {note.author}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(note.createdAt)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {note.content}
                        </Typography>
                      </Paper>
                    ))}
                  </List>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <NotesIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">
                      No notes have been shared for this session yet.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Your therapist may share notes after the session is complete.
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
            
            {/* Recording Tab (Requirement 12.3) */}
            {detailsTab === 2 && sessionDetails.session?.hasRecording && (
              <Box>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <PlayIcon sx={{ fontSize: 64, color: 'secondary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Session Recording Available
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This session was recorded with your consent. You can access the recording below.
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<PlayIcon />}
                    onClick={() => handleAccessRecording(sessionDetails.session._id)}
                  >
                    Watch Recording
                  </Button>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
                    Recording access is logged for security purposes.
                  </Typography>
                </Paper>
              </Box>
            )}
            
            {/* History Tab */}
            {(detailsTab === 3 || (detailsTab === 2 && !sessionDetails.session?.hasRecording)) && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Previous Sessions with {sessionDetails.therapist?.name}
                </Typography>
                {sessionDetails.previousSessions?.length > 0 ? (
                  <List>
                    {sessionDetails.previousSessions.map((prevSession) => (
                      <ListItem key={prevSession._id} divider>
                        <ListItemText
                          primary={`${prevSession.sessionType} Session`}
                          secondary={
                            <>
                              {formatDate(prevSession.sessionDate)}
                              {prevSession.duration && ` • ${prevSession.duration} min`}
                              {prevSession.bookingReference && ` • Ref: ${prevSession.bookingReference}`}
                            </>
                          }
                        />
                        <Chip label="Completed" size="small" color="success" />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">
                      This is your first session with this therapist.
                    </Typography>
                  </Paper>
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
        <Button onClick={handleCloseDetails}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  // Main render
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            My Session History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View your past and upcoming therapy sessions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Toggle View">
            <IconButton onClick={() => setViewMode(viewMode === 'cards' ? 'timeline' : 'cards')}>
              {viewMode === 'cards' ? <EventIcon /> : <HistoryIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle Filters">
            <IconButton onClick={() => setShowFilters(!showFilters)}>
              <FilterIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={() => fetchSessions(page)} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={exportLoading ? <CircularProgress size={16} /> : <PdfIcon />}
            onClick={handleExportHistory}
            disabled={exportLoading}
          >
            Export PDF
          </Button>
        </Box>
      </Box>
      
      {/* Stats Summary */}
      {stats && renderStats()}
      
      {/* Filters */}
      {renderFilters()}
      
      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : sessions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <HistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No sessions found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Object.values(filters).some(v => v) 
              ? 'Try adjusting your filters'
              : 'Book your first session to get started'}
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Sessions List */}
          {viewMode === 'cards' 
            ? sessions.map(renderSessionCard)
            : renderTimeline()
          }
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
      
      {/* Session Details Dialog */}
      {renderDetailsDialog()}
      
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClientSessionHistory;
