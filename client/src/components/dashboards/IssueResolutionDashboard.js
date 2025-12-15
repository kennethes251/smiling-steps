import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const IssueResolutionDashboard = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [potentialIssues, setPotentialIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [scheduleMinutes, setScheduleMinutes] = useState(5);
  const [alert, setAlert] = useState(null);

  // Issue type descriptions
  const issueTypeDescriptions = {
    timeout_recovery: 'Payment processing timeout - verify with M-Pesa API',
    status_verification: 'Verify payment status consistency',
    orphaned_payment: 'Payment has transaction ID but wrong status',
    duplicate_callback: 'Multiple callbacks for same transaction',
    amount_mismatch: 'M-Pesa amount differs from session price',
    status_inconsistency: 'Payment and session status mismatch',
    failed_callback_retry: 'Retry failed callback processing',
    api_sync_issue: 'Synchronization issue with M-Pesa API'
  };

  // Severity colors
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  // Load system status
  const loadStatus = async () => {
    try {
      const response = await fetch('/api/issue-resolution/status', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  // Load potential issues
  const loadPotentialIssues = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/issue-resolution/potential-issues', {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPotentialIssues(data.potentialIssues);
      }
    } catch (error) {
      console.error('Failed to load potential issues:', error);
      setAlert({ type: 'error', message: 'Failed to load potential issues' });
    } finally {
      setLoading(false);
    }
  };

  // Run automatic detection and resolution
  const runDetectionAndResolution = async () => {
    setResolving(true);
    try {
      const response = await fetch('/api/issue-resolution/detect-and-resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAlert({
          type: 'success',
          message: `Resolution completed: ${data.results.resolved} resolved, ${data.results.failed} failed`
        });
        loadPotentialIssues(); // Refresh the list
      } else {
        throw new Error('Failed to run resolution');
      }
    } catch (error) {
      console.error('Failed to run resolution:', error);
      setAlert({ type: 'error', message: 'Failed to run automatic resolution' });
    } finally {
      setResolving(false);
    }
  };

  // Resolve specific issue
  const resolveSpecificIssue = async (sessionId, issueType) => {
    try {
      const response = await fetch('/api/issue-resolution/resolve-specific', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ sessionId, issueType })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result.success) {
          setAlert({ type: 'success', message: `Issue resolved: ${data.result.reason}` });
        } else {
          setAlert({ 
            type: 'warning', 
            message: `Resolution failed: ${data.result.reason}${data.result.requiresManualIntervention ? ' (Manual intervention required)' : ''}` 
          });
        }
        loadPotentialIssues(); // Refresh the list
      } else {
        throw new Error('Failed to resolve issue');
      }
    } catch (error) {
      console.error('Failed to resolve issue:', error);
      setAlert({ type: 'error', message: 'Failed to resolve specific issue' });
    }
  };

  // Schedule resolution
  const scheduleResolution = async () => {
    if (!selectedIssue) return;

    try {
      const response = await fetch('/api/issue-resolution/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({
          sessionId: selectedIssue.sessionId,
          issueType: selectedIssue.issueType,
          delayMinutes: scheduleMinutes
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAlert({ 
          type: 'success', 
          message: `Resolution scheduled for ${new Date(data.scheduledFor).toLocaleString()}` 
        });
        setDialogOpen(false);
      } else {
        throw new Error('Failed to schedule resolution');
      }
    } catch (error) {
      console.error('Failed to schedule resolution:', error);
      setAlert({ type: 'error', message: 'Failed to schedule resolution' });
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadStatus();
      loadPotentialIssues();
    }
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <Alert severity="error">
        Admin access required to view issue resolution dashboard.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Automatic Issue Resolution
      </Typography>

      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          sx={{ mb: 2 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* System Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Box display="flex" alignItems="center">
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography>
                  Status: {status?.systemActive ? 'Active' : 'Inactive'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography>
                Max Attempts: {status?.config?.MAX_AUTO_RESOLUTION_ATTEMPTS || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={runDetectionAndResolution}
                  disabled={resolving}
                >
                  {resolving ? <CircularProgress size={20} /> : 'Run Detection & Resolution'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadPotentialIssues}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Potential Issues */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Potential Issues ({potentialIssues.length})
          </Typography>

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : potentialIssues.length === 0 ? (
            <Alert severity="success">
              No potential issues detected. All payments appear to be in good state.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Session</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Issues</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {potentialIssues.map((issue) => (
                    <TableRow key={issue.sessionId}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {issue.sessionId.slice(-8)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {issue.transactionId ? `TX: ${issue.transactionId.slice(-8)}` : 'No TX ID'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {issue.client}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Dr. {issue.psychologist}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          KES {issue.amount}
                        </Typography>
                        {issue.mpesaAmount && issue.mpesaAmount !== issue.amount && (
                          <Typography variant="caption" color="error">
                            M-Pesa: KES {issue.mpesaAmount}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={issue.paymentStatus} 
                          size="small"
                          color={issue.paymentStatus === 'Paid' ? 'success' : 'warning'}
                        />
                        <br />
                        <Chip 
                          label={issue.sessionStatus} 
                          size="small" 
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          {issue.issues.map((iss, idx) => (
                            <Chip
                              key={idx}
                              label={iss.type.replace(/_/g, ' ')}
                              size="small"
                              color={getSeverityColor(iss.severity)}
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                        <Accordion sx={{ mt: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="caption">Details</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            {issue.issues.map((iss, idx) => (
                              <Typography key={idx} variant="caption" display="block">
                                • {iss.description}
                              </Typography>
                            ))}
                          </AccordionDetails>
                        </Accordion>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" flexDirection="column" gap={1}>
                          {issue.issues.map((iss, idx) => (
                            <Box key={idx} display="flex" gap={1}>
                              <Tooltip title={`Resolve ${iss.type}`}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => resolveSpecificIssue(issue.sessionId, iss.type)}
                                >
                                  <PlayArrowIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={`Schedule ${iss.type} resolution`}>
                                <IconButton
                                  size="small"
                                  color="secondary"
                                  onClick={() => {
                                    setSelectedIssue({
                                      sessionId: issue.sessionId,
                                      issueType: iss.type,
                                      description: iss.description
                                    });
                                    setDialogOpen(true);
                                  }}
                                >
                                  <ScheduleIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Schedule Resolution Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Schedule Issue Resolution</DialogTitle>
        <DialogContent>
          {selectedIssue && (
            <>
              <Typography variant="body2" gutterBottom>
                <strong>Session:</strong> {selectedIssue.sessionId}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Issue:</strong> {selectedIssue.issueType.replace(/_/g, ' ')}
              </Typography>
              <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
                <strong>Description:</strong> {selectedIssue.description}
              </Typography>
              <TextField
                fullWidth
                label="Delay (minutes)"
                type="number"
                value={scheduleMinutes}
                onChange={(e) => setScheduleMinutes(parseInt(e.target.value))}
                inputProps={{ min: 1, max: 1440 }}
                helperText="Resolution will be attempted after this delay"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={scheduleResolution} variant="contained">
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IssueResolutionDashboard;