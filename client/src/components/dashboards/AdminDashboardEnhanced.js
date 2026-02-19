import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Tooltip,
  Badge,
  Pagination,
  Link,
  Collapse
} from '@mui/material';
import {
  People as PeopleIcon,
  Psychology as PsychologyIcon,
  EventNote as SessionsIcon,
  Payment as PaymentIcon,
  PendingActions as PendingIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Block as DeactivateIcon,
  CheckCircleOutline as ActivateIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Event as EventIcon,
  AdminPanelSettings as AdminIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL, { API_ENDPOINTS } from '../../config/api';
import AdminBookingForm from '../AdminBookingForm';
import PerformanceDashboard from './PerformanceDashboard';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminDashboardEnhanced = () => {
  const navigate = useNavigate();
  
  // State for statistics
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  
  // State for tabs
  const [activeTab, setActiveTab] = useState(0);
  
  // State for users management
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPagination, setUsersPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  
  // State for pending psychologists
  const [pendingPsychologists, setPendingPsychologists] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  
  // State for payments
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsPagination, setPaymentsPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [paymentDateRange, setPaymentDateRange] = useState({ start: '', end: '' });
  
  // State for dialogs
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '', data: null });
  const [rejectDialog, setRejectDialog] = useState({ open: false, psychologist: null, reason: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  
  // State for snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // State for admin bookings - Requirements: 15.1, 15.7
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminBookingsLoading, setAdminBookingsLoading] = useState(false);
  
  // Auto-refresh interval (60 seconds)
  const REFRESH_INTERVAL = 60000;

  // Get auth token
  const getAuthConfig = () => ({
    headers: { 'x-auth-token': localStorage.getItem('token') }
  });

  // Fetch dashboard statistics
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await axios.get(`${API_ENDPOINTS.ADMIN}/stats`, getAuthConfig());
      setStats(response.data);
      setStatsError(null);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStatsError(error.response?.data?.message || 'Failed to load statistics');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch users with pagination and filters
  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setUsersLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(userSearch && { search: userSearch }),
        ...(userRoleFilter && { role: userRoleFilter }),
        ...(userStatusFilter && { status: userStatusFilter })
      });
      
      const response = await axios.get(
        `${API_ENDPOINTS.ADMIN}/users?${params}`,
        getAuthConfig()
      );
      
      setUsers(response.data.users || []);
      setUsersPagination({
        page: response.data.page,
        pages: response.data.pages,
        total: response.data.total
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      showSnackbar('Failed to load users', 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, userRoleFilter, userStatusFilter]);

  // Fetch pending psychologists
  const fetchPendingPsychologists = useCallback(async () => {
    try {
      setPendingLoading(true);
      const response = await axios.get(
        `${API_ENDPOINTS.ADMIN}/psychologists/pending`,
        getAuthConfig()
      );
      setPendingPsychologists(response.data.psychologists || []);
    } catch (error) {
      console.error('Error fetching pending psychologists:', error);
      showSnackbar('Failed to load pending approvals', 'error');
    } finally {
      setPendingLoading(false);
    }
  }, []);

  // Fetch payments with pagination and filters
  const fetchPayments = useCallback(async (page = 1) => {
    try {
      setPaymentsLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(paymentSearch && { search: paymentSearch }),
        ...(paymentStatusFilter && { status: paymentStatusFilter }),
        ...(paymentDateRange.start && { startDate: paymentDateRange.start }),
        ...(paymentDateRange.end && { endDate: paymentDateRange.end })
      });
      
      const response = await axios.get(
        `${API_ENDPOINTS.ADMIN}/payments?${params}`,
        getAuthConfig()
      );
      
      setPayments(response.data.transactions || []);
      setPaymentsPagination({
        page: response.data.pagination?.page || 1,
        pages: response.data.pagination?.pages || 1,
        total: response.data.pagination?.total || 0
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      showSnackbar('Failed to load payments', 'error');
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentSearch, paymentStatusFilter, paymentDateRange]);

  // Fetch admin-created bookings - Requirements: 15.7
  const fetchAdminBookings = useCallback(async () => {
    try {
      setAdminBookingsLoading(true);
      const response = await axios.get(
        `${API_ENDPOINTS.ADMIN}/sessions/admin-created?limit=5`,
        getAuthConfig()
      );
      setAdminBookings(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching admin bookings:', error);
      // Don't show error for this - it's not critical
    } finally {
      setAdminBookingsLoading(false);
    }
  }, []);

  // Handle successful admin booking
  const handleBookingSuccess = (session) => {
    showSnackbar('Session booked successfully!', 'success');
    setShowBookingForm(false);
    fetchAdminBookings();
    fetchStats();
  };

  // Show snackbar notification
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Handle user status change (activate/deactivate)
  const handleUserStatusChange = async (userId, newStatus) => {
    try {
      await axios.put(
        `${API_ENDPOINTS.ADMIN}/users/${userId}/status`,
        { status: newStatus },
        getAuthConfig()
      );
      showSnackbar(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchUsers(usersPagination.page);
      fetchStats();
    } catch (error) {
      console.error('Error updating user status:', error);
      showSnackbar(error.response?.data?.message || 'Failed to update user status', 'error');
    }
    setConfirmDialog({ open: false, type: '', data: null });
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    
    try {
      await axios.delete(
        `${API_ENDPOINTS.ADMIN}/users/${deleteDialog.user.id}`,
        getAuthConfig()
      );
      showSnackbar('User deleted successfully');
      fetchUsers(usersPagination.page);
      fetchStats();
    } catch (error) {
      console.error('Error deleting user:', error);
      showSnackbar(error.response?.data?.message || 'Failed to delete user', 'error');
    }
    setDeleteDialog({ open: false, user: null });
  };

  // Handle psychologist approval
  const handleApprovePsychologist = async (psychologistId) => {
    try {
      await axios.put(
        `${API_ENDPOINTS.ADMIN}/psychologists/${psychologistId}/approve`,
        {},
        getAuthConfig()
      );
      showSnackbar('Psychologist approved successfully');
      fetchPendingPsychologists();
      fetchStats();
    } catch (error) {
      console.error('Error approving psychologist:', error);
      showSnackbar(error.response?.data?.message || 'Failed to approve psychologist', 'error');
    }
    setConfirmDialog({ open: false, type: '', data: null });
  };

  // Handle psychologist rejection
  const handleRejectPsychologist = async () => {
    if (!rejectDialog.psychologist) return;
    
    try {
      await axios.put(
        `${API_ENDPOINTS.ADMIN}/psychologists/${rejectDialog.psychologist.id}/reject`,
        { reason: rejectDialog.reason || 'Application did not meet requirements' },
        getAuthConfig()
      );
      showSnackbar('Psychologist application rejected');
      fetchPendingPsychologists();
      fetchStats();
    } catch (error) {
      console.error('Error rejecting psychologist:', error);
      showSnackbar(error.response?.data?.message || 'Failed to reject psychologist', 'error');
    }
    setRejectDialog({ open: false, psychologist: null, reason: '' });
  };

  // Handle CSV export
  const handleExportPayments = async () => {
    try {
      const params = new URLSearchParams({
        ...(paymentSearch && { search: paymentSearch }),
        ...(paymentStatusFilter && { status: paymentStatusFilter }),
        ...(paymentDateRange.start && { startDate: paymentDateRange.start }),
        ...(paymentDateRange.end && { endDate: paymentDateRange.end })
      });
      
      const response = await axios.get(
        `${API_ENDPOINTS.ADMIN}/payments/export?${params}`,
        {
          ...getAuthConfig(),
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payments-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showSnackbar('Payments exported successfully');
    } catch (error) {
      console.error('Error exporting payments:', error);
      showSnackbar('Failed to export payments', 'error');
    }
  };

  // Initial data fetch and auto-refresh setup
  useEffect(() => {
    fetchStats();
    fetchAdminBookings(); // Fetch recent admin bookings
    
    // Set up auto-refresh for stats (every 60 seconds)
    const refreshInterval = setInterval(fetchStats, REFRESH_INTERVAL);
    
    return () => clearInterval(refreshInterval);
  }, [fetchStats, fetchAdminBookings]);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 1) {
      fetchUsers(1);
    } else if (activeTab === 2) {
      fetchPendingPsychologists();
    } else if (activeTab === 3) {
      fetchPayments(1);
    }
  }, [activeTab, fetchUsers, fetchPendingPsychologists, fetchPayments]);

  // Statistics Card Component
  const StatCard = ({ title, value, icon, color, subtitle, onClick, badge }) => (
    <Card 
      sx={{ 
        height: '100%', 
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: 4
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color }}>
              {statsLoading ? <CircularProgress size={24} /> : value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.7 }}>
            {badge ? (
              <Badge badgeContent={badge} color="error">
                {icon}
              </Badge>
            ) : icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );


  // Render Statistics Section
  const renderStatistics = () => (
    <Grid container spacing={3} mb={4}>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Total Clients"
          value={stats?.totalClients || 0}
          icon={<PeopleIcon sx={{ fontSize: 40 }} />}
          color="#1976d2"
          subtitle="Registered clients"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Psychologists"
          value={stats?.totalPsychologists || 0}
          icon={<PsychologyIcon sx={{ fontSize: 40 }} />}
          color="#2e7d32"
          subtitle="Active professionals"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Total Sessions"
          value={typeof stats?.totalSessions === 'object' ? (stats?.totalSessions?.total ?? 0) : (stats?.totalSessions ?? 0)}
          icon={<SessionsIcon sx={{ fontSize: 40 }} />}
          color="#9c27b0"
          subtitle={`${typeof stats?.totalSessions === 'object' ? (stats?.totalSessions?.completed ?? 0) : (stats?.completedSessions ?? 0)} completed`}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Total Payments"
          value={`KES ${(stats?.totalPayments?.amount || 0).toLocaleString()}`}
          icon={<PaymentIcon sx={{ fontSize: 40 }} />}
          color="#ed6c02"
          subtitle={`${stats?.totalPayments?.count || 0} transactions`}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatCard
          title="Pending Approvals"
          value={stats?.pendingApprovals || 0}
          icon={<PendingIcon sx={{ fontSize: 40 }} />}
          color="#d32f2f"
          subtitle="Awaiting review"
          onClick={() => setActiveTab(2)}
          badge={stats?.pendingApprovals > 0 ? stats.pendingApprovals : null}
        />
      </Grid>
    </Grid>
  );

  // Render User Management Section
  const renderUserManagement = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            User Management ({usersPagination.total} users)
          </Typography>
          <IconButton onClick={() => fetchUsers(usersPagination.page)} disabled={usersLoading}>
            <RefreshIcon />
          </IconButton>
        </Box>
        
        {/* Filters */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search by name or email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchUsers(1)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: userSearch && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setUserSearch(''); fetchUsers(1); }}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={userRoleFilter}
              label="Role"
              onChange={(e) => { setUserRoleFilter(e.target.value); }}
            >
              <MenuItem value="">All Roles</MenuItem>
              <MenuItem value="client">Client</MenuItem>
              <MenuItem value="psychologist">Psychologist</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={userStatusFilter}
              label="Status"
              onChange={(e) => { setUserStatusFilter(e.target.value); }}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" onClick={() => fetchUsers(1)} startIcon={<SearchIcon />}>
            Search
          </Button>
        </Box>
        
        {/* Users Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Joined</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">No users found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        color={user.role === 'admin' ? 'error' : user.role === 'psychologist' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status || 'active'}
                        size="small"
                        color={user.status === 'inactive' ? 'default' : 'success'}
                      />
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="center">
                      {user.role !== 'admin' && (
                        <Box display="flex" justifyContent="center" gap={1}>
                          {user.status === 'active' ? (
                            <Tooltip title="Deactivate">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => setConfirmDialog({
                                  open: true,
                                  type: 'deactivate',
                                  data: user
                                })}
                              >
                                <DeactivateIcon />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Activate">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => setConfirmDialog({
                                  open: true,
                                  type: 'activate',
                                  data: user
                                })}
                              >
                                <ActivateIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteDialog({ open: true, user })}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        {usersPagination.pages > 1 && (
          <Box display="flex" justifyContent="center" mt={2}>
            <Pagination
              count={usersPagination.pages}
              page={usersPagination.page}
              onChange={(e, page) => fetchUsers(page)}
              color="primary"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );


  // Render Psychologist Approvals Section
  const renderPsychologistApprovals = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Pending Psychologist Approvals ({pendingPsychologists.length})
          </Typography>
          <IconButton onClick={fetchPendingPsychologists} disabled={pendingLoading}>
            <RefreshIcon />
          </IconButton>
        </Box>
        
        {pendingLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : pendingPsychologists.length === 0 ? (
          <Alert severity="info">No pending psychologist approvals</Alert>
        ) : (
          <Grid container spacing={3}>
            {pendingPsychologists.map((psychologist) => (
              <Grid item xs={12} md={6} key={psychologist.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box>
                        <Typography variant="h6">{psychologist.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {psychologist.email}
                        </Typography>
                        {psychologist.phone && (
                          <Typography variant="body2" color="textSecondary">
                            {psychologist.phone}
                          </Typography>
                        )}
                      </Box>
                      <Chip label="Pending" color="warning" size="small" />
                    </Box>
                    
                    {/* Profile Information */}
                    <Box mb={2}>
                      {psychologist.bio && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Bio:</strong> {psychologist.bio.substring(0, 150)}
                          {psychologist.bio.length > 150 && '...'}
                        </Typography>
                      )}
                      {psychologist.profile?.specializations?.length > 0 && (
                        <Box mb={1}>
                          <Typography variant="body2" component="span"><strong>Specializations:</strong> </Typography>
                          {psychologist.profile.specializations.map((spec, idx) => (
                            <Chip key={idx} label={spec} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          ))}
                        </Box>
                      )}
                      {psychologist.profile?.experience && (
                        <Typography variant="body2">
                          <strong>Experience:</strong> {psychologist.profile.experience} years
                        </Typography>
                      )}
                      {psychologist.profile?.education && (
                        <Typography variant="body2">
                          <strong>Education:</strong> {psychologist.profile.education}
                        </Typography>
                      )}
                    </Box>
                    
                    {/* Credentials */}
                    {psychologist.credentials?.length > 0 && (
                      <Box mb={2}>
                        <Typography variant="body2"><strong>Credentials:</strong></Typography>
                        {psychologist.credentials.map((cred, idx) => (
                          <Chip
                            key={idx}
                            label={cred.type}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                            onClick={() => cred.documentUrl && window.open(cred.documentUrl, '_blank')}
                          />
                        ))}
                      </Box>
                    )}
                    
                    {/* Session Rates */}
                    {psychologist.sessionRates && (
                      <Box mb={2}>
                        <Typography variant="body2"><strong>Session Rates (KES):</strong></Typography>
                        <Typography variant="body2" color="textSecondary">
                          Individual: {psychologist.sessionRates.individual?.toLocaleString() || 'N/A'} | 
                          Couples: {psychologist.sessionRates.couples?.toLocaleString() || 'N/A'} | 
                          Family: {psychologist.sessionRates.family?.toLocaleString() || 'N/A'}
                        </Typography>
                      </Box>
                    )}
                    
                    <Typography variant="caption" color="textSecondary" display="block" mb={2}>
                      Applied: {new Date(psychologist.createdAt).toLocaleDateString()}
                    </Typography>
                    
                    {/* Action Buttons */}
                    <Box display="flex" gap={1}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<ApproveIcon />}
                        onClick={() => setConfirmDialog({
                          open: true,
                          type: 'approve',
                          data: psychologist
                        })}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<RejectIcon />}
                        onClick={() => setRejectDialog({
                          open: true,
                          psychologist,
                          reason: ''
                        })}
                      >
                        Reject
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );


  // Render Payment Overview Section
  const renderPaymentOverview = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Payment Transactions ({paymentsPagination.total})
          </Typography>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportPayments}
              disabled={paymentsLoading}
            >
              Export CSV
            </Button>
            <IconButton onClick={() => fetchPayments(paymentsPagination.page)} disabled={paymentsLoading}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
        
        {/* Filters */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search by name, email, or transaction ID..."
            value={paymentSearch}
            onChange={(e) => setPaymentSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchPayments(1)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: paymentSearch && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setPaymentSearch(''); fetchPayments(1); }}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={paymentStatusFilter}
              label="Status"
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Processing">Processing</MenuItem>
              <MenuItem value="Failed">Failed</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="date"
            label="Start Date"
            value={paymentDateRange.start}
            onChange={(e) => setPaymentDateRange(prev => ({ ...prev, start: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            type="date"
            label="End Date"
            value={paymentDateRange.end}
            onChange={(e) => setPaymentDateRange(prev => ({ ...prev, end: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" onClick={() => fetchPayments(1)} startIcon={<FilterIcon />}>
            Filter
          </Button>
        </Box>
        
        {/* Payments Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Transaction ID</strong></TableCell>
                <TableCell><strong>Client</strong></TableCell>
                <TableCell><strong>Therapist</strong></TableCell>
                <TableCell><strong>Amount</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Session</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paymentsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="textSecondary">No payment transactions found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow 
                    key={payment.id} 
                    hover
                    sx={{
                      backgroundColor: payment.paymentStatus === 'Failed' ? '#ffebee' : 
                                      payment.resultCode && payment.resultCode !== 0 ? '#fff3e0' : 'inherit'
                    }}
                  >
                    <TableCell>
                      {payment.paymentVerifiedAt 
                        ? new Date(payment.paymentVerifiedAt).toLocaleDateString()
                        : new Date(payment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {payment.transactionID || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{payment.client?.name || 'N/A'}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {payment.client?.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{payment.therapist?.name || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        KES {(payment.amount || 0).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.paymentStatus || 'Unknown'}
                        size="small"
                        color={
                          payment.paymentStatus === 'Paid' ? 'success' :
                          payment.paymentStatus === 'Processing' ? 'warning' :
                          payment.paymentStatus === 'Failed' ? 'error' : 'default'
                        }
                        icon={payment.resultCode && payment.resultCode !== 0 ? <WarningIcon /> : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{payment.sessionType || 'N/A'}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {payment.sessionDate ? new Date(payment.sessionDate).toLocaleDateString() : ''}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        {paymentsPagination.pages > 1 && (
          <Box display="flex" justifyContent="center" mt={2}>
            <Pagination
              count={paymentsPagination.pages}
              page={paymentsPagination.page}
              onChange={(e, page) => fetchPayments(page)}
              color="primary"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );


  // Main render
  if (statsError && !stats) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">{statsError}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Welcome back! Here's what's happening with Smiling Steps.
          {stats?.cached && (
            <Typography component="span" variant="caption" sx={{ ml: 1 }}>
              (Data refreshes every 60 seconds)
            </Typography>
          )}
        </Typography>
      </Box>

      {/* Statistics Cards - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 */}
      {renderStatistics()}

      {/* Tabs for different sections */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="User Management" />
          <Tab 
            label={
              <Badge badgeContent={stats?.pendingApprovals || 0} color="error">
                Psychologist Approvals
              </Badge>
            } 
          />
          <Tab label="Payments" />
          <Tab label="Performance" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {/* Admin Booking Section - Requirements: 15.1, 15.7 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <EventIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Book Session for Client
                </Typography>
              </Box>
              <Button
                variant={showBookingForm ? 'outlined' : 'contained'}
                color="primary"
                startIcon={showBookingForm ? <ExpandLessIcon /> : <AddIcon />}
                onClick={() => setShowBookingForm(!showBookingForm)}
              >
                {showBookingForm ? 'Hide Form' : 'Book for Client'}
              </Button>
            </Box>
            
            <Collapse in={showBookingForm}>
              <Box sx={{ mt: 2 }}>
                <AdminBookingForm 
                  onSuccess={handleBookingSuccess}
                  onCancel={() => setShowBookingForm(false)}
                />
              </Box>
            </Collapse>

            {/* Recent Admin-Created Bookings */}
            {!showBookingForm && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Recent Admin-Created Bookings
                </Typography>
                {adminBookingsLoading ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : adminBookings.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    No admin-created bookings yet. Click "Book for Client" to create one.
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell><strong>Client</strong></TableCell>
                          <TableCell><strong>Psychologist</strong></TableCell>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Type</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                          <TableCell><strong>Created By</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {adminBookings.slice(0, 5).map((booking) => (
                          <TableRow key={booking.id} hover>
                            <TableCell>
                              <Typography variant="body2">{booking.client?.name || 'N/A'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">Dr. {booking.psychologist?.name || 'N/A'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(booking.sessionDate).toLocaleDateString()}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {new Date(booking.sessionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={booking.sessionType} size="small" />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={booking.status} 
                                size="small"
                                color={
                                  booking.status === 'Confirmed' ? 'success' :
                                  booking.status === 'Approved' ? 'primary' :
                                  booking.status === 'Pending' ? 'warning' : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip title={booking.adminBookingReason || 'Admin booking'}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <AdminIcon fontSize="small" color="action" />
                                  <Typography variant="caption">
                                    {booking.admin?.name || 'Admin'}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
              }}
              onClick={() => setActiveTab(1)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <PeopleIcon sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    User Management
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  View, search, activate/deactivate, and manage all platform users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
              }}
              onClick={() => setActiveTab(2)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Badge badgeContent={stats?.pendingApprovals || 0} color="error">
                    <PendingIcon sx={{ fontSize: 40, color: '#ed6c02', mr: 2 }} />
                  </Badge>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', ml: 1 }}>
                    Psychologist Approvals
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Review and approve/reject psychologist applications
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
              }}
              onClick={() => setActiveTab(3)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <PaymentIcon sx={{ fontSize: 40, color: '#2e7d32', mr: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Payment Overview
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  View all M-Pesa transactions, filter, and export reports
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 */}
        {renderUserManagement()}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {/* Requirements: 3.2, 3.3, 3.4, 3.5 */}
        {renderPsychologistApprovals()}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {/* Requirements: 10.1, 10.2, 10.3, 10.4, 10.5 */}
        {renderPaymentOverview()}
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        {/* Performance Monitoring Dashboard - Requirements: 13.1, 13.2, 13.3, 13.4, 13.5 */}
        <PerformanceDashboard />
      </TabPanel>

      {/* Confirmation Dialog for Activate/Deactivate/Approve */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, type: '', data: null })}
      >
        <DialogTitle>
          {confirmDialog.type === 'activate' && 'Activate User'}
          {confirmDialog.type === 'deactivate' && 'Deactivate User'}
          {confirmDialog.type === 'approve' && 'Approve Psychologist'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.type === 'activate' && 
              `Are you sure you want to activate ${confirmDialog.data?.name}'s account? They will be able to log in again.`}
            {confirmDialog.type === 'deactivate' && 
              `Are you sure you want to deactivate ${confirmDialog.data?.name}'s account? They will not be able to log in.`}
            {confirmDialog.type === 'approve' && 
              `Are you sure you want to approve ${confirmDialog.data?.name} as a psychologist? Their profile will become visible to clients.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, type: '', data: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={confirmDialog.type === 'deactivate' ? 'warning' : 'success'}
            onClick={() => {
              if (confirmDialog.type === 'activate') {
                handleUserStatusChange(confirmDialog.data.id, 'active');
              } else if (confirmDialog.type === 'deactivate') {
                handleUserStatusChange(confirmDialog.data.id, 'inactive');
              } else if (confirmDialog.type === 'approve') {
                handleApprovePsychologist(confirmDialog.data.id);
              }
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog with Reason Input */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, psychologist: null, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Psychologist Application</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Please provide a reason for rejecting {rejectDialog.psychologist?.name}'s application. 
            This will be sent to them via email.
          </DialogContentText>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            label="Rejection Reason"
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="e.g., Missing credentials, incomplete profile information..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, psychologist: null, reason: '' })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectPsychologist}
          >
            Reject Application
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, user: null })}
      >
        <DialogTitle sx={{ color: 'error.main' }}>Delete User Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {deleteDialog.user?.name}'s account? 
            This action will soft-delete the account and anonymize all personal data. 
            This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteUser}
          >
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminDashboardEnhanced;
