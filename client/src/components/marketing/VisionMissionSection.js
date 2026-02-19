import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent
} from '@mui/material';
import { motion } from 'framer-motion';

const VisionMissionSection = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const communityImpactStats = [
    {
      statistic: '500+',
      description: 'Individuals supported in their recovery journey',
      icon: '🤝'
    },
    {
      statistic: '50+',
      description: 'Licensed professionals in our network',
      icon: '👩‍⚕️'
    },
    {
      statistic: '95%',
      description: 'Client satisfaction with our compassionate approach',
      icon: '⭐'
    },
    {
      statistic: '24/7',
      description: 'Community support and crisis resources available',
      icon: '🌟'
    }
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: '#FAFAFA' }}>
      <Container maxWidth="lg">
        {/* Vision Statement */}
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
              background: 'linear-gradient(135deg, rgba(102, 51, 153, 0.1), rgba(156, 39, 176, 0.1))',
              borderRadius: '20px',
              border: '1px solid rgba(102, 51, 153, 0.2)'
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
              Our Vision
            </Typography>
            <Typography
              variant="h4"
              sx={{
                color: '#663399',
                fontStyle: 'italic',
                fontWeight: 300,
                lineHeight: 1.4,
                maxWidth: '800px',
                mx: 'auto'
              }}
            >
              A world where mental wellness is accessible, stigma-free, and rooted in dignity—where every person has the support they need to heal and thrive.
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
              Our Mission
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                textAlign: 'center', 
                lineHeight: 1.7, 
                color: 'text.primary', 
                maxWidth: '900px', 
                mx: 'auto',
                mb: 4
              }}
            >
              Smiling Steps creates a comprehensive mental wellness ecosystem that goes beyond traditional therapy. 
              We provide compassionate counseling, creative healing modalities, and community support that empowers 
              individuals to navigate addiction recovery and mental health challenges with dignity, respect, and hope.
            </Typography>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: '#663399', 
                  fontStyle: 'italic',
                  fontWeight: 300
                }}
              >
                "We don't just provide therapy—we nurture a community of healing."
              </Typography>
            </Box>
          </Paper>
        </motion.div>

        {/* Mental Wellness Ecosystem Positioning */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Typography variant="h3" sx={{ textAlign: 'center', mb: 6, fontWeight: 'bold', color: '#663399' }}>
            More Than Therapy: A Complete Wellness Ecosystem
          </Typography>

          <Grid container spacing={4} sx={{ mb: 8 }}>
            {[
              {
                icon: '🧠',
                title: 'Clinical Excellence',
                description: 'Evidence-based therapeutic approaches delivered by licensed professionals with specialized training in addiction recovery and mental health support'
              },
              {
                icon: '🎨',
                title: 'Creative Healing',
                description: 'Art therapy, music therapy, and expressive modalities that engage different pathways to healing and self-discovery'
              },
              {
                icon: '🤝',
                title: 'Community Support',
                description: 'Peer support groups, family education, and community resources that create a network of understanding and encouragement'
              },
              {
                icon: '🌱',
                title: 'Holistic Recovery',
                description: 'Comprehensive approach addressing mental, emotional, and social aspects of healing for sustainable long-term recovery'
              }
            ].map((pillar, index) => (
              <Grid item xs={12} md={6} key={index}>
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
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                      },
                      borderRadius: '15px'
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 0 }}>
                      <Box sx={{ fontSize: '3rem', mb: 3 }}>
                        {pillar.icon}
                      </Box>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#663399' }}>
                        {pillar.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                        {pillar.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>

        {/* Community Impact Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Typography variant="h3" sx={{ textAlign: 'center', mb: 6, fontWeight: 'bold', color: '#663399' }}>
            Our Community Impact
          </Typography>

          <Paper
            elevation={3}
            sx={{
              p: 6,
              backgroundColor: 'white',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #E3F2FD 0%, #F3E5F5 100%)'
            }}
          >
            <Grid container spacing={4} textAlign="center">
              {communityImpactStats.map((stat, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Box sx={{ fontSize: '3rem', mb: 2 }}>
                      {stat.icon}
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1, color: '#663399' }}>
                      {stat.statistic}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                      {stat.description}
                    </Typography>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </motion.div>

        {/* Inspirational Closing */}
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
            <Typography variant="h4" sx={{ mb: 3, fontStyle: 'italic', fontWeight: 300 }}>
              "Together, we're building a community where healing happens through connection, creativity, and compassion."
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Join us in creating a stigma-free world where mental wellness is accessible to all.
            </Typography>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default VisionMissionSection;