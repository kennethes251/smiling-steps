/**
 * Design System Utilities for Marketing Pages Refactor
 * Ensures consistent styling across Landing Page and Learn More Page
 * Requirements: 3.1, 3.4, 3.5, 3.6
 */

// Primary color tokens from theme (#663399 primary)
export const colorTokens = {
  primary: {
    main: '#663399',
    light: '#9C27B0',
    dark: '#512DA8',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#BA68C8',
    light: '#E1BEE7',
    dark: '#8E24AA',
    contrastText: '#FFFFFF',
  },
  healing: {
    hope: '#9C27B0',
    empowerment: '#2E7D32',
    creativity: '#F57C00',
    trust: '#1976D2',
    respect: '#663399',
  },
  background: {
    default: '#FAFAFA',
    paper: '#FFFFFF',
    soft: '#F3E5F5',
    gradient: 'linear-gradient(135deg, rgba(186, 104, 200, 0.1), rgba(149, 117, 205, 0.1))',
  },
  text: {
    primary: '#2C2C2C',
    secondary: '#666666',
    accent: '#663399',
  }
};

// Typography classes for consistent text styling
export const typographyClasses = {
  heroTitle: {
    fontWeight: 800,
    lineHeight: 1.1,
    fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
    background: 'linear-gradient(45deg, #663399, #9C27B0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  sectionTitle: {
    fontWeight: 700,
    color: colorTokens.primary.main,
    textAlign: 'center',
    mb: 2,
  },
  tagline: {
    fontWeight: 500,
    lineHeight: 1.3,
    color: colorTokens.primary.main,
    fontStyle: 'italic',
    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
  },
  bodyText: {
    lineHeight: 1.7,
    color: colorTokens.text.primary,
  },
  subtitle: {
    color: colorTokens.text.secondary,
    lineHeight: 1.6,
    textAlign: 'center',
  }
};

