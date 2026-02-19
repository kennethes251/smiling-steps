import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import { ArrowForward as ArrowForwardIcon, Healing as HealingIcon } from '@mui/icons-material';
import Logo from '../Logo';

const LearnMoreHero = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `
          linear-gradient(
            135deg, 
            rgba(227, 242, 253, 0.9) 0%, 
            rgba(232, 245, 232, 0.9) 50%, 
            rgba(255, 243, 224, 0.9) 100%
          ),
          url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:%23E3F2FD;stop-opacity:1" /><stop offset="100%" style="stop-color:%23FFF8E1;stop-opacity:1" /></linearGradient></defs><rect width="1200" height="800" fill="url(%23sky)"/><path d="M0,600 Q300,500 600,550 T1200,500 L1200,800 L0,800 Z" fill="%23C8E6C9" opacity="0.7"/><path d="M0,650 Q400,580 800,600 T1200,580 L1200,800 L0,800 Z" fill="%23A5D6A7" opacity="0.6"/><path d="M0,700 Q200,650 600,680 T1200,650 L1200,800 L0,800 Z" fill="%2381C784" opacity="0.5"/><circle cx="100" cy="150" r="60" fill="%23FFF59D" opacity="0.8"/><path d="M200,400 Q250,350 300,400 T400,400" stroke="%234CAF50" stroke-width="3" fill="none" opacity="0.6"/><path d="M600,450 Q650,400 700,450 T800,450" stroke="%234CAF50" stroke-width="2" fill="none" opacity="0.5"/></svg>')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        pt: 10
      }}
    >
      {/* Floating Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(79, 195, 247, 0.1)',
          animation: 'float 6s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-20px)' }
          }
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '5%',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'rgba(129, 199, 132, 0.1)',
          animation: 'float 8s ease-in-out infinite reverse',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-20px)' }
          }
        }}
      />

      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                  fontWeight: 'bold',
                  mb: 3,
                  background: 'linear-gradient(45deg, #663399, #2E7D32)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.2
                }}
              >
                Your Journey to Recovery Starts Here
              </Typography>

              <Typography
                variant="h5"
                sx={{
                  mb: 4,
                  color: 'text.secondary',
                  lineHeight: 1.6,
                  fontSize: { xs: '1.1rem', md: '1.3rem' },
                  fontWeight: 500
                }}
              >
                Professional addiction counseling and mental health support that honors your story, respects your pace, and empowers your healing through evidence-based therapy and creative approaches.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/register')}
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: '1.1rem',
                    borderRadius: '50px',
                    background: 'linear-gradient(45deg, #663399, #9C27B0)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #512DA8, #663399)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(102, 51, 153, 0.3)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                  endIcon={<ArrowForwardIcon />}
                >
                  Book Session
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: '1.1rem',
                    borderRadius: '50px',
                    borderColor: '#663399',
                    color: '#663399',
                    '&:hover': {
                      borderColor: '#512DA8',
                      backgroundColor: 'rgba(102, 51, 153, 0.04)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                  startIcon={<HealingIcon />}
                >
                  Explore Our Services
                </Button>
              </Box>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Box
                sx={{
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))'
                }}
              >
                <Logo size={200} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  textAlign: 'center',
                  color: '#663399',
                  mt: 3,
                  fontWeight: 600,
                  fontSize: { xs: '1.3rem', md: '1.5rem' }
                }}
              >
                Smiling Steps
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  textAlign: 'center',
                  color: 'text.secondary',
                  mt: 1,
                  fontStyle: 'italic',
                  fontSize: { xs: '1rem', md: '1.1rem' }
                }}
              >
                "Healing doesn't happen in leaps—it happens in steps"
              </Typography>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default LearnMoreHero;
