# Property-Based Testing Setup for Marketing Pages Refactor

## Overview

This document describes the property-based testing setup for the marketing pages refactor feature using fast-check library.

## What is Property-Based Testing?

Property-based testing is a testing methodology where you define properties (universal truths) that should hold for all valid inputs, rather than testing specific examples. The testing framework (fast-check) then generates hundreds of random inputs to verify these properties.

### Benefits

1. **Comprehensive Coverage**: Tests hundreds of input combinations automatically
2. **Edge Case Discovery**: Finds edge cases you might not think of manually
3. **Specification Validation**: Ensures the implementation matches the specification
4. **Regression Protection**: Properties serve as contracts that must always hold

## Configuration

### Library Version

- **fast-check**: v4.4.0 (installed in client/package.json)
- **Minimum iterations per test**: 100 (configurable via `numRuns` option)

### Test File Location

All property-based tests for the marketing pages refactor are located in:
```
client/src/test/marketing-pages-refactor.property.test.js
```

### Test Tagging Format

Each property test follows this format:

```javascript
/**
 * Feature: marketing-pages-refactor, Property {number}: {property_text}
 * Validates: Requirements {requirement_ids}
 * 
 * {Property description}
 */
```

Example:
```javascript
/**
 * Feature: marketing-pages-refactor, Property 1: Landing Page CTA Standardization
 * Validates: Requirements 1.2, 2.3, 6.5
 * 
 * For any visit to the Landing Page, there should be exactly two primary CTAs 
 * with the text "Get Support" and "Join as a Professional"
 */
```

## Running the Tests

### Run All Property Tests

```bash
# From the client directory
npm test -- marketing-pages-refactor.property.test.js

# Or from the root directory
cd client && npm test -- marketing-pages-refactor.property.test.js
```

### Run Specific Property Test

```bash
npm test -- marketing-pages-refactor.property.test.js -t "Property 1"
```

### Run with Coverage

```bash
npm test -- marketing-pages-refactor.property.test.js --coverage
```

### Run in Watch Mode

```bash
npm test -- marketing-pages-refactor.property.test.js --watch
```

## Property Test Structure

### 12 Core Properties

The test suite validates 12 correctness properties:

1. **Property 1: Landing Page CTA Standardization** (Requirements 1.2, 2.3, 6.5)
   - Validates exactly 2 CTAs with correct text
   - Ensures consistency across pages

2. **Property 2: Content Length Constraints** (Requirements 1.3)
   - Validates Problem Statement ≤ 150 words
   - Tests word counting accuracy

3. **Property 3: Core Values Presence** (Requirements 1.4)
   - Validates exactly 4 core values
   - Ensures correct values and order

4. **Property 4: Landing Page Content Removal** (Requirements 1.7, 6.1, 6.2, 6.3)
   - Validates removal of forbidden content
   - Ensures content moved to Learn More page

5. **Property 5: Learn More Page Content Flow** (Requirements 2.1)
   - Validates section ordering
   - Ensures immutable section order

6. **Property 6: Service Categories Structure** (Requirements 2.5)
   - Validates exactly 3 service categories
   - Ensures correct category names

7. **Property 7: Design System Consistency** (Requirements 3.1, 3.4, 3.6)
   - Validates consistent color tokens
   - Ensures design token consistency

8. **Property 8: Mobile CTA Accessibility** (Requirements 3.3)
   - Validates minimum 44px touch targets
   - Ensures adequate spacing

9. **Property 9: Technical Architecture Preservation** (Requirements 5.1, 5.2, 5.5, 5.6)
   - Validates React component structure
   - Ensures routing unchanged

10. **Property 10: Performance Maintenance** (Requirements 5.3, 5.4)
    - Validates responsive design
    - Ensures performance baseline

11. **Property 11: Kenya Market Integration** (Requirements 7.2, 7.4, 7.6)
    - Validates M-Pesa mentions
    - Ensures KES currency format
    - Validates Kenyan context

12. **Property 12: Content Deduplication** (Requirements 6.4, 6.6)
    - Validates unique content per page
    - Ensures no duplicate sections

## Writing New Property Tests

### Template

```javascript
describe('Property X: Property Name', () => {
  /**
   * Feature: marketing-pages-refactor, Property X: Property Name
   * Validates: Requirements X.Y
   * 
   * Property description
   */
  
  test('should validate property for all inputs', () => {
    fc.assert(
      fc.property(
        fc.arbitraryGenerator(), // Input generator
        (input) => {
          // Test logic
          expect(actualValue).toBe(expectedValue);
        }
      ),
      { numRuns: 100 } // Minimum 100 iterations
    );
  });
});
```

### Fast-Check Generators

Common generators used in the test suite:

```javascript
// Constants
fc.constant(value)

// Strings
fc.string({ minLength: 1, maxLength: 100 })

// Integers
fc.integer({ min: 0, max: 1000 })

// Arrays
fc.array(fc.string(), { minLength: 1, maxLength: 10 })

// One of several values
fc.constantFrom('value1', 'value2', 'value3')

// Records (objects)
fc.record({
  field1: fc.string(),
  field2: fc.integer()
})
```

## Integration with Unit Tests

Property-based tests complement unit tests:

- **Property Tests**: Validate universal properties across all inputs
- **Unit Tests**: Validate specific examples and edge cases

Both types of tests are valuable and should be used together.

## Troubleshooting

### Test Failures

If a property test fails:

1. **Review the failing input**: Fast-check will show the input that caused the failure
2. **Verify the property**: Ensure the property definition is correct
3. **Check the implementation**: The implementation may not satisfy the property
4. **Shrinking**: Fast-check automatically finds the minimal failing case

### Performance Issues

If tests run slowly:

1. **Reduce numRuns**: Temporarily reduce iterations for debugging
2. **Optimize generators**: Use more specific generators
3. **Mock heavy operations**: Mock API calls, rendering, etc.

### Mock Issues

The test file includes mocks for:
- Material-UI components
- Framer Motion animations
- React Router

If you encounter mock-related errors:
1. Verify mock paths are correct
2. Ensure mocks are defined before imports
3. Check that mocked components match actual usage

## Best Practices

1. **Keep properties simple**: Each property should test one universal truth
2. **Use meaningful generators**: Generate realistic test data
3. **Document properties clearly**: Include feature tag and requirements
4. **Run tests frequently**: Catch regressions early
5. **Review failures carefully**: Property test failures often reveal real issues

## References

- [fast-check Documentation](https://github.com/dubzzz/fast-check)
- [Property-Based Testing Guide](https://github.com/dubzzz/fast-check/blob/main/documentation/Guides.md)
- [Marketing Pages Refactor Spec](.kiro/specs/marketing-pages-refactor/)

## Maintenance

This test suite should be updated when:
- New properties are identified in the specification
- Requirements change
- New components are added to the marketing pages
- Edge cases are discovered

Last Updated: 2026-02-19
