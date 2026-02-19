import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Psychology as PsychologyIcon,
  Palette as PaletteIcon,
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const ServiceCategories = () => {
  const navigate = useNavigate();
  const [expandedCategory, setExpandedCategory] = useState(null);

  const serviceCategories = [
    {
      id: 'clinical-care',
      title: 'Clinical Care',
      icon: <PsychologyIcon />,
      color: '#663399',
      emoji: '🧠',
      description: 'Evidence-based therapeutic approaches delivered by licensed professionals specializing in addiction recovery and mental health support.',
      services: [
        'Individual Addiction Counseling',
        'Trauma-Informed Therapy',
        'Cognitive Behavioral Therapy (CBT)',
        'Dialectical Behavior Therapy (DBT)',
        'Motivational Interviewing',
        'Relapse Prevention Planning',
        'Crisis Intervention Support',
        'Medication Management Coordination'
      ],
      benefits: [
        'Licensed, experienced therapists',
        'Personalized treatment plans',
        'Evidence-based approaches',
        'Confidential, secure sessions',
        'Flexible scheduling options'
      ],
      targetAudience: 'Individuals seeking professional therapeutic support for addiction recovery, trauma, depression, anxiety, and other mental health challenges.'
    },
    {
      id: 'creative-healing',
      title: 'Creative/Expressive Healing',
      icon: <PaletteIcon />,
      color: '#F57C00',
      emoji: '🎨',
      description: 'Art therapy, music therapy, and other creative modalities that engage different pathways to healing and self-discovery.',
      services: [
        'Art Therapy Sessions',
        'Music Therapy Programs',
        'Expressive Writing Workshops',
        'Movement and Dance Therapy',
        'Drama and Role-Play Therapy',
        'Creative Journaling Guidance',
        'Digital Art Therapy',
        'Storytelling for Healing'
      ],
      benefits: [
        'Non-verbal expression opportunities',
        'Stress reduction through creativity',
        'Enhanced self-awareness',
        'Alternative healing pathways',
        'Group and individual options'
      ],
      targetAudience: 'Individuals who find traditional talk therapy challenging, those seeking creative outlets for expression, and people interested in holistic healing approaches.'
    },
    {
      id: 'community-support',
      title: 'Community/Recovery Support',
      icon: <GroupIcon />,
      color: '#2E7D32',
      emoji: '🤝',
      description: 'Peer support groups, family education, and community resources that create a network of understanding and encouragement.',
      services: [
        'Peer Support Groups',
        'Family Education Programs',
        'Community Workshops',
        'Recovery Mentorship',
        'Support Group Facilitation',
        'Educational Seminars',
        'Stigma Reduction Campaigns',
        'Resource Navigation Assistance'
      ],
      benefits: [
        'Peer connection and support',
        'Family involvement in recovery',
        'Community education and awareness',
        'Reduced isolation and stigma',
        'Ongoing recovery support'
      ],
      targetAudience: 'Individuals in recovery, family members of those struggling with addiction or mental health issues, and community members seeking education and support.'
    }
  ];

  const handleCategoryToggle = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#FAFAFA' }}>
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
            Our Service Categories
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
            Three distinct pathways to healing, each designed to meet you where you are in your journey toward wellness and recovery.
          </Typography>
        </motion.div>

        {/* Service Categories Grid */}
        <Grid container spacing={4}>
          {serviceCategories.map((category, index) => (
            <Grid item xs={12} key={category.id}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
                    },
                    border: expandedCategory === category.id ? `2px solid ${category.color}` : '1px solid #e0e0e0',
                    borderRadius: '15px',
                    overflow: 'hidden'
                  }}
                  onClick={() => handleCategoryToggle(category.id)}
                >
                  <CardContent sx={{ p: 4 }}>
                    {/* Category Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            fontSize: '3rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            backgroundColor: `${category.color}15`,
                            border: `2px solid ${category.color}30`
                          }}
                        >
                          {category.emoji}
                        </Box>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: category.color, mb: 1 }}>
                            {category.title}
                          </Typography>
                          <Chip
                            label={`${category.services.length} Services Available`}
                            size="small"
                            sx={{
                              backgroundColor: category.color,
                              color: 'white',
                              fontWeight: 600
                            }}
                          />
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          sx={{
                            borderColor: category.color,
                            color: category.color,
                            '&:hover': {
                              borderColor: category.color,
                              backgroundColor: `${category.color}10`
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/register');
                          }}
                        >
                          Get Started
                        </Button>
                        {expandedCategory === category.id ? (
                          <ExpandLessIcon sx={{ color: category.color, fontSize: '2rem' }} />
                        ) : (
                          <ExpandMoreIcon sx={{ color: category.color, fontSize: '2rem' }} />
                        )}
                      </Box>
                    </Box>

                    {/* Category Description */}
                    <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.7 }}>
                      {category.description}
                    </Typography>

                    {/* Expandable Content */}
                    <AnimatePresence>
                      {expandedCategory === category.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Divider sx={{ my: 3 }} />
                          
                          <Grid container spacing={4}>
                            {/* Services List */}
                            <Grid item xs={12} md={6}>
                              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: category.color }}>
                                Available Services
                              </Typography>
                              <List dense>
                                {category.services.map((service, serviceIndex) => (
                                  <ListItem key={serviceIndex} sx={{ py: 0.25, px: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 25 }}>
                                      <CheckCircleIcon sx={{ color: category.color, fontSize: '1rem' }} />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={service}
                                      sx={{ '& .MuiListItemText-primary': { fontSize: '0.9rem' } }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </Grid>

                            {/* Benefits & Target Audience */}
                            <Grid item xs={12} md={6}>
                              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: category.color }}>
                                Key Benefits
                              </Typography>
                              <List dense sx={{ mb: 3 }}>
                                {category.benefits.map((benefit, benefitIndex) => (
                                  <ListItem key={benefitIndex} sx={{ py: 0.25, px: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 25 }}>
                                      <CheckCircleIcon sx={{ color: category.color, fontSize: '1rem' }} />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={benefit}
                                      sx={{ '& .MuiListItemText-primary': { fontSize: '0.9rem' } }}
                                    />
                                  </ListItem>
                                ))}
                              </List>

                              <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', color: category.color }}>
                                Who This Helps
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                                {category.targetAudience}
                              </Typography>
                            </Grid>
                          </Grid>

                          {/* Action Buttons */}
                          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                            <Button
                              variant="contained"
                              size="large"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/register');
                              }}
                              sx={{
                                backgroundColor: category.color,
                                px: 4,
                                py: 1.5,
                                borderRadius: '50px',
                                '&:hover': {
                                  backgroundColor: category.color,
                                  opacity: 0.9,
                                  transform: 'translateY(-2px)'
                                }
                              }}
                              endIcon={<ArrowForwardIcon />}
                            >
                              Book {category.title} Session
                            </Button>
                            <Button
                              variant="outlined"
                              size="large"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Could navigate to a detailed services page in the future
                                navigate('/register');
                              }}
                              sx={{
                                borderColor: category.color,
                                color: category.color,
                                px: 4,
                                py: 1.5,
                                borderRadius: '50px',
                                '&:hover': {
                                  borderColor: category.color,
                                  backgroundColor: `${category.color}10`
                                }
                              }}
                            >
                              Learn More
                            </Button>
                          </Box>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Bottom CTA */}
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
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
              Not Sure Which Path Is Right for You?
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              Our intake process will help match you with the most appropriate services for your unique needs and goals.
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
              endIcon={<ArrowForwardIcon />}
            >
              Start Your Journey Today
            </Button>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ServiceCategories;