import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Tabs,
  Tab,
  Button,
  Switch,
  FormControlLabel,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  People as PeopleIcon,
  Psychology as PsychologyIcon,
  Article as ArticleIcon,
  TrendingUp as TrendingUpIcon,
  Dashboard as DashboardIcon,
  LibraryBooks as ResourcesIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import ResourceManager from '../ResourceManager';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [psychologists, setPsychologists] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Settings state
  const [settings, setSettings] = useState({
    allowRegistrations: true,
    emailNotifications: true,
    maintenanceMode: false
  });
  const [actionLoading, setActionLoading] = useState({});
  const [deleteDialog, setDeleteDialog] = useState({ open: false, userId: null, userName: '', userType: '' });
  const [clarificationDialog, setClarificationDialog] = useState({ open: false, psychologistId: null, psychologistName: '', message: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      // Fetch all data in parallel
      const [statsRes, psychRes, clientsRes] = await Promise.all([
        axios.get(`${API_ENDPOINTS.ADMIN}/stats`, config),
        axios.get(`${API_ENDPOINTS.ADMIN}/psychologists`, config),
        axios.get(`${API_ENDPOINTS.ADMIN}/clients`, config)
      ]);

      setStats(statsRes.data);
      setPsychologists(psychRes.data.psychologists || []);
      setClients(clientsRes.data.clients || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  const handleApprovePsychologist = async (psychologistId) => {
    try {
      setActionLoading({ ...actionLoading, [psychologistId]: true });
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      await axios.put(
        `${API_ENDPOINTS.ADMIN}/psychologists/${psychologistId}/approve`,
        {},
        config
      );

      // Refresh data
      await fetchDashboardData();
      setActionLoading({ ...actionLoading, [psychologistId]: false });
    } catch (err) {
      console.error('Error approving psychologist:', err);
      setError(err.response?.data?.message || 'Failed to approve psychologist');
      setActionLoading({ ...actionLoading, [psychologistId]: false });
    }
  };

  const handleRejectPsychologist = async (psychologistId) => {
    try {
      setActionLoading({ ...actionLoading, [psychologistId]: true });
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      await axios.put(
        `${API_ENDPOINTS.ADMIN}/psychologists/${psychologistId}/reject`,
        {},
        config
      );

      // Refresh data
      await fetchDashboardData();
      setActionLoading({ ...actionLoading, [psychologistId]: false });
    } catch (err) {
      console.error('Error rejecting psychologist:', err);
      setError(err.response?.data?.message || 'Failed to reject psychologist');
      setActionLoading({ ...actionLoading, [psychologistId]: false });
    }
  };

  const handleTogglePsychologistStatus = async (psychologistId) => {
    try {
      setActionLoading({ ...actionLoading, [psychologistId]: true });
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      await axios.put(
        `${API_ENDPOINTS.ADMIN}/psychologists/${psychologistId}/toggle-status`,
        {},
        config
      );

      // Refresh data
      await fetchDashboardData();
      setActionLoading({ ...actionLoading, [psychologistId]: false });
    } catch (err) {
      console.error('Error toggling psychologist status:', err);
      setError(err.response?.data?.message || 'Failed to update psychologist status');
      setActionLoading({ ...actionLoading, [psychologistId]: false });
    }
  };

  const handleRequestClarification = async (psychologistId, message) => {
    try {
      setActionLoading({ ...actionLoading, [psychologistId]: true });
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      await axios.post(
        `${API_ENDPOINTS.ADMIN}/psychologists/${psychologistId}/request-clarification`,
        { message },
        config
      );

      // Refresh data
      await fetchDashboardData();
      setActionLoading({ ...actionLoading, [psychologistId]: false });
      
      // Show success message
      setError(null);
      console.log('Clarification request sent successfully');
    } catch (err) {
      console.error('Error requesting clarification:', err);
      setError(err.response?.data?.message || 'Failed to send clarification request');
      setActionLoading({ ...actionLoading, [psychologistId]: false });
    }
  };

  const handleDeleteUser = async () => {
    const { userId, userName, userType } = deleteDialog;
    try {
      setActionLoading({ ...actionLoading, [userId]: true });
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      const response = await axios.delete(
        `${API_ENDPOINTS.ADMIN}/users/${userId}`,
        config
      );

      // Show success snackbar
      setSnackbar({
        open: true,
        message: `✅ ${userName}'s account has been permanently deleted`,
        severity: 'success'
      });
      
      // Refresh data
      await fetchDashboardData();
      setDeleteDialog({ open: false, userId: null, userName: '', userType: '' });
      setActionLoading({ ...actionLoading, [userId]: false });
    } catch (err) {
      console.error('Error deleting user:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to delete user',
        severity: 'error'
      });
      setActionLoading({ ...actionLoading, [userId]: false });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const openDeleteDialog = (userId, userName, userType) => {
    setDeleteDialog({ open: true, userId, userName, userType });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, userId: null, userName: '', userType: '' });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.7 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Welcome back! Here's what's happening with Smiling Steps.
        </Typography>
      </Box>

      {/* Tabs Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<DashboardIcon />} label="Overview" iconPosition="start" />
          <Tab icon={<PsychologyIcon />} label="Psychologists" iconPosition="start" />
          <Tab icon={<PeopleIcon />} label="Clients" iconPosition="start" />
          <Tab icon={<ArticleIcon />} label="Content & Resources" iconPosition="start" />
          <Tab icon={<ResourcesIcon />} label="Resources" iconPosition="start" />
          <Tab icon={<AnalyticsIcon />} label="Analytics" iconPosition="start" />
          <Tab icon={<SettingsIcon />} label="Settings" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      {activeTab === 0 && (
        <>
          {/* Statistics Cards */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Clients"
                value={stats?.totalClients || 0}
                icon={<PeopleIcon sx={{ fontSize: 40 }} />}
                color="#1976d2"
                subtitle={`+${stats?.recent?.newClients || 0} this month`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Psychologists"
                value={stats?.totalPsychologists || 0}
                icon={<PsychologyIcon sx={{ fontSize: 40 }} />}
                color="#2e7d32"
                subtitle="Active professionals"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Blogs & Articles"
                value={stats?.totalBlogs || 0}
                icon={<ArticleIcon sx={{ fontSize: 40 }} />}
                color="#ed6c02"
                subtitle="Published content"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Sessions"
                value={stats?.totalSessions || 0}
                icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
                color="#9c27b0"
                subtitle={`${stats?.completedSessions || 0} completed`}
              />
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/admin/create-psychologist')}
                  >
                    Add Psychologist
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ArticleIcon />}
                    onClick={() => navigate('/admin/blogs')}
                  >
                    Manage Content & Resources
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ResourcesIcon />}
                    disabled
                  >
                    Add Resource
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<AnalyticsIcon />}
                    disabled
                  >
                    View Analytics
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Recent Psychologists Preview */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Recent Psychologists
                </Typography>
                <Button size="small" onClick={() => setActiveTab(1)}>View All</Button>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {psychologists.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography color="textSecondary">No psychologists registered yet</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      psychologists.slice(0, 5).map((psych) => (
                        <TableRow key={psych.id} hover>
                          <TableCell>{psych.name}</TableCell>
                          <TableCell>{psych.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={psych.isVerified ? 'Verified' : 'Pending'}
                              color={psych.isVerified ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Recent Clients Preview */}
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Recent Clients
                </Typography>
                <Button size="small" onClick={() => setActiveTab(2)}>View All</Button>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell><strong>Joined</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography color="textSecondary">No clients registered yet</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      clients.slice(0, 5).map((client) => (
                        <TableRow key={client.id} hover>
                          <TableCell>{client.name}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{new Date(client.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Psychologists Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                All Psychologists ({psychologists.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/admin/create-psychologist')}
              >
                Add Psychologist
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Specializations</strong></TableCell>
                    <TableCell><strong>Joined</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {psychologists.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="textSecondary">No psychologists registered yet</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    psychologists.map((psych) => {
                      const approvalStatus = psych.psychologistDetails?.approvalStatus || 'approved';
                      const isActive = psych.psychologistDetails?.isActive !== false;
                      
                      return (
                        <TableRow key={psych.id || psych._id} hover>
                          <TableCell>{psych.name}</TableCell>
                          <TableCell>{psych.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={
                                approvalStatus === 'pending' ? 'Pending Approval' :
                                approvalStatus === 'rejected' ? 'Rejected' :
                                isActive ? 'Active' : 'Disabled'
                              }
                              color={
                                approvalStatus === 'pending' ? 'warning' :
                                approvalStatus === 'rejected' ? 'error' :
                                isActive ? 'success' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {psych.psychologistDetails?.specializations?.slice(0, 2).join(', ') || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {new Date(psych.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">
                              {approvalStatus === 'pending' && (
                                <>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleApprovePsychologist(psych.id || psych._id)}
                                    disabled={actionLoading[psych.id || psych._id]}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={() => handleRejectPsychologist(psych.id || psych._id)}
                                    disabled={actionLoading[psych.id || psych._id]}
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    onClick={() => setClarificationDialog({ 
                                      open: true, 
                                      psychologistId: psych.id || psych._id, 
                                      psychologistName: psych.name,
                                      message: '' 
                                    })}
                                    disabled={actionLoading[psych.id || psych._id]}
                                  >
                                    Request Info
                                  </Button>
                                </>
                              )}
                              {approvalStatus === 'approved' && (
                                <>
                                  <Button
                                    size="small"
                                    variant={isActive ? 'outlined' : 'contained'}
                                    color={isActive ? 'error' : 'success'}
                                    onClick={() => handleTogglePsychologistStatus(psych.id || psych._id)}
                                    disabled={actionLoading[psych.id || psych._id]}
                                  >
                                    {isActive ? 'Disable' : 'Enable'}
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={() => openDeleteDialog(psych.id || psych._id, psych.name, 'psychologist')}
                                    disabled={actionLoading[psych.id || psych._id]}
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}
                              {approvalStatus === 'rejected' && (
                                <>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleApprovePsychologist(psych.id || psych._id)}
                                    disabled={actionLoading[psych.id || psych._id]}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={() => openDeleteDialog(psych.id || psych._id, psych.name, 'psychologist')}
                                    disabled={actionLoading[psych.id || psych._id]}
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}
                              {approvalStatus === 'pending' && (
                                <Button
                                  size="small"
                                  variant="text"
                                  color="error"
                                  startIcon={<DeleteIcon />}
                                  onClick={() => openDeleteDialog(psych.id || psych._id, psych.name, 'psychologist')}
                                  disabled={actionLoading[psych.id || psych._id]}
                                >
                                  Delete
                                </Button>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Clients Tab */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              All Clients ({clients.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Last Login</strong></TableCell>
                    <TableCell><strong>Joined</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="textSecondary">No clients registered yet</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client) => (
                      <TableRow key={client.id} hover>
                        <TableCell>{client.name}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={client.isVerified ? 'Active' : 'Pending'}
                            color={client.isVerified ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {client.lastLogin ? new Date(client.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          {new Date(client.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => openDeleteDialog(client.id || client._id, client.name, 'client')}
                            disabled={actionLoading[client.id || client._id]}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Blog Management Tab */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                <ArticleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Content & Resources Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Manage all content including blogs, recovery guides, education materials, and support tools
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/admin/blogs')}
              >
                Manage All Content
              </Button>
            </Box>
            <Alert severity="info">
              Click "Manage Blogs" to create and edit blog posts. You can use the templates provided in BLOG_TEMPLATES.md for inspiration!
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Resources Tab */}
      {activeTab === 4 && (
        <ResourceManager />
      )}

      {/* Analytics Tab */}
      {activeTab === 5 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              <AnalyticsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Platform Analytics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>User Growth</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Analytics dashboard coming soon...
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Session Statistics</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Session analytics coming soon...
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Settings Tab */}
      {activeTab === 6 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              <SettingsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Platform Settings
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                General Settings
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.allowRegistrations}
                      onChange={(e) => setSettings({ ...settings, allowRegistrations: e.target.checked })}
                    />
                  }
                  label="Allow new user registrations"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    />
                  }
                  label="Enable email notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.maintenanceMode}
                      onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                    />
                  }
                  label="Maintenance mode"
                />
              </Box>
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              Settings are currently for display only. Backend integration coming soon.
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={closeDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title" sx={{ color: 'error.main', fontWeight: 'bold' }}>
          ⚠️ Confirm Account Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to permanently delete the account for <strong>{deleteDialog.userName}</strong>?
            <br /><br />
            <strong>This action cannot be undone.</strong> All associated data including:
            <br />
            • Profile information
            <br />
            • Session history
            <br />
            • Messages and communications
            <br />
            <br />
            will be permanently removed from the system.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDeleteDialog} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteUser} 
            variant="contained" 
            color="error"
            startIcon={<DeleteIcon />}
            autoFocus
          >
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Clarification Request Dialog */}
      <Dialog
        open={clarificationDialog.open}
        onClose={() => setClarificationDialog({ open: false, psychologistId: null, psychologistName: '', message: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Request Additional Information from {clarificationDialog.psychologistName}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Message"
            value={clarificationDialog.message}
            onChange={(e) => setClarificationDialog({ ...clarificationDialog, message: e.target.value })}
            placeholder="Please specify what additional information or clarification is needed..."
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setClarificationDialog({ open: false, psychologistId: null, psychologistName: '', message: '' })}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (clarificationDialog.message.trim()) {
                await handleRequestClarification(clarificationDialog.psychologistId, clarificationDialog.message);
                setClarificationDialog({ open: false, psychologistId: null, psychologistName: '', message: '' });
              }
            }}
            variant="contained"
            disabled={!clarificationDialog.message.trim() || actionLoading[clarificationDialog.psychologistId]}
          >
            Send Request
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;
