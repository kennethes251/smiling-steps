import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';
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
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  Psychology as PsychologyIcon,
  Article as ArticleIcon,
  Feedback as FeedbackIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [psychologists, setPsychologists] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Specializations</strong></TableCell>
                  <TableCell><strong>Joined</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {psychologists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="textSecondary">No psychologists registered yet</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  psychologists.map((psych) => (
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
                      <TableCell>
                        {psych.psychologistDetails?.specializations?.slice(0, 2).join(', ') || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(psych.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
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

      {/* Blogs & Feedback Placeholder */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
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
        <Grid item xs={12} md={6}>
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
    </Container>
  );
};

export default AdminDashboard;