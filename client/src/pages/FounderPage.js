import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Paper,
  Chip,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Favorite as FavoriteIcon,
  Star as StarIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  EmojiEvents as AwardIcon,
  Group as TeamIcon,
  TrendingUp as GrowthIcon,
  Lightbulb as InnovationIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Import uploadable images with fallbacks
let founderPhoto, founderBackground, missionImage;

try {
  founderPhoto = require('../assets/founder-photo.jpg');
} catch (e) {
  founderPhoto = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><rect width='400' height='400' fill='%23f0f0f0'/><circle cx='200' cy='150' r='60' fill='%23663399'/><path d='M120,250 Q200,200 280,250 Q200,300 120,250' fill='%23663399'/><text x='200' y='350' text-anchor='middle' font-family='Arial' font-size='20' fill='%23663399'>Kenneth Esilo</text></svg>";
}

try {
  founderBackground = require('../assets/founder-background.jpg');
} catch (e) {
  founderBackground = 'linear-gradient(135deg, #663399 0%, #9C27B0 50%, #BA68C8 100%)';
}

try {
  missionImage = require('../assets/mission-image.jpg');
} catch (e) {
  missionImage = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80';
}

const FounderPage = () => {
  const navigate = useNavigate();

  const achievements = [
    {
      icon: <PsychologyIcon />,
      title: 'Licensed Addiction Counselor',
      description: 'Specialized expertise in addiction recovery and mental health support'
    },
    {
      icon: <InnovationIcon />,
      title: 'Creative Healing Advocate', 
      description: 'Integrating art therapy, music therapy, and creative modalities into treatment'
    },
    {
      icon: <TeamIcon />,
      title: 'Community Educator',
      description: 'Reducing stigma through education and community engagement'
    },
    {
      icon: <GrowthIcon />,
      title: 'Empowerment Focused',
      description: 'Client-centered approach that honors each person as the expert of their own life'
    }
  ];

  const timeline = [
    {
      year: '2020',
      title: 'The Vision',
      description: 'Recognized the gap in accessible mental health services in Kenya'
    },
    {
      year: '2021',
      title: 'Research & Development',
      description: 'Conducted extensive research on teletherapy needs and solutions'
    },
    {
      year: '2022',
      title: 'Platform Development',
      description: 'Started building the Smiling Steps teletherapy platform'
    },
    {
      year: '2023',
      title: 'Beta Launch',
      description: 'Launched beta version with select therapists and clients'
    },
    {
      year: '2024',
      title: 'Full Launch',
      description: 'Official launch of Smiling Steps platform'
    }
  ];

  const values = [
    'Confidentiality - Healing begins with trust and secure, private support',
    'Respect - Honoring each person\'s pace, story, and unique journey',
    'Empowerment - Supporting growth without control, recognizing client expertise',
    'Hope - Recovery is possible, and no one walks this path alone',
    'Creativity - Embracing diverse healing modalities and innovative approaches'
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `
            linear-gradient(
              135deg, 
              rgba(102, 51, 153, 0.9) 0%, 
              rgba(156, 39, 176, 0.9) 100%
            ),
            url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><defs><linearGradient id="mountainSky" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:%23E3F2FD;stop-opacity:1" /><stop offset="100%" style="stop-color:%23FFF8E1;stop-opacity:1" /></linearGradient></defs><rect width="1200" height="600" fill="url(%23mountainSky)"/><path d="M0,400 L200,300 L400,350 L600,250 L800,300 L1000,200 L1200,250 L1200,600 L0,600 Z" fill="%234CAF50" opacity="0.3"/><path d="M0,450 L300,380 L500,400 L700,320 L900,360 L1200,300 L1200,600 L0,600 Z" fill="%2366BB6A" opacity="0.4"/><circle cx="1000" cy="100" r="50" fill="%23FFF59D" opacity="0.8"/></svg>')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          py: { xs: 8, md: 12 },
          color: 'white'
        }}
      >       
 <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={4}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: { xs: 200, md: 280 },
                      height: { xs: 200, md: 280 },
                      mx: 'auto',
                      mb: 3,
                      border: '6px solid #663399',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                    }}
                    src={founderPhoto}
                  />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Kenneth Esilo
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
                    Licensed Addiction Counselor & Founder, Smiling Steps
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Chip 
                      icon={<PsychologyIcon />} 
                      label="Mental Health Advocate" 
                      sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                    <Chip 
                      icon={<InnovationIcon />} 
                      label="Tech Innovator" 
                      sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                  </Box>
                </Box>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={8}>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 3 }}>
                  Compassionate Counseling Rooted in Respect, Empowerment, and Hope
                </Typography>
                
                <Typography variant="h5" sx={{ mb: 4, opacity: 0.9, lineHeight: 1.6, fontStyle: 'italic' }}>
                  "My mission is to offer a safe, empowering path for individuals navigating addiction recovery 
                  and mental health challenges. I believe healing begins with dignity, creativity, and connection."
                </Typography>

                <Typography variant="body1" sx={{ mb: 4, fontSize: '1.1rem', lineHeight: 1.7, opacity: 0.9 }}>
                  As a licensed addiction counselor and founder of Smiling Steps, I blend clinical expertise 
                  with creative healing approaches. My work is rooted in confidentiality, empowerment, and hope. 
                  Having witnessed the transformative power of compassionate, client-centered care, I created 
                  Smiling Steps to ensure everyone has access to dignified, effective addiction recovery support.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/register')}
                    sx={{
                      backgroundColor: 'white',
                      color: '#1976D2',
                      '&:hover': { backgroundColor: '#f5f5f5' }
                    }}
                  >
                    Join Our Mission
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    href="mailto:founder@smilingsteps.com"
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }
                    }}
                    startIcon={<EmailIcon />}
                  >
                    Get In Touch
                  </Button>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Story Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Typography variant="h3" sx={{ textAlign: 'center', mb: 2, fontWeight: 'bold', color: '#1976D2' }}>
            My Story
          </Typography>
          
          <Typography variant="h6" sx={{ textAlign: 'center', mb: 6, color: 'text.secondary', maxWidth: '800px', mx: 'auto' }}>
            The journey that led to creating Smiling Steps
          </Typography>
        </motion.div>

        <Grid container spacing={6}>
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Paper elevation={0} sx={{ p: 4, backgroundColor: 'rgba(186, 104, 200, 0.1)', borderRadius: '20px' }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#663399' }}>
                  The Challenge
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.7, mb: 3 }}>
                  Throughout my career as an addiction counselor, I witnessed countless individuals struggling 
                  with addiction and mental health challenges who faced significant barriers to accessing 
                  compassionate, dignified care. The stigma, limited resources, and lack of client-centered 
                  approaches often left people feeling hopeless and alone.
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                  This experience fueled my passion for creating a different kind of healing space—one rooted 
                  in respect, empowerment, and hope, where recovery is seen as a journey of steps, not leaps.
                </Typography>
              </Paper>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Paper elevation={0} sx={{ p: 4, backgroundColor: 'rgba(149, 117, 205, 0.1)', borderRadius: '20px' }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#663399' }}>
                  The Solution
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.7, mb: 3 }}>
                  With my clinical expertise in addiction counseling and belief in creative healing modalities, 
                  I envisioned a practice that would honor each person's unique journey while providing 
                  evidence-informed, compassionate care.
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                  Smiling Steps was born from this vision—a space where healing happens through respect, 
                  creativity, and genuine human connection. Where confidentiality builds trust, empowerment 
                  guides growth, and hope illuminates the path forward.
                </Typography>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </Container>

      {/* Achievements Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'white' }}>
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Typography variant="h3" sx={{ textAlign: 'center', mb: 6, fontWeight: 'bold', color: '#1976D2' }}>
              Impact & Achievements
            </Typography>
          </motion.div>

          <Grid container spacing={4}>
            {achievements.map((achievement, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      textAlign: 'center',
                      p: 3,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                      }
                    }}
                  >
                    <Box sx={{ color: '#1976D2', mb: 2 }}>
                      {React.cloneElement(achievement.icon, { sx: { fontSize: '3rem' } })}
                    </Box>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#1976D2' }}>
                      {achievement.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                      {achievement.description}
                    </Typography>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Values & Vision Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#F8F9FA' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <Typography variant="h3" sx={{ mb: 4, fontWeight: 'bold', color: '#1976D2' }}>
                  Our Values
                </Typography>
                
                <List>
                  {values.map((value, index) => (
                    <ListItem key={index} sx={{ px: 0, py: 1 }}>
                      <ListItemIcon>
                        <FavoriteIcon sx={{ color: '#E91E63' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#2E7D32' }}>
                            {value.split(' - ')[0]}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            {value.split(' - ')[1]}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <Paper elevation={3} sx={{ p: 4, borderRadius: '20px', backgroundColor: 'white' }}>
                  <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#663399' }}>
                    Vision for the Future
                  </Typography>
                  
                  <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.7 }}>
                    "I envision a world where addiction recovery and mental health support are rooted in 
                    dignity and hope. Where every person struggling with addiction is met with compassion, 
                    not judgment, and where healing happens through gentle, intentional steps."
                  </Typography>

                  <Typography variant="body1" sx={{ mb: 4, lineHeight: 1.7, fontStyle: 'italic' }}>
                    Through Smiling Steps, we're creating more than a counseling practice—we're fostering 
                    a community where recovery is possible, creativity heals, and every step forward is 
                    celebrated with respect and empowerment.
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip icon={<AwardIcon />} label="Healthcare Innovation" color="primary" />
                    <Chip icon={<TeamIcon />} label="Community Impact" color="success" />
                    <Chip icon={<GrowthIcon />} label="Sustainable Growth" color="secondary" />
                  </Box>
                </Paper>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Contact Section */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
          color: 'white'
        }}
      >
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Typography variant="h3" sx={{ textAlign: 'center', mb: 2, fontWeight: 'bold' }}>
              Let's Connect
            </Typography>
            
            <Typography variant="h6" sx={{ textAlign: 'center', mb: 6, opacity: 0.9 }}>
              I'd love to hear from you about your mental health journey or ideas for improving our platform
            </Typography>

            <Grid container spacing={4} justifyContent="center">
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '15px',
                    transition: 'all 0.3s ease',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  <EmailIcon sx={{ fontSize: '2.5rem', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>Email</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    smilingstep254@gmail.com
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '15px',
                    transition: 'all 0.3s ease',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  <PhoneIcon sx={{ fontSize: '2.5rem', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>Phone</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    0118832083
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  component="a"
                  href="https://wa.me/254118832083"
                  target="_blank"
                  rel="noopener noreferrer"
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '15px',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  <Box component="span" sx={{ fontSize: '2.5rem', mb: 2, display: 'block' }}>💬</Box>
                  <Typography variant="h6" sx={{ mb: 1 }}>WhatsApp</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Chat with us
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '15px',
                    transition: 'all 0.3s ease',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
                  }}
                >
                  <LocationIcon sx={{ fontSize: '2.5rem', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>Location</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Nairobi, Kenya
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ textAlign: 'center', mt: 6 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/learn-more')}
                sx={{
                  backgroundColor: 'white',
                  color: '#1976D2',
                  px: 4,
                  py: 2,
                  borderRadius: '50px',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
              >
                Learn More About Smiling Steps
              </Button>
            </Box>
          </motion.div>
        </Container>
      </Box>
    </Box>
  );
};

export default FounderPage;