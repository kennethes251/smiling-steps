/**
 * Kenya Market Localization Utilities
 * Provides Kenya-specific content, formatting, and cultural context
 * Requirements: 7.1, 7.2, 7.4, 7.5
 */

// Kenya-specific payment integration content
export const paymentIntegration = {
  mpesa: {
    title: 'M-Pesa Payment Integration',
    description: 'Pay for therapy sessions easily using your mobile money - no credit card needed',
    benefits: [
      'Instant payment confirmation',
      'Support for Safaricom, Airtel Money, and T-Kash',
      'No international transaction fees',
      'Secure mobile money transactions',
      'Payment history and receipts via SMS'
    ],
    supportedNetworks: [
      { name: 'Safaricom M-Pesa', logo: '📱', coverage: '99%' },
      { name: 'Airtel Money', logo: '💳', coverage: '85%' },
      { name: 'T-Kash (Telkom)', logo: '💰', coverage: '70%' }
    ]
  },
  pricing: {
    currency: 'KES',
    symbol: 'KSh',
    format: (amount) => `KSh ${amount.toLocaleString('en-KE')}`,
    samplePrices: {
      individual_session: 3500,
      group_session: 2000,
      assessment: 2500,
      monthly_package: 12000
    }
  }
};

// Kenya mental health context and cultural considerations
export const mentalHealthContext = {
  stigmaReduction: {
    title: 'Breaking Mental Health Stigma in Kenya',
    description: 'We understand the unique challenges of seeking mental health support in Kenya',
    points: [
      'Confidential, judgment-free environment',
      'Culturally sensitive therapeutic approaches',
      'Understanding of Kenyan family dynamics',
      'Respect for traditional healing alongside modern therapy',
      'Community-based support that honors our collective culture'
    ]
  },
  localChallenges: [
    'Mental health stigma in communities',
    'Limited access to qualified professionals',
    'High cost of traditional therapy',
    'Language and cultural barriers',
    'Lack of mental health awareness'
  ],
  culturalSensitivity: {
    approaches: [
      'Integration of Ubuntu philosophy in therapy',
      'Respect for elder wisdom and family consultation',
      'Understanding of communal vs. individual healing',
      'Incorporation of spiritual and traditional elements',
      'Multilingual support (English, Kiswahili, local languages)'
    ]
  }
};

// Local presence and founder context
export const localPresence = {
  founder: {
    kenyanContext: 'Born and raised in Kenya, our founder understands the unique mental health challenges facing our communities',
    localExperience: 'Over 10 years of experience working with Kenyan families and communities',
    culturalUnderstanding: 'Deep appreciation for Kenyan values of Ubuntu, community support, and collective healing',
    education: 'Trained both locally and internationally, bringing global best practices to Kenyan context'
  },
  community: {
    partnerships: [
      'Kenya Association of Professional Counsellors (KAPC)',
      'Kenya Psychological Association (KPA)',
      'Local community health centers',
      'University counseling programs'
    ],
    outreach: [
      'Mental health awareness campaigns in schools',
      'Community workshops on stress management',
      'Support for families affected by addiction',
      'Training programs for local counselors'
    ]
  }
};

// Kenya-specific service adaptations
export const localizedServices = {
  languageSupport: {
    primary: 'English',
    secondary: 'Kiswahili',
    additional: ['Kikuyu', 'Luo', 'Luhya', 'Kamba'],
    note: 'Therapy sessions available in multiple Kenyan languages'
  },
  culturalAdaptations: {
    familyTherapy: 'Extended family involvement respected and encouraged',
    groupSessions: 'Community-style healing circles',
    spirituality: 'Integration of faith and traditional beliefs',
    genderSensitive: 'Male and female therapists available for cultural comfort'
  },
  accessibility: {
    internetOptimization: 'Platform optimized for Kenyan internet speeds',
    dataUsage: 'Low-bandwidth options for video sessions',
    offlineResources: 'Downloadable materials for offline access',
    mobileFirst: 'Designed for smartphone access across Kenya'
  }
};

// Pricing in Kenyan Shillings with local context
export const kenyaPricing = {
  individual: {
    session: { amount: 3500, description: 'One-on-one therapy session (50 minutes)' },
    assessment: { amount: 2500, description: 'Initial mental health assessment' },
    followUp: { amount: 3000, description: 'Follow-up session (45 minutes)' }
  },
  group: {
    session: { amount: 2000, description: 'Group therapy session (90 minutes)' },
    workshop: { amount: 1500, description: 'Mental health workshop' }
  },
  packages: {
    monthly: { amount: 12000, sessions: 4, description: 'Monthly therapy package (4 sessions)' },
    quarterly: { amount: 32000, sessions: 12, description: 'Quarterly package (12 sessions)' },
    family: { amount: 15000, sessions: 4, description: 'Family therapy package (4 sessions)' }
  },
  accessibility: {
    sliding_scale: 'Sliding scale pricing available based on income',
    student_discount: '20% discount for students with valid ID',
    community_support: 'Community-sponsored sessions for those in need'
  }
};

// Kenya-specific trust indicators
export const trustIndicators = {
  licensing: {
    title: 'Licensed Kenyan Professionals',
    description: 'All our therapists are licensed by the Kenya Medical Practitioners and Dentists Council',
    certifications: [
      'Kenya Medical Practitioners and Dentists Council (KMPDC)',
      'Kenya Association of Professional Counsellors (KAPC)',
      'Kenya Psychological Association (KPA)'
    ]
  },
  privacy: {
    title: 'Privacy Protection',
    description: 'Your information is protected according to Kenyan data protection laws',
    compliance: [
      'Kenya Data Protection Act 2019 compliant',
      'Secure data storage within Kenya',
      'Confidentiality guaranteed under Kenyan law',
      'No sharing with third parties without consent'
    ]
  },
  localFocus: {
    title: 'Kenya-Focused Care',
    description: 'Mental health support designed specifically for Kenyan communities',
    features: [
      'Understanding of Kenyan cultural context',
      'Awareness of local mental health challenges',
      'Integration with Kenyan healthcare system',
      'Support for local mental health initiatives'
    ]
  }
};

// Utility functions for Kenya market integration
export const kenyaUtils = {
  // Format currency in Kenyan Shillings
  formatCurrency: (amount) => {
    return `KSh ${amount.toLocaleString('en-KE')}`;
  },

  // Get appropriate greeting based on time
  getLocalGreeting: () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Habari za asubuhi'; // Good morning
    if (hour < 17) return 'Habari za mchana'; // Good afternoon
    return 'Habari za jioni'; // Good evening
  },

  // Check if M-Pesa is available (simplified check)
  isMpesaAvailable: () => {
    // In real implementation, would check user's location/network
    return true;
  },

  // Get culturally appropriate mental health messaging
  getCulturalMessage: (context = 'general') => {
    const messages = {
      general: 'Healing happens in community - you are not alone in this journey',
      family: 'Strong families build strong communities - let us support your family\'s wellbeing',
      youth: 'Your mental health matters - invest in your future self',
      stigma: 'Seeking help is a sign of strength, not weakness'
    };
    return messages[context] || messages.general;
  },

  // Generate Kenya-specific testimonial context
  getLocalTestimonial: () => {
    return {
      quote: "Smiling Steps helped me understand that seeking therapy doesn't go against our culture - it strengthens it.",
      author: "Sarah M., Nairobi",
      context: "Mother of two, overcame postpartum depression"
    };
  }
};

export default {
  paymentIntegration,
  mentalHealthContext,
  localPresence,
  localizedServices,
  kenyaPricing,
  trustIndicators,
  kenyaUtils
};