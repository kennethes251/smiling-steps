/**
 * Conversion Optimization Utility
 * 
 * This module implements conversion optimization elements for the marketing pages:
 * - Limits Landing Page to two clear decision paths
 * - Includes social proof, authority, and trust signals
 * - Addresses common objections through strategic content placement
 * 
 * Requirements: 8.1, 8.3, 8.5
 */

/**
 * Decision Paths Configuration
 * 
 * Landing Page must have exactly 2 clear decision paths:
 * 1. Get Support (for clients seeking therapy)
 * 2. Join as a Professional (for psychologists)
 */
export const decisionPaths = {
  primary: [
    {
      id: 'get-support',
      label: 'Get Support',
      description: 'Book a session with a licensed therapist',
      targetAudience: 'clients',
      route: '/register/client',
      priority: 1,
      color: '#663399',
      icon: '🤝'
    },
    {
      id: 'join-professional',
      label: 'Join as a Professional',
      description: 'Become part of our therapist community',
      targetAudience: 'psychologists',
      route: '/register/psychologist',
      priority: 2,
      color: '#2E7D32',
      icon: '👨‍⚕️'
    }
  ],
  secondary: [
    {
      id: 'learn-more',
      label: 'Learn More About Our Approach',
      description: 'Discover our comprehensive mental wellness ecosystem',
      targetAudience: 'all',
      route: '/learn-more',
      priority: 3,
      color: '#1976D2',
      icon: '📖'
    }
  ]
};

/**
 * Social Proof Elements
 * 
 * Evidence that others trust and use the platform
 */
export const socialProof = {
  statistics: {
    happyClients: {
      value: '500+',
      label: 'Happy Clients',
      description: 'Individuals supported on their healing journey',
      icon: '😊'
    },
    licensedTherapists: {
      value: '50+',
      label: 'Licensed Therapists',
      description: 'Verified mental health professionals',
      icon: '👨‍⚕️'
    },
    satisfactionRate: {
      value: '95%',
      label: 'Satisfaction Rate',
      description: 'Client satisfaction with our services',
      icon: '⭐'
    },
    supportAvailable: {
      value: '24/7',
      label: 'Support Available',
      description: 'Round-the-clock platform access',
      icon: '🕐'
    }
  },
  testimonials: [
    {
      id: 'testimonial-1',
      name: 'Maria K.',
      role: 'Recovery Journey',
      content: 'Smiling Steps gave me hope when I thought recovery was impossible. The counselors truly understand addiction and treat you with dignity.',
      rating: 5,
      verified: true,
      category: 'client'
    },
    {
      id: 'testimonial-2',
      name: 'James M.',
      role: 'Family Member',
      content: 'The family support and education helped us understand addiction better. We learned how to support our loved one without enabling.',
      rating: 5,
      verified: true,
      category: 'family'
    },
    {
      id: 'testimonial-3',
      name: 'Dr. Sarah L.',
      role: 'Addiction Counselor',
      content: 'Working with Smiling Steps allows me to provide compassionate, evidence-based care. The platform truly supports both clients and therapists.',
      rating: 5,
      verified: true,
      category: 'professional'
    }
  ],
  trustBadges: [
    {
      id: 'licensed-professionals',
      label: 'Licensed Professionals',
      description: 'All therapists are verified and licensed',
      icon: '✓',
      color: '#2E7D32'
    },
    {
      id: 'secure-platform',
      label: 'Secure & Private',
      description: 'End-to-end encryption for all sessions',
      icon: '🔒',
      color: '#1976D2'
    },
    {
      id: 'kenya-focused',
      label: 'Kenya-Focused Care',
      description: 'Understanding local context and culture',
      icon: '🇰🇪',
      color: '#663399'
    }
  ]
};

/**
 * Authority Signals
 * 
 * Elements that establish credibility and expertise
 */
