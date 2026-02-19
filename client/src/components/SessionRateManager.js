import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';
import {
  Edit as EditIcon,
  History as HistoryIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const SessionRateManager = () => {
  const [currentRates, setCurrentRates] = useState([]);
  const [rateHistory, setRateHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedSessionType, setSelectedSessionType] = useState('');
  
  // Form states
  const [editForm, setEditForm] = useState({
    sessionType: '',
    amount: '',
    duration: '',
    changeReason: ''
  });

  const sessionTypes = ['Individual', 'Couples', 'Family', 'Group'];
  
  const sessionTypeConfig = {
    Individual: {
      description: 'One-on-one personalized therapy session',
      color: '#1976d2',
      defaultDuration: 60
    },
    Couples: {
      description: 'Therapy session for couples',
      color: '#d32f2f',
      defaultDuration: 75
    },
    Family: {
      description: 'Family therapy session',
      color: '#388e3c',
      defaultDuration: 90
    },
    Group: {
      description: 'Group therapy with peers',
      color: '#f57c00',
      defaultDuration: 90
    }
  };

  useEffect(() => {
    fetchCurrentRates();
  }, []);

  const fetchCurrentRates = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const response = await axios.get(`${API_BASE_URL}/api/therapist/rates`, config);
      
      if (response.data.success) {
        setCurrentRates(response.data.rates);
      }
    } catch (err) {
      console.error('Error fetching current rates:', err);
      setError('Failed to fetch current rates');
    } finally {
      setLoading(false);
    }
  };

  const fetchRateHistory = async (sessionType = null) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const url = sessionType 
        ? `${API_BASE_URL}/api/therapist/rates/history?sessionType=${sessionType}`
        : `${API_BASE_URL}/api/therapist/rates/history`;
      
      const response = await axios.get(url, config);
      
      if (response.data.success) {
        setRateHistory(response.data.history);
      }
    } catch (err) {
      console.error('Error fetching rate history:', err);
      setError('Failed to fetch rate history');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRate = (sessionType) => {
    const currentRate = currentRates.find(rate => rate.sessionType === sessionType);
    
    setEditForm({
      sessionType,
      amount: currentRate?.amount?.toString() || '',
      duration: currentRate?.duration?.toString() || sessionTypeConfig[sessionType]?.defaultDuration?.toString() || '60',
      changeReason: ''
    });
    
    setEditDialogOpen(true);
  };

  const handleSaveRate = async () => {
    if (!editForm.amount || !editForm.duration) {
      setError('Please fill in all required fields');
      return;
    }

    const amount = parseInt(editForm.amount);
    const duration = parseInt(editForm.duration);

    if (amount < 0 || duration < 15 || duration > 240) {
      setError('Please enter valid amount and duration (15-240 minutes)');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const requestData = {
        sessionType: editForm.sessionType,
        amount,
        duration,
        changeReason: editForm.changeReason || undefined
      };
      
      const response = await axios.post(`${API_BASE_URL}/api/therapist/rates`, requestData, config);
      
      if (response.data.success) {
        setSuccess('Rate updated successfully');
        setEditDialogOpen(false);
        fetchCurrentRates();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error updating rate:', err);
      setError(err.response?.data?.message || 'Failed to update rate');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (sessionType) => {
    setSelectedSessionType(sessionType);
    fetchRateHistory(sessionType);
    setHistoryDialogOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRateForSessionType = (sessionType) => {
    return currentRates.find(rate => rate.sessionType === sessionType);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <MoneyIcon sx={{ mr: 2, color: 'primary.main' }} />
        Session Rate Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={3}>
        {sessionTypes.map((sessionType) => {
          const config = sessionTypeConfig[sessionType];
          const currentRate = getRateForSessionType(sessionType);
          
          return (
            <Grid item xs={12} md={6} key={sessionType}>
              <Card 
                variant="outlined" 
                sx={{ 
                  height: '100%',
                  borderLeft: `4px solid ${config.color}`,
                  '&:hover': { boxShadow: 3 }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: config.color }}>
                      {sessionType} Session
                    </Typography>
                    <Box>
                      <Tooltip title="Edit Rate">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditRate(sessionType)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View History">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewHistory(sessionType)}
                        >
                          <HistoryIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {config.description}
                  </Typography>

                  {currentRate ? (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Current Rate:
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          KES {currentRate.amount.toLocaleString()}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Duration:
                        </Typography>
                        <Chip 
                          label={`${currentRate.duration} minutes`}
                          size="small"
                          icon={<ScheduleIcon />}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Effective From:
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(currentRate.effectiveFrom)}
                        </Typography>
                      </Box>

                      {currentRate.isDefault && (
                        <Chip 
                          label="Default Rate" 
                          size="small" 
                          color="secondary" 
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No custom rate set
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'primary.main' }}>
                        KES {(config.defaultDuration === 60 ? 2000 : 
                              config.defaultDuration === 75 ? 3500 : 
                              config.defaultDuration === 90 && sessionType === 'Group' ? 5000 : 5000).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (Default rate)
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="body2">
            <strong>Important:</strong> Rate changes only affect future bookings. 
            Existing bookings will retain their original rates to ensure fairness to clients.
          </Typography>
        </Alert>
      </Box>

      {/* Edit Rate Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit {editForm.sessionType} Session Rate
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount (KES)"
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">KES</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 50 }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={editForm.duration}
                  onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">min</InputAdornment>,
                  }}
                  inputProps={{ min: 15, max: 240, step: 5 }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Change (Optional)"
                  multiline
                  rows={3}
                  value={editForm.changeReason}
                  onChange={(e) => setEditForm({ ...editForm, changeReason: e.target.value })}
                  placeholder="e.g., Market adjustment, increased expertise, etc."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveRate} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Save Rate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rate History Dialog */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Rate History - {selectedSessionType} Sessions
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Amount</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Effective From</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rateHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No rate history available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rateHistory.map((rate, index) => (
                      <TableRow key={rate._id || index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            KES {rate.amount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`${rate.duration} min`}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(rate.effectiveFrom)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={rate.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            color={rate.isActive ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {rate.changeReason || 'No reason provided'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionRateManager;