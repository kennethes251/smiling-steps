import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ClientDashboard from '../components/dashboards/ClientDashboard';
import PsychologistDashboard from '../components/dashboards/PsychologistDashboard';
import { Box, Grid, Typography } from '@mui/material';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();



  // Wait for user data to be loaded
  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Remove the wrapper Grid and Typography - let the dashboard components handle their own layout */}
      {user.role === 'client' ? <ClientDashboard /> : <PsychologistDashboard />}
    </Box>
  );
};

export default Dashboard;
