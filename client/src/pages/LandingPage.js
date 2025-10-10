import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  useTheme,
  useMediaQuery,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import Logo from '../components/Logo';
import { API_ENDPOINTS } from '../config/api';

// Import local images with fallbacks
let heroImage1, heroImage2, heroImage3, therapistImage1, therapistImage2, therapistImage3, howItWorksImg;

try {
  heroImage1 = require('../assets/hero-image-1.jpg');
} catch (e) {
  heroImage1 = 'https://images.unsplash.com/photo-1464822759844-d150baec0494?auto=format&fit=crop&w=1964&q=80';
}

try {
  heroImage2 = require('../assets/hero-image-2.jpg');
} catch (e) {
  heroImage2 = 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1964&q=80';
}

try {
  heroImage3 = require('../assets/hero-image-3.jpg');
} catch (e) {
  heroImage3 = 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=1964&q=80';
}

try {
  therapistImage1 = require('../assets/therapist-1.jpg');
} catch (e) {
  therapistImage1 = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80';
}

try {
  therapistImage2 = require('../assets/therapist-2.jpg');
} catch (e) {
  therapistImage2 = 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=800&q=80';
}

try {
  therapistImage3 = require('../assets/therapist-3.jpg');
} catch (e) {
  therapistImage3 = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800&q=80';
}

try {
  howItWorksImg = require('../assets/how-it-works.jpg');
} catch (e) {
  howItWorksImg = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1740&q=80';
}

let heroImage4, heroImage5, heroImage6;

try {
  heroImage4 = require('../assets/hero-image-4.jpg');
} catch (e) {
  heroImage4 = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=1964&q=80';
}

try {
  heroImage5 = require('../assets/hero-image-5.jpg');
} catch (e) {
  heroImage5 = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1964&q=80';
}

try {
  heroImage6 = require('../assets/hero-image-6.jpg');
} catch (e) {
  heroImage6 = 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=1964&q=80';
}

// Hero Slideshow Images - Now using your uploadable images
const heroImages = [
  {
    url: heroImage1,
    alt: 'Person on healing journey - representing hope and progress'
  },
  {
    url: heroImage2,
    alt: 'Client in therapy session - professional counseling support'
  },
  {
    url: heroImage3,
    alt: 'Supportive therapy session - community healing'
  },
  {
    url: heroImage4,
    alt: 'Peaceful counseling session - professional therapeutic support'
  },
  {
    url: heroImage5,
    alt: 'Serene nature path - journey of recovery and growth'
  },
  {
    url: heroImage6,
    alt: 'Supportive hands - empowerment and healing connection'
  }
];

const therapist1 = therapistImage1;
const therapist2 = therapistImage2;
const therapist3 = therapistImage3;
const howItWorksImage = howItWorksImg;

const benefits = [
  {
    icon: <ScheduleIcon color="primary" sx={{ fontSize: 40 }} />,
    title: 'Flexible Scheduling',
    description: 'Book sessions that fit your busy lifestyle, available 24/7 from anywhere.'
  },
  {
    icon: <LockIcon color="primary" sx={{ fontSize: 40 }} />,
    title: 'Complete Privacy',
    description: 'Your sessions are confidential and HIPAA-compliant.'
  },
  {
    icon: <AccessibilityNewIcon color="primary" sx={{ fontSize: 40 }} />,
    title: 'Personalized Care',
    description: 'Therapists who specialize in your specific needs and goals.'
  },
  {
    icon: <PsychologyIcon color="primary" sx={{ fontSize: 40 }} />,
    title: 'Expert Therapists',
    description: 'Licensed professionals with years of experience in mental health care.'
  }
];

const FeatureCard = ({ icon, title, description }) => (
  <Box
    sx={{
      p: 3,
      borderRadius: 2,
      bgcolor: 'background.paper',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      height: '100%',
      transition: 'transform 0.3s, box-shadow 0.3s',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
      },
    }}
  >
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        height: 60,
        mb: 2,
        fontSize: '2.5rem'
      }}
    >
      {icon}
    </Box>
    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
    <Typography variant="body1" color="text.secondary">
      {description}
    </Typography>
  </Box>
);

