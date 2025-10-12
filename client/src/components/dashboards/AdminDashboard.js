import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/api';
import axios from 'axios';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  CircularProgress
} from '@mui/material';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [psychologists, setPsychologists] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'x-auth-token': token } };

      // Fetch admin stats
      const statsRes = await axios.get('https://smiling-steps.onrender.com/api/admin/stats', config);
      setStats(statsRes.data);

      // Fetch psychologists
      const psychRes = await axios.get('https://smiling-steps.onrender.com/api/admin/psychologists', config);
      setPsychologists(psychRes.data);

      // Fetch sessions
      const sessionsRes = await axios.get('https://smiling-steps.onrender.com/api/sessions', config);
      setSessions(sessionsRes.data);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      
      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Users
                </Typography>
                <Typography variant="h5">
                  {stats.totalUsers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Psychologists
                </Typography>
                <Typography variant="h5">
                  {stats.totalPsychologists}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Sessions
                </Typography>
                <Typography variant="h5">
                  {stats.totalSessions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completed Sessions
                </Typography>
                <Typography variant="h5">
                  {stats.completedSessions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Button
          component={Link}
          to="/admin/create-psychologist"
          variant="contained"
          sx={{ mr: 2 }}
        >
          Create Psychologist
        </Button>
      </Box>

      {/* Recent Sessions */}
      <Typography variant="h6" gutterBottom>
        Recent Sessions
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>Psychologist</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.slice(0, 10).map((session) => (
              <TableRow key={session._id}>
                <TableCell>{session.client?.name || 'N/A'}</TableCell>
                <TableCell>{session.psychologist?.name || 'N/A'}</TableCell>
                <TableCell>
                  {new Date(session.sessionDate).toLocaleDateString()}
                </TableCell>
                <TableCell>{session.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default AdminDashboard;