import React from 'react';
import { Box, Typography, Button, Grid, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  CalendarMonth as CalendarIcon,
  Chat as ChatIcon,
  Assessment as ProgressIcon,
  CheckCircle as CheckInIcon,
  Group as ClientsIcon,
  RateReview as ReviewIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const QuickActions = ({ userRole }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  // Common button styles
  const buttonStyle = {
    height: '100%',
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
    textAlign: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[6],
    },
  };

  // Client specific actions
  const clientActions = [
    {
      id: 'book-session',
      icon: <CalendarIcon fontSize="large" color="primary" />,
      label: 'Book Session',
      onClick: () => navigate('/bookings'),
    },
    {
      id: 'message-therapist',
      icon: <ChatIcon fontSize="large" color="primary" />,
      label: 'Message Therapist',
      onClick: () => navigate('/messages'),
    },
    {
      id: 'view-progress',
      icon: <ProgressIcon fontSize="large" color="primary" />,
      label: 'View Progress',
      onClick: () => navigate('/progress'),
    },
    {
      id: 'daily-checkin',
      icon: <CheckInIcon fontSize="large" color="primary" />,
      label: 'Daily Check-in',
      onClick: () => navigate('/checkin'),
    },
  ];

  // Psychologist specific actions
  const psychologistActions = [
    {
      id: 'schedule-session',
      icon: <ScheduleIcon fontSize="large" color="primary" />,
      label: 'Schedule Session',
      onClick: () => navigate('/bookings'),
    },
    {
      id: 'message-client',
      icon: <ChatIcon fontSize="large" color="primary" />,
      label: 'Message Client',
      onClick: () => navigate('/messages'),
    },
    {
      id: 'review-assessments',
      icon: <ReviewIcon fontSize="large" color="primary" />,
      label: 'Review Assessments',
      onClick: () => navigate('/assessments'),
    },
    {
      id: 'view-clients',
      icon: <ClientsIcon fontSize="large" color="primary" />,
      label: 'View Clients',
      onClick: () => navigate('/clients'),
    },
  ];

  const actions = userRole === 'Client' ? clientActions : psychologistActions;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
        Quick Actions
      </Typography>
      <Grid container spacing={2}>
        {actions.map((action) => (
          <Grid item xs={12} sm={6} md={3} key={action.id}>
            <Button
              variant="outlined"
              fullWidth
              onClick={action.onClick}
              sx={buttonStyle}
            >
              <Box sx={{ mb: 1 }}>{action.icon}</Box>
              <Typography variant="subtitle2">{action.label}</Typography>
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default QuickActions;
