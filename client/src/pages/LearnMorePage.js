import React from 'react';
import { Box } from '@mui/material';

// Import the marketing components for Learn More Page
import LearnMoreHero from '../components/marketing/LearnMoreHero';
import VisionMissionSection from '../components/marketing/VisionMissionSection';
import FounderStorySection from '../components/marketing/FounderStorySection';
import ServiceCategories from '../components/marketing/ServiceCategories';
import PlatformFeatures from '../components/marketing/PlatformFeatures';
import ComprehensiveFAQ from '../components/marketing/ComprehensiveFAQ';

const LearnMorePage = () => {
  return (
    <Box sx={{ overflowX: 'hidden' }}>
      {/* Hero Section with Hook Statement and Logo */}
      <LearnMoreHero />

      {/* Vision/Mission/Community Impact */}
      <VisionMissionSection />

      {/* Founder Story/Credentials */}
      <FounderStorySection />

      {/* Service Categories (Clinical, Creative, Community) */}
      <ServiceCategories />

      {/* Platform Features */}
      <PlatformFeatures />

      {/* Comprehensive FAQ Section */}
      <ComprehensiveFAQ />
    </Box>
  );
};

export default LearnMorePage;
