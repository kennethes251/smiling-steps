import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Rating,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Chip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  VideoCall as VideoCallIcon,
  Chat as ChatIcon,
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
  ArrowForward as ArrowForwardIcon,
  Healing as HealingIcon,
  Shield as ShieldIcon,
  Payment as PaymentIcon,
  Dashboard as DashboardIcon,
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Lightbulb as LightbulbIcon,
  EmojiPeople as EmojiPeopleIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../components/Logo';

const MarketingPage = () => {
  // Import uploadable founder images with fallbacks
  let founderAvatar;

  try {
    founderAvatar = require('../assets/founder-avatar.jpg');
  } catch (e) {
    founderAvatar = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><circle cx='100' cy='100' r='90' fill='%23f0f0f0' stroke='%23663399' stroke-width='4'/><circle cx='100' cy='70' r='25' fill='%23663399'/><path d='M60,130 Q100,110 140,130 Q100,150 60,130' fill='%23663399'/><text x='100' y='180' text-anchor='middle' font-family='Arial' font-size='12' fill='%23666'>Kenneth Esilo</text></svg>";
  }
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State for interactive elements
  const [expandedService, setExpandedService] = useState(null);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [showAppPreview, setShowAppPreview] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Data for sections
  const services = [
    {
      id: 'individual-counseling',
      title: 'Individual Addiction Counseling',
      icon: <PsychologyIcon />,
      description: 'One-on-one sessions with licensed addiction counselors specializing in recovery support',
      features: ['Personalized Treatment Plans', 'Evidence-Based Approaches', 'Confidential Sessions', 'Flexible Scheduling'],
      color: '#663399',
      image: '🧠'
    },
    {
      id: 'group-therapy',
      title: 'Group Therapy & Support',
      icon: <GroupIcon />,
      description: 'Connect with others on similar journeys in facilitated group sessions',
      features: ['Peer Support', 'Shared Experiences', 'Professional Facilitation', 'Safe Environment'],
      color: '#2E7D32',
      image: '🤝'
    },
    {
      id: 'creative-healing',
      title: 'Creative Healing Modalities',
      icon: <LightbulbIcon />,
      description: 'Art therapy, music therapy, and other creative approaches to healing',
      features: ['Art Therapy', 'Music Therapy', 'Expressive Writing', 'Creative Expression'],
      color: '#F57C00',
      image: '🎨'
    },
    {
      id: 'online-sessions',
      title: 'Online Counseling Sessions',
      icon: <VideoCallIcon />,
      description: 'Secure, convenient online sessions from the comfort of your home',
      features: ['Video Sessions', 'Secure Platform', 'Convenient Access', 'Professional Support'],
      color: '#1976D2',
      image: '💻'
    },
    {
      id: 'community-education',
      title: 'Community Education',
      icon: <EmojiPeopleIcon />,
      description: 'Educational workshops and resources for communities and families',
      features: ['Family Support', 'Educational Workshops', 'Community Resources', 'Stigma Reduction'],
      color: '#7B1FA2',
      image: '📚'
    },
    {
      id: 'recovery-tools',
      title: 'Recovery Support Tools',
      icon: <HealingIcon />,
      description: 'Digital tools and resources to support your recovery journey',
      features: ['Progress Tracking', 'Coping Strategies', 'Resource Library', 'Daily Support'],
      color: '#D32F2F',
      image: '🛠️'
    }
  ];
  const appFeatures = [
    {
      title: 'Secure Video Calls',
      description: 'End-to-end encrypted video sessions with your therapist',
      icon: <ShieldIcon />,
      preview: '🔒'
    },
    {
      title: 'Real-time Chat',
      description: 'Instant messaging with therapists and community members',
      icon: <ChatIcon />,
      preview: '💬'
    },
    {
      title: 'M-Pesa Integration',
      description: 'Easy and secure payments through mobile money',
      icon: <PaymentIcon />,
      preview: '💳'
    },
    {
      title: 'Smart Dashboards',
      description: 'Personalized dashboards for clients and therapists',
      icon: <DashboardIcon />,
      preview: '📊'
    }
  ];

  const testimonials = [
    {
      name: 'Maria K.',
      role: 'Recovery Journey',
      content: 'Smiling Steps gave me hope when I thought recovery was impossible. The counselors truly understand addiction and treat you with dignity.',
      rating: 5,
      avatar: <Logo size={60} />
    },
    {
      name: 'James M.',
      role: 'Family Member',
      content: 'The family support and education helped us understand addiction better. We learned how to support our loved one without enabling.',
      rating: 5,
      avatar: '🤝'
    },
    {
      name: 'Dr. Sarah L.',
      role: 'Addiction Counselor',
      content: 'Working with Smiling Steps allows me to provide compassionate, evidence-based care. The platform truly supports both clients and therapists.',
      rating: 5,
      avatar: '�'
    }
  ];

  const faqs = [
    {
      question: 'Is my information confidential and secure?',
      answer: 'Absolutely. We use end-to-end encryption and follow strict HIPAA compliance standards. Your privacy and confidentiality are our top priorities.'
    },
    {
      question: 'How much does teletherapy cost?',
      answer: 'Our sessions start from KES 2,000 per session. We also offer package deals and accept M-Pesa payments for your convenience.'
    },
    {
      question: 'How do I access the platform?',
      answer: 'Simply register on our website, complete your profile, and book your first session. You can access everything through your web browser - no downloads required.'
    },
    {
      question: 'Are the therapists licensed?',
      answer: 'Yes, all our therapists are licensed mental health professionals with verified credentials and extensive experience in their fields.'
    },
    {
      question: 'Can I switch therapists if needed?',
      answer: 'Of course! We want you to feel comfortable. You can easily switch therapists through your dashboard at any time.'
    }
  ];

  const handleSubscribe = () => {
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  // Navigation Menu Component
  const NavigationMenu = () => (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.1)'
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#663399', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Logo size={32} />
            Smiling Steps
          </Typography>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3 }}>
            <Button color="inherit" onClick={() => document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' })}>
              Home
            </Button>
            <Button color="inherit" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>
              About
            </Button>
            <Button color="inherit" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>
              Services
            </Button>
            <Button color="inherit" onClick={() => document.getElementById('resources')?.scrollIntoView({ behavior: 'smooth' })}>
              Resources
            </Button>
            <Button color="inherit" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
              Contact
            </Button>
          </Box>

          <Button
            variant="contained"
            onClick={() => navigate('/register')}
            sx={{
              borderRadius: '25px',
              px: 3,
              background: 'linear-gradient(45deg, #1976D2, #42A5F5)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1565C0, #1976D2)'
              }
            }}
          >
            Book Session
          </Button>
        </Box>
      </Container>
    </Box>
  );

  // Hero Section Component
  const HeroSection = () => (
    <Box
      id="home"
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
      {/* Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(79, 195, 247, 0.1)',
          animation: 'float 6s ease-in-out infinite'
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
          animation: 'float 8s ease-in-out infinite reverse'
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
                Compassionate Counseling Rooted in Respect, Empowerment, and Hope
              </Typography>

              <Typography
                variant="h5"
                sx={{
                  mb: 4,
                  color: 'text.secondary',
                  lineHeight: 1.6,
                  fontSize: { xs: '1.1rem', md: '1.3rem' },
                  fontStyle: 'italic'
                }}
              >
                A safe, empowering path for individuals navigating addiction recovery and mental health challenges. Healing begins with dignity, creativity, and connection.
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
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
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
                variant="h6"
                sx={{
                  textAlign: 'center',
                  color: 'text.secondary',
                  mt: 2,
                  fontStyle: 'italic'
                }}
              >
                Healing doesn't happen in leaps—it happens in steps
              </Typography>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
  // About Section Component
  const AboutSection = () => (
    <Box id="about" sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#FAFAFA' }}>
      <Container maxWidth="lg">
        {/* Introduction Banner */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Box
            sx={{
              textAlign: 'center',
              mb: 8,
              p: 6,
              background: 'linear-gradient(135deg, rgba(186, 104, 200, 0.1), rgba(149, 117, 205, 0.1))',
              borderRadius: '20px',
              border: '1px solid rgba(186, 104, 200, 0.2)'
            }}
          >
            <Typography
              variant="h2"
              sx={{
                mb: 3,
                fontWeight: 'bold',
                color: '#663399'
              }}
            >
              About Smiling Steps
            </Typography>
            <Typography
              variant="h4"
              sx={{
                color: '#663399',
                fontStyle: 'italic',
                fontWeight: 300,
                lineHeight: 1.4
              }}
            >
              "Compassionate Counseling Rooted in Respect, Empowerment, and Hope."
            </Typography>
          </Box>
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Paper elevation={0} sx={{ p: 6, mb: 8, backgroundColor: 'white', borderRadius: '15px' }}>
            <Typography variant="h3" sx={{ mb: 4, fontWeight: 'bold', color: '#663399', textAlign: 'center' }}>
              Why We Exist
            </Typography>
            <Typography variant="h6" sx={{ textAlign: 'center', lineHeight: 1.7, color: 'text.primary', maxWidth: '800px', mx: 'auto' }}>
              Smiling Steps was founded to offer a safe, empowering path for individuals navigating addiction recovery and mental health challenges. We believe healing begins with dignity, creativity, and connection.
            </Typography>
          </Paper>
        </motion.div>

        {/* Core Values */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Typography variant="h3" sx={{ textAlign: 'center', mb: 6, fontWeight: 'bold', color: '#663399' }}>
            What Guides Us
          </Typography>

          <Grid container spacing={4} sx={{ mb: 8 }}>
            {[
              {
                icon: '🔐',
                title: 'Confidentiality',
                description: 'Healing begins with trust',
                color: '#1976D2'
              },
              {
                icon: '🙌',
                title: 'Respect',
                description: 'Honoring each person\'s pace and story',
                color: '#388E3C'
              },
              {
                icon: '💪',
                title: 'Empowerment',
                description: 'Supporting growth without control',
                color: '#F57C00'
              },
              {
                icon: '🌟',
                title: 'Hope',
                description: 'Recovery is possible, and you\'re not alone',
                color: '#7B1FA2'
              }
            ].map((value, index) => (
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
                    <Box sx={{ fontSize: '3rem', mb: 2 }}>
                      {value.icon}
                    </Box>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: value.color }}>
                      {value.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                      {value.description}
                    </Typography>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>

        {/* Our Approach */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Typography variant="h3" sx={{ textAlign: 'center', mb: 6, fontWeight: 'bold', color: '#663399' }}>
            How We Support You
          </Typography>

          <Grid container spacing={4} sx={{ mb: 8 }}>
            {[
              {
                icon: '🧠',
                title: 'Evidence-Informed Counseling',
                description: 'Therapeutic approaches backed by research and proven effective for addiction recovery and mental health support'
              },
              {
                icon: '🎨',
                title: 'Creative Healing Modalities',
                description: 'Art therapy, music therapy, and other creative approaches that engage different pathways to healing'
              },
              {
                icon: '🤝',
                title: 'Client-Centered Support',
                description: 'You are the expert of your own life. We provide tools and support while you lead your healing journey'
              }
            ].map((pillar, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Paper elevation={0} sx={{ p: 4, height: '100%', backgroundColor: 'white', borderRadius: '15px', border: '1px solid #e0e0e0' }}>
                    <Box sx={{ fontSize: '3rem', textAlign: 'center', mb: 3 }}>
                      {pillar.icon}
                    </Box>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#663399', textAlign: 'center' }}>
                      {pillar.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, textAlign: 'center' }}>
                      {pillar.description}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>

        {/* Meet the Founder */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Paper elevation={3} sx={{ p: 6, backgroundColor: 'white', borderRadius: '20px' }}>
            <Typography variant="h3" sx={{ textAlign: 'center', mb: 4, fontWeight: 'bold', color: '#663399' }}>
              Meet the Founder
            </Typography>

            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: 200,
                      height: 200,
                      mx: 'auto',
                      mb: 2,
                      border: '4px solid #663399'
                    }}
                    src={founderAvatar}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#663399' }}>
                    Kenneth Esilo
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Licensed Addiction Counselor & Founder
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={8}>
                <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.7 }}>
                  Kenneth Esilo, a licensed addiction counselor and founder of Smiling Steps, blends clinical expertise with creative healing. His approach is rooted in confidentiality, empowerment, and hope.
                </Typography>
                <Typography variant="body1" sx={{ mb: 4, lineHeight: 1.7 }}>
                  With years of experience in addiction recovery and mental health support, Kenneth founded Smiling Steps to create a space where healing happens through respect, creativity, and genuine human connection.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/founder')}
                  sx={{
                    borderColor: '#663399',
                    color: '#663399',
                    '&:hover': {
                      borderColor: '#512DA8',
                      backgroundColor: 'rgba(102, 51, 153, 0.04)'
                    }
                  }}
                >
                  Learn More About Kenneth
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </motion.div>

        {/* Closing Quote & CTA */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Box
            sx={{
              textAlign: 'center',
              mt: 8,
              p: 6,
              background: 'linear-gradient(135deg, #663399, #9C27B0)',
              borderRadius: '20px',
              color: 'white'
            }}
          >
            <Typography variant="h4" sx={{ mb: 4, fontStyle: 'italic', fontWeight: 300 }}>
              "Healing doesn't happen in leaps—it happens in steps. Gentle, intentional, and yours."
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              sx={{
                py: 2,
                px: 4,
                fontSize: '1.1rem',
                borderRadius: '50px',
                backgroundColor: 'white',
                color: '#663399',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              Explore Our Services
            </Button>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
  // Services Section Component
  const ServicesSection = () => (
    <Box id="services" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        {/* Section Introduction */}
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
            Our Services
          </Typography>

          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              mb: 8,
              color: 'text.secondary',
              maxWidth: '700px',
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Compassionate care designed to meet you where you are—online, in community, or through tools that support your healing journey.
          </Typography>
        </motion.div>

        {/* Services Grid - 2 rows of 3 columns */}
        <Grid container spacing={4} sx={{ mb: 8 }}>
          {services.map((service, index) => (
            <Grid item xs={12} md={4} key={service.id}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                    },
                    border: expandedService === service.id ? `2px solid ${service.color}` : '1px solid #e0e0e0',
                    borderRadius: '15px'
                  }}
                  onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                >
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Box
                      sx={{
                        fontSize: '4rem',
                        mb: 2,
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                      }}
                    >
                      {service.image}
                    </Box>

                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: service.color }}>
                      {service.title}
                    </Typography>

                    <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.6 }}>
                      {service.description}
                    </Typography>

                    <AnimatePresence>
                      {expandedService === service.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Divider sx={{ my: 2 }} />
                          <List dense>
                            {service.features.map((feature, idx) => (
                              <ListItem key={idx} sx={{ py: 0.25, px: 0 }}>
                                <ListItemIcon sx={{ minWidth: 25 }}>
                                  <CheckCircleIcon sx={{ color: service.color, fontSize: '1rem' }} />
                                </ListItemIcon>
                                <ListItemText
                                  primary={feature}
                                  sx={{ '& .MuiListItemText-primary': { fontSize: '0.85rem' } }}
                                />
                              </ListItem>
                            ))}
                          </List>

                          <Button
                            variant="contained"
                            fullWidth
                            sx={{
                              mt: 2,
                              backgroundColor: service.color,
                              borderRadius: '25px',
                              '&:hover': { backgroundColor: service.color, opacity: 0.9 }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/register');
                            }}
                          >
                            Learn More
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Call-to-Action Banner */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Box
            sx={{
              textAlign: 'center',
              p: 6,
              background: 'linear-gradient(135deg, #663399, #9C27B0)',
              borderRadius: '20px',
              color: 'white'
            }}
          >
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
              Ready to take the next step?
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              Book a session or join our community today.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{
                py: 2,
                px: 4,
                fontSize: '1.1rem',
                borderRadius: '50px',
                backgroundColor: 'white',
                color: '#663399',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              Book a Session
            </Button>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );

  // Features Showcase Section
  const FeaturesSection = () => (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#F8F9FA' }}>
      <Container maxWidth="lg">
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
              color: '#1976D2'
            }}
          >
            Platform Features
          </Typography>

          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              mb: 8,
              color: 'text.secondary',
              maxWidth: '700px',
              mx: 'auto'
            }}
          >
            Experience the future of teletherapy with our cutting-edge platform
          </Typography>
        </motion.div>

        <Grid container spacing={6}>
          {appFeatures.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    height: '100%',
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      borderColor: '#1976D2'
                    }
                  }}
                >
                  <Box sx={{ fontSize: '3rem', mb: 2 }}>
                    {feature.preview}
                  </Box>

                  <Box sx={{ color: '#1976D2', mb: 2 }}>
                    {React.cloneElement(feature.icon, { sx: { fontSize: '2rem' } })}
                  </Box>

                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    {feature.title}
                  </Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {feature.description}
                  </Typography>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* App Preview Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <Paper
              elevation={3}
              sx={{
                p: 4,
                maxWidth: '800px',
                mx: 'auto',
                backgroundColor: '#1976D2',
                color: 'white',
                borderRadius: '20px'
              }}
            >
              <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
                🖥️ Web App Preview
              </Typography>

              <Typography variant="body1" sx={{ mb: 4, opacity: 0.9 }}>
                Get a sneak peek at our intuitive dashboard and seamless user experience
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      p: 3,
                      borderRadius: '10px',
                      mb: 2
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 1 }}>Client Dashboard</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      📅 Schedule sessions<br />
                      💬 Chat with therapists<br />
                      📊 Track your progress
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      p: 3,
                      borderRadius: '10px',
                      mb: 2
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 1 }}>Therapist Dashboard</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      👥 Manage clients<br />
                      📝 Session notes<br />
                      📈 Client analytics
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Button
                variant="contained"
                size="large"
                onClick={() => setShowAppPreview(true)}
                sx={{
                  mt: 3,
                  backgroundColor: 'white',
                  color: '#1976D2',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
                startIcon={<PlayIcon />}
              >
                View Interactive Demo
              </Button>
            </Paper>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
  // Resources Section Component
  const ResourcesSection = () => (
    <Box id="resources" sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#FAFAFA' }}>
      <Container maxWidth="lg">
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
            Resources & Support
          </Typography>

          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              mb: 8,
              color: 'text.secondary',
              maxWidth: '700px',
              mx: 'auto'
            }}
          >
            Educational materials and tools to support your healing journey and reduce stigma
          </Typography>
        </motion.div>

        <Grid container spacing={4}>
          {[
            {
              title: 'Recovery Guides',
              description: 'Downloadable guides on addiction recovery, mental health, and harm reduction',
              icon: '📖',
              color: '#1976D2',
              items: [
                'Understanding Addiction: A Comprehensive Guide',
                'Mental Health First Aid Handbook',
                'Harm Reduction Strategies for Families'
              ]
            },
            {
              title: 'Community Education',
              description: 'Educational materials, slides, and infographics for families and communities',
              icon: '🎓',
              color: '#2E7D32',
              items: [
                'Breaking the Stigma: Community Workshop Materials',
                'Supporting a Loved One in Recovery',
                'Mental Health Awareness Infographics'
              ]
            },
            {
              title: 'Blog & Articles',
              description: 'Articles on healing, stigma reduction, empowerment, and hope in recovery',
              icon: '✍️',
              color: '#F57C00',
              items: [
                'The Journey to Healing: Personal Stories',
                'Overcoming Mental Health Stigma in Kenya',
                'Building Resilience Through Community Support'
              ]
            },
            {
              title: 'Support Tools',
              description: 'Digital tools for tracking progress, coping strategies, and daily support',
              icon: '🛠️',
              color: '#7B1FA2',
              items: [
                'Daily Mood Tracker & Journal',
                'Coping Strategies Toolkit',
                'Crisis Support Contact Directory'
              ]
            }
          ].map((resource, index) => (
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
                    p: 3,
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
                    },
                    borderRadius: '15px'
                  }}
                >
                  <Box sx={{ fontSize: '3rem', mb: 2 }}>
                    {resource.icon}
                  </Box>

                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: resource.color }}>
                    {resource.title}
                  </Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, mb: 3 }}>
                    {resource.description}
                  </Typography>

                  <Box sx={{ textAlign: 'left', mb: 3 }}>
                    {resource.items.map((item, itemIndex) => (
                      <Typography 
                        key={itemIndex}
                        variant="body2" 
                        sx={{ 
                          mb: 1, 
                          display: 'flex', 
                          alignItems: 'center',
                          fontSize: '0.875rem'
                        }}
                      >
                        <Box 
                          sx={{ 
                            width: 6, 
                            height: 6, 
                            borderRadius: '50%', 
                            backgroundColor: resource.color, 
                            mr: 1,
                            flexShrink: 0
                          }} 
                        />
                        {item}
                      </Typography>
                    ))}
                  </Box>

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      // Handle Support Tools separately - redirect to resources page
                      if (resource.title === 'Support Tools') {
                        navigate('/resources');
                        return;
                      }
                      
                      const categoryMap = {
                        'Recovery Guides': 'Recovery Guide',
                        'Community Education': 'Community Education',
                        'Blog & Articles': null
                      };
                      
                      const category = categoryMap[resource.title];
                      if (category) {
                        navigate(`/blog?category=${encodeURIComponent(category)}`);
                      } else if (resource.title === 'Blog & Articles') {
                        navigate('/blog');
                      }
                    }}
                    sx={{
                      borderColor: resource.color,
                      color: resource.color,
                      '&:hover': {
                        borderColor: resource.color,
                        backgroundColor: `${resource.color}10`
                      }
                    }}
                  >
                    {resource.title === 'Blog & Articles' ? 'Read Blogs & Articles' : 
                     resource.title === 'Recovery Guides' ? 'View Recovery Guides' :
                     resource.title === 'Community Education' ? 'View Education Materials' :
                     resource.title === 'Support Tools' ? 'View Support Tools' :
                     'Explore Resources'}
                  </Button>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );

  // Recent Blogs Section
  const RecentBlogsSection = () => {
    const [recentBlogs, setRecentBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetchRecentBlogs();
    }, []);

    const fetchRecentBlogs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/public/blogs/recent?limit=3`);
        const data = await response.json();
        if (data.success) {
          setRecentBlogs(data.blogs);
        }
      } catch (error) {
        console.error('Error fetching recent blogs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (loading || recentBlogs.length === 0) return null;

    return (
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
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
              Latest from Our Blog
            </Typography>

            <Typography
              variant="h5"
              sx={{
                textAlign: 'center',
                mb: 8,
                color: 'text.secondary',
                maxWidth: '700px',
                mx: 'auto'
              }}
            >
              Insights, stories, and resources for your healing journey
            </Typography>
          </motion.div>

          <Grid container spacing={4}>
            {recentBlogs.map((blog, index) => (
              <Grid item xs={12} md={4} key={blog.id}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                      },
                      borderRadius: '15px'
                    }}
                    onClick={() => navigate(`/blog/${blog.slug}`)}
                  >
                    {blog.featuredImage && (
                      <Box
                        component="img"
                        src={blog.featuredImage}
                        alt={blog.title}
                        sx={{
                          width: '100%',
                          height: 200,
                          objectFit: 'cover'
                        }}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Chip
                        label={blog.category}
                        size="small"
                        sx={{
                          mb: 2,
                          backgroundColor: '#663399',
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                        {blog.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {blog.excerpt}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 'auto' }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(blog.createdAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {blog.readTime} min read
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/blog')}
              sx={{
                borderColor: '#663399',
                color: '#663399',
                px: 4,
                py: 1.5,
                borderRadius: '50px',
                '&:hover': {
                  borderColor: '#512DA8',
                  backgroundColor: 'rgba(102, 51, 153, 0.04)'
                }
              }}
            >
              View All Blog Posts
            </Button>
          </Box>
        </Container>
      </Box>
    );
  };

  // Testimonials Section
  const TestimonialsSection = () => (
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
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
            Stories of Hope
          </Typography>

          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              mb: 8,
              color: 'text.secondary',
              maxWidth: '600px',
              mx: 'auto'
            }}
          >
            Hear from our community members about their healing journey
          </Typography>
        </motion.div>

        <Grid container spacing={4}>
          {testimonials.map((testimonial, index) => (
            <Grid item xs={12} md={4} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card
                  sx={{
                    height: '100%',
                    p: 4,
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
                    },
                    borderRadius: '15px'
                  }}
                >
                  <Box sx={{ fontSize: '4rem', mb: 2 }}>
                    {testimonial.avatar}
                  </Box>

                  <Rating
                    value={testimonial.rating}
                    readOnly
                    sx={{ mb: 2, color: '#FFD700' }}
                  />

                  <Typography
                    variant="body1"
                    sx={{
                      mb: 3,
                      fontStyle: 'italic',
                      color: 'text.secondary',
                      lineHeight: 1.6
                    }}
                  >
                    "{testimonial.content}"
                  </Typography>

                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#663399' }}>
                    {testimonial.name}
                  </Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {testimonial.role}
                  </Typography>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <Box sx={{ mt: 8 }}>
            <Paper
              elevation={0}
              sx={{
                p: 6,
                backgroundColor: '#E3F2FD',
                borderRadius: '20px'
              }}
            >
              <Grid container spacing={4} textAlign="center">
                <Grid item xs={12} md={3}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1, color: '#1976D2' }}>
                    500+
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    Happy Clients
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1, color: '#1976D2' }}>
                    50+
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    Licensed Therapists
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1, color: '#1976D2' }}>
                    95%
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    Satisfaction Rate
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1, color: '#1976D2' }}>
                    24/7
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    Support Available
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );

  // FAQ Section
  const FAQSection = () => (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#FAFAFA' }}>
      <Container maxWidth="md">
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
              color: '#1976D2'
            }}
          >
            Frequently Asked Questions
          </Typography>

          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              mb: 6,
              color: 'text.secondary'
            }}
          >
            Get answers to common questions about our platform
          </Typography>
        </motion.div>

        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <Accordion
              expanded={expandedFAQ === index}
              onChange={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
              sx={{
                mb: 2,
                '&:before': { display: 'none' },
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                borderRadius: '10px !important',
                '&.Mui-expanded': {
                  boxShadow: '0 4px 20px rgba(25, 118, 210, 0.15)'
                }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: expandedFAQ === index ? '#E3F2FD' : 'white',
                  borderRadius: '10px',
                  '&.Mui-expanded': {
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0
                  }
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976D2' }}>
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ backgroundColor: 'white', borderRadius: '0 0 10px 10px' }}>
                <Typography variant="body1" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </motion.div>
        ))}
      </Container>
    </Box>
  );

  // Call-to-Action Banner
  const CTABanner = () => (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
        color: 'white',
        textAlign: 'center'
      }}
    >
      <Container maxWidth="md">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Typography variant="h2" sx={{ mb: 3, fontWeight: 'bold' }}>
            Ready to Start Your Journey?
          </Typography>

          <Typography variant="h5" sx={{ mb: 6, opacity: 0.9 }}>
            Join thousands of people who have found healing and support through Smiling Steps
          </Typography>

          {!subscribed ? (
            <Box sx={{ maxWidth: '500px', mx: 'auto', mb: 4 }}>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '50px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '50px',
                      '& fieldset': { border: 'none' }
                    }
                  }}
                />
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubscribe}
                  sx={{
                    px: 4,
                    borderRadius: '50px',
                    backgroundColor: '#2E7D32',
                    '&:hover': { backgroundColor: '#1B5E20' },
                    whiteSpace: 'nowrap'
                  }}
                >
                  Join Waitlist
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#4CAF50' }}>
                ✅ Thank you for joining our waitlist!
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                We'll notify you when the platform launches.
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{
                py: 2,
                px: 4,
                fontSize: '1.1rem',
                borderRadius: '50px',
                backgroundColor: 'white',
                color: '#1976D2',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  transform: 'translateY(-2px)'
                }
              }}
              endIcon={<ArrowForwardIcon />}
            >
              Get Started Now
            </Button>

            <Button
              variant="outlined"
              size="large"
              href="mailto:support@smilingsteps.com"
              sx={{
                py: 2,
                px: 4,
                fontSize: '1.1rem',
                borderRadius: '50px',
                borderColor: 'white',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
              startIcon={<EmailIcon />}
            >
              Contact Us
            </Button>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );

  // App Preview Dialog
  const AppPreviewDialog = () => (
    <Dialog
      open={showAppPreview}
      onClose={() => setShowAppPreview(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '20px' }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976D2' }}>
          🚀 Platform Preview
        </Typography>
        <IconButton
          onClick={() => setShowAppPreview(false)}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
          Experience the future of teletherapy
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '15px', backgroundColor: '#E3F2FD' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#1976D2' }}>
                🎥 Video Sessions
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                High-quality, secure video calls with your therapist
              </Typography>
              <LinearProgress
                variant="determinate"
                value={85}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(25, 118, 210, 0.2)',
                  '& .MuiLinearProgress-bar': { backgroundColor: '#1976D2' }
                }}
              />
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                85% user satisfaction
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: '15px', backgroundColor: '#E8F5E8' }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#2E7D32' }}>
                💬 Real-time Chat
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Instant messaging with therapists and community
              </Typography>
              <LinearProgress
                variant="determinate"
                value={92}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(46, 125, 50, 0.2)',
                  '& .MuiLinearProgress-bar': { backgroundColor: '#2E7D32' }
                }}
              />
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                92% response rate
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: '15px', backgroundColor: '#FFF3E0' }}>
              <Typography variant="h6" sx={{ mb: 3, color: '#F57C00' }}>
                📊 Your Journey Steps
              </Typography>

              <Stepper orientation={isMobile ? 'vertical' : 'horizontal'} activeStep={2}>
                <Step>
                  <StepLabel>Register & Profile Setup</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Match with Therapist</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Start Your Sessions</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Track Progress</StepLabel>
                </Step>
              </Stepper>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => {
            setShowAppPreview(false);
            navigate('/register');
          }}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: '50px',
            background: 'linear-gradient(45deg, #1976D2, #42A5F5)'
          }}
        >
          Start Your Journey
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Contact Section Component
  const ContactSection = () => (
    <Box id="contact" sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#FAFAFA' }}>
      <Container maxWidth="md">
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
            Contact Us
          </Typography>

          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              mb: 6,
              color: 'text.secondary',
              fontStyle: 'italic'
            }}
          >
            "Reach out. We're here to listen."
          </Typography>
        </motion.div>

        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={4}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: 'white',
                  borderRadius: '15px',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <EmailIcon sx={{ fontSize: '3rem', mb: 2, color: '#663399' }} />
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>Email</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  smilingstep254@gmail.com
                </Typography>
              </Paper>
            </motion.div>
          </Grid>

          <Grid item xs={12} sm={4}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: 'white',
                  borderRadius: '15px',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <PhoneIcon sx={{ fontSize: '3rem', mb: 2, color: '#663399' }} />
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>Phone</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  0118832083
                </Typography>
              </Paper>
            </motion.div>
          </Grid>

          <Grid item xs={12} sm={4}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Paper
                component="a"
                href="https://wa.me/254118832083"
                target="_blank"
                rel="noopener noreferrer"
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: 'white',
                  borderRadius: '15px',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  textDecoration: 'none',
                  display: 'block',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <Box component="span" sx={{ fontSize: '3rem', mb: 2, display: 'block' }}>💬</Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', color: 'text.primary' }}>WhatsApp</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Chat with us
                </Typography>
              </Paper>
            </motion.div>
          </Grid>

          <Grid item xs={12} sm={4}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  backgroundColor: 'white',
                  borderRadius: '15px',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <LocationOnIcon sx={{ fontSize: '3rem', mb: 2, color: '#663399' }} />
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>Location</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Nairobi, Kenya
                </Typography>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <Box sx={{ textAlign: 'center', mt: 6 }}>
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
                  transform: 'translateY(-2px)'
                }
              }}
            >
              Start Your Healing Journey
            </Button>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* Add floating animation keyframes */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
        `}
      </style>

      <NavigationMenu />
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <ResourcesSection />
      <TestimonialsSection />
      <ContactSection />
      <AppPreviewDialog />
    </Box>
  );
};

export default MarketingPage;