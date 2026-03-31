import React, { useState, useEffect } from 'react';
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
  Stack,
  Snackbar
} from '@mui/material';
import {
  People as PeopleIcon,
  Psychology as PsychologyIcon,
  Article as ArticleIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PaymentVerificationPanel from './PaymentVerificationPanel';
import API_BASE_URL from '../../config/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [psychologists, setPsychologists] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleApprove = async (psychId) => {
    setActionLoading(prev => ({ ...prev, [psychId]: 'approving' }));
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/admin/psychologists/${psychId}/approve`, {}, {
        headers: { 'x-auth-token': token }
      });
      showSnackbar('Therapist approved successfully');
      fetchDashboardData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to approve therapist', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [psychId]: null }));
    }
  };

  const handleReject = async (psychId) => {
    setActionLoading(prev => ({ ...prev, [psychId]: 'rejecting' }));
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/admin/psychologists/${psychId}/reject`, {}, {
        headers: { 'x-auth-token': token }
      });
      showSnackbar('Therapist application rejected');
      fetchDashboardData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to reject therapist', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [psychId]: null }));
    }
  };

  const handleRequestDocuments = async (psychId) => {
    setActionLoading(prev => ({ ...prev, [psychId]: 'requesting' }));
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/admin/psychologists/${psychId}/request-documents`, {}, {
        headers: { 'x-auth-token': token }
      });
      showSnackbar('Document request email sent to therapist');
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'Failed to send document request', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [psychId]: null }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      // Fetch all data in parallel
      const [statsRes, psychRes, clientsRes] = await Promise.all([
        axios.get('https://smiling-steps.onrender.com/api/admin/stats', config),
        axios.get('https://smiling-steps.onrender.com/api/admin/psychologists', config),
        axios.get('https://smiling-steps.onrender.com/api/admin/clients', config)
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
      <Box mb={4}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Welcome back! Here's what's happening with Smiling Steps.
        </Typography>
      </Box>

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

      {/* Psychologists Table */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Registered Psychologists ({psychologists.length})
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Approval Status</strong></TableCell>
                  <TableCell><strong>Specializations</strong></TableCell>
                  <TableCell><strong>Joined</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
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
                    const approvalStatus = psych.approvalStatus || psych.psychologistDetails?.approvalStatus || 'pending';
                    const isPending = approvalStatus === 'pending';
                    const isApproved = approvalStatus === 'approved';
                    const isLoading = actionLoading[psych.id];
                    return (
                      <TableRow key={psych.id} hover>
                        <TableCell>{psych.name}</TableCell>
                        <TableCell>{psych.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}
                            color={isApproved ? 'success' : isPending ? 'warning' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {psych.psychologistDetails?.specializations?.slice(0, 2).join(', ') || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {new Date(psych.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {isPending && (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="info"
                                  startIcon={<EmailIcon />}
                                  onClick={() => handleRequestDocuments(psych.id)}
                                  disabled={!!isLoading}
                                >
                                  {isLoading === 'requesting' ? 'Sending...' : 'Request Docs'}
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckCircleIcon />}
                                  onClick={() => handleApprove(psych.id)}
                                  disabled={!!isLoading}
                                >
                                  {isLoading === 'approving' ? 'Approving...' : 'Approve'}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<CancelIcon />}
                                  onClick={() => handleReject(psych.id)}
                                  disabled={!!isLoading}
                                >
                                  {isLoading === 'rejecting' ? 'Rejecting...' : 'Reject'}
                                </Button>
                              </>
                            )}
                            {isApproved && (
                              <Typography variant="body2" color="success.main">✓ Active</Typography>
                            )}
                          </Stack>
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

      {/* Clients Table */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Registered Clients ({clients.length})
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
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="textSecondary">No clients registered yet</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.slice(0, 10).map((client) => (
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {clients.length > 10 && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
              Showing 10 of {clients.length} clients
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Payment Verification Panel - Manual Till Number System */}
      <Box sx={{ mb: 4 }}>
        <PaymentVerificationPanel />
      </Box>

      {/* Quick Actions & Management */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
            onClick={() => navigate('/admin/payments')}
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PaymentIcon sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Payment Management
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                View and manage all M-Pesa transactions, reconcile payments, and export reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
            onClick={() => navigate('/admin/accounting')}
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUpIcon sx={{ fontSize: 40, color: '#4caf50', mr: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Accounting Integration
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Export payment data to QuickBooks, Xero, Sage, and other accounting software
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                <ArticleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Blogs & Articles
              </Typography>
              <Alert severity="info">
                Blog management will be available after Blog model conversion
              </Alert>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                <FeedbackIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Client Feedback
              </Typography>
              <Alert severity="info">
                Feedback management will be available after Feedback model conversion
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
};

export default AdminDashboard;