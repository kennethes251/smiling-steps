import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Paper
} from '@mui/material';
import { Person, Psychology, AdminPanelSettings } from '@mui/icons-material';
import Logo from '../components/Logo';

const RoleSelectionPage = () => {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'client',
      title: 'I need mental health support',
      description: 'Book sessions with licensed therapists, access resources, and track your mental health journey.',
      icon: <Person sx={{ fontSize: 48, color: 'primary.main' }} />,
      buttonText: 'Register as Client',
      route: '/register'
    },
    {
      id: 'therapist',
      title: 'I am a licensed therapist',
      description: 'Provide professional mental health services, manage clients, and grow your practice.',
      icon: <Psychology sx={{ fontSize: 48, color: 'secondary.main' }} />,
      buttonText: 'Register as Therapist',
      route: '/register/therapist'
    }
  ];

  return (
    <Container component="main" maxWidth="lg">
      <Box
        sx={{
          marginTop: 8,
          marginBottom: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            width: '100%',
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Logo size={80} sx={{ mb: 3 }} />
            <Typography
              component="h1"
              variant="h3"
              gutterBottom
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(45deg, #663399 30%, #9C27B0 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block',
                mb: 2
              }}
            >
              Join Smiling Steps
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              Choose how you'd like to use our platform
            </Typography>
          </Box>

          <Grid container spacing={4} justifyContent="center">
            {roles.map((role) => (
              <Grid item xs={12} md={6} key={role.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(102, 51, 153, 0.15)',
                    },
                    border: '2px solid transparent',
                    '&:hover': {
                      borderColor: 'primary.main',
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                    <Box sx={{ mb: 3 }}>
                      {role.icon}
                    </Box>
                    <Typography
                      variant="h5"
                      component="h2"
                      gutterBottom
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      {role.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ lineHeight: 1.6 }}
                    >
                      {role.description}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 3, pt: 0 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => navigate(role.route)}
                      sx={{
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        background: role.id === 'client' 
                          ? 'linear-gradient(45deg, #663399 30%, #9C27B0 90%)'
                          : 'linear-gradient(45deg, #9C27B0 30%, #663399 90%)',
                        '&:hover': {
                          background: role.id === 'client'
                            ? 'linear-gradient(45deg, #552288 30%, #8B1A9B 90%)'
                            : 'linear-gradient(45deg, #8B1A9B 30%, #552288 90%)',
                        }
                      }}
                    >
                      {role.buttonText}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Already have an account?
            </Typography>
            <Button
              variant="outlined"
              onClick={() => navigate('/login')}
              sx={{ textTransform: 'none', px: 4 }}
            >
              Sign In
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RoleSelectionPage;