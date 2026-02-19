/**
 * Testimonials Property-Based Tests
 * 
 * Feature: social-media-management
 * Tests correctness properties for testimonial management
 * 
 * Requirements: 2.1-2.5 (Testimonials Management)
 */

const fc = require('fast-check');
const mongoose = require('mongoose');

// Import the Testimonial model
const Testimonial = require('../models/Testimonial');

describe('Testimonials Property-Based Tests', () => {
  // Use the global test setup from setup.js - no need to connect again
  
  beforeEach(async () => {
    // Clean up testimonials before each test
    await Testimonial.deleteMany({});
  });

  describe('Property 3: Testimonial Display Order Consistency', () => {
    /**
     * Feature: social-media-management, Property 3: Testimonial Display Order Consistency
     * Validates: Requirements 2.5
     * 
     * For any testimonial reorder operation, the testimonials returned by the
     * marketing page endpoint SHALL be sorted by displayOrder in ascending order.
     */

    test('should return published testimonials sorted by displayOrder ascending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.nat({ max: 100 }), { minLength: 2, maxLength: 10 }),
          async (displayOrders) => {
            // Clean up before each iteration
            await Testimonial.deleteMany({});

            const mockUserId = new mongoose.Types.ObjectId();

            // Create testimonials with different display orders
            for (let i = 0; i < displayOrders.length; i++) {
              await Testimonial.create({
                clientName: `Client ${i}`,
                clientRole: `Role ${i}`,
                content: `This is testimonial content ${i}`,
                rating: Math.floor(Math.random() * 5) + 1,
                displayOrder: displayOrders[i],
                isPublished: true,
                createdBy: mockUserId
              });
            }

            // Get published testimonials (simulates marketing page query)
            const testimonials = await Testimonial.getPublishedTestimonials();

            // Verify testimonials are sorted by displayOrder ascending
            for (let i = 1; i < testimonials.length; i++) {
              expect(testimonials[i].displayOrder).toBeGreaterThanOrEqual(
                testimonials[i - 1].displayOrder
              );
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should maintain order consistency after reorder operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.nat({ max: 50 }), { minLength: 3, maxLength: 8 }),
          async (initialOrders) => {
            // Clean up before each iteration
            await Testimonial.deleteMany({});

            const mockUserId = new mongoose.Types.ObjectId();
            const testimonialIds = [];

            // Create testimonials with initial display orders
            for (let i = 0; i < initialOrders.length; i++) {
              const testimonial = await Testimonial.create({
                clientName: `Client ${i}`,
                content: `Testimonial content ${i}`,
                rating: Math.floor(Math.random() * 5) + 1,
                displayOrder: initialOrders[i],
                isPublished: true,
                createdBy: mockUserId
              });
              testimonialIds.push(testimonial._id);
            }

            // Shuffle the IDs to simulate a reorder operation
            const shuffledIds = [...testimonialIds].sort(() => Math.random() - 0.5);

            // Perform reorder operation (update displayOrder based on new position)
            for (let i = 0; i < shuffledIds.length; i++) {
              await Testimonial.findByIdAndUpdate(shuffledIds[i], { displayOrder: i });
            }

            // Get testimonials sorted by displayOrder
            const reorderedTestimonials = await Testimonial.getPublishedTestimonials();

            // Verify the order matches the shuffled order
            for (let i = 0; i < reorderedTestimonials.length; i++) {
              expect(reorderedTestimonials[i]._id.toString()).toBe(shuffledIds[i].toString());
              expect(reorderedTestimonials[i].displayOrder).toBe(i);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should only return published testimonials in sorted order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            displayOrder: fc.nat({ max: 100 }),
            isPublished: fc.boolean()
          }), { minLength: 3, maxLength: 10 }),
          async (testimonialConfigs) => {
            // Clean up before each iteration
            await Testimonial.deleteMany({});

            const mockUserId = new mongoose.Types.ObjectId();

            // Create testimonials with mixed publication status
            for (let i = 0; i < testimonialConfigs.length; i++) {
              await Testimonial.create({
                clientName: `Client ${i}`,
                content: `Testimonial content ${i}`,
                rating: Math.floor(Math.random() * 5) + 1,
                displayOrder: testimonialConfigs[i].displayOrder,
                isPublished: testimonialConfigs[i].isPublished,
                createdBy: mockUserId
              });
            }

            // Get published testimonials
            const publishedTestimonials = await Testimonial.getPublishedTestimonials();

            // Count expected published testimonials
            const expectedPublishedCount = testimonialConfigs.filter(c => c.isPublished).length;
            expect(publishedTestimonials.length).toBe(expectedPublishedCount);

            // Verify all returned testimonials are published
            publishedTestimonials.forEach(t => {
              expect(t.isPublished).toBe(true);
            });

            // Verify they are sorted by displayOrder ascending
            for (let i = 1; i < publishedTestimonials.length; i++) {
              expect(publishedTestimonials[i].displayOrder).toBeGreaterThanOrEqual(
                publishedTestimonials[i - 1].displayOrder
              );
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should handle empty reorder gracefully', async () => {
      // Clean up
      await Testimonial.deleteMany({});

      // Get testimonials when none exist
      const testimonials = await Testimonial.getPublishedTestimonials();
      expect(testimonials).toEqual([]);
    });

    test('should preserve displayOrder values after individual updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.nat({ max: 50 }), { minLength: 3, maxLength: 6 }),
          fc.nat({ max: 5 }),
          fc.nat({ max: 100 }),
          async (initialOrders, updateIndex, newOrder) => {
            // Clean up before each iteration
            await Testimonial.deleteMany({});

            const mockUserId = new mongoose.Types.ObjectId();
            const testimonialIds = [];

            // Create testimonials
            for (let i = 0; i < initialOrders.length; i++) {
              const testimonial = await Testimonial.create({
                clientName: `Client ${i}`,
                content: `Testimonial content ${i}`,
                rating: Math.floor(Math.random() * 5) + 1,
                displayOrder: initialOrders[i],
                isPublished: true,
                createdBy: mockUserId
              });
              testimonialIds.push(testimonial._id);
            }

            // Update one testimonial's displayOrder
            const targetIndex = updateIndex % testimonialIds.length;
            await Testimonial.findByIdAndUpdate(
              testimonialIds[targetIndex],
              { displayOrder: newOrder }
            );

            // Get testimonials
            const testimonials = await Testimonial.getPublishedTestimonials();

            // Verify they are still sorted by displayOrder
            for (let i = 1; i < testimonials.length; i++) {
              expect(testimonials[i].displayOrder).toBeGreaterThanOrEqual(
                testimonials[i - 1].displayOrder
              );
            }

            // Verify the updated testimonial has the new order
            const updatedTestimonial = await Testimonial.findById(testimonialIds[targetIndex]);
            expect(updatedTestimonial.displayOrder).toBe(newOrder);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
