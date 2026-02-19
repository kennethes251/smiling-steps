import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Warning as ProblemIcon,
  CheckCircle as SolutionIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const ProblemSolutionNarrative = () => {
  // Problem statement - condensed to maximum 150 words as per requirements
  const problemText = `In many communities worldwide, accessing quality mental health support remains challenging. Many individuals face long wait times, limited specialized therapists, inconvenient office hours, and persistent stigma around seeking help. Traditional therapy costs can be prohibitive, while geographic barriers prevent many from reaching professional support. These obstacles often leave people struggling alone during their most vulnerable moments, when timely intervention could make a significant difference in their healing journey.`;

  // Solution statement - also condensed to balance the narrative
  const solutionText = `Smiling Steps bridges this gap by providing immediate access to licensed therapists through secure online sessions. Our platform offers flexible scheduling that fits your life, affordable therapy options with multiple payment methods (including mobile money), and a stigma-free environment where healing happens with dignity. We combine evidence-based counseling with creative healing modalities, ensuring personalized care that respects your cultural context and empowers your recovery journey.`;

  const problemPoints = [
    'Long wait times for appointments',
    'Limited access to specialized therapists', 
    'Geographic and transportation barriers',
    'Stigma around seeking mental health support',
    'High costs of traditional therapy'
  ];

  const solutionPoints = [
    'Immediate access to licensed therapists',
    'Flexible scheduling to fit your life',
    'Secure, confidential online sessions',
    'Multiple payment options including mobile money',
    'Culturally sensitive, stigma-free care'
  ];

  return (
    <Box
      component="section"
      sx={{
        py: 12,
        background: 'linear-gradient(135deg, #f5f7ff 0%, #f0f4ff 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{
              fontWeight: 700,
              mb: 4,
              color: 'primary.main',
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
                background: 'linear-gradient(45deg, #3f51b5, #2196f3)',
                borderRadius: 2,
              }
            }}
          >
            Mental Health Support for Your Community
          </Typography>

          {/* Two-column layout: Problem | Solution */}
          <Grid container spacing={6} alignItems="stretch" sx={{ mt: 4 }}>
            {/* Problem Column */}
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
                style={{ height: '100%' }}
              >
                <Paper
                  elevation={3}
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    background: 'rgba(255, 245, 245, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(244, 67, 54, 0.2)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <ProblemIcon sx={{ color: '#d32f2f', fontSize: 32, mr: 2 }} />
                    <Typography 
                      variant="h5" 
                      component="h3" 
                      sx={{ 
                        fontWeight: 600, 
                        color: '#d32f2f' 
                      }}
                    >
                      The Challenge
                    </Typography>
                  </Box>
                  
                  <Typography 
                    variant="body1" 
                    paragraph 
                    sx={{ 
                      lineHeight: 1.7,
                      mb: 3,
                      flexGrow: 1
                    }}
                  >
                    {problemText}
                  </Typography>
                  
                  <List dense>
                    {problemPoints.map((item, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: '#d32f2f',
                              mr: 1
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={item}
                          sx={{
                            '& .MuiListItemText-primary': {
                              fontSize: '0.9rem',
                              color: 'text.secondary'
                            }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </motion.div>
            </Grid>

            {/* Solution Column */}
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                viewport={{ once: true }}
                style={{ height: '100%' }}
              >
                <Paper
                  elevation={6}
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    background: 'rgba(245, 255, 245, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(76, 175, 80, 0.2)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: 'linear-gradient(45deg, #4caf50, #81c784)',
                      borderRadius: '12px 12px 0 0'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <SolutionIcon sx={{ color: '#4caf50', fontSize: 32, mr: 2 }} />
                    <Typography 
                      variant="h5" 
                      component="h3" 
                      sx={{ 
                        fontWeight: 600, 
                        color: '#4caf50' 
                      }}
                    >
                      Our Solution
                    </Typography>
                  </Box>
                  
                  <Typography 
                    variant="body1" 
                    paragraph 
                    sx={{ 
                      lineHeight: 1.7,
                      mb: 3,
                      flexGrow: 1
                    }}
                  >
                    {solutionText}
                  </Typography>
                  
                  <List dense>
                    {solutionPoints.map((item, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon>
                          <CheckCircleIcon 
                            sx={{ 
                              color: '#4caf50', 
                              fontSize: '1.2rem' 
                            }} 
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={item}
                          sx={{
                            '& .MuiListItemText-primary': {
                              fontSize: '0.9rem',
                              color: 'text.secondary',
                              fontWeight: 500
                            }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </motion.div>
            </Grid>
          </Grid>

          {/* Community-focused context highlight */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            viewport={{ once: true }}
          >
            <Box
              sx={{
                mt: 6,
                p: 4,
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(102, 51, 153, 0.1), rgba(156, 39, 176, 0.1))',
                borderRadius: 3,
                border: '1px solid rgba(102, 51, 153, 0.2)'
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: 'primary.main',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  maxWidth: '800px',
                  mx: 'auto',
                  lineHeight: 1.6
                }}
              >
                "Designed to understand local challenges worldwide, our platform provides culturally 
                sensitive mental health support that respects your journey while empowering your healing, 
                no matter where you are."
              </Typography>
            </Box>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ProblemSolutionNarrative;