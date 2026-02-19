/**
 * AvailabilityCalendar Component
 * 
 * Enhanced calendar interface for therapist availability management
 * Implements Requirements 2.1 from teletherapy-booking-enhancement
 * 
 * Features:
 * - Calendar view of availability windows
 * - Recurring schedule setup
 * - Show existing sessions on calendar
 * - Visual time slot management
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab,
  Card,
  CardContent,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  Event as EventIcon,
  Block as BlockIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';

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

const SESSION_TYPES = ['Individual', 'Couples', 'Family', 'Group'];


const AvailabilityCalendar = ({ therapistId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Data states
  const [windows, setWindows] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  
  // Dialog states
  const [windowDialogOpen, setWindowDialogOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [windowToDelete, setWindowToDelete] = useState(null);
  
  // Form state
  const [windowForm, setWindowForm] = useState({
    windowType: 'recurring',
    dayOfWeek: 1,
    specificDate: null,
    startTime: '09:00',
    endTime: '17:00',
    title: '',
    notes: '',
    sessionTypes: ['Individual', 'Couples', 'Family', 'Group'],
    bufferMinutes: 15,
    minAdvanceBookingHours: 24,
    maxAdvanceBookingDays: 30,
    recurrence: {
      frequency: 'weekly',
      startDate: null,
      endDate: null
    }
  });

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return { headers: { 'x-auth-token': token } };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const config = getAuthConfig();
      const userId = therapistId || 'me';
      
      // Fetch availability windows
      const windowsRes = await axios.get(
        `${API_BASE_URL}/api/availability-windows/${userId}`,
        config
      );
      
      if (windowsRes.data.success) {
        setWindows(windowsRes.data.data.windows || []);
      }
      
      // Fetch sessions for the current week
      const weekStart = format(currentWeek, 'yyyy-MM-dd');
      const weekEnd = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
      
      try {
        const sessionsRes = await axios.get(
          `${API_BASE_URL}/api/sessions?startDate=${weekStart}&endDate=${weekEnd}`,
          config
        );
        setSessions(sessionsRes.data.sessions || sessionsRes.data || []);
      } catch (sessErr) {
        console.log('Could not fetch sessions:', sessErr.message);
        setSessions([]);
      }
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  }, [therapistId, currentWeek]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateWindow = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const config = getAuthConfig();
      const payload = {
        ...windowForm,
        specificDate: windowForm.windowType !== 'recurring' ? windowForm.specificDate : undefined,
        dayOfWeek: windowForm.windowType === 'recurring' ? windowForm.dayOfWeek : undefined
      };
      
      const response = await axios.post(
        `${API_BASE_URL}/api/availability-windows`,
        payload,
        config
      );
      
      if (response.data.success) {
        setSuccess('Availability window created successfully');
        setWindowDialogOpen(false);
        resetForm();
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create window:', err);
      setError(err.response?.data?.message || 'Failed to create availability window');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWindow = async () => {
    if (!editingWindow) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const config = getAuthConfig();
      const response = await axios.put(
        `${API_BASE_URL}/api/availability-windows/${editingWindow._id}`,
        windowForm,
        config
      );
      
      if (response.data.success) {
        setSuccess('Availability window updated successfully');
        setWindowDialogOpen(false);
        setEditingWindow(null);
        resetForm();
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update window:', err);
      setError(err.response?.data?.message || 'Failed to update availability window');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWindow = async () => {
    if (!windowToDelete) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const config = getAuthConfig();
      const response = await axios.delete(
        `${API_BASE_URL}/api/availability-windows/${windowToDelete._id}`,
        config
      );
      
      if (response.data.success) {
        setSuccess('Availability window deleted successfully');
        setDeleteConfirmOpen(false);
        setWindowToDelete(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete window:', err);
      setError(err.response?.data?.message || 'Failed to delete availability window');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWindowActive = async (window) => {
    setSaving(true);
    try {
      const config = getAuthConfig();
      
      if (window.isActive) {
        await axios.delete(
          `${API_BASE_URL}/api/availability-windows/${window._id}`,
          config
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/api/availability-windows/${window._id}/reactivate`,
          {},
          config
        );
      }
      
      fetchData();
    } catch (err) {
      console.error('Failed to toggle window:', err);
      setError(err.response?.data?.message || 'Failed to update window status');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setWindowForm({
      windowType: 'recurring',
      dayOfWeek: 1,
      specificDate: null,
      startTime: '09:00',
      endTime: '17:00',
      title: '',
      notes: '',
      sessionTypes: ['Individual', 'Couples', 'Family', 'Group'],
      bufferMinutes: 15,
      minAdvanceBookingHours: 24,
      maxAdvanceBookingDays: 30,
      recurrence: {
        frequency: 'weekly',
        startDate: null,
        endDate: null
      }
    });
  };

  const openEditDialog = (window) => {
    setEditingWindow(window);
    setWindowForm({
      windowType: window.windowType,
      dayOfWeek: window.dayOfWeek,
      specificDate: window.specificDate ? new Date(window.specificDate) : null,
      startTime: window.startTime,
      endTime: window.endTime,
      title: window.title || '',
      notes: window.notes || '',
      sessionTypes: window.sessionTypes || ['Individual', 'Couples', 'Family', 'Group'],
      bufferMinutes: window.bufferMinutes || 15,
      minAdvanceBookingHours: window.minAdvanceBookingHours || 24,
      maxAdvanceBookingDays: window.maxAdvanceBookingDays || 30,
      recurrence: window.recurrence || { frequency: 'weekly' }
    });
    setWindowDialogOpen(true);
  };

  const getWindowsForDay = (dayOfWeek) => {
    return windows.filter(w => 
      w.windowType === 'recurring' && 
      w.dayOfWeek === dayOfWeek && 
      w.isActive
    );
  };

  const getWindowsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return windows.filter(w => {
      if (w.windowType === 'one-time' || w.windowType === 'exception') {
        const windowDate = format(new Date(w.specificDate), 'yyyy-MM-dd');
        return windowDate === dateStr && w.isActive;
      }
      return false;
    });
  };

  const getSessionsForDate = (date) => {
    return sessions.filter(s => {
      const sessionDate = new Date(s.sessionDate);
      return isSameDay(sessionDate, date);
    });
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

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

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Calendar View" icon={<EventIcon />} iconPosition="start" />
          <Tab label="Recurring Schedule" icon={<ScheduleIcon />} iconPosition="start" />
          <Tab label="All Windows" icon={<BlockIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: Calendar View */}
      {tabValue === 0 && (
        <Paper sx={{ p: 2 }}>
          {/* Calendar Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                <ChevronLeftIcon />
              </IconButton>
              <Typography variant="h6">
                {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
              </Typography>
              <IconButton onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                <ChevronRightIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<TodayIcon />}
                onClick={() => setCurrentWeek(startOfWeek(new Date()))}
                size="small"
              >
                Today
              </Button>
              <Button
                startIcon={<RefreshIcon />}
                onClick={fetchData}
                size="small"
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  resetForm();
                  setEditingWindow(null);
                  setWindowDialogOpen(true);
                }}
              >
                Add Window
              </Button>
            </Box>
          </Box>

          {/* Calendar Grid */}
          <Grid container spacing={1}>
            {weekDays.map((day, index) => {
              const dayOfWeek = day.getDay();
              const recurringWindows = getWindowsForDay(dayOfWeek);
              const dateWindows = getWindowsForDate(day);
              const daySessions = getSessionsForDate(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <Grid item xs={12} sm={6} md={12/7} key={index}>
                  <Card 
                    variant="outlined"
                    sx={{ 
                      minHeight: 200,
                      bgcolor: isToday ? 'primary.lighter' : 'background.paper',
                      border: isToday ? 2 : 1,
                      borderColor: isToday ? 'primary.main' : 'divider'
                    }}
                  >
                    <CardContent sx={{ p: 1 }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontWeight: 'bold',
                          textAlign: 'center',
                          color: isToday ? 'primary.main' : 'text.primary'
                        }}
                      >
                        {format(day, 'EEE')}
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ textAlign: 'center', mb: 1 }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      
                      <Divider sx={{ mb: 1 }} />
                      
                      {/* Recurring Windows */}
                      {recurringWindows.map((w, i) => (
                        <Tooltip key={i} title={`${w.title || 'Available'}: ${w.startTime} - ${w.endTime}`}>
                          <Chip
                            label={`${w.startTime}-${w.endTime}`}
                            size="small"
                            color="success"
                            sx={{ mb: 0.5, width: '100%', fontSize: '0.7rem' }}
                            onClick={() => openEditDialog(w)}
                          />
                        </Tooltip>
                      ))}
                      
                      {/* One-time Windows */}
                      {dateWindows.filter(w => w.windowType === 'one-time').map((w, i) => (
                        <Tooltip key={`ot-${i}`} title={`One-time: ${w.startTime} - ${w.endTime}`}>
                          <Chip
                            label={`${w.startTime}-${w.endTime}`}
                            size="small"
                            color="info"
                            sx={{ mb: 0.5, width: '100%', fontSize: '0.7rem' }}
                            onClick={() => openEditDialog(w)}
                          />
                        </Tooltip>
                      ))}
                      
                      {/* Exceptions (Blocked) */}
                      {dateWindows.filter(w => w.windowType === 'exception').map((w, i) => (
                        <Tooltip key={`ex-${i}`} title={`Blocked: ${w.startTime} - ${w.endTime}`}>
                          <Chip
                            label={`Blocked ${w.startTime}-${w.endTime}`}
                            size="small"
                            color="error"
                            sx={{ mb: 0.5, width: '100%', fontSize: '0.7rem' }}
                            onClick={() => openEditDialog(w)}
                          />
                        </Tooltip>
                      ))}
                      
                      {/* Sessions */}
                      {daySessions.map((s, i) => (
                        <Tooltip key={`s-${i}`} title={`Session: ${s.sessionType || 'Individual'}`}>
                          <Chip
                            label={format(new Date(s.sessionDate), 'HH:mm')}
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ mb: 0.5, width: '100%', fontSize: '0.7rem' }}
                          />
                        </Tooltip>
                      ))}
                      
                      {recurringWindows.length === 0 && dateWindows.length === 0 && daySessions.length === 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                          No availability
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Legend */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label="Recurring" size="small" color="success" />
            <Chip label="One-time" size="small" color="info" />
            <Chip label="Blocked" size="small" color="error" />
            <Chip label="Session" size="small" color="warning" variant="outlined" />
          </Box>
        </Paper>
      )}

      {/* Tab 1: Recurring Schedule */}
      {tabValue === 1 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Weekly Recurring Schedule</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setWindowForm(prev => ({ ...prev, windowType: 'recurring' }));
                setEditingWindow(null);
                setWindowDialogOpen(true);
              }}
            >
              Add Recurring Slot
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            {DAYS_OF_WEEK.map(day => {
              const dayWindows = getWindowsForDay(day.value);
              return (
                <Grid item xs={12} sm={6} md={4} lg={12/7} key={day.value}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {day.label}
                      </Typography>
                      {dayWindows.length > 0 ? (
                        dayWindows.map((w, i) => (
                          <Box key={i} sx={{ mb: 1, p: 1, bgcolor: 'success.lighter', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">
                                {w.startTime} - {w.endTime}
                              </Typography>
                              <Box>
                                <IconButton size="small" onClick={() => openEditDialog(w)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  onClick={() => {
                                    setWindowToDelete(w);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                            {w.title && (
                              <Typography variant="caption" color="text.secondary">
                                {w.title}
                              </Typography>
                            )}
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No availability
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}

      {/* Tab 2: All Windows List */}
      {tabValue === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>All Availability Windows</Typography>
          <List>
            {windows.map((w, index) => (
              <ListItem 
                key={index}
                sx={{ 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1, 
                  mb: 1,
                  bgcolor: w.isActive ? 'background.paper' : 'grey.100'
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={w.windowType} 
                        size="small" 
                        color={w.windowType === 'recurring' ? 'success' : w.windowType === 'exception' ? 'error' : 'info'}
                      />
                      <Typography>
                        {w.windowType === 'recurring' 
                          ? DAYS_OF_WEEK.find(d => d.value === w.dayOfWeek)?.label
                          : format(new Date(w.specificDate), 'MMM d, yyyy')
                        }
                      </Typography>
                      <Typography color="text.secondary">
                        {w.startTime} - {w.endTime}
                      </Typography>
                    </Box>
                  }
                  secondary={w.title || w.notes}
                />
                <ListItemSecondaryAction>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={w.isActive}
                        onChange={() => handleToggleWindowActive(w)}
                        disabled={saving}
                      />
                    }
                    label="Active"
                  />
                  <IconButton onClick={() => openEditDialog(w)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    onClick={() => {
                      setWindowToDelete(w);
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {windows.length === 0 && (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No availability windows configured. Add your first window to start accepting bookings.
              </Typography>
            )}
          </List>
        </Paper>
      )}

      {/* Create/Edit Window Dialog */}
      <Dialog 
        open={windowDialogOpen} 
        onClose={() => {
          setWindowDialogOpen(false);
          setEditingWindow(null);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingWindow ? 'Edit Availability Window' : 'Create Availability Window'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Window Type */}
            <FormControl fullWidth>
              <InputLabel>Window Type</InputLabel>
              <Select
                value={windowForm.windowType}
                onChange={(e) => setWindowForm({ ...windowForm, windowType: e.target.value })}
                label="Window Type"
                disabled={!!editingWindow}
              >
                <MenuItem value="recurring">Recurring (Weekly)</MenuItem>
                <MenuItem value="one-time">One-time</MenuItem>
                <MenuItem value="exception">Exception (Block Time)</MenuItem>
              </Select>
            </FormControl>

            {/* Day of Week (for recurring) */}
            {windowForm.windowType === 'recurring' && (
              <FormControl fullWidth>
                <InputLabel>Day of Week</InputLabel>
                <Select
                  value={windowForm.dayOfWeek}
                  onChange={(e) => setWindowForm({ ...windowForm, dayOfWeek: e.target.value })}
                  label="Day of Week"
                >
                  {DAYS_OF_WEEK.map(day => (
                    <MenuItem key={day.value} value={day.value}>{day.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Specific Date (for one-time/exception) */}
            {(windowForm.windowType === 'one-time' || windowForm.windowType === 'exception') && (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date"
                  value={windowForm.specificDate}
                  onChange={(date) => setWindowForm({ ...windowForm, specificDate: date })}
                  minDate={new Date()}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            )}

            {/* Time Range */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Start Time</InputLabel>
                  <Select
                    value={windowForm.startTime}
                    onChange={(e) => setWindowForm({ ...windowForm, startTime: e.target.value })}
                    label="Start Time"
                  >
                    {TIME_SLOTS.map(time => (
                      <MenuItem key={time} value={time}>{time}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>End Time</InputLabel>
                  <Select
                    value={windowForm.endTime}
                    onChange={(e) => setWindowForm({ ...windowForm, endTime: e.target.value })}
                    label="End Time"
                  >
                    {TIME_SLOTS.map(time => (
                      <MenuItem key={time} value={time}>{time}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {windowForm.startTime >= windowForm.endTime && (
              <Alert severity="error">End time must be after start time</Alert>
            )}

            {/* Title & Notes */}
            <TextField
              label="Title (optional)"
              value={windowForm.title}
              onChange={(e) => setWindowForm({ ...windowForm, title: e.target.value })}
              fullWidth
              placeholder="e.g., Morning Sessions, Afternoon Availability"
            />

            <TextField
              label="Notes (optional)"
              value={windowForm.notes}
              onChange={(e) => setWindowForm({ ...windowForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            {/* Session Types (not for exceptions) */}
            {windowForm.windowType !== 'exception' && (
              <FormControl component="fieldset">
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Session Types Available</Typography>
                <FormGroup row>
                  {SESSION_TYPES.map(type => (
                    <FormControlLabel
                      key={type}
                      control={
                        <Checkbox
                          checked={windowForm.sessionTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWindowForm({
                                ...windowForm,
                                sessionTypes: [...windowForm.sessionTypes, type]
                              });
                            } else {
                              setWindowForm({
                                ...windowForm,
                                sessionTypes: windowForm.sessionTypes.filter(t => t !== type)
                              });
                            }
                          }}
                        />
                      }
                      label={type}
                    />
                  ))}
                </FormGroup>
              </FormControl>
            )}

            {/* Advanced Settings */}
            {windowForm.windowType !== 'exception' && (
              <>
                <Divider />
                <Typography variant="subtitle2">Booking Settings</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      label="Buffer (min)"
                      type="number"
                      value={windowForm.bufferMinutes}
                      onChange={(e) => setWindowForm({ ...windowForm, bufferMinutes: parseInt(e.target.value) || 0 })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Min Advance (hrs)"
                      type="number"
                      value={windowForm.minAdvanceBookingHours}
                      onChange={(e) => setWindowForm({ ...windowForm, minAdvanceBookingHours: parseInt(e.target.value) || 0 })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      label="Max Advance (days)"
                      type="number"
                      value={windowForm.maxAdvanceBookingDays}
                      onChange={(e) => setWindowForm({ ...windowForm, maxAdvanceBookingDays: parseInt(e.target.value) || 30 })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                </Grid>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setWindowDialogOpen(false);
            setEditingWindow(null);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editingWindow ? handleUpdateWindow : handleCreateWindow}
            disabled={saving || windowForm.startTime >= windowForm.endTime}
          >
            {saving ? <CircularProgress size={20} /> : (editingWindow ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Availability Window?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this availability window? This action cannot be undone.
          </Typography>
          {windowToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Type:</strong> {windowToDelete.windowType}
              </Typography>
              <Typography variant="body2">
                <strong>Time:</strong> {windowToDelete.startTime} - {windowToDelete.endTime}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteWindow}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AvailabilityCalendar;
