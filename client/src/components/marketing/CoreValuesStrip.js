import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Lock as LockIcon,
  Favorite as RespectIcon,
  TrendingUp as EmpowermentIcon,
  Star as HopeIcon
} from '@mui/icons-material';
import { colorTokens, typographyClasses, componentStyles, spacing } from '../../utils/designSystem';
import optimizedAnimations from '../../utils/optimizedAnimations';

const coreValues = [
  {
    title: 'Confidentiality',
    descriptor: 'Your privacy is sacred',
    icon: <LockIcon sx={{ fontSize: 40, color: colorTokens.healing.trust }} />,
    color: colorTokens.healing.trust
  },
  {
    title: 'Respect',
    descriptor: 'Honoring your journey',
    icon: <RespectIcon sx={{ fontSize: 40, color: colorTokens.healing.respect }} />,
    color: colorTokens.healing.respect
  },
  {
    title: 'Empowerment',
    descriptor: 'Building your strength',
    icon: <EmpowermentIcon sx={{ fontSize: 40, color: colorTokens.healing.empowerment }} />,
    color: colorTokens.healing.empowerment
  },
  {
    title: 'Hope',
    descriptor: 'Believing in your future',
    icon: <HopeIcon sx={{ fontSize: 40, color: colorTokens.healing.hope }} />,
    color: colorTokens.healing.hope
  }
];

const CoreValuesStrip = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      component="section"
      sx={{
        ...componentStyles.section.withBackground,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
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
              ...typographyClasses.sectionTitle,
              mb: 6,
              position: 'relative',
              display: 'inline-block',
              width: '100%',
              textAlign: 'center',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 80,
                height: 4,
                background: `linear-gradient(45deg, ${colorTokens.primary.main}, ${colorTokens.primary.light})`,
                borderRadius: 2,
              }
            }}
          >
            Our Core Values
          </Typography>

          {/* Responsive layout: horizontal strip on desktop, 2x2 grid on mobile */}
          <Grid 
            container 
            spacing={4} 
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {coreValues.map((value, index) => (
              <Grid 
                item 
                xs={6} 
                sm={6} 
                md={3} 
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <motion.div
                  {...optimizedAnimations.fadeInUp}
                  transition={{ 
                    ...optimizedAnimations.fadeInUp.transition,
                    delay: optimizedAnimations.performance.isLowPerformance ? index * 0.05 : index * 0.1 
                  }}
                  viewport={optimizedAnimations.viewport}
                  style={{ width: '100%', maxWidth: '250px' }}
                >
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: 3,
                      borderRadius: 3,
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(63, 81, 181, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': optimizedAnimations.performance.prefersReducedMotion ? {} : {
                        transform: `translateY(${optimizedAnimations.performance.isLowPerformance ? '-2px' : '-5px'})`,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                        borderColor: value.color,
                      },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 80,
                        height: 80,
                        mb: 2,
                        borderRadius: '50%',
                        backgroundColor: `${value.color}15`,
                        border: `2px solid ${value.color}30`
                      }}
                    >
                      {value.icon}
                    </Box>
                    
                    <Typography 
                      variant="h6" 
                      component="h3"
                      gutterBottom 
                      sx={{ 
                        fontWeight: 600,
                        color: value.color,
                        mb: 1
                      }}
                    >
                      {value.title}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        textAlign: 'center',
                        lineHeight: 1.4
                      }}
                    >
                      {value.descriptor}
                    </Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      </Container>
    </Box>
  );
};

export default CoreValuesStrip;