// Component styling patterns for consistency
export const componentStyles = {
  // CTA Button styles with mobile-first accessibility (44px minimum touch target)
  ctaButton: {
    primary: {
      px: 4,
      py: 1.5,
      minHeight: 44, // Minimum 44px touch target size
      minWidth: 44,  // Minimum 44px touch target size
      fontSize: '1.1rem',
      fontWeight: 600,
      textTransform: 'none',
      borderRadius: 2,
      boxShadow: '0 4px 14px rgba(102, 51, 153, 0.3)',
      background: `linear-gradient(45deg, ${colorTokens.primary.main}, ${colorTokens.primary.light})`,
      // Mobile-first spacing for touch interaction
      margin: { xs: '8px 4px', sm: '4px 8px' },
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 20px rgba(102, 51, 153, 0.4)',
        background: `linear-gradient(45deg, ${colorTokens.primary.dark}, ${colorTokens.primary.main})`,
      },
      '&:focus': {
        outline: `3px solid ${colorTokens.primary.light}`,
        outlineOffset: '2px',
      },
      transition: 'all 0.3s',
    },
    secondary: {
      px: 4,
      py: 1.5,
      minHeight: 44, // Minimum 44px touch target size
      minWidth: 44,  // Minimum 44px touch target size
      fontSize: '1.1rem',
      fontWeight: 600,
      textTransform: 'none',
      borderRadius: 2,
      boxShadow: '0 4px 14px rgba(156, 39, 176, 0.3)',
      backgroundColor: colorTokens.secondary.main,
      // Mobile-first spacing for touch interaction
      margin: { xs: '8px 4px', sm: '4px 8px' },
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 20px rgba(156, 39, 176, 0.4)',
        backgroundColor: colorTokens.secondary.dark,
      },
      '&:focus': {
        outline: `3px solid ${colorTokens.secondary.light}`,
        outlineOffset: '2px',
      },
      transition: 'all 0.3s',
    },
    outlined: {
      px: 4,
      py: 1.5,
      minHeight: 44, // Minimum 44px touch target size
      minWidth: 44,  // Minimum 44px touch target size
      fontSize: '1.1rem',
      fontWeight: 600,
      textTransform: 'none',
      borderRadius: 2,
      borderWidth: 2,
      borderColor: colorTokens.primary.main,
      color: colorTokens.primary.main,
      // Mobile-first spacing for touch interaction
      margin: { xs: '8px 4px', sm: '4px 8px' },
      '&:hover': {
        borderWidth: 2,
        borderColor: colorTokens.primary.dark,
        backgroundColor: 'rgba(102, 51, 153, 0.04)',
        transform: 'translateY(-1px)',
      },
      '&:focus': {
        outline: `3px solid ${colorTokens.primary.light}`,
        outlineOffset: '2px',
      },
      transition: 'all 0.3s',
    },
    // Large CTA for hero sections with enhanced mobile accessibility
    large: {
      px: { xs: 3, sm: 4 },
      py: { xs: 2, sm: 1.5 },
      minHeight: { xs: 48, sm: 44 }, // Larger on mobile for easier touch
      minWidth: { xs: 120, sm: 44 },  // Wider on mobile
      fontSize: { xs: '1rem', sm: '1.1rem' },
      fontWeight: 600,
      textTransform: 'none',
      borderRadius: 2,
      // Enhanced mobile spacing
      margin: { xs: '12px 8px', sm: '8px 12px' },
      '&:focus': {
        outline: `3px solid ${colorTokens.primary.light}`,
        outlineOffset: '2px',
      },
      transition: 'all 0.3s',
    }
  },

  // Card styles for consistent elevation and styling
  card: {
    default: {
      borderRadius: 3,
      transition: 'all 0.3s ease',
      border: '1px solid rgba(102, 51, 153, 0.1)',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        borderColor: colorTokens.primary.main,
      }
    },
    elevated: {
      borderRadius: 3,
      boxShadow: '0 4px 20px rgba(102, 51, 153, 0.08)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-8px)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
      }
    }
  },

  // Section containers for consistent spacing
  section: {
    default: {
      py: { xs: 8, md: 12 },
    },
    withBackground: {
      py: { xs: 8, md: 12 },
      background: colorTokens.background.gradient,
    },
    paper: {
      py: { xs: 8, md: 12 },
      backgroundColor: colorTokens.background.paper,
    }
  },

  // Icon containers for consistent styling
  iconContainer: {
    default: (color) => ({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      height: 80,
      mb: 2,
      borderRadius: '50%',
      backgroundColor: `${color}15`,
      border: `2px solid ${color}30`,
      mx: 'auto'
    }),
    large: (color) => ({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: 100,
      height: 100,
      mb: 3,
      borderRadius: '50%',
      backgroundColor: `${color}15`,
      border: `2px solid ${color}30`,
      mx: 'auto'
    })
  },

  // Gradient backgrounds for sections
  gradientBackground: {
    primary: {
      background: `linear-gradient(135deg, ${colorTokens.primary.main}, ${colorTokens.primary.light})`,
      color: 'white',
      borderRadius: '20px',
    },
    soft: {
      background: 'linear-gradient(135deg, #f5f7ff 0%, #f0f4ff 100%)',
      borderRadius: '15px',
    },
    healing: {
      background: 'linear-gradient(135deg, #E3F2FD 0%, #F3E5F5 100%)',
      borderRadius: '20px',
    }
  }
};

// Animation variants for consistent motion
export const animationVariants = {
  fadeInUp: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8 }
  },
  fadeInUpDelayed: (delay = 0) => ({
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay }
  }),
  staggerChildren: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  },
  hoverLift: {
    whileHover: { y: -5 },
    transition: { duration: 0.3 }
  }
};

// Responsive breakpoints for consistent layout
export const breakpoints = {
  mobile: 'xs',
  tablet: 'sm', 
  desktop: 'md',
  large: 'lg',
  xlarge: 'xl'
};