export const authoritySignals = {
  founder: {
    name: 'Kenneth Esilo',
    title: 'Licensed Addiction Counselor & Founder',
    credentials: [
      'Licensed Addiction Counselor',
      'Mental Health Professional',
      'Community Educator',
      'Recovery Advocate'
    ],
    experience: 'Years of experience in addiction recovery and mental health support',
    philosophy: 'Healing through respect, creativity, and genuine human connection',
    localPresence: 'Based in Nairobi, Kenya with deep understanding of local context'
  },
  certifications: [
    {
      id: 'licensed-counselors',
      name: 'Licensed Counselors',
      description: 'All therapists hold valid professional licenses',
      verified: true
    },
    {
      id: 'hipaa-compliant',
      name: 'Privacy Compliant',
      description: 'Following strict confidentiality standards',
      verified: true
    },
    {
      id: 'evidence-based',
      name: 'Evidence-Based Approaches',
      description: 'Using research-backed therapeutic methods',
      verified: true
    }
  ],
  mediaPresence: {
    blog: 'Educational articles on healing and recovery',
    resources: 'Downloadable guides and community education materials',
    workshops: 'Community workshops and family support programs'
  }
};

/**
 * Common Objections and Responses
 * 
 * Strategic content placement to address user concerns
 */
export const objectionHandling = {
  objections: [
    {
      id: 'privacy-concerns',
      objection: 'Is my information really confidential?',
      response: 'Absolutely. We use end-to-end encryption and follow strict confidentiality standards. Your privacy is our top priority.',
      placement: 'TrustIndicators section',
      supportingEvidence: ['End-to-end encryption', 'Strict confidentiality protocols', 'Secure platform'],
      icon: '🔒'
    },
    {
      id: 'cost-concerns',
      objection: 'Can I afford therapy?',
      response: 'Sessions start from KES 2,000. We accept M-Pesa payments for convenience and offer package deals.',
      placement: 'FAQ section',
      supportingEvidence: ['Transparent pricing', 'M-Pesa integration', 'Package deals available'],
      icon: '💰'
    },
    {
      id: 'effectiveness-concerns',
      objection: 'Does online therapy really work?',
      response: 'Yes! Research shows online therapy is as effective as in-person sessions. Our 95% satisfaction rate speaks for itself.',
      placement: 'Social proof section',
      supportingEvidence: ['95% satisfaction rate', '500+ happy clients', 'Evidence-based approaches'],
      icon: '📊'
    },
    {
      id: 'stigma-concerns',
      objection: 'What will people think if I seek therapy?',
      response: 'Seeking help is a sign of strength, not weakness. Our platform provides private, confidential support.',
      placement: 'Problem/Solution narrative',
      supportingEvidence: ['Confidential platform', 'Stigma reduction focus', 'Supportive community'],
      icon: '💪'
    },
    {
      id: 'quality-concerns',
      objection: 'Are the therapists qualified?',
      response: 'All our therapists are licensed mental health professionals with verified credentials and extensive experience.',
      placement: 'Trust indicators section',
      supportingEvidence: ['Licensed professionals', 'Verified credentials', 'Ongoing training'],
      icon: '✓'
    },
    {
      id: 'commitment-concerns',
      objection: 'What if I want to switch therapists?',
      response: 'You can easily switch therapists through your dashboard at any time. We want you to feel comfortable.',
      placement: 'FAQ section',
      supportingEvidence: ['Flexible matching', 'Easy switching', 'Client-centered approach'],
      icon: '🔄'
    },
    {
      id: 'technology-concerns',
      objection: 'Is the platform easy to use?',
      response: 'Yes! Access everything through your web browser - no downloads required. Simple, intuitive interface.',
      placement: 'Platform features section',
      supportingEvidence: ['Web-based platform', 'No downloads needed', 'Intuitive design'],
      icon: '💻'
    },
    {
      id: 'local-context-concerns',
      objection: 'Do therapists understand Kenyan culture?',
      response: 'Our founder and many therapists are based in Kenya with deep understanding of local context and cultural considerations.',
      placement: 'Founder story section',
      supportingEvidence: ['Kenya-based founder', 'Local therapists', 'Cultural sensitivity'],
      icon: '🇰🇪'
    }
  ]
};

/**
 * Conversion Funnel Configuration
 * 
 * Defines the logical progression from awareness to action
 */
