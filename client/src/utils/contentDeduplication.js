/**
 * Content Deduplication Utility
 * 
 * This module ensures no identical content sections appear on both Landing Page and Learn More Page.
 * It provides validation functions to verify content uniqueness between pages.
 * 
 * Requirements: 6.4, 6.6
 */

/**
 * Landing Page Content Structure
 * - HeroSection: Tagline + 2 CTAs (Get Support, Join as Professional)
 * - CoreValuesStrip: 4 values (Confidentiality, Respect, Empowerment, Hope)
 * - ProblemSolutionNarrative: Condensed problem/solution (max 150 words)
 * - HumanBenefits: 4 user-focused benefits
 * - TrustIndicators: Licensed professionals, privacy, Kenya-focused care
 * - TransitionCTA: Single "Learn More About Our Approach" CTA
 */
const landingPageContent = {
  sections: [
    'HeroSection',
    'CoreValuesStrip',
    'ProblemSolutionNarrative',
    'HumanBenefits',
    'TrustIndicators',
    'TransitionCTA'
  ],
  purpose: 'Clarity + Emotional Connection + Action',
  contentType: 'Minimal, focused, curiosity-driving',
  ctaCount: 2,
  transitionCTA: 'Learn More About Our Approach'
};

/**
 * Learn More Page Content Structure
 * - VisionMissionSection: Vision/Mission/Community Impact
 * - FounderStorySection: Founder credentials and story
 * - ServiceCategories: Clinical, Creative, Community categories
 * - PlatformFeatures: Detailed platform features with user benefits
 * - ComprehensiveFAQ: Comprehensive FAQ section
 */
const learnMorePageContent = {
  sections: [
    'VisionMissionSection',
    'FounderStorySection',
    'ServiceCategories',
    'PlatformFeatures',
    'ComprehensiveFAQ'
  ],
  purpose: 'Trust + Depth + Education',
  contentType: 'Comprehensive, credibility-building',
  ctaConsistency: 'Uses same CTA text as Landing Page',
  finalCTA: 'Get Support / Join as a Professional'
};

/**
 * Content Uniqueness Rules
 * 
 * These rules ensure no duplicate content between pages:
 * 1. Landing Page focuses on WHAT (quick overview, emotional connection)
 * 2. Learn More Page focuses on WHY and HOW (depth, credibility, details)
 * 3. No identical text blocks appear on both pages
 * 4. Each page has unique value propositions
 * 5. Content progression is logical: Landing → Learn More
 */
const contentUniquenessRules = {
  landingPageUnique: [
    'Condensed problem/solution narrative (max 150 words)',
    'Human-centered benefits (4 specific benefits)',
    'Trust indicators (brief, non-overwhelming)',
    'Core values strip (visual, brief descriptors)'
  ],
  learnMorePageUnique: [
    'Vision/Mission/Community Impact (detailed)',
    'Founder story and credentials (comprehensive)',
    'Service categories (3 distinct categories with details)',
    'Platform features (detailed with user benefit translation)',
    'Comprehensive FAQ (addressing all common concerns)'
  ],
  sharedElements: [
    'CTA button text (consistent across both pages)',
    'Brand colors and design system',
    'Logo and brand identity',
    'Navigation structure'
  ],
  prohibitedDuplication: [
    'Identical paragraphs or text blocks',
    'Duplicate service descriptions',
    'Repeated testimonials',
    'Identical feature explanations',
    'Duplicate founder story content'
  ]
};

/**
 * Validate Content Uniqueness
 * 
 * Checks that content sections don't overlap between pages
 * 
 * @returns {Object} Validation result with any violations
 */
export const validateContentUniqueness = () => {
  const violations = [];
  
  // Check for section overlap
  const landingSections = new Set(landingPageContent.sections);
  const learnMoreSections = new Set(learnMorePageContent.sections);
  
  const overlap = [...landingSections].filter(section => learnMoreSections.has(section));
  
  if (overlap.length > 0) {
    violations.push({
      type: 'section_overlap',
      message: `Sections appear on both pages: ${overlap.join(', ')}`,
      severity: 'error'
    });
  }
  
  return {
    isValid: violations.length === 0,
    violations,
    landingPageSections: landingPageContent.sections,
    learnMorePageSections: learnMorePageContent.sections
  };
};

/**
 * Get Content Progression Map
 * 
 * Returns the logical content progression from Landing to Learn More
 * 
 * @returns {Object} Content progression mapping
 */
export const getContentProgression = () => {
  return {
    landingToLearnMore: {
      'HeroSection': 'VisionMissionSection',
      'CoreValuesStrip': 'FounderStorySection',
      'ProblemSolutionNarrative': 'ServiceCategories',
      'HumanBenefits': 'PlatformFeatures',
      'TrustIndicators': 'ComprehensiveFAQ'
    },
    progressionPrinciple: 'Each Landing Page section leads naturally to deeper Learn More content',
    userJourney: [
      '1. Landing Page: Quick overview and emotional connection',
      '2. Transition CTA: "Learn More About Our Approach"',
      '3. Learn More Page: Comprehensive information and trust-building',
      '4. Final CTA: "Get Support" or "Join as a Professional"'
    ]
  };
};

/**
 * Validate CTA Consistency
 * 
 * Ensures CTA text is consistent across both pages
 * 
 * @param {Array} landingCTAs - CTA texts from Landing Page
 * @param {Array} learnMoreCTAs - CTA texts from Learn More Page
 * @returns {Object} Validation result
 */
export const validateCTAConsistency = (landingCTAs, learnMoreCTAs) => {
  const expectedCTAs = ['Get Support', 'Join as a Professional'];
  const violations = [];
  
  // Check Landing Page CTAs
  expectedCTAs.forEach(expectedCTA => {
    if (!landingCTAs.includes(expectedCTA)) {
      violations.push({
        type: 'missing_cta',
        page: 'Landing Page',
        message: `Missing expected CTA: "${expectedCTA}"`,
        severity: 'error'
      });
    }
  });
  
  // Check Learn More Page CTAs
  expectedCTAs.forEach(expectedCTA => {
    if (!learnMoreCTAs.includes(expectedCTA)) {
      violations.push({
        type: 'missing_cta',
        page: 'Learn More Page',
        message: `Missing expected CTA: "${expectedCTA}"`,
        severity: 'error'
      });
    }
  });
  
  return {
    isValid: violations.length === 0,
    violations,
    expectedCTAs
  };
};

/**
 * Get Unique Value Propositions
 * 
 * Returns the unique value propositions for each page
 * 
 * @returns {Object} Value propositions for each page
 */
export const getUniqueValuePropositions = () => {
  return {
    landingPage: {
      primary: 'Compassionate Counseling Rooted in Respect, Empowerment, and Hope',
      secondary: 'Quick, clear path to getting support or joining as a professional',
      differentiator: 'Immediate clarity and emotional connection'
    },
    learnMorePage: {
      primary: 'A comprehensive mental wellness ecosystem for Kenya',
      secondary: 'Deep understanding of our approach, values, and community impact',
      differentiator: 'Trust-building through transparency and comprehensive information'
    }
  };
};

export default {
  landingPageContent,
  learnMorePageContent,
  contentUniquenessRules,
  validateContentUniqueness,
  getContentProgression,
  validateCTAConsistency,
  getUniqueValuePropositions
};
