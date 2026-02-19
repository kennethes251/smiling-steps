import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import API_BASE_URL from '../config/api';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  Lock as LockIcon,
  Logout as LogoutIcon,
  DeleteForever as DeleteIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Devices as DevicesIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Computer as ComputerIcon,
  Smartphone as SmartphoneIcon,
  Tablet as TabletIcon
} from '@mui/icons-material';

/**
 * SecuritySettings Component
 * 
 * Implements Requirements 14.1-14.5:
 * - 14.1: Display last login time and active sessions
 * - 14.2: Enforce password strength requirements
 * - 14.3: Account deletion workflow with confirmation
 * - 14.5: Logout from all devices (invalidate all sessions)
 */
const SecuritySettings = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Security info
  const [lastLogin, setLastLogin] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Password strength
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });
  
  // Dialog states
  const [logoutAllDialogOpen, setLogoutAllDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Fetch security info on mount
  useEffect(() => {
    fetchSecurityInfo();
  }, []);

  // Calculate password strength when new password changes
  useEffect(() => {
    if (passwordForm.newPassword) {
      const strength = calculatePasswordStrength(passwordForm.newPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, feedback: [] });
    }
  }, [passwordForm.newPassword]);

  const fetchSecurityInfo = async () => {
    setFetchingData(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      // Fetch user profile for last login
      const response = await axios.get(`${API_BASE_URL}/api/users/profile`, config);
      
      if (response.data.success) {
        setLastLogin(response.data.user.lastLogin);
      }
      
      // Try to fetch active sessions (if endpoint exists)
      try {
        const sessionsResponse = await axios.get(`${API_BASE_URL}/api/auth/sessions`, config);
        if (sessionsResponse.data.success) {
          setActiveSessions(sessionsResponse.data.sessions || []);
        }
      } catch (sessionsErr) {
        // Sessions endpoint may not exist, that's okay
        console.log('Active sessions endpoint not available');
      }
    } catch (err) {
      console.error('Failed to fetch security info:', err);
    } finally {
      setFetchingData(false);
    }
  };

  /**
   * Calculate password strength - Requirement 14.2
   */
  const calculatePasswordStrength = (password) => {
    let score = 0;
    const feedback = [];
    
    // Length check
    if (password.length >= 8) {
      score += 25;
    } else {
      feedback.push('Use at least 8 characters');
    }
    
    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 25;
    } else {
      feedback.push('Add uppercase letters');
    }
    
    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 15;
    } else {
      feedback.push('Add lowercase letters');
    }
    
    // Number check
    if (/\d/.test(password)) {
      score += 20;
    } else {
      feedback.push('Add numbers');
    }
    
    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 15;
    } else {
      feedback.push('Add special characters (!@#$%^&*)');
    }
    
    return { score, feedback };
  };

  const getStrengthColor = (score) => {
    if (score < 40) return 'error';
    if (score < 70) return 'warning';
    return 'success';
  };

  const getStrengthLabel = (score) => {
    if (score < 40) return 'Weak';
    if (score < 70) return 'Medium';
    return 'Strong';
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    // Requirement 14.2: Password strength requirements
    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    
    if (passwordStrength.score < 40) {
      setError('Password is too weak. Please use a stronger password.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      const response = await axios.put(
        `${API_BASE_URL}/api/users/password`,
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword
        },
        config
      );
      
      if (response.data.success) {
        setSuccess('Password changed successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (err) {
      console.error('Failed to change password:', err);
      setError(err.response?.data?.message || err.response?.data?.msg || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout from all devices - Requirement 14.5
   */
  const handleLogoutAllDevices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      await axios.post(`${API_BASE_URL}/api/auth/logout-all`, {}, config);
      
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (err) {
      console.error('Failed to logout all devices:', err);
      setError(err.response?.data?.msg || 'Failed to logout all devices');
      setLoading(false);
      setLogoutAllDialogOpen(false);
    }
  };

  /**
   * Delete account - Requirement 14.3
   */
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };
      
      await axios.delete(`${API_BASE_URL}/api/users/account`, config);
      
      // Clear local storage and redirect to home
      localStorage.removeItem('token');
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to delete account:', err);
      setError(err.response?.data?.msg || 'Failed to delete account');
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
      case 'phone':
        return <SmartphoneIcon />;
      case 'tablet':
        return <TabletIcon />;
      default:
        return <ComputerIcon />;
    }
  };

  const formatLastLogin = (date) => {
    if (!date) return 'Never';
    const loginDate = new Date(date);
    const now = new Date();
    const diffMs = now - loginDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return loginDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

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

      <Grid container spacing={3}>
        {/* Last Login & Active Sessions - Requirement 14.1 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <DevicesIcon color="primary" />
              <Typography variant="h6">Login Activity</Typography>
            </Box>
            
            {fetchingData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                {/* Last Login */}
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTimeIcon color="action" />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Last Login
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {formatLastLogin(lastLogin || user?.lastLogin)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Active Sessions */}
                {activeSessions.length > 0 ? (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Active Sessions ({activeSessions.length})
                    </Typography>
                    <List dense>
                      {activeSessions.map((session, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {getDeviceIcon(session.deviceType)}
                          </ListItemIcon>
                          <ListItemText
                            primary={session.deviceName || 'Unknown Device'}
                            secondary={`${session.location || 'Unknown location'} • ${formatLastLogin(session.lastActive)}`}
                          />
                          {session.current && (
                            <Chip label="Current" size="small" color="primary" />
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      This is your only active session
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>

        {/* Password Change Section - Requirement 14.2 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <LockIcon color="primary" />
              <Typography variant="h6">Change Password</Typography>
            </Box>
            
            <form onSubmit={handlePasswordChange}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Current Password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                  fullWidth
                  autoComplete="current-password"
                />
                <TextField
                  label="New Password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  fullWidth
                  autoComplete="new-password"
                />
                
                {/* Password Strength Indicator */}
                {passwordForm.newPassword && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Password Strength
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color={`${getStrengthColor(passwordStrength.score)}.main`}
                        sx={{ fontWeight: 'bold' }}
                      >
                        {getStrengthLabel(passwordStrength.score)}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={passwordStrength.score} 
                      color={getStrengthColor(passwordStrength.score)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    {passwordStrength.feedback.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {passwordStrength.feedback.map((tip, index) => (
                          <Typography key={index} variant="caption" color="text.secondary" display="block">
                            • {tip}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
                
                <TextField
                  label="Confirm New Password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  fullWidth
                  autoComplete="new-password"
                  error={passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword}
                  helperText={
                    passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword
                      ? 'Passwords do not match'
                      : ''
                  }
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {loading ? <CircularProgress size={20} /> : 'Change Password'}
                </Button>
              </Box>
            </form>
          </Paper>
        </Grid>

        {/* Security Actions - Requirements 14.3, 14.5 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SecurityIcon color="primary" />
              <Typography variant="h6">Security Actions</Typography>
            </Box>
            
            <Grid container spacing={2}>
              {/* Logout All Devices - Requirement 14.5 */}
              <Grid item xs={12} md={6}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'warning.main', bgcolor: 'warning.lighter' }
                  }}
                  onClick={() => setLogoutAllDialogOpen(true)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LogoutIcon color="warning" sx={{ fontSize: 40 }} />
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          Logout from All Devices
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Sign out from all devices where you're currently logged in
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Delete Account - Requirement 14.3 */}
              <Grid item xs={12} md={6}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    cursor: 'pointer',
                    borderColor: 'error.light',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'error.main', bgcolor: 'error.lighter' }
                  }}
                  onClick={() => setDeleteAccountDialogOpen(true)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <DeleteIcon color="error" sx={{ fontSize: 40 }} />
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                          Delete Account
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Permanently delete your account and all associated data
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Logout All Devices Dialog */}
      <Dialog open={logoutAllDialogOpen} onClose={() => setLogoutAllDialogOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LogoutIcon color="warning" />
          Logout from All Devices
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will sign you out from all devices where you're currently logged in, 
            including this one. You'll need to log in again on each device.
          </DialogContentText>
          <Alert severity="info" sx={{ mt: 2 }}>
            Use this if you suspect unauthorized access to your account.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutAllDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleLogoutAllDevices} 
            color="warning" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Logout All Devices'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Dialog - Requirement 14.3 */}
      <Dialog open={deleteAccountDialogOpen} onClose={() => setDeleteAccountDialogOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Delete Account
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action is permanent and cannot be undone!
          </Alert>
          <DialogContentText sx={{ mb: 2 }}>
            Deleting your account will:
          </DialogContentText>
          <List dense sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 32 }}>•</ListItemIcon>
              <ListItemText primary="Remove all your personal information" />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 32 }}>•</ListItemIcon>
              <ListItemText primary="Cancel any upcoming sessions" />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 32 }}>•</ListItemIcon>
              <ListItemText primary="Delete your session history" />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 32 }}>•</ListItemIcon>
              <ListItemText primary="Remove access to all platform features" />
            </ListItem>
          </List>
          <DialogContentText sx={{ mb: 1 }}>
            Type <strong>DELETE</strong> to confirm:
          </DialogContentText>
          <TextField
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
            fullWidth
            placeholder="Type DELETE"
            error={deleteConfirmText.length > 0 && deleteConfirmText !== 'DELETE'}
            helperText={deleteConfirmText.length > 0 && deleteConfirmText !== 'DELETE' ? 'Please type DELETE exactly' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteAccountDialogOpen(false);
            setDeleteConfirmText('');
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteAccount} 
            color="error" 
            variant="contained"
            disabled={loading || deleteConfirmText !== 'DELETE'}
          >
            {loading ? <CircularProgress size={20} /> : 'Delete My Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecuritySettings;
