import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  Chip,
  Avatar,
  Button,
  CircularProgress,
  Pagination,
  FormControlLabel,
  Switch,
  Divider,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import API_BASE_URL from '../config/api';

const SessionHistory = ({ userRole = 'client', maxItems = 10, showPagination = true }) => {
  const { user } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [includeActive, setIncludeActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const itemsPerPage = maxItems;

  const fetchSessionHistory = async (pageNum = 1, includeActiveSessions = false) => {
    try {
      setLoading(pageNum === 1);
      setRefreshing(pageNum !== 1);
      
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const offset = (pageNum - 1) * itemsPerPage;
      const response = await axios.get(
        `${API_BASE_URL}/api/sessions/history?limit=${itemsPerPage}&offset=${offset}&includeActive=${includeActiveSessions}`,
        config
      );

      if (response.data.success) {
        setSessions(response.data.sessionHistory);
        setTotalPages(Math.ceil(response.data.pagination.total / itemsPerPage));
        setError(null);
      } else {
        setError('Failed to fetch session history');
      }
    } catch (err) {
      console.error('Error fetching session history:', err);
      setError(err.response?.data?.msg || 'Failed to fetch session history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessionHistory(1, includeActive);
  }, [includeActive]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    fetchSessionHistory(newPage, includeActive);
  };

  const handleRefresh = () => {
    fetchSessionHistory(page, includeActive);
  };

  const handleIncludeActiveChange = (event) => {
    setIncludeActive(event.target.checked);
    setPage(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'error';
      case 'Confirmed':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getCallStatusColor = (callStatus) => {
    switch (callStatus) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'error';
      case 'No call data':
        return 'default';
      default:
        return 'info';
    }
  };

  const downloadReceipt = (session) => {
    const receiptData = {
      sessionType: session.sessionType,
      participant: userRole === 'client' ? session.psychologist.name : session.client.name,
      date: formatDate(session.sessionDate),
      amount: session.price || 0,
      status: session.paymentStatus || 'Unknown',
      callDuration: session.callData.durationFormatted || 'No call data'
    };

    const receiptText = `
SMILING STEPS THERAPY
Session Receipt
=====================================

Session Type: ${receiptData.sessionType}
${userRole === 'client' ? 'Therapist' : 'Client'}: ${receiptData.participant}
Session Date: ${receiptData.date}
Call Duration: ${receiptData.callDuration}

Amount: KES ${receiptData.amount}
Status: ${receiptData.status}

=====================================
Thank you for using our service!
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-receipt-${session.sessionId}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error" variant="body1">
          {error}
        </Typography>
        <Button onClick={handleRefresh} sx={{ mt: 2 }}>
          Try Again
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VideocamIcon color="primary" />
          <Typography variant="h6" component="h2">
            Session History
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={includeActive}
                onChange={handleIncludeActiveChange}
                size="small"
              />
            }
            label="Include Active"
            sx={{ mr: 1 }}
          />
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Session List */}
      {sessions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No session history found.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {includeActive 
              ? 'Try toggling "Include Active" to see completed sessions only.'
              : 'Complete some sessions to see your history here.'
            }
          </Typography>
        </Box>
      ) : (
        <List>
          {sessions.map((session, index) => (
            <React.Fragment key={session.sessionId}>
              <ListItem
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  mb: 2,
                  p: 2,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  {/* Participant Info */}
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        src={userRole === 'client' 
                          ? session.psychologist.profilePicture 
                          : session.client.profilePicture
                        }
                        sx={{ width: 48, height: 48 }}
                      >
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {session.sessionType} Session
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {userRole === 'client' ? 'With: ' : 'Client: '}
                          {userRole === 'client' 
                            ? session.psychologist.name 
                            : session.client.name
                          }
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Session Details */}
                  <Grid item xs={12} sm={4}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <ScheduleIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDate(session.sessionDate)}
                        </Typography>
                      </Box>
                      
                      {session.callData.hasCallData && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <AccessTimeIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            Duration: {session.callData.durationFormatted || 'N/A'}
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={session.status}
                          color={getStatusColor(session.status)}
                          size="small"
                        />
                        {session.callData.hasCallData && (
                          <Chip
                            label={session.callData.status}
                            color={getCallStatusColor(session.callData.status)}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  </Grid>

                  {/* Actions */}
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      {session.price && (
                        <Typography variant="body2" sx={{ mr: 2, alignSelf: 'center' }}>
                          KES {session.price.toLocaleString()}
                        </Typography>
                      )}
                      
                      <Tooltip title="Download Receipt">
                        <IconButton
                          onClick={() => downloadReceipt(session)}
                          size="small"
                          color="primary"
                        >
                          <ReceiptIcon />
                        </IconButton>
                      </Tooltip>

                      {session.status === 'In Progress' && session.meetingLink && (
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<VideocamIcon />}
                          href={`/video-call/${session.sessionId}`}
                          sx={{ ml: 1 }}
                        >
                          Rejoin
                        </Button>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </ListItem>
              {index < sessions.length - 1 && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
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

      {/* Summary Stats */}
      {sessions.length > 0 && (
        <Card sx={{ mt: 3, bgcolor: 'primary.light' }}>
          <CardContent>
            <Typography variant="h6" color="primary.contrastText" gutterBottom>
              Session Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="primary.contrastText">
                  Total Sessions
                </Typography>
                <Typography variant="h6" color="primary.contrastText">
                  {sessions.length}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="primary.contrastText">
                  Completed Calls
                </Typography>
                <Typography variant="h6" color="primary.contrastText">
                  {sessions.filter(s => s.callData.hasCallData && s.callData.status === 'Completed').length}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="primary.contrastText">
                  Total Call Time
                </Typography>
                <Typography variant="h6" color="primary.contrastText">
                  {sessions
                    .filter(s => s.callData.hasCallData && s.callData.duration)
                    .reduce((total, s) => total + (s.callData.duration || 0), 0)} min
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="primary.contrastText">
                  Active Sessions
                </Typography>
                <Typography variant="h6" color="primary.contrastText">
                  {sessions.filter(s => s.status === 'In Progress').length}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Paper>
  );
};

export default SessionHistory;