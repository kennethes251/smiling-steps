# Implementation Plan: Marketing Pages Refactor

## Overview

This implementation plan transforms the Smiling Steps marketing pages from overlapping, competing content into a strategic marketing funnel. The approach maintains existing technical architecture while strategically repositioning content to reduce cognitive overload and improve conversion rates.

## Tasks

- [x] 1. Create new Landing Page components and structure
  - [x] 1.1 Create HeroSection component with refined tagline and dual CTAs
    - Implement single tagline: "Compassionate Counseling Rooted in Respect, Empowerment, and Hope"
    - Create exactly two primary CTAs: "Get Support" and "Join as a Professional"
    - Maintain existing slideshow background functionality
    - _Requirements: 1.1, 1.2_

  - [ ]* 1.2 Write property test for Landing Page CTA standardization
    - **Property 1: Landing Page CTA Standardization**
    - **Validates: Requirements 1.2, 2.3, 6.5**

  - [x] 1.3 Create CoreValuesStrip component
    - Display exactly four values: Confidentiality, Respect, Empowerment, Hope
    - Include brief descriptors for each value
    - Implement responsive layout (horizontal strip on desktop, 2x2 grid on mobile)
    - _Requirements: 1.4_

  - [ ]* 1.4 Write property test for Core Values presence
    - **Property 3: Core Values Presence**
    - **Validates: Requirements 1.4**

  - [x] 1.5 Create ProblemSolutionNarrative component
    - Condense current problem statement to maximum 150 words
    - Implement two-column layout: Problem | Solution
    - Integrate Kenya-specific context
    - _Requirements: 1.3_

  - [ ]* 1.6 Write property test for content length constraints
    - **Property 2: Content Length Constraints**
    - **Validates: Requirements 1.3**

- [x] 2. Refactor Landing Page content and remove unnecessary elements
  - [x] 2.1 Create HumanBenefits component with exactly 4 user-focused benefits
    - Focus on user outcomes rather than technical platform features
    - Implement grid layout with hover animations
    - Maintain existing FeatureCard styling patterns
    - _Requirements: 1.5_

  - [x] 2.2 Create TrustIndicators component
    - Highlight licensed professionals, privacy protection, Kenya-focused care
    - Implement subtle, non-overwhelming presentation
    - Use professional credibility emphasis
    - _Requirements: 1.6_

  - [x] 2.3 Remove featured therapists grid, API test components, and detailed platform features
    - Remove TherapistCard grid section from Landing Page
    - Remove testApiConnection functionality and UI
    - Move detailed platform feature explanations to Learn More Page
    - _Requirements: 1.7, 6.1, 6.2, 6.3_

  - [ ]* 2.4 Write property test for Landing Page content removal
    - **Property 4: Landing Page Content Removal**
    - **Validates: Requirements 1.7, 6.1, 6.2, 6.3**
  - [x] 2.5 Add single transition CTA to Learn More Page
    - Implement "Learn More About Our Approach" CTA at page end
    - Ensure proper routing to /learn-more
    - Style consistently with other CTAs
    - _Requirements: 1.8_

- [ ] 3. Checkpoint - Ensure Landing Page refactor is complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Enhance Learn More Page with comprehensive content flow
  - [x] 4.1 Create VisionMissionSection component
    - Implement Vision/Mission/Community Impact content
    - Position ecosystem messaging prominently
    - Use inspirational tone with concrete impact metrics
    - _Requirements: 2.1, 2.2_

  - [x] 4.2 Create FounderStorySection component
    - Include founder credentials and personal story
    - Establish professional credibility and personal connection
    - Integrate Kenya-specific context and local presence
    - _Requirements: 2.6, 7.6_

  - [x] 4.3 Create ServiceCategories component
    - Implement three distinct categories: Clinical Care, Creative/Expressive Healing, Community/Recovery Support
    - Use expandable/collapsible design with visual differentiation
    - Integrate with existing services data structure
    - _Requirements: 2.5_

  - [ ]* 4.4 Write property test for service categories structure
    - **Property 6: Service Categories Structure**
    - **Validates: Requirements 2.5**

  - [x] 4.5 Enhance PlatformFeatures component for Learn More Page
    - Move detailed platform feature explanations from Landing Page
    - Translate technical features into user benefits
    - Emphasize M-Pesa integration and security features
    - _Requirements: 2.1, 7.2_

  - [x] 4.6 Ensure comprehensive FAQ section
    - Address online therapy, pricing, and platform access concerns
    - Include Kenya-specific considerations and cultural context
    - Maintain existing accordion-style interaction
    - _Requirements: 2.7_

  - [ ]* 4.7 Write property test for Learn More Page content flow
    - **Property 5: Learn More Page Content Flow**
    - **Validates: Requirements 2.1**

