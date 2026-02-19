import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { componentStyles, mobileAccessibility } from '../../utils/designSystem';

const TransitionCTA = () => {
  const navigate = useNavigate();

  return (
    <Box 
      component="section" 
      sx={{ 
        py: 8, 
        background: 'linear-gradient(135deg, rgba(102, 51, 153, 0.05), rgba(156, 39, 176, 0.05))',
        borderTop: '1px solid rgba(102, 51, 153, 0.1)'
      }}
    >
      <Container maxWidth="md">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Box textAlign="center">
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 600,
                mb: 3,
                color: 'primary.main',
              }}
            >
              Ready to Learn More?
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mb: 4,
                maxWidth: '600px',
                mx: 'auto',
                color: 'text.secondary',
                lineHeight: 1.6
              }}
            >
              Discover our comprehensive approach to mental wellness, meet our team, 
              and understand how we can support your healing journey.
            </Typography>
            
            {/* Single transition CTA as per requirements with mobile accessibility */}
            <Box sx={mobileAccessibility.ctaContainer.mobile}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => navigate('/learn-more')}
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    ...componentStyles.ctaButton.primary,
                    ...componentStyles.ctaButton.large,
                    px: 6,
                  }}
                  aria-label="Learn More About Our Approach - Navigate to detailed information page"
                  data-testid="transition-cta-button"
                >
                  Learn More About Our Approach
                </Button>
              </motion.div>
            </Box>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default TransitionCTA;