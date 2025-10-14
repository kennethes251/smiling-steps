import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Paper,
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  Psychology as PsychologyIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const DeveloperDashboardSimple = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalPsychologists: 0,
    totalSessions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_ENDPOINTS.ADMIN}/stats`, {
        headers: { 'x-auth-token': token }
      });
      setStats(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics');
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h3" component="div">
              {value}
            </Typography>
          </Box>
          <Icon sx={{ fontSize: 48, color }} />
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <AdminIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Welcome to the Smiling Steps Admin Dashboard
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Clients"
            value={stats.totalClients}
            icon={PeopleIcon}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Psychologists"
            value={stats.totalPsychologists}
            icon={PsychologyIcon}
            color="secondary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Sessions"
            value={stats.totalSessions}
            icon={AdminIcon}
            color="success.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<PsychologyIcon />}
                href="/admin/create-psychologist"
                fullWidth
              >
                Create Psychologist
              </Button>
              <Button
                variant="outlined"
                startIcon={<PeopleIcon />}
                href="/developer-dashboard"
                fullWidth
              >
                View Full Dashboard
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                ✅ User Authentication: Active
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                ✅ Admin Panel: Active
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                ✅ PostgreSQL Database: Connected
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                ⏳ Sessions: In Development
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                ⏳ Assessments: In Development
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DeveloperDashboardSimple;