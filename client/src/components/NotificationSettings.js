import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import API_BASE_URL from '../config/api';
import {
  Box,
  Paper,
  Typography,
  FormControlLabel,
  Switch,
  Button,
  Alert,
  CircularProgress,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
  Chip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Schedule as ScheduleIcon,
  Save as SaveIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon
} from '@mui/icons-material';

/**
 * NotificationSettings Component
 * 
 * Implements Requirements 13.1-13.4:
 * - 13.1: Display current notification preferences
 * - 13.2: Toggle email notifications
 * - 13.3: Toggle SMS notifications
 * - 13.4: Set quiet hours for non-urgent notifications
 */
const NotificationSettings = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [settings, setSettings] = useState({
    // Email notifications - Requirement 13.2
    emailNotifications: true,
    sessionReminders: true,
    paymentAlerts: true,
    newMessageAlerts: true,
    marketingEmails: false,
    
    // SMS notifications - Requirement 13.3
    smsNotifications: false,
    smsSessionReminders: false,
    smsPaymentAlerts: false,
    
    // Quiet hours - Requirement 13.4
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    
    // Reminder timing
    reminderTiming: '24'
  });

  // Load current preferences - Requirement 13.1
  useEffect(() => {
    if (user) {
      setSettings({
        emailNotifications: user.emailNotifications !== false,
        sessionReminders: user.sessionReminders !== false,
        paymentAlerts: user.paymentAlerts !== false,
        newMessageAlerts: user.newMessageAlerts !== false,
        marketingEmails: user.marketingEmails || false,
        smsNotifications: user.smsNotifications || false,
        smsSessionReminders: user.smsSessionReminders || false,
        smsPaymentAlerts: user.smsPaymentAlerts || false,
        quietHoursEnabled: user.quietHoursEnabled || false,
        quietHoursStart: user.quietHoursStart || '22:00',
        quietHoursEnd: user.quietHoursEnd || '08:00',
        reminderTiming: user.reminderTiming || '24'
      });
    }
  }, [user]);

  const handleToggle = (field) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
    setHasChanges(true);
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const response = await axios.put(
        `${API_BASE_URL}/api/users/profile`,
        settings,
        config
      );
      
      if (response.data.success) {
        updateUser(response.data.user);
        setSuccess('Notification settings saved successfully');
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Failed to save notification settings:', err);
      setError(err.response?.data?.msg || err.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // Calculate notification summary
  const getNotificationSummary = () => {
    const enabledCount = [
      settings.emailNotifications,
      settings.smsNotifications
    ].filter(Boolean).length;
    
    if (enabledCount === 0) return { label: 'All Off', color: 'error' };
    if (enabledCount === 2) return { label: 'All On', color: 'success' };
    return { label: 'Partial', color: 'warning' };
  };

  const summary = getNotificationSummary();

  return (
    <Box>
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

      {/* Summary Card */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {settings.emailNotifications || settings.smsNotifications ? (
              <NotificationsActiveIcon color="primary" sx={{ fontSize: 40 }} />
            ) : (
              <NotificationsOffIcon color="disabled" sx={{ fontSize: 40 }} />
            )}
            <Box>
              <Typography variant="h6">Notification Status</Typography>
              <Typography variant="body2" color="text.secondary">
                Manage how you receive updates about sessions, payments, and messages
              </Typography>
            </Box>
          </Box>
          <Chip 
            label={summary.label} 
            color={summary.color} 
            variant="outlined"
          />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Email Notifications - Requirement 13.2 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <EmailIcon color="primary" />
              <Typography variant="h6">Email Notifications</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.emailNotifications}
                        onChange={() => handleToggle('emailNotifications')}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Enable Email Notifications</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Master switch for all email notifications
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                    labelPlacement="start"
                  />
                </CardContent>
              </Card>
              
              <Divider />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.sessionReminders}
                    onChange={() => handleToggle('sessionReminders')}
                    disabled={!settings.emailNotifications}
                  />
                }
                label="Session reminders"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.paymentAlerts}
                    onChange={() => handleToggle('paymentAlerts')}
                    disabled={!settings.emailNotifications}
                  />
                }
                label="Payment alerts"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.newMessageAlerts}
                    onChange={() => handleToggle('newMessageAlerts')}
                    disabled={!settings.emailNotifications}
                  />
                }
                label="New message alerts"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.marketingEmails}
                    onChange={() => handleToggle('marketingEmails')}
                    disabled={!settings.emailNotifications}
                  />
                }
                label="Marketing and promotional emails"
              />
            </Box>
          </Paper>
        </Grid>

        {/* SMS Notifications - Requirement 13.3 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <SmsIcon color="primary" />
              <Typography variant="h6">SMS Notifications</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.smsNotifications}
                        onChange={() => handleToggle('smsNotifications')}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Enable SMS Notifications</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Receive text messages for important updates
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                    labelPlacement="start"
                  />
                </CardContent>
              </Card>
              
              {settings.smsNotifications && (
                <>
                  <Divider />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.smsSessionReminders}
                        onChange={() => handleToggle('smsSessionReminders')}
                      />
                    }
                    label="Session reminders via SMS"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.smsPaymentAlerts}
                        onChange={() => handleToggle('smsPaymentAlerts')}
                      />
                    }
                    label="Payment confirmations via SMS"
                  />
                  
                  <Alert severity="info" sx={{ mt: 1 }}>
                    SMS notifications will be sent to your registered phone number. 
                    Standard carrier rates may apply.
                  </Alert>
                </>
              )}
              
              {!settings.smsNotifications && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Enable SMS notifications to receive text messages for session reminders 
                  and payment confirmations.
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Quiet Hours - Requirement 13.4 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <ScheduleIcon color="primary" />
              <Typography variant="h6">Quiet Hours</Typography>
            </Box>
            
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.quietHoursEnabled}
                      onChange={() => handleToggle('quietHoursEnabled')}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Enable Quiet Hours</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Pause non-urgent notifications during specified hours
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                  labelPlacement="start"
                />
              </CardContent>
            </Card>
            
            {settings.quietHoursEnabled && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Start Time"
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => handleChange('quietHoursStart', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    label="End Time"
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => handleChange('quietHoursEnd', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Box>
                
                <Alert severity="info">
                  During quiet hours ({settings.quietHoursStart} - {settings.quietHoursEnd}), 
                  non-urgent notifications will be held and delivered when quiet hours end.
                  Urgent notifications (like session starting soon) will still be sent.
                </Alert>
              </Box>
            )}
            
            {!settings.quietHoursEnabled && (
              <Typography variant="body2" color="text.secondary">
                Set quiet hours to pause notifications during sleep or focus time.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Reminder Timing */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <NotificationsIcon color="primary" />
              <Typography variant="h6">Reminder Timing</Typography>
            </Box>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Send session reminders</InputLabel>
              <Select
                value={settings.reminderTiming}
                onChange={(e) => handleChange('reminderTiming', e.target.value)}
                label="Send session reminders"
              >
                <MenuItem value="1">1 hour before</MenuItem>
                <MenuItem value="2">2 hours before</MenuItem>
                <MenuItem value="6">6 hours before</MenuItem>
                <MenuItem value="12">12 hours before</MenuItem>
                <MenuItem value="24">24 hours before</MenuItem>
                <MenuItem value="48">48 hours before</MenuItem>
              </Select>
            </FormControl>
            
            <Typography variant="body2" color="text.secondary">
              Choose when you'd like to receive reminders about upcoming sessions.
              This applies to both email and SMS reminders if enabled.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={loading || !hasChanges}
          sx={{ minWidth: 200 }}
        >
          {loading ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
        </Button>
        
        {hasChanges && (
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
            You have unsaved changes
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default NotificationSettings;
