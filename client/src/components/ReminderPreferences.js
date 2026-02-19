/**
 * Reminder Preferences Component
 * 
 * Allows users to manage their session reminder preferences.
 * 
 * Requirements: 15.5
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Collapse
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Schedule as ScheduleIcon,
  NightsStay as QuietHoursIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../config/api';

const ReminderPreferences = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    email: true,
    sms: false,
    sessionReminders: true,
    paymentAlerts: true,
    marketingEmails: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });

  // Fetch current preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await api.get('/notification-preferences');
        if (response.data.success) {
          setPreferences({
            ...response.data.data,
            quietHours: {
              enabled: response.data.data.quietHours?.enabled || false,
              start: response.data.data.quietHours?.start || '22:00',
              end: response.data.data.quietHours?.end || '08:00'
            }
          });
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
        enqueueSnackbar('Failed to load notification preferences', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [enqueueSnackbar]);

  // Handle preference change
  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle quiet hours change
  const handleQuietHoursChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setPreferences(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [field]: value
      }
    }));
  };

  // Save preferences
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        email: preferences.email,
        sms: preferences.sms,
        sessionReminders: preferences.sessionReminders,
        paymentAlerts: preferences.paymentAlerts,
        marketingEmails: preferences.marketingEmails,
        quietHoursStart: preferences.quietHours.enabled ? preferences.quietHours.start : null,
        quietHoursEnd: preferences.quietHours.enabled ? preferences.quietHours.end : null
      };

      const response = await api.put('/notification-preferences', payload);
      
      if (response.data.success) {
        enqueueSnackbar('Notification preferences saved successfully', { variant: 'success' });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      enqueueSnackbar(
        error.response?.data?.message || 'Failed to save preferences',
        { variant: 'error' }
      );
    } finally {
      setSaving(false);
    }
  };

  // Quick toggle for session reminders
  const handleQuickToggleReminders = async () => {
    const newValue = !preferences.sessionReminders;
    setSaving(true);
    
    try {
      const response = await api.put('/notification-preferences/reminders', {
        enabled: newValue
      });
      
      if (response.data.success) {
        setPreferences(prev => ({
          ...prev,
          sessionReminders: newValue
        }));
        enqueueSnackbar(
          `Session reminders ${newValue ? 'enabled' : 'disabled'}`,
          { variant: 'success' }
        );
      }
    } catch (error) {
      console.error('Error toggling reminders:', error);
      enqueueSnackbar('Failed to update reminder settings', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto' }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Notification Preferences</Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Manage how and when you receive notifications about your therapy sessions.
        </Alert>

        {/* Session Reminders - Main Toggle */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Session Reminders
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Receive reminders 24 hours and 1 hour before your sessions
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={preferences.sessionReminders}
              onChange={handleQuickToggleReminders}
              disabled={saving}
              color="primary"
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Notification Channels */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Notification Channels
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.email}
                  onChange={handleChange('email')}
                  color="primary"
                />
              }
              label={
                <Box display="flex" alignItems="center">
                  <EmailIcon sx={{ mr: 1, fontSize: 20 }} />
                  <span>Email Notifications</span>
                </Box>
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.sms}
                  onChange={handleChange('sms')}
                  color="primary"
                />
              }
              label={
                <Box display="flex" alignItems="center">
                  <SmsIcon sx={{ mr: 1, fontSize: 20 }} />
                  <span>SMS Notifications</span>
                </Box>
              }
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Other Notification Types */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Other Notifications
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.paymentAlerts}
                onChange={handleChange('paymentAlerts')}
                color="primary"
              />
            }
            label="Payment Alerts"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
            Receive notifications about payment confirmations and refunds
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.marketingEmails}
                onChange={handleChange('marketingEmails')}
                color="primary"
              />
            }
            label="Marketing Emails"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
            Receive updates about new features and wellness tips
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Quiet Hours */}
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.quietHours.enabled}
                onChange={handleQuietHoursChange('enabled')}
                color="primary"
              />
            }
            label={
              <Box display="flex" alignItems="center">
                <QuietHoursIcon sx={{ mr: 1, fontSize: 20 }} />
                <span>Quiet Hours</span>
              </Box>
            }
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
            Pause SMS notifications during specified hours
          </Typography>

          <Collapse in={preferences.quietHours.enabled}>
            <Grid container spacing={2} sx={{ mt: 1, ml: 3 }}>
              <Grid item xs={6}>
                <TextField
                  label="Start Time"
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={handleQuietHoursChange('start')}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Time"
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={handleQuietHoursChange('end')}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }}
                  size="small"
                  fullWidth
                />
              </Grid>
            </Grid>
          </Collapse>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Save Button */}
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ReminderPreferences;