export const conversionFunnel = {
  stages: [
    {
      stage: 'awareness',
      page: 'Landing Page',
      goal: 'Capture attention and create emotional connection',
      elements: ['Hero section', 'Core values', 'Problem/solution narrative'],
      metrics: ['Page views', 'Time on page', 'Scroll depth']
    },
    {
      stage: 'interest',
      page: 'Landing Page',
      goal: 'Build curiosity and demonstrate value',
      elements: ['Human benefits', 'Trust indicators'],
      metrics: ['Section engagement', 'CTA hover rate']
    },
    {
      stage: 'consideration',
      page: 'Learn More Page',
      goal: 'Provide comprehensive information and build trust',
      elements: ['Vision/mission', 'Founder story', 'Service categories', 'Platform features'],
      metrics: ['Learn More clicks', 'Time on Learn More page', 'FAQ engagement']
    },
    {
      stage: 'decision',
      page: 'Both pages',
      goal: 'Convert visitors into registered users',
      elements: ['Primary CTAs', 'Final CTA'],
      metrics: ['CTA clicks', 'Registration starts', 'Registration completions']
    }
  ],
  touchpoints: [
    {
      id: 'hero-cta',
      location: 'Landing Page - Hero Section',
      type: 'primary',
      action: 'Get Support / Join as Professional',
      priority: 'high'
    },
    {
      id: 'transition-cta',
      location: 'Landing Page - End',
      type: 'secondary',
      action: 'Learn More About Our Approach',
      priority: 'medium'
    },
    {
      id: 'learn-more-cta',
      location: 'Learn More Page - End',
      type: 'primary',
      action: 'Get Support / Join as Professional',
      priority: 'high'
    }
  ]
};

/**
 * Validate Decision Path Limit
 * 
 * Ensures Landing Page has exactly 2 primary decision paths
 * 
 * @param {Array} ctaButtons - Array of CTA buttons on the page
 * @returns {Object} Validation result
 */
export const validateDecisionPathLimit = (ctaButtons) => {
  const primaryCTAs = ctaButtons.filter(cta => cta.type === 'primary');
  const violations = [];
  
  if (primaryCTAs.length !== 2) {
    violations.push({
      type: 'decision_path_limit',
      message: `Landing Page should have exactly 2 primary CTAs, found ${primaryCTAs.length}`,
      severity: 'error',
      expected: 2,
      actual: primaryCTAs.length
    });
  }
  
  const expectedLabels = ['Get Support', 'Join as a Professional'];
  expectedLabels.forEach(label => {
    if (!primaryCTAs.some(cta => cta.label === label)) {
      violations.push({
        type: 'missing_decision_path',
        message: `Missing expected CTA: "${label}"`,
        severity: 'error'
      });
    }
  });
  
  return {
    isValid: violations.length === 0,
    violations,
    primaryCTACount: primaryCTAs.length,
    expectedCount: 2
  };
};

/**
 * Get Objection Response
 * 
 * Returns the appropriate response for a given objection
 * 
 * @param {string} objectionId - ID of the objection
 * @returns {Object|null} Objection details and response
 */
export const getObjectionResponse = (objectionId) => {
  return objectionHandling.objections.find(obj => obj.id === objectionId) || null;
};

/**
 * Get Social Proof for Section
 * 
 * Returns appropriate social proof elements for a given section
 * Optionally merges with dynamic statistics
 * 
 * @param {string} sectionName - Name of the section
 * @param {Object} dynamicStats - Optional dynamic statistics from API
 * @returns {Object} Social proof elements
 */
export const getSocialProofForSection = (sectionName, dynamicStats = null) => {
  const sectionMapping = {
    'hero': ['statistics'],
    'trust-indicators': ['trustBadges', 'certifications'],
    'testimonials': ['testimonials', 'statistics'],
    'learn-more': ['testimonials', 'trustBadges']
  };
  
  const elements = sectionMapping[sectionName] || [];
  const result = {};
  
  elements.forEach(element => {
    if (socialProof[element]) {
      result[element] = socialProof[element];
    }
  });
  
  // Merge dynamic statistics if provided
  if (dynamicStats && result.statistics) {
    result.statistics = {
      ...result.statistics,
      ...dynamicStats
    };
  }
  
  return result;
};

/**
 * Merge Dynamic Statistics with Static Configuration
 * 
 * Combines real-time statistics from the database with static configuration
 * 
 * @param {Object} dynamicStats - Statistics from platformStatsService
 * @returns {Object} Complete social proof configuration with dynamic data
 */
export const mergeDynamicStats = (dynamicStats) => {
  if (!dynamicStats) {
    return socialProof;
  }
  
  return {
    ...socialProof,
    statistics: {
      ...socialProof.statistics,
      ...dynamicStats
    }
  };
};

export default {
  decisionPaths,
  socialProof,
  authoritySignals,
  objectionHandling,
  conversionFunnel,
  validateDecisionPathLimit,
  getObjectionResponse,
  getSocialProofForSection,
  mergeDynamicStats
};
