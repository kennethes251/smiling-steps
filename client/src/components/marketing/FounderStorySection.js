import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Avatar,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  School as SchoolIcon,
  Psychology as PsychologyIcon,
  Favorite as FavoriteIcon,
  LocationOn as LocationOnIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const FounderStorySection = () => {
  const navigate = useNavigate();

  // Import founder avatar with fallback
  let founderAvatar;
  try {
    founderAvatar = require('../../assets/founder-avatar.jpg');
  } catch (e) {
    founderAvatar = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='90' fill='%23f0f0f0' stroke='%23663399' stroke-width='4'/><circle cx='100' cy='70' r='25' fill='%23663399'/><path d='M60,130 Q100,110 140,130 Q100,150 60,130' fill='%23663399'/><text x='100' y='180' text-anchor='middle' font-family='Arial' font-size='12' fill='%23666'>Kenneth Esilo</text></svg>";
  }

  const credentials = [
    'Licensed Addiction Counselor (LAC)',
    'Certified Creative Arts Therapist',
    'Mental Health First Aid Instructor',
    'Community Mental Health Specialist',
    'Trauma-Informed Care Practitioner'
  ];

  const communityContext = [
    'Deep understanding of diverse communities',
    'Experience with multicultural mental health care',
    'Multilingual therapeutic approaches',
    'Active in global mental health advocacy',
    'Culturally sensitive therapeutic methods'
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'white' }}>
      <Container maxWidth="lg">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Typography
            variant="h2"
            sx={{
              textAlign: 'center',
              mb: 2,
              fontWeight: 'bold',
              color: '#663399'
            }}
          >
            Meet Our Founder
          </Typography>
          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              mb: 8,
              color: 'text.secondary',
              maxWidth: '700px',
              mx: 'auto',
              fontStyle: 'italic'
            }}
          >
            "Healing begins when we see each person's story with compassion and respect."
          </Typography>
        </motion.div>

        {/* Main Founder Profile */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Paper elevation={3} sx={{ p: 6, backgroundColor: 'white', borderRadius: '20px', mb: 6 }}>
            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: 250,
                      height: 250,
                      mx: 'auto',
                      mb: 3,
                      border: '4px solid #663399',
                      boxShadow: '0 8px 30px rgba(102, 51, 153, 0.3)'
                    }}
                    src={founderAvatar}
                  />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#663399', mb: 1 }}>
                    Kenneth Esilo
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
                    Founder & Licensed Addiction Counselor
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<LocationOnIcon />}
                      label="Global Practice"
                      sx={{ backgroundColor: '#663399', color: 'white' }}
                    />
                    <Chip
                      icon={<PsychologyIcon />}
                      label="10+ Years Experience"
                      sx={{ backgroundColor: '#2E7D32', color: 'white' }}
                    />
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={8}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#663399' }}>
                  A Journey Rooted in Compassion
                </Typography>
                
                <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.7, fontSize: '1.1rem' }}>
                  With a background rooted in understanding diverse communities and their unique mental health 
                  challenges, Kenneth has witnessed firsthand how traditional approaches often fall short when 
                  they don't honor the whole person and cultural context.
                </Typography>
                
                <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.7, fontSize: '1.1rem' }}>
                  His deep appreciation for cultural values and community support drives his commitment to 
                  creating spaces where individuals can seek help without shame, where families can learn 
                  without judgment, and where recovery is seen as a journey of strength, not weakness.
                </Typography>

                <Typography variant="body1" sx={{ mb: 4, lineHeight: 1.7, fontSize: '1.1rem' }}>
                  "Trained both locally and internationally, I bring global best practices to diverse cultural 
                  contexts. I believe that every person who walks through our doors—virtual or physical—deserves 
                  to be met with respect, empowerment, and hope. That's not just our tagline; it's our promise."
                </Typography>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/founder')}
                  sx={{
                    borderColor: '#663399',
                    color: '#663399',
                    px: 4,
                    py: 1.5,
                    borderRadius: '50px',
                    '&:hover': {
                      borderColor: '#512DA8',
                      backgroundColor: 'rgba(102, 51, 153, 0.04)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Read Kenneth's Full Story
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </motion.div>

        {/* Professional Credentials & Community Context */}
        <Grid container spacing={4}>
          {/* Professional Credentials */}
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  height: '100%',
                  backgroundColor: '#F3E5F5',
                  borderRadius: '15px',
                  border: '1px solid rgba(102, 51, 153, 0.2)'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <SchoolIcon sx={{ fontSize: '2rem', color: '#663399', mr: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#663399' }}>
                    Professional Credentials
                  </Typography>
                </Box>
                
                <List dense>
                  {credentials.map((credential, index) => (
                    <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <CheckCircleIcon sx={{ color: '#663399', fontSize: '1.2rem' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={credential}
                        sx={{ 
                          '& .MuiListItemText-primary': { 
                            fontSize: '1rem',
                            fontWeight: 500
                          } 
                        }}
                      />
                    </ListItem>
                  ))}
                </List>

                <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary', fontStyle: 'italic' }}>
                  All credentials verified and maintained through continuing education and professional development.
                </Typography>
              </Paper>
            </motion.div>
          </Grid>

          {/* Community-Specific Context */}
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  height: '100%',
                  backgroundColor: '#E8F5E8',
                  borderRadius: '15px',
                  border: '1px solid rgba(46, 125, 50, 0.2)'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <FavoriteIcon sx={{ fontSize: '2rem', color: '#2E7D32', mr: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2E7D32' }}>
                    Cultural Understanding
                  </Typography>
                </Box>
                
                <List dense>
                  {communityContext.map((context, index) => (
                    <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <CheckCircleIcon sx={{ color: '#2E7D32', fontSize: '1.2rem' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={context}
                        sx={{ 
                          '& .MuiListItemText-primary': { 
                            fontSize: '1rem',
                            fontWeight: 500
                          } 
                        }}
                      />
                    </ListItem>
                  ))}
                </List>

                <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary', fontStyle: 'italic' }}>
                  Kenneth's experience with diverse communities informs every aspect of Smiling Steps' approach to mental health care.
                </Typography>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>

        {/* Philosophy & Approach */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Paper
            elevation={3}
            sx={{
              mt: 6,
              p: 6,
              backgroundColor: 'white',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05), rgba(102, 51, 153, 0.05))'
            }}
          >
            <Typography variant="h4" sx={{ textAlign: 'center', mb: 4, fontWeight: 'bold', color: '#663399' }}>
              Kenneth's Philosophy
            </Typography>
            
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ fontSize: '3rem', mb: 2 }}>🤝</Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#663399' }}>
                    Dignity First
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    Every person deserves to be treated with respect and dignity, regardless of their struggles or background.
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ fontSize: '3rem', mb: 2 }}>🎨</Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#663399' }}>
                    Creative Healing
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    Healing happens through multiple pathways—words, art, music, movement, and human connection.
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ fontSize: '3rem', mb: 2 }}>🌍</Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#663399' }}>
                    Cultural Sensitivity
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    Mental health care must honor cultural values and address the unique challenges of each community.
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ textAlign: 'center', mt: 4, p: 4, backgroundColor: 'rgba(102, 51, 153, 0.1)', borderRadius: '15px' }}>
              <Typography variant="h5" sx={{ fontStyle: 'italic', color: '#663399', fontWeight: 300 }}>
                "Mental health is not a luxury—it's a human right. And across diverse communities worldwide, 
                we're proving that compassionate, culturally-informed care can break down barriers and transform lives."
              </Typography>
              <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
                — Kenneth Esilo, Founder
              </Typography>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default FounderStorySection;