const TherapistCard = ({ name, specialization, image, isCenter = false }) => (
  <Box sx={{
    textAlign: 'center',
    px: 2,
    transform: isCenter ? 'translateY(0)' : 'translateY(-20px)',
    transition: 'transform 0.3s ease'
  }}>
    {image ? (
      <Box
        component="img"
        src={image.startsWith('http') ? image : `${API_ENDPOINTS.BASE_URL}${image}`}
        alt={name}
        sx={{
          width: isCenter ? { xs: 180, sm: 200, md: 240 } : { xs: 140, sm: 160, md: 180 },
          height: isCenter ? { xs: 180, sm: 200, md: 240 } : { xs: 140, sm: 160, md: 180 },
          borderRadius: '50%',
          objectFit: 'cover',
          mb: 3,
          border: '4px solid',
          borderColor: 'primary.main',
          boxShadow: isCenter
            ? '0 12px 40px rgba(102, 51, 153, 0.3)'
            : '0 8px 24px rgba(102, 51, 153, 0.2)',
          mx: 'auto',
          display: 'block',
          transition: 'all 0.3s ease'
        }}
      />
    ) : (
      <Box
        sx={{
          width: isCenter ? { xs: 180, sm: 200, md: 240 } : { xs: 140, sm: 160, md: 180 },
          height: isCenter ? { xs: 180, sm: 200, md: 240 } : { xs: 140, sm: 160, md: 180 },
          borderRadius: '50%',
          mb: 3,
          border: '4px solid',
          borderColor: 'primary.main',
          boxShadow: isCenter
            ? '0 12px 40px rgba(102, 51, 153, 0.3)'
            : '0 8px 24px rgba(102, 51, 153, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'primary.main',
          color: 'white',
          mx: 'auto',
          transition: 'all 0.3s ease'
        }}
      >
        <PersonIcon sx={{
          fontSize: isCenter
            ? { xs: 70, sm: 80, md: 100 }
            : { xs: 50, sm: 60, md: 70 }
        }} />
      </Box>
    )}
    <Typography
      variant={isCenter ? "h4" : "h5"}
      gutterBottom
      sx={{
        fontWeight: 600,
        mb: 1,
        color: 'text.primary',
        fontSize: isCenter
          ? { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
          : { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' }
      }}
    >
      {name}
    </Typography>
    <Typography
      variant="body1"
      color="primary.main"
      sx={{
        fontWeight: 500,
        fontSize: isCenter
          ? { xs: '1rem', sm: '1.1rem', md: '1.2rem' }
          : { xs: '0.9rem', sm: '1rem', md: '1.1rem' }
      }}
    >
      {specialization}
    </Typography>
  </Box>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [inView, setInView] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [featuredTherapists, setFeaturedTherapists] = useState([]);
  const [apiTestResult, setApiTestResult] = useState('');

  useEffect(() => {
    setInView(true);
    fetchFeaturedTherapists();
  }, []);

  const fetchFeaturedTherapists = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.PSYCHOLOGISTS);
      // Get first 3 therapists for featured section
      const therapists = response.data.slice(0, 3).map(therapist => ({
        name: therapist.name.startsWith('Dr.') ? therapist.name : `Dr. ${therapist.name}`,
        specialization: therapist.specializations?.[0] || 'Licensed Psychologist',
        image: therapist.profilePicture
      }));
      setFeaturedTherapists(therapists);
    } catch (error) {
      console.error('Error fetching therapists:', error);
      // Fallback to default therapists if API fails
      setFeaturedTherapists([
        { name: 'Dr. Sarah Johnson', specialization: 'Clinical Psychologist', image: null },
        { name: 'Dr. Michael Chen', specialization: 'Marriage & Family Therapist', image: null },
        { name: 'Dr. Emily Rodriguez', specialization: 'Cognitive Behavioral Therapist', image: null }
      ]);
    }
  };

  const testApiConnection = async () => {
    setApiTestResult('Testing...');
    try {
      // Test backend health
      const healthResponse = await axios.get(`${API_ENDPOINTS.BASE_URL}/api/test`);
      setApiTestResult(`✅ Backend: ${healthResponse.data.message} | API URL: ${API_ENDPOINTS.BASE_URL}`);
    } catch (error) {
      setApiTestResult(`❌ Backend Error: ${error.message} | Trying: ${API_ENDPOINTS.BASE_URL}/api/test`);
    }
  };

  // Slideshow effect - change image every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prevIndex) =>
          (prevIndex + 1) % heroImages.length
        );
        setIsTransitioning(false);
      }, 800); // 800ms delay for distinct fade out/fade in
    }, 8000); // 8 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ overflowX: 'hidden' }}>
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          pt: { xs: 8, md: 0 },
          overflow: 'hidden'
        }}
      >
        {/* Background Images with Fade Transition */}
        {heroImages.map((image, index) => (
          <Box
            key={index}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url(${image.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: currentImageIndex === index ? 1 : 0,
              transition: 'opacity 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              transform: isTransitioning && currentImageIndex === index ? 'scale(1.02)' : 'scale(1)',
              filter: isTransitioning ? 'brightness(0.95)' : 'brightness(1)',
              zIndex: 1
            }}
          />
        ))}

        {/* Gradient Overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `
              linear-gradient(135deg, 
                rgba(227, 242, 253, 0.9) 0%, 
                rgba(232, 245, 232, 0.9) 50%, 
                rgba(255, 243, 224, 0.9) 100%
              )
            `,
            zIndex: 2
          }}
        />

        {/* Fallback Gradient Background */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #E3F2FD 0%, #E8F5E8 50%, #FFF3E0 100%)',
            zIndex: 0
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 3 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Typography
                  variant="h1"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontWeight: 800,
                    lineHeight: 1.1,
                    mb: 1,
                    fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                    background: 'linear-gradient(45deg, #663399, #9C27B0)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Smiling Steps
                </Typography>
                <Typography
                  variant="h4"
                  component="h2"
                  gutterBottom
                  sx={{
                    fontWeight: 500,
                    lineHeight: 1.3,
                    mb: 4,
                    color: 'primary.main',
                    fontStyle: 'italic',
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                    <Logo size={40} />
                    Compassionate Counseling Rooted in Respect, Empowerment, and Hope
                  </Box>
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    component={RouterLink}
                    to="/register"
                    variant="contained"
                    size="large"
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      boxShadow: '0 4px 14px rgba(63, 81, 181, 0.3)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(63, 81, 181, 0.4)',
                      },
                      transition: 'all 0.3s',
                    }}
                  >
                    Get Started
                  </Button>
                  <Button
                    onClick={() => navigate('/learn-more')}
                    variant="outlined"
                    size="large"
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      borderWidth: 2,
                      '&:hover': {
                        borderWidth: 2,
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s',
                    }}
                  >
                    Learn More
                  </Button>
                  
                  {/* Temporary API Test Button */}
                  <Button
                    onClick={testApiConnection}
                    variant="text"
                    size="small"
                    sx={{ mt: 2, display: 'block', fontSize: '0.9rem' }}
                  >
                    🧪 Test API Connection
                  </Button>
                  
                  {apiTestResult && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1, fontSize: '0.8rem' }}>
                      {apiTestResult}
                    </Box>
                  )}
                </Box>
              </motion.div>
            </Grid>
            {!isMobile && (
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <Box sx={{ position: 'relative', width: '100%' }}>
                    {heroImages.map((image, index) => (
                      <Box
                        key={index}
                        component="img"
                        src={image.url}
                        alt={image.alt}
                        sx={{
                          position: index === 0 ? 'relative' : 'absolute',
                          top: index === 0 ? 0 : 0,
                          left: index === 0 ? 0 : 0,
                          width: '100%',
                          borderRadius: 4,
                          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                          transform: 'rotate(-2deg)',
                          opacity: currentImageIndex === index ? 1 : 0,
                          transition: 'opacity 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.5s ease-in-out',
                          '&:hover': {
                            transform: 'rotate(0deg)',
                          },
                          filter: isTransitioning && currentImageIndex === index ? 'brightness(0.95)' : 'brightness(1)',
                        }}
                      />
                    ))}
                  </Box>
                </motion.div>
              </Grid>
            )}
          </Grid>
        </Container>

        {/* Slideshow Indicators */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 1,
            zIndex: 2
          }}
        >
          {heroImages.map((_, index) => (
            <Box
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: currentImageIndex === index ? 'white' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: '2px solid rgba(255,255,255,0.8)',
                '&:hover': {
                  backgroundColor: 'white',
                  transform: 'scale(1.2)'
                }
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Problem Statement Section */}
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
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
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
              The Challenge of Modern Mental Health
            </Typography>

            <Grid container spacing={6} alignItems="center" sx={{ mt: 4 }}>
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <Typography variant="h6" color="text.secondary" paragraph>
                    In today's fast-paced world, finding quality mental health support can be overwhelming. Many people struggle with:
                  </Typography>
                  <List>
                    {[
                      'Long wait times for appointments',
                      'Limited access to specialized therapists',
                      'Inconvenient office hours',
                      'Stigma around seeking help',
                      'High costs of traditional therapy'
                    ].map((item, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              mr: 1
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText primary={item} />
                      </ListItem>
                    ))}
                  </List>
                </motion.div>
              </Grid>
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.6 }}
                >
                  <Paper
                    elevation={6}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(63, 81, 181, 0.1)'
                    }}
                  >
                    <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                      Our Solution
                    </Typography>
                    <Typography variant="body1" paragraph>
                      Smiling Steps bridges the gap between you and professional mental health support. Our platform offers:
                    </Typography>
                    <List dense>
                      {[
                        'Immediate access to licensed therapists',
                        'Flexible scheduling to fit your life',
                        'Secure, confidential video sessions',
                        'Personalized care plans',
                        'Affordable therapy options'
                      ].map((item, index) => (
                        <ListItem key={index} disableGutters>
                          <ListItemIcon>
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                mr: 1
                              }}
                            />
                          </ListItemIcon>
                          <ListItemText primary={item} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </motion.div>
              </Grid>
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* Therapy Benefits Section */}
      <Box component="section" sx={{ py: 12, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
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
              Benefits of Online Therapy
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
              Experience the difference with our comprehensive approach to mental wellness
            </Typography>

            <Grid container spacing={4}>
              {benefits.map((benefit, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    whileHover={{ y: -5 }}
                  >
                    <Paper
                      elevation={2}
                      sx={{
                        p: 4,
                        height: '100%',
                        borderRadius: 3,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: theme.shadows[8],
                        }
                      }}
                    >
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        {benefit.icon}
                      </Box>
                      <Typography
                        variant="h6"
                        component="h3"
                        align="center"
                        gutterBottom
                        sx={{ fontWeight: 600, color: 'primary.dark' }}
                      >
                        {benefit.title}
                      </Typography>
                      <Typography variant="body1" align="center" color="text.secondary">
                        {benefit.description}
                      </Typography>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 8, textAlign: 'center' }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  size="large"
                  sx={{
                    px: 6,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: '0 4px 14px rgba(63, 81, 181, 0.3)',
                  }}
                >
                  Start Your Journey Today
                </Button>
              </motion.div>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 10, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography
              variant="h3"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 700,
                mb: 2,
                color: 'text.primary',
              }}
            >
              Why Choose Our Platform
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              maxWidth="700px"
              mx="auto"
            >
              We provide professional, convenient, and confidential online therapy services
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <FeatureCard
                icon={<PsychologyIcon color="primary" sx={{ fontSize: 40 }} />}
                title="Licensed Therapists"
                description="Connect with experienced, licensed professionals who specialize in various areas of mental health."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FeatureCard
                icon={<ScheduleIcon color="primary" sx={{ fontSize: 40 }} />}
                title="Flexible Scheduling"
                description="Book sessions at your convenience with our easy-to-use scheduling system."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FeatureCard
                icon={<LockIcon color="primary" sx={{ fontSize: 40 }} />}
                title="Secure & Private"
                description="Your privacy is our priority with HIPAA-compliant video sessions and secure messaging."
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* How It Works */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography
              variant="h3"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 700,
                mb: 2,
                color: 'text.primary',
              }}
            >
              How It Works
            </Typography>
          </Box>

          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{
                p: 4,
                borderRadius: 2,
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                height: '100%',
              }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                  Simple 3-Step Process
                </Typography>
                <Box sx={{ mt: 4 }}>
                  <Box sx={{ display: 'flex', mb: 3 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      flexShrink: 0,
                      fontWeight: 700,
                      fontSize: '1.2rem',
                    }}>
                      1
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Create Your Account</Typography>
                      <Typography>Sign up and complete a brief assessment to match with the right therapist.</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', mb: 3 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      flexShrink: 0,
                      fontWeight: 700,
                      fontSize: '1.2rem',
                    }}>
                      2
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Book Your Session</Typography>
                      <Typography>Choose a convenient time that works with your schedule.</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex' }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      flexShrink: 0,
                      fontWeight: 700,
                      fontSize: '1.2rem',
                    }}>
                      3
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Start Your Session</Typography>
                      <Typography>Connect with your therapist via secure video call from anywhere.</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <Box
                  component="img"
                  src={howItWorksImage}
                  alt="How it works"
                  sx={{
                    width: '100%',
                    borderRadius: 4,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                  }}
                />
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Therapists Section */}
      <Box sx={{ py: 10, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography
              variant="h3"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 700,
                mb: 2,
                color: 'text.primary',
              }}
            >
              Meet Our Therapists
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              maxWidth="700px"
              mx="auto"
            >
              Our team of licensed professionals is here to support you on your mental health journey
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 4, sm: 6, md: 8 }} justifyContent="center" alignItems="flex-end">
            {featuredTherapists.map((therapist, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  minHeight: { xs: 320, sm: 360, md: 400 },
                  alignItems: 'flex-end',
                  pb: index === 1 ? 0 : 2 // Add padding bottom to side cards
                }}>
                  <TherapistCard
                    name={therapist.name}
                    specialization={therapist.specialization}
                    image={therapist.image}
                    isCenter={index === 1} // Middle card is the center/featured one
                  />
                </Box>
              </Grid>
            ))}
          </Grid>

          <Box textAlign="center" mt={6}>
            <Button
              component={RouterLink}
              to="/therapists"
              variant="outlined"
              size="large"
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                },
              }}
            >
              View All Therapists
            </Button>
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: 10, bgcolor: 'primary.main', color: 'white' }}>
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography
              variant="h3"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 700,
                mb: 3,
                color: 'white',
              }}
            >
              Ready to Get Started?
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mb: 4,
                maxWidth: '700px',
                mx: 'auto',
                opacity: 0.9,
              }}
            >
              Take the first step towards better mental health. Sign up today and get matched with a licensed therapist who understands you.
            </Typography>
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              size="large"
              sx={{
                px: 6,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.9)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                },
                transition: 'all 0.3s',
              }}
            >
              Get Started Now
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: 'background.paper', py: 6, borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                Teletherapy Pro
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Professional online therapy services to help you live a happier, healthier life.
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Company
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                <li><Typography component={RouterLink} to="/about" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>About Us</Typography></li>
                <li><Typography component={RouterLink} to="/therapists" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' }, mt: 1, display: 'block' }}>Our Therapists</Typography></li>
                <li><Typography component={RouterLink} to="/blog" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' }, mt: 1, display: 'block' }}>Blog</Typography></li>
                <li><Typography component={RouterLink} to="/careers" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' }, mt: 1, display: 'block' }}>Careers</Typography></li>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Resources
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                <li><Typography component={RouterLink} to="/faq" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>FAQ</Typography></li>
                <li><Typography component={RouterLink} to="/privacy" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' }, mt: 1, display: 'block' }}>Privacy Policy</Typography></li>
                <li><Typography component={RouterLink} to="/terms" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' }, mt: 1, display: 'block' }}>Terms of Service</Typography></li>
                <li><Typography component={RouterLink} to="/contact" sx={{ textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main' }, mt: 1, display: 'block' }}>Contact Us</Typography></li>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Newsletter
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Subscribe to our newsletter for mental health tips and updates.
              </Typography>
              <Box component="form" sx={{ display: 'flex', gap: 1 }}>
                <input
                  type="email"
                  placeholder="Your email address"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                  }}
                >
                  Subscribe
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              &copy; {new Date().getFullYear()} Teletherapy Pro. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
