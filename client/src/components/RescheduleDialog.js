/**
 * RescheduleDialog Component
 * 
 * Modal dialog for rescheduling therapy sessions.
 * Implements the rescheduling workflow with:
 * - Eligibility checking
 * - Date/time selection with availability checking
 * - Reason selection
 * - Approval status display
 * 
 * Requirements: 9.1, 9.2 from Cancellation & Rescheduling
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Divider,
  Paper
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const RESCHEDULE_REASONS = [
  { value: 'schedule_conflict', label: 'Schedule Conflict' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'illness', label: 'Illness' },
  { value: 'work_commitment', label: 'Work Commitment' },
  { value: 'family_emergency', label: 'Family Emergency' },
  { value: 'travel', label: 'Travel' },
  { value: 'technical_issues', label: 'Technical Issues' },
  { value: 'other', label: 'Other' }
];

const steps = ['Check Eligibility', 'Select New Date', 'Confirm'];

const RescheduleDialog = ({ open, onClose, session, onRescheduleComplete }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [newDate, setNewDate] = useState(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [error, setError] = useState(null);

  // Check eligibility when dialog opens
  useEffect(() => {
    if (open && session) {
      checkEligibility();
    }
  }, [open, session]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setEligibility(null);
      setNewDate(null);
      setReason('');
      setNotes('');
      setAvailability(null);
      setError(null);
    }
  }, [open]);

  const checkEligibility = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const response = await axios.get(`${API_BASE_URL}/api/sessions/${session._id}/reschedule-eligibility`, config);
      setEligibility(response.data);
      if (response.data.eligible) {
        setActiveStep(1);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check eligibility');
      setEligibility({ eligible: false, reason: err.response?.data?.error });
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = useCallback(async (date) => {
    if (!date || !session) return;
    
    setCheckingAvailability(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const response = await axios.get(`${API_BASE_URL}/api/sessions/${session._id}/availability`, {
        ...config,
        params: { date: date.toISOString(), duration: 60 }
      });
      setAvailability(response.data);
    } catch (err) {
      setAvailability({ available: false, error: err.response?.data?.error });
    } finally {
      setCheckingAvailability(false);
    }
  }, [session]);

  // Check availability when date changes
  useEffect(() => {
    if (newDate) {
      const debounceTimer = setTimeout(() => {
        checkAvailability(newDate);
      }, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [newDate, checkAvailability]);

  const handleDateChange = (date) => {
    setNewDate(date);
    setAvailability(null);
  };

  const handleNext = () => {
    if (activeStep === 1) {
      if (!newDate) {
        enqueueSnackbar('Please select a new date and time', { variant: 'warning' });
        return;
      }
      if (!availability?.available) {
        enqueueSnackbar('Selected time slot is not available', { variant: 'warning' });
        return;
      }
      if (!reason) {
        enqueueSnackbar('Please select a reason for rescheduling', { variant: 'warning' });
        return;
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      const response = await axios.post(`${API_BASE_URL}/api/sessions/${session._id}/reschedule`, {
        newDate: newDate.toISOString(),
        reason,
        notes
      }, config);
      
      enqueueSnackbar(response.data.message, { 
        variant: response.data.status === 'approved' ? 'success' : 'info' 
      });
      
      if (onRescheduleComplete) {
        onRescheduleComplete(response.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reschedule session');
      enqueueSnackbar(err.response?.data?.error || 'Failed to reschedule', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderEligibilityStep = () => (
    <Box sx={{ py: 2 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : eligibility ? (
        <>
          {eligibility.eligible ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Session can be rescheduled
              </Typography>
              <Typography variant="body2">
                {eligibility.approvalMessage}
              </Typography>
            </Alert>
          ) : (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Cannot reschedule this session
              </Typography>
              <Typography variant="body2">
                {eligibility.reason}
              </Typography>
            </Alert>
          )}
          
          {eligibility.eligible && (
            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Session Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Current Date:</strong> {formatDate(session?.sessionDate)}
                </Typography>
                <Typography variant="body2">
                  <strong>Hours Until Session:</strong> {eligibility.hoursUntilSession?.toFixed(1)} hours
                </Typography>
                <Typography variant="body2">
                  <strong>Reschedules Used:</strong> {eligibility.rescheduleCount} / {eligibility.maxReschedules}
                </Typography>
                {eligibility.requiresApproval && (
                  <Chip 
                    icon={<WarningIcon />} 
                    label="Requires Therapist Approval" 
                    color="warning" 
                    size="small"
                    sx={{ mt: 1, width: 'fit-content' }}
                  />
                )}
              </Box>
            </Paper>
          )}
        </>
      ) : null}
    </Box>
  );


  const renderDateSelectionStep = () => (
    <Box sx={{ py: 2 }}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DateTimePicker
          label="New Session Date & Time"
          value={newDate}
          onChange={handleDateChange}
          minDateTime={new Date()}
          sx={{ width: '100%', mb: 3 }}
          slotProps={{
            textField: {
              fullWidth: true,
              helperText: 'Select a new date and time for your session'
            }
          }}
        />
      </LocalizationProvider>

      {checkingAvailability && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Checking availability...
          </Typography>
        </Box>
      )}

      {availability && !checkingAvailability && (
        <Alert 
          severity={availability.available ? 'success' : 'error'} 
          sx={{ mb: 3 }}
        >
          {availability.available ? (
            'This time slot is available!'
          ) : (
            <>
              This time slot is not available.
              {availability.conflicts?.length > 0 && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Conflicts with {availability.conflicts.length} existing session(s)
                </Typography>
              )}
            </>
          )}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Reason for Rescheduling *</InputLabel>
        <Select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          label="Reason for Rescheduling *"
        >
          {RESCHEDULE_REASONS.map((r) => (
            <MenuItem key={r.value} value={r.value}>
              {r.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Additional Notes (Optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Any additional information about the reschedule request..."
      />

      {eligibility?.requiresApproval && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <InfoIcon sx={{ mr: 1 }} />
          Since this is less than 24 hours before your session, your therapist will need to approve this reschedule request.
        </Alert>
      )}
    </Box>
  );

  const renderConfirmationStep = () => (
    <Box sx={{ py: 2 }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        Please review your reschedule request before submitting.
      </Alert>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Reschedule Summary
        </Typography>
        <Divider sx={{ my: 1 }} />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Current Date
            </Typography>
            <Typography variant="body1">
              {formatDate(session?.sessionDate)}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              New Date
            </Typography>
            <Typography variant="body1" color="primary.main" fontWeight="bold">
              {formatDate(newDate)}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              Reason
            </Typography>
            <Typography variant="body1">
              {RESCHEDULE_REASONS.find(r => r.value === reason)?.label || reason}
            </Typography>
          </Box>
          
          {notes && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Notes
              </Typography>
              <Typography variant="body1">
                {notes}
              </Typography>
            </Box>
          )}
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              Approval Status
            </Typography>
            {eligibility?.requiresApproval ? (
              <Chip 
                icon={<WarningIcon />} 
                label="Requires Therapist Approval" 
                color="warning" 
                size="small"
              />
            ) : (
              <Chip 
                icon={<CheckCircleIcon />} 
                label="Will Be Auto-Approved" 
                color="success" 
                size="small"
              />
            )}
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return renderEligibilityStep();
      case 1:
        return renderDateSelectionStep();
      case 2:
        return renderConfirmationStep();
      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{ sx: { minHeight: '500px' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScheduleIcon color="primary" />
        Reschedule Session
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {getStepContent(activeStep)}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        
        {activeStep > 0 && eligibility?.eligible && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        
        {activeStep === 0 && eligibility?.eligible && (
          <Button 
            variant="contained" 
            onClick={handleNext}
            disabled={loading}
          >
            Continue
          </Button>
        )}
        
        {activeStep === 1 && (
          <Button 
            variant="contained" 
            onClick={handleNext}
            disabled={loading || !newDate || !availability?.available || !reason}
          >
            Review
          </Button>
        )}
        
        {activeStep === 2 && (
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {loading ? 'Submitting...' : 'Confirm Reschedule'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RescheduleDialog;
