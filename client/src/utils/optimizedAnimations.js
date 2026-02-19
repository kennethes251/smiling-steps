/**
 * Optimized Animation Utilities for Landing Page
 * 
 * This module provides optimized Framer Motion animations that:
 * - Reduce visual noise while maintaining existing animation patterns
 * - Ensure animations don't impact page load performance
 * - Implement progressive enhancement for low-performance devices
 * 
 * Requirements: 3.2, 5.3
 */

// Performance detection utilities
const getDevicePerformance = () => {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Basic performance indicators
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
  
  // Memory constraints (if available)
  const isLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
  
  // Hardware concurrency (CPU cores)
  const isLowCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
  
  return {
    prefersReducedMotion,
    isSlowConnection,
    isLowMemory,
    isLowCPU,
    isLowPerformance: isSlowConnection || isLowMemory || isLowCPU
  };
};

const performance = getDevicePerformance();

// Base animation configurations
const baseAnimations = {
  // Reduced visual noise - simpler, shorter animations
  fadeInUp: {
    initial: { opacity: 0, y: performance.isLowPerformance ? 20 : 30 },
    animate: { opacity: 1, y: 0 },
    transition: { 
      duration: performance.prefersReducedMotion ? 0.2 : (performance.isLowPerformance ? 0.4 : 0.6),
      ease: "easeOut"
    }
  },
  
  fadeInLeft: {
    initial: { opacity: 0, x: performance.isLowPerformance ? -20 : -50 },
    animate: { opacity: 1, x: 0 },
    transition: { 
      duration: performance.prefersReducedMotion ? 0.2 : (performance.isLowPerformance ? 0.5 : 0.8),
      ease: "easeOut"
    }
  },
  
  fadeInScale: {
    initial: { opacity: 0, scale: performance.isLowPerformance ? 0.95 : 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { 
      duration: performance.prefersReducedMotion ? 0.2 : (performance.isLowPerformance ? 0.5 : 0.8),
      ease: "easeOut",
      delay: performance.isLowPerformance ? 0.1 : 0.2
    }
  },
  
  // Subtle hover animations - reduced intensity
  hoverLift: {
    whileHover: performance.prefersReducedMotion ? {} : { 
      y: performance.isLowPerformance ? -2 : -5,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  },
  
  // Stagger animations with performance consideration
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: performance.isLowPerformance ? 0.05 : 0.1,
        delayChildren: performance.isLowPerformance ? 0.1 : 0.2
      }
    }
  }
};

// Progressive enhancement animations
const progressiveAnimations = {
  // High performance devices get full animations
  highPerformance: {
    heroEntry: {
      initial: { opacity: 0, x: -50 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.8, ease: "easeOut" }
    },
    
    imageSlideshow: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.8, delay: 0.2, ease: "easeOut" }
    },
    
    sectionReveal: {
      initial: { opacity: 0, y: 30 },
      whileInView: { opacity: 1, y: 0 },
      transition: { duration: 0.8 },
      viewport: { once: true, margin: "-100px" }
    }
  },
  
  // Medium performance devices get simplified animations
  mediumPerformance: {
    heroEntry: {
      initial: { opacity: 0, x: -30 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.5, ease: "easeOut" }
    },
    
    imageSlideshow: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.5, delay: 0.1 }
    },
    
    sectionReveal: {
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      transition: { duration: 0.5 },
      viewport: { once: true, margin: "-50px" }
    }
  },
  
  // Low performance devices get minimal animations
  lowPerformance: {
    heroEntry: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.3 }
    },
    
    imageSlideshow: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.3 }
    },
    
    sectionReveal: {
      initial: { opacity: 0 },
      whileInView: { opacity: 1 },
      transition: { duration: 0.3 },
      viewport: { once: true }
    }
  }
};

// Get appropriate animation set based on device performance
const getAnimationSet = () => {
  if (performance.prefersReducedMotion) {
    return progressiveAnimations.lowPerformance;
  }
  
  if (performance.isLowPerformance) {
    return progressiveAnimations.lowPerformance;
  }
  
  if (performance.isSlowConnection || performance.isLowMemory) {
    return progressiveAnimations.mediumPerformance;
  }
  
  return progressiveAnimations.highPerformance;
};

// Optimized slideshow animations
const slideshowAnimations = {
  // Reduced transition time and simplified effects
  imageTransition: {
    opacity: performance.isLowPerformance ? 1 : 1,
    transition: performance.prefersReducedMotion 
      ? 'none' 
      : `opacity ${performance.isLowPerformance ? '1s' : '1.8s'} cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
    transform: performance.prefersReducedMotion || performance.isLowPerformance 
      ? 'scale(1)' 
      : 'scale(1.02)',
    filter: performance.prefersReducedMotion || performance.isLowPerformance 
      ? 'brightness(1)' 
      : 'brightness(0.95)'
  },
  
  // Simplified indicator animations
  indicators: {
    transition: performance.prefersReducedMotion ? 'none' : 'all 0.3s ease',
    '&:hover': performance.prefersReducedMotion ? {} : {
      backgroundColor: 'white',
      transform: performance.isLowPerformance ? 'scale(1.1)' : 'scale(1.2)'
    }
  }
};

// Performance-aware viewport settings
const viewportSettings = {
  once: true,
  margin: performance.isLowPerformance ? "0px" : "-100px",
  amount: performance.isLowPerformance ? 0.1 : 0.3
};

// Export for use in components
export const getOptimizedAnimationConfig = (animationType) => {
  const performance = getDevicePerformance();
  const tier = performance.isLowPerformance ? 'low' : (performance.isSlowConnection || performance.isLowMemory ? 'medium' : 'high');
  
  const animations = {
    high: progressiveAnimations.highPerformance,
    medium: progressiveAnimations.mediumPerformance,
    low: progressiveAnimations.lowPerformance
  };
  
  return animations[tier][animationType] || baseAnimations[animationType] || {};
};

// Detect device performance for exports
const detectDevicePerformance = () => {
  const perf = getDevicePerformance();
  return {
    ...perf,
    tier: perf.isLowPerformance ? 'low' : (perf.isSlowConnection || perf.isLowMemory ? 'medium' : 'high')
  };
};

// Export optimized animations
export {
  baseAnimations,
  progressiveAnimations,
  getAnimationSet,
  slideshowAnimations,
  viewportSettings,
  detectDevicePerformance,
  performance as devicePerformance
};

// Default export for easy importing
export default {
  ...baseAnimations,
  progressive: getAnimationSet(),
  slideshow: slideshowAnimations,
  viewport: viewportSettings,
  performance: performance
};