// Spacing system for consistent margins and padding
export const spacing = {
  section: { xs: 8, md: 12 },
  component: { xs: 4, md: 6 },
  element: { xs: 2, md: 3 },
  tight: { xs: 1, md: 2 }
};

// Logo component integration helper
export const logoIntegration = {
  withText: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    justifyContent: 'center'
  },
  standalone: {
    display: 'flex',
    justifyContent: 'center',
    mb: 2
  }
};

// Brand identity preservation
export const brandIdentity = {
  logoSize: {
    small: 30,
    medium: 40,
    large: 60
  },
  brandColors: {
    primary: colorTokens.primary.main,
    secondary: colorTokens.secondary.main,
    healing: colorTokens.healing
  },
  brandFonts: {
    primary: '"PT Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    headings: '"PT Sans", "Roboto", "Helvetica", "Arial", sans-serif'
  }
};

// Mobile accessibility utilities
export const mobileAccessibility = {
  // Touch target sizes (WCAG 2.1 AA compliance)
  touchTarget: {
    minimum: 44, // 44px minimum for WCAG AA
    recommended: 48, // 48px recommended for better UX
    spacing: 8, // Minimum spacing between touch targets
  },
  
  // Mobile-first CTA container
  ctaContainer: {
    mobile: {
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      gap: { xs: 2, sm: 2 },
      alignItems: 'center',
      justifyContent: 'center',
      px: { xs: 2, sm: 0 }, // Padding for mobile edge spacing
      '& > *': {
        width: { xs: '100%', sm: 'auto' },
        maxWidth: { xs: '280px', sm: 'none' }, // Prevent overly wide buttons on mobile
      }
    },
    desktop: {
      display: 'flex',
      gap: 2,
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center'
    }
  },

  // Mobile viewport testing breakpoints
  viewports: {
    mobile: {
      small: '320px',   // iPhone SE
      medium: '375px',  // iPhone 12
      large: '414px',   // iPhone 12 Pro Max
    },
    tablet: {
      small: '768px',   // iPad Mini
      large: '1024px',  // iPad Pro
    }
  },

  // Focus indicators for accessibility
  focusIndicator: {
    default: {
      '&:focus': {
        outline: `3px solid ${colorTokens.primary.light}`,
        outlineOffset: '2px',
      },
      '&:focus-visible': {
        outline: `3px solid ${colorTokens.primary.light}`,
        outlineOffset: '2px',
      }
    },
    high_contrast: {
      '&:focus': {
        outline: `4px solid ${colorTokens.primary.main}`,
        outlineOffset: '3px',
        backgroundColor: 'rgba(102, 51, 153, 0.1)',
      }
    }
  }
};
export const styleUtils = {
  // Apply consistent hover effects
  applyHoverEffect: (baseStyles, hoverColor = colorTokens.primary.main) => ({
    ...baseStyles,
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      borderColor: hoverColor,
      boxShadow: `0 4px 15px ${hoverColor}30`,
    }
  }),

  // Create consistent gradient text
  gradientText: (colors = [colorTokens.primary.main, colorTokens.primary.light]) => ({
    background: `linear-gradient(45deg, ${colors[0]}, ${colors[1]})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }),

  // Apply consistent section styling
  sectionContainer: (variant = 'default') => ({
    ...componentStyles.section[variant],
    position: 'relative',
    overflow: 'hidden'
  }),

  // Create consistent card styling
  cardContainer: (variant = 'default', customColor) => ({
    ...componentStyles.card[variant],
    ...(customColor && {
      '&:hover': {
        ...componentStyles.card[variant]['&:hover'],
        borderColor: customColor
      }
    })
  })
};

export default {
  colorTokens,
  typographyClasses,
  componentStyles,
  animationVariants,
  breakpoints,
  spacing,
  logoIntegration,
  brandIdentity,
  styleUtils
};