import React from 'react';
import { Box } from '@mui/material';

// Import the new marketing components
import HeroSection from '../components/marketing/HeroSection';
import CoreValuesStrip from '../components/marketing/CoreValuesStrip';
import ProblemSolutionNarrative from '../components/marketing/ProblemSolutionNarrative';
import HumanBenefits from '../components/marketing/HumanBenefits';
import TrustIndicators from '../components/marketing/TrustIndicators';
import TransitionCTA from '../components/marketing/TransitionCTA';

const LandingPageRefactored = () => {
  return (
    <Box sx={{ overflowX: 'hidden' }}>
      {/* Hero Section with refined tagline and dual CTAs */}
      <HeroSection />

      {/* Core Values Strip */}
      <CoreValuesStrip />

      {/* Problem/Solution Narrative (condensed to max 150 words) */}
      <ProblemSolutionNarrative />

      {/* Human-Centered Benefits (exactly 4 benefits) */}
      <HumanBenefits />

      {/* Trust Indicators */}
      <TrustIndicators />

      {/* Single transition CTA to Learn More Page */}
      <TransitionCTA />
    </Box>
  );
};

export default LandingPageRefactored;