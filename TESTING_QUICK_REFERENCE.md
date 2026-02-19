# Testing Quick Reference

## 🚀 Daily Development Commands

```bash
# Quick feedback during development (2-3 minutes)
npm run test:quick

# Verify stable features still work (30 seconds)
npm run test:stable

# Before committing code (5-7 minutes)
npm run test:full
```

## 📊 Analysis & Cleanup Commands

```bash
# Analyze your current test situation
npm run test:analyze

# Get cleanup recommendations
npm run test:cleanup

# Actually move redundant files to archive
npm run test:cleanup -- --execute
```

## 🎯 Specific Test Scenarios

```bash
# Test specific functionality
npm test -- --testNamePattern="login"
npm test -- --testNamePattern="booking"
npm test -- --testNamePattern="payment"

# Test specific file
npm test server/test/auth-login.stable.test.js

# Run with coverage
npm test -- --coverage --testPathPattern="core"

# Run tests in watch mode during development
npm test -- --watch --testPathPattern="core"
```

## 🚨 Before Deployment

```bash
# Complete pre-deployment test suite (8-10 minutes)
npm run test:deploy

# If all passes, you're good to deploy!
```

## 📁 Recommended Test Organization

```
server/test/
├── core/                    # Daily development tests
│   ├── auth.test.js        # All authentication tests
│   ├── booking.test.js     # All booking/session tests
│   ├── payment.test.js     # All payment/M-Pesa tests
│   └── admin.test.js       # All admin functionality tests
├── integration/             # End-to-end tests
│   ├── full-flow.test.js   # Complete user journeys
│   └── api-integration.test.js
├── stable/                  # PROTECTED - Never modify
│   └── auth-login.stable.test.js
└── property/               # Property-based tests
    └── *.property.test.js
```

## ⚡ Time Savings

- **Before**: 20+ minutes to run all tests
- **After**: 2-3 minutes for daily development
- **Result**: 85% time reduction while maintaining quality

## 🎯 Focus Areas

1. **Quality over Quantity** - Better to have 20 good tests than 200 mediocre ones
2. **Fast Feedback** - Tests should run quickly to encourage frequent use
3. **Clear Purpose** - Each test should have a specific, documented purpose
4. **Stable Protection** - Never modify tests marked as stable

## 🔧 Troubleshooting

If tests are slow:
```bash
# Run with timing info
npm test -- --verbose

# Run single-threaded for debugging
npm test -- --runInBand

# Skip slow tests during development
npm test -- --testPathIgnorePatterns="slow|integration"
```

If tests are flaky:
```bash
# Run multiple times to identify flaky tests
for i in {1..5}; do npm run test:quick; done
```

## 📝 Next Steps

1. Run `npm run test:analyze` to see your current situation
2. Run `npm run test:cleanup` to get recommendations
3. Start using `npm run test:quick` for daily development
4. Gradually consolidate tests into the organized structure
5. Archive or delete redundant test files

Remember: The goal is efficient, reliable testing that gives you confidence without wasting time!