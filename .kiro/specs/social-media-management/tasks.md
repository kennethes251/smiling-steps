# Implementation Plan: Social Media Management

## Overview

This implementation plan covers the Social Media Management feature for managing marketing page content through the Admin Dashboard. Tasks are organized to build incrementally, with property-based tests validating correctness at each stage.

## Tasks

- [x] 1. Set up backend infrastructure and data models
  - [x] 1.1 Create SocialLink model
    - Define schema with platform, url, displayOrder, isActive, timestamps
    - Add platform enum validation (facebook, twitter, instagram, linkedin, youtube, tiktok)
    - Add URL format validation
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Create Testimonial model
    - Define schema with clientName, clientRole, content, rating, avatarUrl, displayOrder, isPublished
    - Add rating validation (1-5)
    - Add content maxLength validation (500 chars)
    - _Requirements: 2.1, 2.2_

  - [x] 1.3 Create MarketingService model
    - Define schema with title, description, icon, colorTheme, features, displayOrder, isActive
    - Add icon validation for MUI icon names
    - _Requirements: 3.1, 3.2_

  - [x] 1.4 Create FAQ model
    - Define schema with question, answer, category, displayOrder, isPublished, expandCount
    - Add category default value
    - _Requirements: 4.1, 4.2_

  - [x] 1.5 Create HeroContent model
    - Define schema with title, subtitle, tagline, ctaButtons, images
    - Add ctaButtons array with text, link, style
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 1.6 Create Banner model
    - Define schema with title, message, link, backgroundColor, textColor, position, startDate, endDate, isActive
    - Add date validation (endDate > startDate)
    - _Requirements: 6.1, 6.2_

  - [x] 1.7 Create ContentAnalytics model
    - Define schema with contentType, contentId, eventType, timestamp, sessionId
    - Add indexes for efficient querying
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 2. Implement Social Links Management
  - [x] 2.1 Create GET /api/admin/content/social-links endpoint
    - Return all social links sorted by displayOrder
    - Include active status and timestamps
    - _Requirements: 1.1_

  - [x] 2.2 Create POST /api/admin/content/social-links endpoint
    - Validate URL format for platform
    - Check for duplicate platform
    - Create social link with admin ID
    - Log to audit trail
    - _Requirements: 1.2_

  - [x] 2.3 Create PUT /api/admin/content/social-links/:id endpoint
    - Validate URL format
    - Update social link
    - Log changes to audit trail
    - _Requirements: 1.3_

  - [x] 2.4 Create PUT /api/admin/content/social-links/:id/toggle endpoint
    - Toggle isActive status
    - Log change to audit trail
    - _Requirements: 1.4_

  - [x] 2.5 Create DELETE /api/admin/content/social-links/:id endpoint
    - Delete social link
    - Log deletion to audit trail
    - _Requirements: 1.5_

  - [x] 2.6 Write property test for social link URL validation
    - **Property 1: Social Link URL Validation**
    - **Validates: Requirements 1.2**

  - [x] 2.7 Write property test for social link toggle visibility
    - **Property 2: Social Link Toggle Reflects on Marketing Page**
    - **Validates: Requirements 1.4**

