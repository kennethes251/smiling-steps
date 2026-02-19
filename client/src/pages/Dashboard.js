import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ClientDashboard from '../components/dashboards/ClientDashboard';
import PsychologistDashboard from '../components/dashboards/PsychologistDashboard';
import AdminDashboardEnhanced from '../components/dashboards/AdminDashboardEnhanced';
import { Box, Grid, Typography } from '@mui/material';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();



  // Wait for user data to be loaded
  if (!user) {
    return <div>Loading...</div>;
  }

  // Render dashboard based on user role
  const renderDashboard = () => {
    switch(user.role) {
      case 'admin':
        return <AdminDashboardEnhanced />;
      case 'psychologist':
        return <PsychologistDashboard />;
      case 'client':
      default:
        return <ClientDashboard />;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {renderDashboard()}
    </Box>
  );
};

export default Dashboard;
