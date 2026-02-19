import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  useTheme
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Psychology as MentalWellnessIcon,
  SelfImprovement as PersonalGrowthIcon,
  Favorite as EmotionalHealingIcon,
  Groups as CommunityConnectionIcon
} from '@mui/icons-material';
import optimizedAnimations from '../../utils/optimizedAnimations';

// Exactly 4 user-focused benefits focused on outcomes rather than technical features
const humanBenefits = [
  {
    icon: <MentalWellnessIcon sx={{ fontSize: 40, color: '#1976D2' }} />,
    title: 'Find Inner Peace',
    description: 'Experience reduced anxiety and stress through personalized therapeutic support.',
    outcome: 'Feel calmer and more centered in your daily life'
  },
  {
    icon: <PersonalGrowthIcon sx={{ fontSize: 40, color: '#388E3C' }} />,
    title: 'Build Resilience',
    description: 'Develop coping strategies and emotional tools for life\'s challenges.',
    outcome: 'Navigate difficulties with confidence and strength'
  },
  {
    icon: <EmotionalHealingIcon sx={{ fontSize: 40, color: '#D32F2F' }} />,
    title: 'Heal Relationships',
    description: 'Improve communication and deepen connections with loved ones.',
    outcome: 'Create healthier, more fulfilling relationships'
  },
  {
    icon: <CommunityConnectionIcon sx={{ fontSize: 40, color: '#7B1FA2' }} />,
    title: 'Rediscover Purpose',
    description: 'Reconnect with your values and find meaning in your journey.',
    outcome: 'Live with greater intention and fulfillment'
  }
];

const HumanBenefits = () => {
  const theme = useTheme();

  return (
    <Box component="section" sx={{ py: 12, bgcolor: 'background.paper' }}>
      <Container maxWidth="lg">
        <motion.div
          {...optimizedAnimations.progressive.sectionReveal}
        >
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{
              fontWeight: 700,
              mb: 2,
              color: 'primary.main',
            }}
          >
            Transform Your Life
          </Typography>
          <Typography
            variant="h6"
            align="center"
            color="text.secondary"
            sx={{
              maxWidth: 700,
              mx: 'auto',
              mb: 6
            }}
          >
            Experience real change through compassionate, professional support
          </Typography>

          {/* Grid layout with hover animations */}
          <Grid container spacing={4}>
            {humanBenefits.map((benefit, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <motion.div
                  {...optimizedAnimations.fadeInUp}
                  transition={{ 
                    ...optimizedAnimations.fadeInUp.transition,
                    delay: optimizedAnimations.performance.isLowPerformance ? index * 0.05 : index * 0.1 
                  }}
                  viewport={optimizedAnimations.viewport}
                  {...(optimizedAnimations.performance.prefersReducedMotion ? {} : optimizedAnimations.hoverLift)}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 3,
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': optimizedAnimations.performance.prefersReducedMotion ? {} : {
                        transform: `translateY(${optimizedAnimations.performance.isLowPerformance ? '-2px' : '-5px'})`,
                        boxShadow: theme.shadows[8],
                        borderColor: benefit.icon.props.sx.color,
                        borderWidth: 1,
                        borderStyle: 'solid'
                      }
                    }}
                  >
                    {/* Icon with consistent styling pattern from existing FeatureCard */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 80,
                        height: 80,
                        mb: 3,
                        borderRadius: '50%',
                        backgroundColor: `${benefit.icon.props.sx.color}15`,
                        border: `2px solid ${benefit.icon.props.sx.color}30`,
                        mx: 'auto'
                      }}
                    >
                      {benefit.icon}
                    </Box>
                    
                    <Typography
                      variant="h6"
                      component="h3"
                      align="center"
                      gutterBottom
                      sx={{ 
                        fontWeight: 600, 
                        color: 'primary.dark',
                        mb: 2
                      }}
                    >
                      {benefit.title}
                    </Typography>
                    
                    <Typography 
                      variant="body1" 
                      align="center" 
                      color="text.secondary"
                      sx={{ mb: 2, flexGrow: 1 }}
                    >
                      {benefit.description}
                    </Typography>
                    
                    {/* User outcome emphasis */}
                    <Box
                      sx={{
                        mt: 'auto',
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: 'rgba(102, 51, 153, 0.05)',
                        border: '1px solid rgba(102, 51, 153, 0.1)'
                      }}
                    >
                      <Typography
                        variant="body2"
                        align="center"
                        sx={{
                          fontStyle: 'italic',
                          color: 'primary.main',
                          fontWeight: 500
                        }}
                      >
                        {benefit.outcome}
                      </Typography>
                    </Box>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      </Container>
    </Box>
  );
};

export default HumanBenefits;