import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { motion } from 'framer-motion';
import Logo from '../Logo';
import { colorTokens, typographyClasses, componentStyles, logoIntegration, mobileAccessibility } from '../../utils/designSystem';
import optimizedAnimations from '../../utils/optimizedAnimations';
import architecturePreservation from '../../utils/architecturePreservation';

// Hero Slideshow Images - Using preserved image optimization patterns
const heroImages = architecturePreservation.images.loadImagesWithFallbacks([
  {
    localPath: 'hero-image-1.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1464822759844-d150baec0494?auto=format&fit=crop&w=1964&q=80',
    alt: 'Person on healing journey - representing hope and progress'
  },
  {
    localPath: 'hero-image-2.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1964&q=80',
    alt: 'Client in therapy session - professional counseling support'
  },
  {
    localPath: 'hero-image-3.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=1964&q=80',
    alt: 'Supportive therapy session - community healing'
  },
  {
    localPath: 'hero-image-4.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=1964&q=80',
    alt: 'Peaceful counseling session - professional therapeutic support'
  },
  {
    localPath: 'hero-image-5.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1964&q=80',
    alt: 'Serene nature path - journey of recovery and growth'
  },
  {
    localPath: 'hero-image-6.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=1964&q=80',
    alt: 'Supportive hands - empowerment and healing connection'
  }
]);

const HeroSection = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Validate component architecture on mount
  useEffect(() => {
    architecturePreservation.validateArchitecture();
  }, []);

  // Slideshow effect - optimized for performance
  useEffect(() => {
    // Skip slideshow on low performance devices or reduced motion preference
    if (optimizedAnimations.performance.prefersReducedMotion || 
        optimizedAnimations.performance.isLowPerformance) {
      return;
    }

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prevIndex) =>
          (prevIndex + 1) % heroImages.length
        );
        setIsTransitioning(false);
      }, optimizedAnimations.performance.isLowPerformance ? 400 : 800);
    }, optimizedAnimations.performance.isLowPerformance ? 6000 : 8000);

    return () => clearInterval(interval);
  }, []);

  return (
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
      {/* Background Images with Optimized Fade Transition */}
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
            ...optimizedAnimations.slideshow.imageTransition,
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
              {...optimizedAnimations.progressive.heroEntry}
            >
              <Typography
                variant="h1"
                component="h1"
                gutterBottom
                sx={{
                  ...typographyClasses.heroTitle,
                  mb: 1,
                }}
              >
                Smiling Steps
              </Typography>
              
              {/* Refined tagline as per requirements */}
              <Typography
                variant="h4"
                component="h2"
                gutterBottom
                sx={{
                  ...typographyClasses.tagline,
                  mb: 4,
                }}
              >
                <Box sx={logoIntegration.withText}>
                  <Logo size={40} />
                  Compassionate Counseling Rooted in Respect, Empowerment, and Hope
                </Box>
              </Typography>
              
              {/* Exactly two primary CTAs as per requirements with mobile-first accessibility */}
              <Box sx={mobileAccessibility.ctaContainer.mobile} data-testid="cta-container">
                <Button
                  onClick={() => navigate(architecturePreservation.routing.navigationPatterns.clientRegistration)}
                  variant="contained"
                  size="large"
                  sx={{
                    ...componentStyles.ctaButton.primary,
                    ...componentStyles.ctaButton.large,
                    ...architecturePreservation.components.preserveMUIIntegration.maintainComponentStyles.button
                  }}
                  aria-label="Get Support - Register as a client for therapy sessions"
                  data-testid="cta-button"
                >
                  Get Support
                </Button>
                <Button
                  onClick={() => navigate(architecturePreservation.routing.navigationPatterns.psychologistRegistration)}
                  variant="contained"
                  color="secondary"
                  size="large"
                  sx={{
                    ...componentStyles.ctaButton.secondary,
                    ...componentStyles.ctaButton.large,
                    ...architecturePreservation.components.preserveMUIIntegration.maintainComponentStyles.button
                  }}
                  aria-label="Join as a Professional - Register as a psychologist"
                  data-testid="cta-button"
                >
                  Join as a Professional
                </Button>
              </Box>
            </motion.div>
          </Grid>
          {!isMobile && (
            <Grid item xs={12} md={6}>
              <motion.div
                {...optimizedAnimations.progressive.imageSlideshow}
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
                        transition: optimizedAnimations.slideshow.imageTransition.transition,
                        '&:hover': optimizedAnimations.performance.prefersReducedMotion ? {} : {
                          transform: 'rotate(0deg)',
                        },
                      }}
                    />
                  ))}
                </Box>
              </motion.div>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Optimized Slideshow Indicators */}
      {!optimizedAnimations.performance.prefersReducedMotion && (
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
                border: '2px solid rgba(255,255,255,0.8)',
                ...optimizedAnimations.slideshow.indicators
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default HeroSection;