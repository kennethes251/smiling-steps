# Design Document

## Overview

This design transforms the Smiling Steps marketing pages from competing, overlapping content into a strategic marketing funnel that positions the platform as a comprehensive mental wellness ecosystem. The design creates a clear user journey from initial awareness (Landing Page) to informed decision-making (Learn More Page), optimized for the Kenyan market and mental health context.

The refactor addresses cognitive overload, message confusion, and conversion barriers while maintaining the established brand identity and technical architecture. Research indicates that mental health websites require unique approaches emphasizing trust, empathy, and accessibility, with content being more critical than aesthetics for conversion.

## Architecture

### Page Relationship Architecture

```
Landing Page (/)
├── Purpose: Clarity + Emotional Connection + Action
├── Content: Minimal, focused, curiosity-driving
├── CTAs: 2 primary actions only
└── Transition: Single "Learn More" CTA → Learn More Page

Learn More Page (/learn-more)  
├── Purpose: Trust + Depth + Education
├── Content: Comprehensive, credibility-building
├── CTAs: Consistent with Landing Page
└── Outcome: Informed conversion decision
```

### Information Architecture Flow

**Landing Page Flow:**
1. Hero Section (Tagline + 2 CTAs)
2. Core Values Strip (4 values)
3. Problem/Solution Narrative (150 words max)
4. Human-Centered Benefits (4 benefits)
5. Trust Indicators
6. Transition CTA to Learn More

**Learn More Page Flow:**
1. Vision/Mission/Community Impact
2. Founder Story/Credentials  
3. Service Categories (Clinical, Creative, Community)
4. Platform Features
5. Testimonials/Impact
6. Resources/Education
7. FAQs
8. Final CTA

## Components and Interfaces

### Landing Page Components

#### HeroSection Component
```typescript
interface HeroSectionProps {
  tagline: string;
  primaryCTAs: {
    clientCTA: CTAButton;
    psychologistCTA: CTAButton;
  };
  backgroundImages: HeroImage[];
}
```

**Design Specifications:**
- Single refined tagline: "Compassionate Counseling Rooted in Respect, Empowerment, and Hope"
- Two prominent CTAs: "Get Support" (primary) and "Join as a Professional" (secondary)
- Existing slideshow background maintained for visual continuity
- Mobile-first responsive design with touch-friendly CTA sizing

#### CoreValuesStrip Component
```typescript
interface CoreValue {
  icon: string;
  title: 'Confidentiality' | 'Respect' | 'Empowerment' | 'Hope';
  descriptor: string;
}

interface CoreValuesStripProps {
  values: CoreValue[];
  layout: 'horizontal' | 'grid';
}
```

**Design Specifications:**
- Horizontal strip on desktop, 2x2 grid on mobile
- Icons using existing theme colors
- Brief descriptors (max 10 words each)
- Subtle animation on scroll

#### ProblemSolutionNarrative Component
```typescript
interface NarrativeProps {
  problemStatement: string; // max 75 words
  solutionStatement: string; // max 75 words
  visualSupport?: React.ReactNode;
}
```

**Design Specifications:**
- Condensed from current lengthy sections
- Two-column layout: Problem | Solution
- Visual hierarchy emphasizing solution
- Kenya-specific context integration

#### HumanBenefits Component
```typescript
interface Benefit {
  icon: React.ReactNode;
  title: string;
  description: string; // max 25 words
  outcome: string; // user-focused result
}

interface HumanBenefitsProps {
  benefits: Benefit[4]; // exactly 4 benefits
}
```

**Design Specifications:**
- Focus on user outcomes, not platform features
- Emotional connection over technical specifications
- Grid layout with hover animations
- Consistent with existing FeatureCard styling

#### TrustIndicators Component
```typescript
interface TrustIndicator {
  type: 'licensing' | 'privacy' | 'local-focus';
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface TrustIndicatorsProps {
  indicators: TrustIndicator[];
  layout: 'horizontal' | 'vertical';
}
```

**Design Specifications:**
- Three key trust elements
- Professional credibility emphasis
- Kenya-specific trust signals
- Subtle, non-overwhelming presentation

### Learn More Page Components

#### VisionMissionSection Component
```typescript
interface VisionMissionProps {
  vision: string;
  mission: string;
  communityImpact: {
    statistic: string;
    description: string;
  }[];
}
```

**Design Specifications:**
- Prominent positioning of ecosystem messaging
- Visual hierarchy emphasizing community aspect
- Integration with existing brand colors
- Inspirational tone with concrete impact

#### FounderStorySection Component
```typescript
interface FounderStoryProps {
  founder: {
    name: string;
    credentials: string[];
    story: string;
    image: string;
    philosophy: string;
  };
}
```

