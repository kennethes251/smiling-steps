# Property-Based Testing Quick Start

## Run the Marketing Pages Refactor Property Tests

```bash
# From the client directory
npm test -- marketing-pages-refactor.property.test.js --run

# Or from the root directory
cd client && npm test -- marketing-pages-refactor.property.test.js --run
```

## What to Expect

The test suite will run 12 property tests, each with 100 iterations:

1. ✓ Property 1: Landing Page CTA Standardization (100 iterations)
2. ✓ Property 2: Content Length Constraints (100 iterations)
3. ✓ Property 3: Core Values Presence (100 iterations)
4. ✓ Property 4: Landing Page Content Removal (100 iterations)
5. ✓ Property 5: Learn More Page Content Flow (100 iterations)
6. ✓ Property 6: Service Categories Structure (100 iterations)
7. ✓ Property 7: Design System Consistency (100 iterations)
8. ✓ Property 8: Mobile CTA Accessibility (100 iterations)
9. ✓ Property 9: Technical Architecture Preservation (100 iterations)
10. ✓ Property 10: Performance Maintenance (100 iterations)
11. ✓ Property 11: Kenya Market Integration (100 iterations)
12. ✓ Property 12: Content Deduplication (100 iterations)

Total: 1,200+ test iterations

## Test Configuration

- **Library**: fast-check v4.4.0
- **Iterations per property**: 100 (minimum)
- **Test tagging**: `Feature: marketing-pages-refactor, Property {number}: {property_text}`
- **Requirements validation**: Each property validates specific requirements from the spec

## Files Created

1. `client/src/test/marketing-pages-refactor.property.test.js` - Main test file
2. `client/src/test/PROPERTY_TESTING_SETUP.md` - Comprehensive setup documentation
3. `client/src/test/QUICK_START.md` - This file

## Next Steps

1. Run the tests to verify setup
2. Review the test output
3. Implement the marketing page components
4. Re-run tests to validate implementation

## Troubleshooting

If tests fail:
- Check the counterexample provided by fast-check
- Review the property definition
- Verify the implementation matches the specification

For more details, see `PROPERTY_TESTING_SETUP.md`