- [x] 5. Implement consistent design system and Kenya market localization
  - [x] 5.1 Ensure design system consistency across both pages
    - Maintain consistent color tokens from theme (#663399 primary)
    - Use consistent typography classes and component styling
    - Preserve existing Logo component and brand identity
    - _Requirements: 3.1, 3.4, 3.5, 3.6_

  - [ ]* 5.2 Write property test for design system consistency
    - **Property 7: Design System Consistency**
    - **Validates: Requirements 3.1, 3.4, 3.6**

  - [x] 5.3 Implement mobile-first CTA accessibility
    - Ensure minimum 44px touch target size for all CTAs
    - Implement appropriate spacing for touch interaction
    - Test across mobile viewports and devices
    - _Requirements: 3.3_

  - [ ]* 5.4 Write property test for mobile CTA accessibility
    - **Property 8: Mobile CTA Accessibility**
    - **Validates: Requirements 3.3**

  - [x] 5.5 Integrate Kenya market-specific content
    - Include M-Pesa payment integration mentions
    - Display pricing in Kenyan Shillings (KES) format
    - Add references to local mental health context and stigma reduction
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [ ]* 5.6 Write property test for Kenya market integration
    - **Property 11: Kenya Market Integration**
    - **Validates: Requirements 7.2, 7.4, 7.6**

- [x] 6. Optimize animations and preserve technical architecture
  - [x] 6.1 Optimize Framer Motion animations for Landing Page
    - Reduce visual noise while maintaining existing animation patterns
    - Ensure animations don't impact page load performance
    - Implement progressive enhancement for low-performance devices
    - _Requirements: 3.2, 5.3_

  - [x] 6.2 Preserve existing technical architecture
    - Maintain React component structure and Material-UI integration
    - Preserve image optimization and fallback mechanisms
    - Ensure API integration patterns remain functional
    - Maintain existing routing structure (/ and /learn-more)
    - _Requirements: 5.1, 5.2, 5.5, 5.6_

  - [ ]* 6.3 Write property test for technical architecture preservation
    - **Property 9: Technical Architecture Preservation**
    - **Validates: Requirements 5.1, 5.2, 5.5, 5.6**

  - [ ]* 6.4 Write property test for performance maintenance
    - **Property 10: Performance Maintenance**
    - **Validates: Requirements 5.3, 5.4**

- [x] 7. Implement content deduplication and conversion optimization
  - [x] 7.1 Eliminate duplicate content between pages
    - Ensure no identical content sections appear on both pages
    - Create unique value propositions for each page
    - Maintain logical content progression from Landing to Learn More
    - _Requirements: 6.4, 6.6_

  - [ ]* 7.2 Write property test for content deduplication
    - **Property 12: Content Deduplication**
    - **Validates: Requirements 6.4, 6.6**

  - [x] 7.3 Implement conversion optimization elements
    - Limit Landing Page to two clear decision paths
    - Include social proof, authority, and trust signals appropriately
    - Address common objections through strategic content placement
    - _Requirements: 8.1, 8.3, 8.5_

- [x] 8. Create comprehensive test suite
  - [x] 8.1 Set up property-based testing with fast-check
    - Configure fast-check library for JavaScript property testing
    - Set minimum 100 iterations per property test
    - Implement test tagging format: **Feature: marketing-pages-refactor, Property {number}: {property_text}**
    - _Requirements: Testing Strategy_

  - [ ]* 8.2 Write unit tests for component interactions
    - Test CTA click handlers and navigation
    - Test responsive breakpoint behavior
    - Test content loading and error states
    - Test form validation and submission flows

  - [ ]* 8.3 Write cross-browser compatibility tests
    - Test functionality across Chrome, Firefox, Safari, Edge
    - Test mobile device compatibility (iOS Safari, Android Chrome)
    - Test screen reader compatibility
    - Test performance across network conditions

- [x] 9. Final integration and validation
  - [x] 9.1 Integrate refactored components into existing app structure
    - Update App.js routing to use refactored components
    - Ensure Header component navigation works with new pages
    - Test all internal and external links
    - _Requirements: 5.6_

  - [x] 9.2 Validate content accuracy and messaging consistency
    - Verify tagline consistency between pages
    - Confirm CTA text standardization
    - Validate Kenya-specific content accuracy
    - Test founder story and credentials display
    - _Requirements: 4.1, 4.5_

  - [x] 9.3 Perform final performance and accessibility audit
    - Run Lighthouse audits for both pages
    - Validate WCAG 2.1 AA compliance
    - Test page load times and animation performance
    - Verify mobile usability across devices
    - _Requirements: 5.3, 5.4_

- [ ] 10. Final checkpoint - Ensure all tests pass and requirements are met
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The refactor maintains existing stable authentication and routing systems
- All changes preserve the existing technical architecture while optimizing content strategy