**Design Specifications:**
- Professional credibility establishment
- Personal connection building
- Kenya-specific context
- Existing founder avatar integration

#### ServiceCategories Component
```typescript
interface ServiceCategory {
  id: string;
  title: string;
  description: string;
  services: string[];
  icon: React.ReactNode;
  color: string;
}

interface ServiceCategoriesProps {
  categories: {
    clinical: ServiceCategory;
    creative: ServiceCategory;
    community: ServiceCategory;
  };
}
```

**Design Specifications:**
- Three distinct categories
- Expandable/collapsible design
- Visual differentiation with colors
- Integration with existing services data

#### PlatformFeatures Component
```typescript
interface PlatformFeature {
  title: string;
  description: string;
  technicalBenefit: string;
  userBenefit: string;
  icon: React.ReactNode;
}

interface PlatformFeaturesProps {
  features: PlatformFeature[];
  displayMode: 'detailed' | 'overview';
}
```

**Design Specifications:**
- Technical features with user benefit translation
- M-Pesa integration prominence
- Security and privacy emphasis
- Interactive demonstrations where appropriate

### Shared Components

#### CTAButton Component (Enhanced)
```typescript
interface CTAButtonProps {
  variant: 'client-primary' | 'psychologist-primary' | 'learn-more' | 'secondary';
  size: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}
```

**Design Specifications:**
- Consistent styling across both pages
- Clear visual hierarchy (primary vs secondary)
- Loading states for form submissions
- Accessibility compliance (WCAG 2.1 AA)

#### ResponsiveContainer Component
```typescript
interface ResponsiveContainerProps {
  maxWidth: 'sm' | 'md' | 'lg' | 'xl';
  padding: 'none' | 'small' | 'medium' | 'large';
  children: React.ReactNode;
}
```

**Design Specifications:**
- Consistent spacing system
- Mobile-first responsive breakpoints
- Integration with existing MUI Container
- Optimized for content readability

## Data Models

### PageContent Model
```typescript
interface PageContent {
  page: 'landing' | 'learn-more';
  sections: Section[];
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    lastUpdated: Date;
  };
}

interface Section {
  id: string;
  type: SectionType;
  content: Record<string, any>;
  displayOrder: number;
  isVisible: boolean;
}
```

### UserJourney Model
```typescript
interface UserJourney {
  sessionId: string;
  entryPoint: 'landing' | 'learn-more' | 'external';
  pageViews: PageView[];
  interactions: Interaction[];
  conversion?: {
    type: 'client-registration' | 'psychologist-registration';
    timestamp: Date;
  };
}

interface PageView {
  page: string;
  timestamp: Date;
  timeOnPage: number;
  scrollDepth: number;
}

interface Interaction {
  type: 'cta-click' | 'section-view' | 'form-start' | 'form-complete';
  element: string;
  timestamp: Date;
}
```

