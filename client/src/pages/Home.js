import React from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Home = () => {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          my: 4,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          minHeight: '60vh', // Ensure it takes up a good portion of the viewport
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Welcome to Smiling Steps
        </Typography>
        <Typography variant="h5" component="h2" color="text.secondary" paragraph>
          Your confidential and compassionate partner in mental wellness. Start your journey to a healthier mind today.
        </Typography>
        <Button 
          variant="contained" 
          color="secondary" 
          size="large" 
          component={RouterLink} 
          to="/register"
          sx={{ mt: 3 }}
        >
          Get Started
        </Button>
      </Box>
    </Container>
  );
};

export default Home;