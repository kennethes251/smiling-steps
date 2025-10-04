import React, { useContext, useState, useEffect } from 'react';
import { Container, Typography, Button, Grid, Paper, Box, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ClientDashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);

  // Simulated data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome, {user?.name || 'User'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your therapy sessions and track your progress
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Quick Actions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                component={Link}
                to="/bookings"
                variant="contained"
                fullWidth
              >
                Book a Session
              </Button>
              <Button
                component={Link}
                to="/assessments"
                variant="outlined"
                fullWidth
              >
                Take Assessment
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Upcoming Sessions */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Upcoming Sessions</Typography>
              <Button component={Link} to="/sessions" size="small">View All</Button>
            </Box>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No upcoming sessions scheduled
              </Typography>
              <Button component={Link} to="/bookings" variant="text" sx={{ mt: 2 }}>
                Book a session
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Recent Activity</Typography>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No recent activity to show
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ClientDashboard;
