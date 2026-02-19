/**
 * Social Links Property-Based Tests
 * 
 * Feature: social-media-management
 * Tests correctness properties for social media link management
 * 
 * Requirements: 1.1-1.5 (Social Links Management)
 */

const fc = require('fast-check');
const mongoose = require('mongoose');

// Import the SocialLink model
const SocialLink = require('../models/SocialLink');

// Platform URL patterns for validation
const platformUrlPatterns = {
  facebook: /^https?:\/\/(www\.)?facebook\.com\/.+/i,
  twitter: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/i,
  instagram: /^https?:\/\/(www\.)?instagram\.com\/.+/i,
  linkedin: /^https?:\/\/(www\.)?linkedin\.com\/.+/i,
  youtube: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.*/i,
  tiktok: /^https?:\/\/(www\.)?tiktok\.com\/.+/i
};

// Valid platforms
const validPlatforms = ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok'];

describe('Social Links Property-Based Tests', () => {
  // Use the global test setup from setup.js - no need to connect again
  
  beforeEach(async () => {
    // Clean up social links before each test
    await SocialLink.deleteMany({});
  });

  describe('Property 1: Social Link URL Validation', () => {
    /**
     * Feature: social-media-management, Property 1: Social Link URL Validation
     * Validates: Requirements 1.2
     * 
     * For any social link creation or update request, if the URL does not match
     * a valid URL format for the specified platform, the request SHALL be rejected
     * and no data SHALL be modified.
     */

    test('should accept valid URLs for each platform', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validPlatforms),
          (platform) => {
            const validUrls = {
              facebook: ['https://facebook.com/test', 'https://www.facebook.com/page'],
              twitter: ['https://twitter.com/test', 'https://x.com/test'],
              instagram: ['https://instagram.com/test', 'https://www.instagram.com/test'],
              linkedin: ['https://linkedin.com/company/test', 'https://www.linkedin.com/in/test'],
              youtube: ['https://youtube.com/test', 'https://youtu.be/abc'],
              tiktok: ['https://tiktok.com/@test', 'https://www.tiktok.com/@test']
            };

            validUrls[platform].forEach(url => {
              const isValid = SocialLink.isValidUrlForPlatform(platform, url);
              expect(isValid).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });


    test('should reject invalid URLs for each platform', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validPlatforms),
          (platform) => {
            const invalidUrls = [
              'not-a-url',
              'ftp://invalid.com',
              '',
              'https://wrongplatform.com/test'
            ];

            invalidUrls.forEach(url => {
              const isValid = SocialLink.isValidUrlForPlatform(platform, url);
              expect(isValid).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject URLs from wrong platforms', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validPlatforms),
          fc.constantFrom(...validPlatforms),
          (targetPlatform, urlPlatform) => {
            // Skip if same platform
            if (targetPlatform === urlPlatform) return;

            const platformUrls = {
              facebook: 'https://facebook.com/test',
              twitter: 'https://twitter.com/test',
              instagram: 'https://instagram.com/test',
              linkedin: 'https://linkedin.com/test',
              youtube: 'https://youtube.com/test',
              tiktok: 'https://tiktok.com/@test'
            };

            const url = platformUrls[urlPlatform];
            const isValid = SocialLink.isValidUrlForPlatform(targetPlatform, url);
            
            // URL from different platform should be rejected
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Social Link Toggle Reflects on Marketing Page', () => {
    /**
     * Feature: social-media-management, Property 2: Social Link Toggle Reflects on Marketing Page
     * Validates: Requirements 1.4
     * 
     * For any social link toggle operation, the marketing page content endpoint
     * SHALL return the link if active is true, and SHALL NOT return the link
     * if active is false.
     */

    test('should return only active social links from getActiveLinks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validPlatforms),
          fc.boolean(),
          async (platform, isActive) => {
            // Clean up before each iteration
            await SocialLink.deleteMany({});

            // Create a social link with the given active status
            const mockUserId = new mongoose.Types.ObjectId();
            const socialLink = await SocialLink.create({
              platform,
              url: `https://${platform}.com/smilingsteps`,
              isActive,
              createdBy: mockUserId
            });

            // Get active links (simulates marketing page query)
            const activeLinks = await SocialLink.getActiveLinks();

            if (isActive) {
              // If active, should be in the results
              expect(activeLinks.length).toBe(1);
              expect(activeLinks[0]._id.toString()).toBe(socialLink._id.toString());
            } else {
              // If not active, should NOT be in the results
              expect(activeLinks.length).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });


    test('should toggle active status correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...validPlatforms),
          fc.boolean(),
          async (platform, initialStatus) => {
            // Clean up before each iteration
            await SocialLink.deleteMany({});

            // Create a social link with initial status
            const mockUserId = new mongoose.Types.ObjectId();
            const socialLink = await SocialLink.create({
              platform,
              url: `https://${platform}.com/smilingsteps`,
              isActive: initialStatus,
              createdBy: mockUserId
            });

            // Toggle the status
            socialLink.isActive = !socialLink.isActive;
            await socialLink.save();

            // Verify the toggle worked
            const updatedLink = await SocialLink.findById(socialLink._id);
            expect(updatedLink.isActive).toBe(!initialStatus);

            // Verify getActiveLinks reflects the change
            const activeLinks = await SocialLink.getActiveLinks();
            
            if (!initialStatus) {
              // Was inactive, now active - should appear
              expect(activeLinks.length).toBe(1);
            } else {
              // Was active, now inactive - should not appear
              expect(activeLinks.length).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should filter multiple links by active status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 6 }),
          async (activeStatuses) => {
            // Clean up before each iteration
            await SocialLink.deleteMany({});

            const mockUserId = new mongoose.Types.ObjectId();
            
            // Create links with different active statuses
            // Use only as many platforms as we have statuses
            const platformsToUse = validPlatforms.slice(0, activeStatuses.length);
            
            for (let i = 0; i < platformsToUse.length; i++) {
              await SocialLink.create({
                platform: platformsToUse[i],
                url: `https://${platformsToUse[i]}.com/smilingsteps`,
                isActive: activeStatuses[i],
                displayOrder: i,
                createdBy: mockUserId
              });
            }

            // Get active links
            const activeLinks = await SocialLink.getActiveLinks();

            // Count expected active links
            const expectedActiveCount = activeStatuses.filter(s => s).length;
            
            // Verify count matches
            expect(activeLinks.length).toBe(expectedActiveCount);

            // Verify all returned links are active
            activeLinks.forEach(link => {
              expect(link.isActive).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain display order when filtering active links', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.nat({ max: 100 }), { minLength: 2, maxLength: 6 }),
          async (displayOrders) => {
            // Clean up before each iteration
            await SocialLink.deleteMany({});

            const mockUserId = new mongoose.Types.ObjectId();
            const platformsToUse = validPlatforms.slice(0, displayOrders.length);

            // Create all links as active with different display orders
            for (let i = 0; i < platformsToUse.length; i++) {
              await SocialLink.create({
                platform: platformsToUse[i],
                url: `https://${platformsToUse[i]}.com/smilingsteps`,
                isActive: true,
                displayOrder: displayOrders[i],
                createdBy: mockUserId
              });
            }

            // Get active links (should be sorted by displayOrder)
            const activeLinks = await SocialLink.getActiveLinks();

            // Verify links are sorted by displayOrder ascending
            for (let i = 1; i < activeLinks.length; i++) {
              expect(activeLinks[i].displayOrder).toBeGreaterThanOrEqual(
                activeLinks[i - 1].displayOrder
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
