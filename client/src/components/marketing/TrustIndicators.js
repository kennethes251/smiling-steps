import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  VerifiedUser as LicensingIcon,
  Security as PrivacyIcon,
  LocationOn as LocalFocusIcon
} from '@mui/icons-material';
import { usePlatformStats } from './DynamicSocialProof';

// Trust elements for global accessibility
const trustIndicators = [
  {
    type: 'licensing',
    title: 'Licensed Professionals',
    description: 'All our therapists are licensed and certified mental health professionals',
    icon: <LicensingIcon sx={{ fontSize: 36, color: '#1976D2' }} />,
    color: '#1976D2',
    details: [
      'Licensed by recognized professional bodies',
      'Ongoing professional development',
      'Verified credentials and certifications',
      'Adherence to ethical standards'
    ]
  },
  {
    type: 'privacy',
    title: 'Privacy Protection',
    description: 'Your information is protected with industry-leading security and privacy standards',
    icon: <PrivacyIcon sx={{ fontSize: 36, color: '#388E3C' }} />,
    color: '#388E3C',
    details: [
      'International data protection compliance',
      'Secure encrypted data storage',
      'Confidentiality guaranteed',
      'No sharing with third parties without consent'
    ]
  },
  {
    type: 'local-focus',
    title: 'Culturally Sensitive Care',
    description: 'Mental health support that respects your cultural background and community values',
    icon: <LocalFocusIcon sx={{ fontSize: 36, color: '#F57C00' }} />,
    color: '#F57C00',
    details: [
      'Understanding of diverse cultural contexts',
      'Multilingual therapist options',
      'Respect for local values and traditions',
      'Community-focused healing approaches'
    ]
  }
];

const TrustIndicators = () => {
  const { stats, loading, isRealData } = usePlatformStats();

  return (
    <Box 
      component="section" 
      sx={{ 
        py: 10, 
        background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
        position: 'relative'
      }}
    >
      <Container maxWidth="lg">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Typography
            variant="h4"
            component="h2"
            align="center"
            gutterBottom
            sx={{
              fontWeight: 600,
              mb: 2,
              color: 'text.primary',
            }}
          >
            Why You Can Trust Us
          </Typography>
          <Typography
            variant="h6"
            align="center"
            color="text.secondary"
            sx={{
              maxWidth: 600,
              mx: 'auto',
              mb: 6,
              fontWeight: 400
            }}
          >
            Professional credibility and care you can depend on
          </Typography>

          {/* Horizontal layout for trust indicators */}
          <Grid container spacing={4} justifyContent="center">
            {trustIndicators.map((indicator, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  viewport={{ once: true }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 2,
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
                        borderColor: indicator.color,
                        borderWidth: 1
                      }
                    }}
                  >
                    {/* Subtle, non-overwhelming icon presentation */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 70,
                        height: 70,
                        mb: 3,
                        borderRadius: '50%',
                        backgroundColor: `${indicator.color}10`,
                        border: `1px solid ${indicator.color}30`,
                        mx: 'auto'
                      }}
                    >
                      {indicator.icon}
                    </Box>
                    
                    {/* Professional credibility emphasis */}
                    <Typography
                      variant="h6"
                      component="h3"
                      gutterBottom
                      sx={{ 
                        fontWeight: 600,
                        color: indicator.color,
                        mb: 2
                      }}
                    >
                      {indicator.title}
                    </Typography>
                    
                    <Typography 
                      variant="body1" 
                      color="text.secondary"
                      sx={{ 
                        lineHeight: 1.6,
                        fontSize: '0.95rem'
                      }}
                    >
                      {indicator.description}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Dynamic Platform Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <Box
              sx={{
                mt: 6,
                p: 4,
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05), rgba(56, 142, 60, 0.05))',
                borderRadius: 2,
                border: '1px solid rgba(25, 118, 210, 0.1)'
              }}
            >
              {/* Statistics Grid */}
              {!loading && (
                <Grid container spacing={3} justifyContent="center" sx={{ mb: 3 }}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976D2' }}>
                      {stats.happyClients?.value || '500+'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stats.happyClients?.label || 'Happy Clients'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#388E3C' }}>
                      {stats.licensedTherapists?.value || '50+'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stats.licensedTherapists?.label || 'Licensed Therapists'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#F57C00' }}>
                      {stats.satisfactionRate?.value || '95%'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stats.satisfactionRate?.label || 'Satisfaction Rate'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#663399' }}>
                      {stats.supportAvailable?.value || '24/7'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stats.supportAvailable?.label || 'Support Available'}
                    </Typography>
                  </Grid>
                </Grid>
              )}
              
              <Typography
                variant="body1"
                sx={{
                  color: 'text.primary',
                  fontWeight: 500,
                  maxWidth: '700px',
                  mx: 'auto',
                  lineHeight: 1.6
                }}
              >
                <strong>Trusted by clients worldwide</strong> who have found healing and hope through our platform. 
                Your mental health journey is safe with us.
              </Typography>
              
              {/* Real Data Indicator */}
              {isRealData && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <Chip 
                    label="Live Statistics" 
                    size="small" 
                    color="success" 
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Box>
              )}
            </Box>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
};

export default TrustIndicators;