- [x] 3. Implement Testimonials Management
  - [x] 3.1 Create GET /api/admin/content/testimonials endpoint
    - Return all testimonials sorted by displayOrder
    - Include publication status
    - _Requirements: 2.1_

  - [x] 3.2 Create POST /api/admin/content/testimonials endpoint
    - Validate rating (1-5)
    - Validate content length
    - Create testimonial with admin ID
    - Log to audit trail
    - _Requirements: 2.2_

  - [x] 3.3 Create PUT /api/admin/content/testimonials/:id endpoint
    - Update testimonial fields
    - Log changes to audit trail
    - _Requirements: 2.3_

  - [x] 3.4 Create PUT /api/admin/content/testimonials/:id/toggle endpoint
    - Toggle isPublished status
    - Log change to audit trail
    - _Requirements: 2.4_

  - [x] 3.5 Create PUT /api/admin/content/testimonials/reorder endpoint
    - Accept array of IDs with new order
    - Update displayOrder for each testimonial
    - _Requirements: 2.5_

  - [x] 3.6 Write property test for testimonial display order
    - **Property 3: Testimonial Display Order Consistency**
    - **Validates: Requirements 2.5**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Services Management
  - [ ] 5.1 Create GET /api/admin/content/services endpoint
    - Return all services sorted by displayOrder
    - Include active status
    - _Requirements: 3.1_

  - [ ] 5.2 Create POST /api/admin/content/services endpoint
    - Validate required fields
    - Create service with admin ID
    - Log to audit trail
    - _Requirements: 3.2_

  - [ ] 5.3 Create PUT /api/admin/content/services/:id endpoint
    - Update service fields
    - Log changes to audit trail
    - _Requirements: 3.3_

  - [ ] 5.4 Create PUT /api/admin/content/services/:id/toggle endpoint
    - Toggle isActive status
    - Log change to audit trail
    - _Requirements: 3.4_

  - [ ] 5.5 Create PUT /api/admin/content/services/reorder endpoint
    - Accept array of IDs with new order
    - Update displayOrder for each service
    - _Requirements: 3.5_

  - [ ] 5.6 Write property test for service active status visibility
    - **Property 4: Service Active Status Visibility**
    - **Validates: Requirements 3.4**

- [ ] 6. Implement FAQ Management
  - [ ] 6.1 Create GET /api/admin/content/faqs endpoint
    - Return all FAQs sorted by displayOrder
    - Include publication status and category
    - _Requirements: 4.1_

  - [ ] 6.2 Create POST /api/admin/content/faqs endpoint
    - Validate required fields
    - Create FAQ with admin ID
    - Log to audit trail
    - _Requirements: 4.2_

  - [ ] 6.3 Create PUT /api/admin/content/faqs/:id endpoint
    - Update FAQ fields
    - Log changes to audit trail
    - _Requirements: 4.3_

  - [ ] 6.4 Create PUT /api/admin/content/faqs/:id/toggle endpoint
    - Toggle isPublished status
    - Log change to audit trail
    - _Requirements: 4.4_

  - [ ] 6.5 Create PUT /api/admin/content/faqs/reorder endpoint
    - Accept array of IDs with new order
    - Update displayOrder for each FAQ
    - _Requirements: 4.5_

  - [ ] 6.6 Write property test for FAQ publication status visibility
    - **Property 5: FAQ Publication Status Visibility**
    - **Validates: Requirements 4.4**

- [ ] 7. Implement Hero Section Management
  - [ ] 7.1 Create GET /api/admin/content/hero endpoint
    - Return current hero content
    - Include all CTA buttons and images
    - _Requirements: 5.1_

  - [ ] 7.2 Create PUT /api/admin/content/hero endpoint
    - Update hero title, subtitle, tagline
    - Update CTA buttons
    - Log changes to audit trail
    - _Requirements: 5.2, 5.3_

  - [ ] 7.3 Create POST /api/admin/content/hero/images endpoint
    - Validate image file type and size
    - Upload image to storage
    - Add to hero images array
    - _Requirements: 5.4_

  - [ ] 7.4 Create DELETE /api/admin/content/hero/images/:id endpoint
    - Remove image from storage
    - Remove from hero images array
    - _Requirements: 5.4_

  - [ ] 7.5 Create PUT /api/admin/content/hero/images/reorder endpoint
    - Accept array of image IDs with new order
    - Update displayOrder for each image
    - _Requirements: 5.5_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement Banners Management
  - [ ] 9.1 Create GET /api/admin/content/banners endpoint
    - Return all banners
    - Include date range and active status
    - _Requirements: 6.1_

  - [ ] 9.2 Create POST /api/admin/content/banners endpoint
    - Validate date range (endDate > startDate)
    - Create banner with admin ID
    - Log to audit trail
    - _Requirements: 6.2_

  - [ ] 9.3 Create PUT /api/admin/content/banners/:id endpoint
    - Validate date range
    - Update banner fields
    - Log changes to audit trail
    - _Requirements: 6.3_

  - [ ] 9.4 Create DELETE /api/admin/content/banners/:id endpoint
    - Delete banner
    - Log deletion to audit trail
    - _Requirements: 6.3_

  - [ ] 9.5 Write property test for banner date range enforcement
    - **Property 6: Banner Date Range Enforcement**
    - **Validates: Requirements 6.4, 6.5**

- [ ] 10. Implement Public Content Endpoint
  - [ ] 10.1 Create GET /api/public/content/marketing endpoint
    - Return all active social links
    - Return all published testimonials sorted by displayOrder
    - Return all active services sorted by displayOrder
    - Return all published FAQs sorted by displayOrder
    - Return hero content
    - Return active banners within date range
    - _Requirements: 1.4, 2.4, 3.4, 4.4, 6.4, 6.5_

  - [ ] 10.2 Add caching for public content endpoint
    - Cache response for 60 seconds
    - Invalidate cache on content updates
    - _Requirements: Performance optimization_

- [ ] 11. Implement Content Preview
  - [ ] 11.1 Create GET /api/admin/content/preview endpoint
    - Return all content including unpublished items
    - Merge pending changes with live content
    - _Requirements: 7.1, 7.2_

  - [ ] 11.2 Write property test for content preview accuracy
    - **Property 9: Content Preview Accuracy**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement Content Analytics
  - [ ] 13.1 Create analytics tracking middleware
    - Track page views on marketing page
    - Track testimonial views
    - Track service card clicks
    - Track FAQ expansions
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 13.2 Create GET /api/admin/content/analytics endpoint
    - Return page views and unique visitors
    - Return testimonial engagement metrics
    - Return service click-through rates
    - Return FAQ expansion counts
    - Support date range filtering
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 13.3 Create GET /api/admin/content/analytics/export endpoint
    - Generate CSV with analytics data
    - Support date range selection
    - _Requirements: 8.5_

  - [ ] 13.4 Write property test for analytics data accuracy
    - **Property 10: Analytics Data Accuracy**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [ ] 14. Implement Audit Logging
  - [ ] 14.1 Create audit logging service
    - Log content creation with admin ID, content type, new values
    - Log content updates with admin ID, content type, old/new values
    - Log content deletion with admin ID, content type, deleted values
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 14.2 Create GET /api/admin/content/audit-logs endpoint
    - Return audit logs with pagination
    - Support filtering by content type, date range, admin user
    - _Requirements: 9.4_

  - [ ] 14.3 Write property test for audit trail completeness
    - **Property 7: Content Audit Trail Completeness**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 15. Implement Content Scheduling
  - [ ] 15.1 Create scheduling service
    - Check for scheduled content every minute
    - Publish content when scheduledPublishDate is reached
    - _Requirements: 10.1, 10.2_

  - [ ] 15.2 Create GET /api/admin/content/scheduled endpoint
    - Return all content with pending scheduled publication
    - Include scheduled date and content type
    - _Requirements: 10.3_

  - [ ] 15.3 Create DELETE /api/admin/content/scheduled/:id endpoint
    - Cancel scheduled publication
    - Clear scheduledPublishDate field
    - _Requirements: 10.4_

  - [ ] 15.4 Write property test for scheduled content auto-publication
    - **Property 8: Scheduled Content Auto-Publication**
    - **Validates: Requirements 10.1, 10.2**

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement Admin Dashboard Content Manager Tab
  - [ ] 17.1 Add "Marketing Content" tab to AdminDashboard
    - Add new tab after existing tabs
    - Create ContentManagerTab container component
    - Add sub-navigation for content types
    - _Requirements: All frontend requirements_

  - [ ] 17.2 Create SocialLinksManager component
    - Display table of social links with platform, URL, status
    - Add create/edit dialog with URL validation
    - Add toggle switch for active status
    - Add delete button with confirmation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 17.3 Create TestimonialsManager component
    - Display table of testimonials with name, content preview, rating, status
    - Add create/edit dialog with rating selector
    - Add drag-drop reordering
    - Add toggle switch for publication status
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 17.4 Create ServicesManager component
    - Display grid of service cards
    - Add create/edit dialog with icon picker and color picker
    - Add drag-drop reordering
    - Add toggle switch for active status
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 18. Continue Admin Dashboard Components
  - [ ] 18.1 Create FAQManager component
    - Display accordion list of FAQs
    - Add create/edit dialog with category selector
    - Add drag-drop reordering
    - Add toggle switch for publication status
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 18.2 Create HeroSectionManager component
    - Display current hero content
    - Add edit form for title, subtitle, tagline
    - Add CTA button editor
    - Add image upload with drag-drop reordering
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 18.3 Create BannersManager component
    - Display table of banners with date range, status
    - Add create/edit dialog with date pickers and color pickers
    - Add preview of banner appearance
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 18.4 Create ContentPreview component
    - Display preview of marketing page with pending changes
    - Add device size selector (mobile, tablet, desktop)
    - Add publish/discard buttons
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 18.5 Create ContentAnalytics component
    - Display page views and visitor charts
    - Display content engagement metrics
    - Add date range selector
    - Add export to CSV button
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 19. Update Marketing Page to Use Dynamic Content
  - [ ] 19.1 Update MarketingPage to fetch content from API
    - Replace hardcoded services array with API data
    - Replace hardcoded testimonials with API data
    - Replace hardcoded FAQs with API data
    - _Requirements: Integration_

  - [ ] 19.2 Add social media links section to MarketingPage
    - Display active social links in footer or header
    - Use platform-specific icons
    - _Requirements: 1.4_

  - [ ] 19.3 Update hero section to use dynamic content
    - Fetch hero content from API
    - Display dynamic title, subtitle, tagline
    - Display dynamic CTA buttons
    - Implement image slideshow
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 19.4 Add promotional banners to MarketingPage
    - Fetch active banners from API
    - Display banners at configured position
    - Auto-hide expired banners
    - _Requirements: 6.4, 6.5_

  - [ ] 19.5 Add analytics tracking to MarketingPage
    - Track page views
    - Track testimonial views
    - Track service card clicks
    - Track FAQ expansions
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Implement Marketing Posts Management
  - [ ] 21.1 Create MarketingPost model
    - Define schema with title, slug, content, featuredImage, gallery, category, tags, isPublished
    - Add slug generation from title
    - Add view and share count tracking
    - _Requirements: 11.1, 11.2_

  - [ ] 21.2 Create GET /api/admin/content/posts endpoint
    - Return all marketing posts with pagination
    - Include publication status and view counts
    - _Requirements: 11.1_

  - [ ] 21.3 Create POST /api/admin/content/posts endpoint
    - Validate required fields
    - Generate unique slug from title
    - Create post with admin ID
    - Log to audit trail
    - _Requirements: 11.2_

  - [ ] 21.4 Create PUT /api/admin/content/posts/:id endpoint
    - Update post fields
    - Log changes to audit trail
    - _Requirements: 11.4_

  - [ ] 21.5 Create POST /api/admin/content/posts/:id/images endpoint
    - Validate file type (jpg, png, gif, webp) and size (max 10MB)
    - Upload to storage
    - Add to gallery array
    - _Requirements: 11.3_

  - [ ] 21.6 Create DELETE /api/admin/content/posts/:id endpoint
    - Delete post and associated images
    - Log deletion to audit trail
    - _Requirements: 11.6_

  - [ ] 21.7 Write property test for marketing post image validation
    - **Property 11: Marketing Post Image Validation**
    - **Validates: Requirements 11.3**

- [ ] 22. Implement Social Media Cross-Posting
  - [ ] 22.1 Create SocialAccount model
    - Define schema with platform, credentials, connection status
    - Encrypt access tokens
    - _Requirements: 12.1_

  - [ ] 22.2 Create GET /api/admin/content/social-accounts endpoint
    - Return connected social accounts (without tokens)
    - Include connection status and last used date
    - _Requirements: 12.1_

  - [ ] 22.3 Create POST /api/admin/content/social-accounts/connect endpoint
    - Handle OAuth flow for each platform
    - Securely store encrypted credentials
    - _Requirements: 12.1_

  - [ ] 22.4 Create POST /api/admin/content/posts/:id/share endpoint
    - Accept array of platform IDs to share to
    - Format content for each platform
    - Post to social media APIs
    - Log share results
    - _Requirements: 12.2, 12.3, 12.4_

  - [ ] 22.5 Create social media formatting service
    - Format content for Twitter (280 chars)
    - Format content for Facebook
    - Format content for Instagram
    - Format content for LinkedIn
    - Format content for TikTok (video descriptions, hashtags)
    - Format content for YouTube (video descriptions, tags)
    - _Requirements: 12.3_

  - [ ] 22.6 Write property test for social media share logging
    - **Property 12: Social Media Share Logging**
    - **Validates: Requirements 12.4**

