import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  LinearProgress
} from '@mui/material';
import {
  Shield as ShieldIcon,
  VideoCall as VideoCallIcon,
  Chat as ChatIcon,
  Payment as PaymentIcon,
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  PhoneAndroid as PhoneAndroidIcon,
  Cloud as CloudIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

const PlatformFeatures = () => {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const platformFeatures = [
    {
      id: 'secure-video',
      title: 'Secure Video Sessions',
      technicalBenefit: 'End-to-end encrypted WebRTC video calls with HIPAA compliance',
      userBenefit: 'Private, secure therapy sessions from the comfort of your home',
      icon: <VideoCallIcon />,
      color: '#1976D2',
      emoji: '🎥',
      details: [
        'HD video quality with adaptive streaming',
        'Screen sharing capabilities for therapeutic exercises',
        'Session recording (with consent) for review',
        'Multi-device support (desktop, tablet, mobile)',
        'Automatic connection quality optimization',
        'Backup audio-only mode for poor connections'
      ],
      securityFeatures: [
        'End-to-end encryption',
        'HIPAA compliant infrastructure',
        'No data stored on local devices',
        'Secure authentication required'
      ]
    },
    {
      id: 'mpesa-integration',
      title: 'Flexible Payment Options',
      technicalBenefit: 'Multiple payment methods including mobile money, credit cards, and local payment systems',
      userBenefit: 'Pay for therapy sessions easily using your preferred payment method - accessible worldwide',
      icon: <PaymentIcon />,
      color: '#2E7D32',
      emoji: '💳',
      details: [
        'Mobile money support (M-Pesa, Airtel Money, etc.)',
        'Credit and debit card payments',
        'Bank transfers and local payment methods',
        'Instant payment confirmation',
        'Secure transaction processing',
        'Payment history and digital receipts'
      ],
      securityFeatures: [
        'Bank-level security protocols',
        'PCI DSS compliant payment processing',
        'Fraud detection and prevention',
        'Secure transaction logging'
      ]
    },
    {
      id: 'real-time-chat',
      title: 'Real-Time Messaging',
      technicalBenefit: 'WebSocket-based instant messaging with message encryption',
      userBenefit: 'Stay connected with your therapist between sessions for ongoing support',
      icon: <ChatIcon />,
      color: '#F57C00',
      emoji: '💬',
      details: [
        'Instant message delivery',
        'File and image sharing capabilities',
        'Message history and search',
        'Typing indicators and read receipts',
        'Emergency contact features',
        'Offline message queuing'
      ],
      securityFeatures: [
        'Message encryption at rest and in transit',
        'Automatic message expiration options',
        'Professional boundary enforcement',
        'Audit trail for compliance'
      ]
    },
    {
      id: 'smart-dashboards',
      title: 'Personalized Dashboards',
      technicalBenefit: 'Role-based UI with real-time data synchronization',
      userBenefit: 'Track your progress, manage appointments, and access resources all in one place',
      icon: <DashboardIcon />,
      color: '#7B1FA2',
      emoji: '📊',
      details: [
        'Personalized progress tracking',
        'Appointment scheduling and reminders',
        'Resource library access',
        'Goal setting and milestone tracking',
        'Session notes and reflections',
        'Integration with wearable devices'
      ],
      securityFeatures: [
        'Role-based access control',
        'Data encryption and backup',
        'Privacy controls for shared information',
        'Secure data export options'
      ]
    },
    {
      id: 'mobile-optimized',
      title: 'Mobile-First Design',
      technicalBenefit: 'Progressive Web App (PWA) with offline capabilities',
      userBenefit: 'Access your therapy platform seamlessly on any device, anywhere in the world',
      icon: <PhoneAndroidIcon />,
      color: '#D32F2F',
      emoji: '📱',
      details: [
        'Works on all smartphones and tablets',
        'Offline access to resources and notes',
        'Push notifications for appointments',
        'Optimized for various connection speeds',
        'Touch-friendly interface design',
        'App-like experience without downloads'
      ],
      securityFeatures: [
        'Secure local data storage',
        'Biometric authentication support',
        'Remote wipe capabilities',
        'Device registration and management'
      ]
    },
    {
      id: 'data-security',
      title: 'Advanced Data Protection',
      technicalBenefit: 'Multi-layered security architecture with blockchain audit trails',
      userBenefit: 'Your personal information and therapy sessions are protected with military-grade security',
      icon: <SecurityIcon />,
      color: '#663399',
      emoji: '🔒',
      details: [
        'Multi-factor authentication',
        'Regular security audits and updates',
        'Compliance with international standards',
        'Secure global data centers',
        'Automated threat detection',
        'Regular data backups and recovery'
      ],
      securityFeatures: [
        'AES-256 encryption',
        'ISO 27001 certified infrastructure',
        'GDPR and local privacy law compliance',
        'Zero-knowledge architecture options'
      ]
    }
  ];

  const handleFeatureClick = (feature) => {
    setSelectedFeature(feature);
  };

  const handleCloseFeatureDialog = () => {
    setSelectedFeature(null);
  };

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
            Platform Features
          </Typography>
          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              mb: 8,
              color: 'text.secondary',
              maxWidth: '800px',
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Advanced technology designed for global accessibility, ensuring secure, accessible, 
            and culturally-appropriate mental health care for communities worldwide.
          </Typography>
        </motion.div>

        {/* Features Grid */}
        <Grid container spacing={4} sx={{ mb: 8 }}>
          {platformFeatures.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={feature.id}>
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
                    borderRadius: '15px',
                    border: '1px solid #e0e0e0'
                  }}
                  onClick={() => handleFeatureClick(feature)}
                >
                  <CardContent sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ fontSize: '3rem', mb: 2 }}>
                      {feature.emoji}
                    </Box>

                    <Box sx={{ color: feature.color, mb: 2 }}>
                      {React.cloneElement(feature.icon, { sx: { fontSize: '2rem' } })}
                    </Box>

                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: feature.color }}>
                      {feature.title}
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, mb: 3, flexGrow: 1 }}>
                      {feature.userBenefit}
                    </Typography>

                    <Chip
                      label="Learn More"
                      size="small"
                      sx={{
                        backgroundColor: feature.color,
                        color: 'white',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: feature.color,
                          opacity: 0.9
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Global Benefits with payment flexibility */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 6,
              mb: 8,
              backgroundColor: '#E8F5E8',
              borderRadius: '20px',
              border: '2px solid #2E7D32'
            }}
          >
            <Typography variant="h3" sx={{ textAlign: 'center', mb: 4, fontWeight: 'bold', color: '#2E7D32' }}>
              Built for Your Community 🌍
            </Typography>
            
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#2E7D32' }}>
                  Flexible Payment Solutions
                </Typography>
                <List dense>
                  <ListItem sx={{ py: 0.25, px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 25 }}>
                      <CheckCircleIcon sx={{ color: '#2E7D32', fontSize: '1rem' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Mobile money (M-Pesa, Airtel Money, etc.)"
                      sx={{ '& .MuiListItemText-primary': { fontSize: '0.9rem' } }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.25, px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 25 }}>
                      <CheckCircleIcon sx={{ color: '#2E7D32', fontSize: '1rem' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Credit and debit cards"
                      sx={{ '& .MuiListItemText-primary': { fontSize: '0.9rem' } }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.25, px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 25 }}>
                      <CheckCircleIcon sx={{ color: '#2E7D32', fontSize: '1rem' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Bank transfers and local payment methods"
                      sx={{ '& .MuiListItemText-primary': { fontSize: '0.9rem' } }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.25, px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 25 }}>
                      <CheckCircleIcon sx={{ color: '#2E7D32', fontSize: '1rem' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Secure, instant payment confirmation"
                      sx={{ '& .MuiListItemText-primary': { fontSize: '0.9rem', fontWeight: 600 } }}
                    />
                  </ListItem>
                </List>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#2E7D32' }}>
                  Global Accessibility
                </Typography>
                <List dense>
                  {[
                    'Optimized for various internet speeds',
                    'Global data centers for faster access',
                    'Multi-language support',
                    'Cultural sensitivity in design and content',
                    'International data protection compliance'
                  ].map((item, index) => (
                    <ListItem key={index} sx={{ py: 0.25, px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 25 }}>
                        <CheckCircleIcon sx={{ color: '#2E7D32', fontSize: '1rem' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item}
                        sx={{ '& .MuiListItemText-primary': { fontSize: '0.9rem' } }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>

            {/* Stigma reduction messaging */}
            <Box sx={{ mt: 4, p: 3, backgroundColor: 'rgba(46, 125, 50, 0.1)', borderRadius: '10px' }}>
              <Typography variant="body1" sx={{ textAlign: 'center', fontStyle: 'italic', color: '#2E7D32' }}>
                "We understand the unique mental health challenges in diverse communities worldwide and are 
                committed to reducing stigma while providing culturally sensitive, accessible care for everyone."
              </Typography>
            </Box>
          </Paper>
        </motion.div>

        {/* Platform Demo CTA */}
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
              background: 'linear-gradient(135deg, #1976D2, #42A5F5)',
              borderRadius: '20px',
              color: 'white'
            }}
          >
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
              Experience the Platform
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              See how our technology makes mental health care accessible, secure, and effective.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => setShowDemo(true)}
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
                startIcon={<PlayIcon />}
              >
                View Platform Demo
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/register')}
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
                endIcon={<ArrowForwardIcon />}
              >
                Start Using Platform
              </Button>
            </Box>
          </Box>
        </motion.div>
      </Container>

      {/* Feature Detail Dialog */}
      <Dialog
        open={selectedFeature !== null}
        onClose={handleCloseFeatureDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '20px' }
        }}
      >
        {selectedFeature && (
          <>
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ fontSize: '2rem' }}>{selectedFeature.emoji}</Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: selectedFeature.color }}>
                  {selectedFeature.title}
                </Typography>
              </Box>
              <IconButton
                onClick={handleCloseFeatureDialog}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ py: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, color: 'text.secondary', textAlign: 'center' }}>
                {selectedFeature.userBenefit}
              </Typography>

              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: selectedFeature.color }}>
                    Features & Capabilities
                  </Typography>
                  <List dense>
                    {selectedFeature.details.map((detail, index) => (
                      <ListItem key={index} sx={{ py: 0.25, px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 25 }}>
                          <CheckCircleIcon sx={{ color: selectedFeature.color, fontSize: '1rem' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={detail}
                          sx={{ '& .MuiListItemText-primary': { fontSize: '0.9rem' } }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: selectedFeature.color }}>
                    Security & Privacy
                  </Typography>
                  <List dense>
                    {selectedFeature.securityFeatures.map((security, index) => (
                      <ListItem key={index} sx={{ py: 0.25, px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 25 }}>
                          <ShieldIcon sx={{ color: selectedFeature.color, fontSize: '1rem' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={security}
                          sx={{ '& .MuiListItemText-primary': { fontSize: '0.9rem' } }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>

              <Paper elevation={1} sx={{ p: 3, mt: 3, backgroundColor: `${selectedFeature.color}10`, borderRadius: '10px' }}>
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  <strong>Technical Implementation:</strong> {selectedFeature.technicalBenefit}
                </Typography>
              </Paper>
            </DialogContent>

            <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  handleCloseFeatureDialog();
                  navigate('/register');
                }}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: '50px',
                  backgroundColor: selectedFeature.color,
                  '&:hover': {
                    backgroundColor: selectedFeature.color,
                    opacity: 0.9
                  }
                }}
                endIcon={<ArrowForwardIcon />}
              >
                Get Started
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Platform Demo Dialog */}
      <Dialog
        open={showDemo}
        onClose={() => setShowDemo(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '20px' }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976D2' }}>
            🚀 Platform Demo
          </Typography>
          <IconButton
            onClick={() => setShowDemo(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
            Experience the future of mental health care in Kenya
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: '15px', backgroundColor: '#E3F2FD' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#1976D2' }}>
                  🎥 Secure Video Sessions
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  HD video calls with end-to-end encryption
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={95}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(25, 118, 210, 0.2)',
                    '& .MuiLinearProgress-bar': { backgroundColor: '#1976D2' }
                  }}
                />
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  95% connection success rate
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: '15px', backgroundColor: '#E8F5E8' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#2E7D32' }}>
                  💳 M-Pesa Integration
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Instant payments via mobile money
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={98}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(46, 125, 50, 0.2)',
                    '& .MuiLinearProgress-bar': { backgroundColor: '#2E7D32' }
                  }}
                />
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  98% payment success rate
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: '15px', backgroundColor: '#FFF3E0' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#F57C00' }}>
                  💬 Real-Time Chat
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Secure messaging between sessions
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={99}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(245, 124, 0, 0.2)',
                    '& .MuiLinearProgress-bar': { backgroundColor: '#F57C00' }
                  }}
                />
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  99% message delivery rate
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Paper elevation={3} sx={{ p: 4, mt: 4, borderRadius: '15px', backgroundColor: '#F3E5F5' }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#7B1FA2' }}>
              📊 Your Healing Journey
            </Typography>

            <Stepper orientation="horizontal" activeStep={2}>
              <Step>
                <StepLabel>Register & Setup</StepLabel>
              </Step>
              <Step>
                <StepLabel>Match with Therapist</StepLabel>
              </Step>
              <Step>
                <StepLabel>Start Sessions</StepLabel>
              </Step>
              <Step>
                <StepLabel>Track Progress</StepLabel>
              </Step>
            </Stepper>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              setShowDemo(false);
              navigate('/register');
            }}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: '50px',
              background: 'linear-gradient(45deg, #1976D2, #42A5F5)'
            }}
            endIcon={<ArrowForwardIcon />}
          >
            Start Your Journey
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlatformFeatures;