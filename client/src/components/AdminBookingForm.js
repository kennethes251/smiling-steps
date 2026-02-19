import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Autocomplete,
  Grid,
  Chip,
  Divider,
  InputAdornment
} from '@mui/material';
import {
  Person as PersonIcon,
  Psychology as PsychologyIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  Notes as NotesIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { API_ENDPOINTS } from '../config/api';

/**
 * AdminBookingForm Component
 * Allows admins to create session bookings on behalf of clients
 * Requirements: 15.1, 15.2, 15.4
 */
const AdminBookingForm = ({ onSuccess, onCancel }) => {
  // State for form data
  const [formData, setFormData] = useState({
    clientId: '',
    psychologistId: '',
    dateTime: '',
    sessionType: 'Individual',
    paymentStatus: 'pending',
    reason: ''
  });

  // State for data loading
  const [clients, setClients] = useState([]);
  const [psychologists, setPsychologists] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedPsychologist, setSelectedPsychologist] = useState(null);

  // State for UI
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [psychologistsLoading, setPsychologistsLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Session types
  const sessionTypes = ['Individual', 'Couples', 'Family', 'Group'];

  // Payment statuses
  const paymentStatuses = [
    { value: 'pending', label: 'Pending', color: 'warning' },
    { value: 'paid', label: 'Paid', color: 'success' },
    { value: 'waived', label: 'Waived', color: 'info' }
  ];

  // Get auth config
  const getAuthConfig = () => ({
    headers: { 'x-auth-token': localStorage.getItem('token') }
  });

  // Fetch clients for dropdown
  const fetchClients = useCallback(async (search = '') => {
    try {
      setClientsLoading(true);
      const params = new URLSearchParams({
        role: 'client',
        status: 'active',
        limit: 50,
        ...(search && { search })
      });

      const response = await axios.get(
        `${API_ENDPOINTS.ADMIN}/users?${params}`,
        getAuthConfig()
      );

      setClients(response.data.users || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  // Fetch approved psychologists for dropdown
  const fetchPsychologists = useCallback(async (search = '') => {
    try {
      setPsychologistsLoading(true);
      const response = await axios.get(
        `${API_ENDPOINTS.ADMIN}/psychologists`,
        getAuthConfig()
      );

      // Filter to only approved psychologists
      const approvedPsychologists = (response.data.psychologists || []).filter(p => {
        const approvalStatus = p.approvalStatus || p.psychologistDetails?.approvalStatus;
        return approvalStatus === 'approved';
      });

      setPsychologists(approvedPsychologists);
    } catch (err) {
      console.error('Error fetching psychologists:', err);
    } finally {
      setPsychologistsLoading(false);
    }
  }, []);

  // Fetch available slots for selected psychologist and date
  const fetchAvailableSlots = useCallback(async (psychologistId, date) => {
    if (!psychologistId || !date) {
      setAvailableSlots([]);
      return;
    }

    try {
      setSlotsLoading(true);
      // Generate time slots based on psychologist availability
      // For now, generate standard business hours slots
      const slots = [];
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay();

      // Find psychologist's availability for this day
      const psychologist = psychologists.find(p => p._id === psychologistId || p.id === psychologistId);
      const availability = psychologist?.availability || [];
      const dayAvailability = availability.find(a => a.dayOfWeek === dayOfWeek);

      // Check blocked dates
      const blockedDates = psychologist?.blockedDates || [];
      const dateStr = selectedDate.toISOString().split('T')[0];
      const isBlocked = blockedDates.some(bd => {
        const blockedStr = new Date(bd).toISOString().split('T')[0];
        return blockedStr === dateStr;
      });

      if (isBlocked) {
        setAvailableSlots([]);
        setSlotsLoading(false);
        return;
      }

      // Generate slots based on availability or default hours
      const startHour = dayAvailability ? parseInt(dayAvailability.startTime.split(':')[0]) : 9;
      const endHour = dayAvailability ? parseInt(dayAvailability.endTime.split(':')[0]) : 17;

      for (let hour = startHour; hour < endHour; hour++) {
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, 0, 0, 0);

        // Only show future slots
        if (slotTime > new Date()) {
          slots.push({
            time: `${hour.toString().padStart(2, '0')}:00`,
            dateTime: slotTime.toISOString(),
            label: `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`
          });
        }
      }

      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error fetching available slots:', err);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [psychologists]);

  // Initial data fetch
  useEffect(() => {
    fetchClients();
    fetchPsychologists();
  }, [fetchClients, fetchPsychologists]);

  // Handle client selection
  const handleClientChange = (event, newValue) => {
    setSelectedClient(newValue);
    setFormData(prev => ({
      ...prev,
      clientId: newValue?.id || newValue?._id || ''
    }));
  };

  // Handle psychologist selection
  const handlePsychologistChange = (event, newValue) => {
    setSelectedPsychologist(newValue);
    setFormData(prev => ({
      ...prev,
      psychologistId: newValue?.id || newValue?._id || '',
      dateTime: '' // Reset date when psychologist changes
    }));
    setAvailableSlots([]);
  };

  // Handle date change
  const handleDateChange = (event) => {
    const date = event.target.value;
    if (formData.psychologistId && date) {
      fetchAvailableSlots(formData.psychologistId, date);
    }
  };

  // Handle time slot selection
  const handleTimeSlotChange = (event) => {
    setFormData(prev => ({
      ...prev,
      dateTime: event.target.value
    }));
  };

  // Handle form field changes
  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate required fields
    if (!formData.clientId || !formData.psychologistId || !formData.dateTime || !formData.sessionType) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_ENDPOINTS.ADMIN}/sessions/book`,
        formData,
        getAuthConfig()
      );

      setSuccess('Session booked successfully!');
      
      // Reset form
      setFormData({
        clientId: '',
        psychologistId: '',
        dateTime: '',
        sessionType: 'Individual',
        paymentStatus: 'pending',
        reason: ''
      });
      setSelectedClient(null);
      setSelectedPsychologist(null);
      setAvailableSlots([]);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response.data.session);
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      setError(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  // Get session rate for selected psychologist and session type
  const getSessionRate = () => {
    if (!selectedPsychologist || !formData.sessionType) return null;
    
    const rates = selectedPsychologist.sessionRates || 
                  selectedPsychologist.psychologistDetails?.rates || {};
    return rates[formData.sessionType] || rates.Individual || 2000;
  };

  const sessionRate = getSessionRate();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon color="primary" />
          Book Session for Client
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Create a therapy session booking on behalf of a client
        </Typography>

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

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Client Selection */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => `${option.name} (${option.email})`}
                value={selectedClient}
                onChange={handleClientChange}
                loading={clientsLoading}
                onInputChange={(event, newInputValue) => {
                  if (newInputValue.length >= 2) {
                    fetchClients(newInputValue);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Client *"
                    placeholder="Search by name or email..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PersonIcon color="action" />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      endAdornment: (
                        <>
                          {clientsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      )
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id || option._id}>
                    <Box>
                      <Typography variant="body1">{option.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {option.email}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            </Grid>

            {/* Psychologist Selection */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={psychologists}
                getOptionLabel={(option) => `Dr. ${option.name}`}
                value={selectedPsychologist}
                onChange={handlePsychologistChange}
                loading={psychologistsLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Psychologist *"
                    placeholder="Choose a therapist..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PsychologyIcon color="action" />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      endAdornment: (
                        <>
                          {psychologistsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      )
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id || option._id}>
                    <Box>
                      <Typography variant="body1">Dr. {option.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {option.psychologistDetails?.specializations?.slice(0, 2).join(', ') || 'General Practice'}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            </Grid>

            {/* Date Selection */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Select Date *"
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: new Date().toISOString().split('T')[0]
                }}
                onChange={handleDateChange}
                disabled={!formData.psychologistId}
                helperText={!formData.psychologistId ? 'Select a psychologist first' : ''}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EventIcon color="action" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            {/* Time Slot Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={availableSlots.length === 0}>
                <InputLabel>Select Time Slot *</InputLabel>
                <Select
                  value={formData.dateTime}
                  onChange={handleTimeSlotChange}
                  label="Select Time Slot *"
                  startAdornment={
                    <InputAdornment position="start">
                      <ScheduleIcon color="action" />
                    </InputAdornment>
                  }
                >
                  {slotsLoading ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} /> Loading slots...
                    </MenuItem>
                  ) : availableSlots.length === 0 ? (
                    <MenuItem disabled>No available slots</MenuItem>
                  ) : (
                    availableSlots.map((slot) => (
                      <MenuItem key={slot.dateTime} value={slot.dateTime}>
                        {slot.label}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>

            {/* Session Type */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Session Type *</InputLabel>
                <Select
                  value={formData.sessionType}
                  onChange={handleChange('sessionType')}
                  label="Session Type *"
                >
                  {sessionTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Payment Status */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Status *</InputLabel>
                <Select
                  value={formData.paymentStatus}
                  onChange={handleChange('paymentStatus')}
                  label="Payment Status *"
                  startAdornment={
                    <InputAdornment position="start">
                      <PaymentIcon color="action" />
                    </InputAdornment>
                  }
                >
                  {paymentStatuses.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      <Chip 
                        label={status.label} 
                        color={status.color} 
                        size="small" 
                        sx={{ mr: 1 }}
                      />
                      {status.value === 'pending' && 'Client will need to pay'}
                      {status.value === 'paid' && 'Payment already received'}
                      {status.value === 'waived' && 'No payment required'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Session Rate Display */}
            {sessionRate && (
              <Grid item xs={12}>
                <Alert severity="info" icon={<PaymentIcon />}>
                  <Typography variant="body2">
                    <strong>Session Rate:</strong> KES {sessionRate.toLocaleString()} for {formData.sessionType} session
                    {formData.paymentStatus === 'waived' && ' (Payment waived)'}
                  </Typography>
                </Alert>
              </Grid>
            )}

            {/* Reason/Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason / Notes"
                placeholder="Enter reason for admin booking or any special notes..."
                value={formData.reason}
                onChange={handleChange('reason')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                      <NotesIcon color="action" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box display="flex" gap={2} justifyContent="flex-end">
                {onCancel && (
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading || !formData.clientId || !formData.psychologistId || !formData.dateTime}
                  startIcon={loading ? <CircularProgress size={20} /> : <EventIcon />}
                >
                  {loading ? 'Creating Booking...' : 'Create Booking'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminBookingForm;
