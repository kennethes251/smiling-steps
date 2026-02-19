import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Block as BlockIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  EventBusy as EventBusyIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

const TIME_SLOTS = [];
for (let hour = 6; hour <= 21; hour++) {
  for (let min = 0; min < 60; min += 30) {
    const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    TIME_SLOTS.push(time);
  }
}

/**
 * AvailabilityManager Component
 * 
 * Implements Requirements 6.1-6.5:
 * - 6.1: Display current schedule
 * - 6.2: Set weekly recurring availability
 * - 6.3: Block specific dates
 * - 6.4: Prevent conflicts with existing confirmed sessions
 * - 6.5: Only show available time slots to clients
 */
const AvailabilityManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [availability, setAvailability] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  
  // Dialog states
  const [addSlotDialogOpen, setAddSlotDialogOpen] = useState(false);
  const [blockDateDialogOpen, setBlockDateDialogOpen] = useState(false);
  
  // New slot form
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00'
  });
  
  // Block date form
  const [dateToBlock, setDateToBlock] = useState(null);
  const [blockReason, setBlockReason] = useState('');

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const response = await axios.get(`${API_BASE_URL}/api/users/availability`, config);
      
      if (response.data.success) {
        setAvailability(response.data.availability || []);
        setBlockedDates(response.data.blockedDates || []);
        setUpcomingSessions(response.data.upcomingSessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch availability:', err);
      setError('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  // Group availability by day for weekly view
  const getAvailabilityByDay = () => {
    const byDay = {};
    DAYS_OF_WEEK.forEach(day => {
      byDay[day.value] = availability.filter(slot => slot.dayOfWeek === day.value);
    });
    return byDay;
  };

  const handleAddSlot = async () => {
    if (newSlot.startTime >= newSlot.endTime) {
      setError('End time must be after start time');
      return;
    }
    
    // Check for overlapping slots on the same day
    const existingSlots = availability.filter(slot => slot.dayOfWeek === newSlot.dayOfWeek);
    const hasOverlap = existingSlots.some(slot => {
      return (newSlot.startTime < slot.endTime && newSlot.endTime > slot.startTime);
    });
    
    if (hasOverlap) {
      setError('This time slot overlaps with an existing slot on the same day');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const updatedAvailability = [...availability, newSlot];
      
      const response = await axios.put(
        `${API_BASE_URL}/api/users/availability`,
        { availability: updatedAvailability },
        config
      );
      
      if (response.data.success) {
        setAvailability(response.data.availability || updatedAvailability);
        setConflicts(response.data.conflicts || []);
        setSuccess('Availability slot added successfully');
        setAddSlotDialogOpen(false);
        setNewSlot({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });
        
        if (response.data.conflicts && response.data.conflicts.length > 0) {
          setTimeout(() => setSuccess(null), 2000);
        }
      }
    } catch (err) {
      console.error('Failed to add slot:', err);
      setError(err.response?.data?.msg || 'Failed to add availability slot');
      if (err.response?.data?.conflicts) {
        setConflicts(err.response.data.conflicts);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSlot = async (index) => {
    setSaving(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const updatedAvailability = availability.filter((_, i) => i !== index);
      
      const response = await axios.put(
        `${API_BASE_URL}/api/users/availability`,
        { availability: updatedAvailability },
        config
      );
      
      if (response.data.success) {
        setAvailability(response.data.availability || updatedAvailability);
        setConflicts(response.data.conflicts || []);
        setSuccess('Availability slot removed');
        
        if (response.data.conflicts && response.data.conflicts.length > 0) {
          setTimeout(() => setSuccess(null), 2000);
        }
      }
    } catch (err) {
      console.error('Failed to remove slot:', err);
      setError(err.response?.data?.msg || 'Failed to remove availability slot');
      if (err.response?.data?.conflicts) {
        setConflicts(err.response.data.conflicts);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBlockDate = async () => {
    if (!dateToBlock) {
      setError('Please select a date to block');
      return;
    }
    
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateToBlock < today) {
      setError('Cannot block dates in the past');
      return;
    }
    
    // Check if date is already blocked
    const isAlreadyBlocked = blockedDates.some(blocked => {
      const blockedDate = new Date(blocked.date || blocked);
      return blockedDate.toDateString() === dateToBlock.toDateString();
    });
    
    if (isAlreadyBlocked) {
      setError('This date is already blocked');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const response = await axios.post(
        `${API_BASE_URL}/api/users/availability/block`,
        { 
          date: dateToBlock.toISOString(),
          reason: blockReason 
        },
        config
      );
      
      if (response.data.success) {
        setBlockedDates(response.data.blockedDates || [...blockedDates, { date: dateToBlock, reason: blockReason }]);
        setConflicts(response.data.conflicts || []);
        setSuccess('Date blocked successfully');
        setBlockDateDialogOpen(false);
        setDateToBlock(null);
        setBlockReason('');
        
        if (response.data.conflicts && response.data.conflicts.length > 0) {
          setTimeout(() => setSuccess(null), 2000);
        }
      }
    } catch (err) {
      console.error('Failed to block date:', err);
      setError(err.response?.data?.msg || 'Failed to block date');
      if (err.response?.data?.conflicts) {
        setConflicts(err.response.data.conflicts);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUnblockDate = async (dateIndex) => {
    setSaving(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const dateToUnblock = blockedDates[dateIndex];
      
      const response = await axios.delete(
        `${API_BASE_URL}/api/users/availability/block`,
        { 
          ...config,
          data: { date: dateToUnblock.date || dateToUnblock }
        }
      );
      
      if (response.data.success) {
        setBlockedDates(blockedDates.filter((_, i) => i !== dateIndex));
        setSuccess('Date unblocked successfully');
      }
    } catch (err) {
      console.error('Failed to unblock date:', err);
      setError(err.response?.data?.msg || 'Failed to unblock date');
    } finally {
      setSaving(false);
    }
  };

  const getDayLabel = (dayValue) => {
    const day = DAYS_OF_WEEK.find(d => d.value === dayValue);
    return day ? day.label : 'Unknown';
  };

  const formatBlockedDate = (blocked) => {
    const date = new Date(blocked.date || blocked);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const availabilityByDay = getAvailabilityByDay();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {/* Conflict Warnings - Requirement 6.4 */}
      {conflicts.length > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          icon={<WarningIcon />}
          onClose={() => setConflicts([])}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Scheduling Conflicts Detected
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            The following confirmed sessions may be affected by your availability changes:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {conflicts.map((conflict, i) => (
              <li key={i}>{conflict}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Weekly Schedule Editor - Requirement 6.1, 6.2 */}
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon color="primary" />
                <Typography variant="h6">Weekly Schedule</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddSlotDialogOpen(true)}
                size="small"
              >
                Add Time Slot
              </Button>
            </Box>
            
            {/* Weekly Grid View */}
            <Grid container spacing={1}>
              {DAYS_OF_WEEK.map(day => (
                <Grid item xs={12} sm={6} md={4} lg={12/7} key={day.value}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      minHeight: 120,
                      bgcolor: availabilityByDay[day.value].length > 0 ? 'success.lighter' : 'grey.50'
                    }}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontWeight: 'bold', 
                          textAlign: 'center',
                          mb: 1,
                          color: availabilityByDay[day.value].length > 0 ? 'success.dark' : 'text.secondary'
                        }}
                      >
                        {day.short}
                      </Typography>
                      
                      {availabilityByDay[day.value].length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {availabilityByDay[day.value].map((slot, idx) => {
                            const globalIndex = availability.findIndex(
                              s => s.dayOfWeek === slot.dayOfWeek && 
                                   s.startTime === slot.startTime && 
                                   s.endTime === slot.endTime
                            );
                            return (
                              <Tooltip 
                                key={idx} 
                                title={`${slot.startTime} - ${slot.endTime} (Click to remove)`}
                                arrow
                              >
                                <Chip
                                  label={`${slot.startTime}-${slot.endTime}`}
                                  size="small"
                                  color="success"
                                  onDelete={() => handleRemoveSlot(globalIndex)}
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              </Tooltip>
                            );
                          })}
                        </Box>
                      ) : (
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ display: 'block', textAlign: 'center' }}
                        >
                          No slots
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* List View */}
            {availability.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>All Time Slots</Typography>
                <List dense>
                  {availability.map((slot, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 0.5
                      }}
                    >
                      <ListItemText
                        primary={getDayLabel(slot.dayOfWeek)}
                        secondary={`${slot.startTime} - ${slot.endTime}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveSlot(index)}
                          disabled={saving}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {availability.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <EventBusyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">
                  No availability slots set. Add your working hours to allow clients to book sessions.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Blocked Dates Calendar - Requirement 6.3 */}
        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BlockIcon color="error" />
                <Typography variant="h6">Blocked Dates</Typography>
                {blockedDates.length > 0 && (
                  <Badge badgeContent={blockedDates.length} color="error" />
                )}
              </Box>
              <Button
                variant="outlined"
                color="error"
                startIcon={<AddIcon />}
                onClick={() => setBlockDateDialogOpen(true)}
                size="small"
              >
                Block Date
              </Button>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Block specific dates when you're unavailable (vacation, holidays, etc.)
            </Typography>
            
            {blockedDates.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {blockedDates.map((blocked, index) => (
                  <Card key={index} variant="outlined" sx={{ bgcolor: 'error.lighter' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {formatBlockedDate(blocked)}
                          </Typography>
                          {blocked.reason && (
                            <Typography variant="caption" color="text.secondary">
                              {blocked.reason}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleUnblockDate(index)}
                          disabled={saving}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography color="text.secondary">
                  No blocked dates. All your available slots are open for booking.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Upcoming Sessions Info */}
          {upcomingSessions.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ScheduleIcon color="info" />
                <Typography variant="h6">Upcoming Sessions</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These confirmed sessions may be affected by availability changes:
              </Typography>
              <List dense>
                {upcomingSessions.slice(0, 5).map((session, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText
                      primary={new Date(session.dateTime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                      secondary={session.clientName || 'Client'}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Add Slot Dialog */}
      <Dialog open={addSlotDialogOpen} onClose={() => setAddSlotDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Availability Slot</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Day of Week</InputLabel>
              <Select
                value={newSlot.dayOfWeek}
                onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: e.target.value })}
                label="Day of Week"
              >
                {DAYS_OF_WEEK.map(day => (
                  <MenuItem key={day.value} value={day.value}>{day.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Start Time</InputLabel>
              <Select
                value={newSlot.startTime}
                onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                label="Start Time"
              >
                {TIME_SLOTS.map(time => (
                  <MenuItem key={time} value={time}>{time}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>End Time</InputLabel>
              <Select
                value={newSlot.endTime}
                onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                label="End Time"
              >
                {TIME_SLOTS.map(time => (
                  <MenuItem key={time} value={time}>{time}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {newSlot.startTime >= newSlot.endTime && (
              <Alert severity="error" sx={{ mt: 1 }}>
                End time must be after start time
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSlotDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddSlot} 
            variant="contained" 
            disabled={saving || newSlot.startTime >= newSlot.endTime}
          >
            {saving ? <CircularProgress size={20} /> : 'Add Slot'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Block Date Dialog */}
      <Dialog open={blockDateDialogOpen} onClose={() => setBlockDateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Block a Date</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select Date"
                value={dateToBlock}
                onChange={(newValue) => setDateToBlock(newValue)}
                minDate={new Date()}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
            
            <TextField
              label="Reason (optional)"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="e.g., Vacation, Holiday, Personal day"
            />
            
            <Alert severity="info" sx={{ mt: 1 }}>
              Blocking a date will prevent clients from booking sessions on this day.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setBlockDateDialogOpen(false);
            setDateToBlock(null);
            setBlockReason('');
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleBlockDate} 
            variant="contained" 
            color="error" 
            disabled={saving || !dateToBlock}
          >
            {saving ? <CircularProgress size={20} /> : 'Block Date'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AvailabilityManager;