### ContentConfiguration Model
```typescript
interface ContentConfiguration {
  landingPage: {
    tagline: string;
    coreValues: CoreValue[];
    problemSolution: {
      problem: string;
      solution: string;
    };
    benefits: Benefit[];
    trustIndicators: TrustIndicator[];
  };
  learnMorePage: {
    vision: string;
    mission: string;
    founderStory: FounderStory;
    serviceCategories: ServiceCategory[];
    platformFeatures: PlatformFeature[];
    testimonials: Testimonial[];
    faqs: FAQ[];
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Now I'll analyze the acceptance criteria to determine which are testable as properties:

### Property-Based Testing Analysis

Based on the prework analysis, the following properties have been identified for testing:

**Property 1: Landing Page CTA Standardization**
*For any* visit to the Landing Page, there should be exactly two primary CTAs with the text "Get Support" and "Join as a Professional", and these same CTA texts should appear consistently on the Learn More Page
**Validates: Requirements 1.2, 2.3, 6.5**

**Property 2: Content Length Constraints**
*For any* Landing Page render, the Problem Statement section should contain no more than 150 words
**Validates: Requirements 1.3**

**Property 3: Core Values Presence**
*For any* Landing Page render, the Core Values Strip should display exactly four values: Confidentiality, Respect, Empowerment, and Hope
**Validates: Requirements 1.4**

**Property 4: Landing Page Content Removal**
*For any* Landing Page render, it should not contain featured therapists grid, API test components, or detailed platform feature explanations
**Validates: Requirements 1.7, 6.1, 6.2, 6.3**

**Property 5: Learn More Page Content Flow**
*For any* Learn More Page render, sections should appear in the specified order: Vision/Mission → Founder Story → Services → Platform Features → Testimonials → Resources → FAQs → Final CTA
**Validates: Requirements 2.1**

**Property 6: Service Categories Structure**
*For any* Learn More Page render, there should be exactly three service categories with the names "Clinical Care", "Creative/Expressive Healing", and "Community/Recovery Support"
**Validates: Requirements 2.5**

**Property 7: Design System Consistency**
*For any* page render (Landing or Learn More), both pages should use consistent color tokens from the theme (#663399 primary), typography classes, and component styling
**Validates: Requirements 3.1, 3.4, 3.6**

**Property 8: Mobile CTA Accessibility**
*For any* mobile viewport render, all CTA buttons should have minimum touch target size of 44px and appropriate spacing for touch interaction
**Validates: Requirements 3.3**

**Property 9: Technical Architecture Preservation**
*For any* page functionality test, React component structure, Material-UI integration, API patterns, and routing should remain unchanged from the original implementation
**Validates: Requirements 5.1, 5.2, 5.5, 5.6**

**Property 10: Performance Maintenance**
*For any* page load test, Framer Motion animations should not increase page load time beyond the original baseline, and responsive design should function across all viewport sizes
**Validates: Requirements 5.3, 5.4**

**Property 11: Kenya Market Integration**
*For any* page content analysis, M-Pesa should be mentioned as a payment option, pricing should display in KES format where present, and founder information should reference Kenyan context
**Validates: Requirements 7.2, 7.4, 7.6**

**Property 12: Content Deduplication**
*For any* cross-page content analysis, no identical content sections should appear on both Landing Page and Learn More Page
**Validates: Requirements 6.4, 6.6**

## Error Handling

### User Experience Error Handling

**Navigation Errors:**
- Graceful handling of broken internal links
- Fallback content for missing sections
- Progressive enhancement for JavaScript failures

**Content Loading Errors:**
- Fallback text for dynamic content failures
- Image loading error handling with appropriate placeholders
- API failure graceful degradation

**Form Interaction Errors:**
- Clear validation messages for CTA interactions
- Loading states for form submissions
- Network error recovery mechanisms

### Technical Error Handling

**Component Error Boundaries:**
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
  errorSection?: string;
}

class MarketingPageErrorBoundary extends React.Component<Props, ErrorBoundaryState> {
  // Graceful degradation for component failures
  // Fallback UI for critical sections
  // Error reporting for monitoring
}
```

**Performance Error Handling:**
- Animation fallbacks for low-performance devices
- Image optimization failure handling
- Responsive design breakpoint failures

**Accessibility Error Handling:**
- Screen reader fallbacks
- Keyboard navigation failure recovery
- Color contrast failure detection

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit testing for specific functionality with property-based testing for universal correctness guarantees:

**Unit Testing Focus:**
- Component rendering with specific props
- CTA click handlers and navigation
- Responsive breakpoint behavior
- Content loading and error states
- Animation trigger conditions
- Form validation and submission

**Property-Based Testing Focus:**
- Content structure consistency across renders
- Design system compliance across components
- Performance characteristics across device types
- Accessibility compliance across interaction patterns
- Cross-page content relationship validation
- Kenya market localization completeness

### Testing Configuration

**Property-Based Testing Setup:**
- Library: fast-check (JavaScript property testing)
- Minimum iterations: 100 per property test
- Test tagging format: **Feature: marketing-pages-refactor, Property {number}: {property_text}**
- Integration with existing Jest test suite

**Unit Testing Balance:**
- Focus on edge cases and integration points
- Avoid over-testing covered by property tests
- Emphasize user interaction flows
- Test error conditions and recovery

**Testing Environment:**
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile device testing (iOS Safari, Android Chrome)
- Screen reader compatibility testing
- Performance testing across network conditions

### Specific Test Categories

**Content Validation Tests:**
- Word count validation for content constraints
- CTA presence and text accuracy
- Section ordering and hierarchy
- Cross-page content uniqueness

**Design System Tests:**
- Theme token usage consistency
- Component prop validation
- Responsive behavior verification
- Animation performance impact

**User Experience Tests:**
- Navigation flow completion
- Form interaction success rates
- Mobile usability validation
- Accessibility compliance verification

**Performance Tests:**
- Page load time benchmarks
- Animation frame rate monitoring
- Image optimization effectiveness
- Bundle size impact assessment

**Localization Tests:**
- Kenya-specific content presence
- Currency format validation
- Cultural context appropriateness
- Language tone consistency

This comprehensive testing strategy ensures both the technical correctness of the implementation and the user experience quality of the refactored marketing pages, while maintaining the stability and performance characteristics of the existing system.