- [ ] 23. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 24. Implement User Notifications System
  - [ ] 24.1 Create UserNotification model
    - Define schema with title, message, link, priority, targetAudience
    - Add delivery and read tracking fields
    - _Requirements: 13.1, 13.2_

  - [ ] 24.2 Create UserNotificationReceipt model
    - Define schema with notificationId, userId, isRead, isClicked
    - Add indexes for efficient querying
    - _Requirements: 13.4_

  - [ ] 24.3 Create GET /api/admin/content/notifications endpoint
    - Return all notifications with pagination
    - Include delivery count, read count, click-through rate
    - _Requirements: 13.1, 13.6_

  - [ ] 24.4 Create POST /api/admin/content/notifications endpoint
    - Validate required fields
    - Create notification with admin ID
    - If not scheduled, send immediately
    - _Requirements: 13.2, 13.3_

  - [ ] 24.5 Create notification delivery service
    - Determine target users based on audience
    - Create notification receipts for each user
    - Update delivery count
    - _Requirements: 13.3_

  - [ ] 24.6 Create GET /api/users/notifications endpoint
    - Return user's notifications with read status
    - Sort by date, unread first
    - _Requirements: 13.4_

  - [ ] 24.7 Create PUT /api/users/notifications/:id/read endpoint
    - Mark notification as read
    - Update readAt timestamp
    - Increment read count on notification
    - _Requirements: 13.4_

  - [ ] 24.8 Create scheduled notification processor
    - Check for scheduled notifications every minute
    - Send notifications when scheduledFor is reached
    - _Requirements: 13.5_

  - [ ] 24.9 Write property test for notification delivery to target audience
    - **Property 13: Notification Delivery to Target Audience**
    - **Validates: Requirements 13.3, 13.2**

  - [ ] 24.10 Write property test for notification read status tracking
    - **Property 14: Notification Read Status Tracking**
    - **Validates: Requirements 13.4**

  - [ ] 24.11 Write property test for scheduled notification auto-send
    - **Property 15: Scheduled Notification Auto-Send**
    - **Validates: Requirements 13.5**

- [ ] 25. Implement Frontend for New Features
  - [ ] 25.1 Create MarketingPostsManager component
    - Display posts table with title, image, status, views
    - Add create/edit dialog with rich text editor
    - Add image upload with drag-drop
    - Add social share buttons
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ] 25.2 Create SocialAccountsManager component
    - Display connected accounts with status
    - Add connect buttons for each platform
    - Add disconnect functionality
    - _Requirements: 12.1_

  - [ ] 25.3 Create NotificationsManager component
    - Display notifications table with delivery stats
    - Add create dialog with audience selector
    - Add schedule option with date picker
    - Show analytics (delivery, read, click rates)
    - _Requirements: 13.1, 13.2, 13.5, 13.6_

  - [ ] 25.4 Create UserNotificationsPage component
    - Display user's notifications list
    - Show unread badge count
    - Mark as read on click
    - Navigate to linked content
    - _Requirements: 13.4_

  - [ ] 25.5 Add notification bell icon to header
    - Show unread count badge
    - Dropdown with recent notifications
    - Link to full notifications page
    - _Requirements: 13.4_

- [ ] 26. Update Marketing Page for Posts
  - [ ] 26.1 Add marketing posts section to MarketingPage
    - Display recent published posts
    - Show featured image and excerpt
    - Link to full post page
    - _Requirements: 11.5_

  - [ ] 26.2 Create MarketingPostPage component
    - Display full post content
    - Show gallery images
    - Add social share buttons
    - Track view count
    - _Requirements: 11.4, 11.5_

- [ ] 27. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check library
- The Marketing Page currently has hardcoded content that will be replaced with dynamic API data
- Content caching should be implemented for performance on the public endpoint
- Audit logging is critical for accountability and should be implemented early
- Social media OAuth integration requires platform-specific developer accounts
- User notifications integrate with the existing notification system in the platform
