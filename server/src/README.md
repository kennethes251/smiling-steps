# Smiling Steps - Foundation Architecture

This `src/` directory contains the production-grade foundation for the Smiling Steps teletherapy platform. It implements stability-first patterns to ensure features remain functional as the codebase grows.

## Folder Structure

```
src/
├── config/           # Centralized configuration
├── constants/        # Enums, state machines, stable markers
├── controllers/      # Thin request handlers (call services, return responses)
├── events/           # EventEmitter system and event definitions
├── listeners/        # Event listeners (logging, notifications, retries)
├── middleware/       # Express middleware (auth, validation, errors)
├── models/           # Database schemas (structure only)
├── routes/           # Route definitions (thin, no business logic)
├── services/         # Business logic (core of the application)
├── utils/            # Stateless helper functions
├── validators/       # Schema-based input validation (Joi)
└── tests/            # Jest test suites
```

## Design Principles

1. **Stability First**: Verified features are marked `@stable` and protected
2. **Service Layer**: All business logic lives in services
3. **Thin Routes**: Routes only validate input, call services, return responses
4. **Event-Driven**: Side effects handled via events, not direct coupling
5. **Centralized Validation**: All input validated before reaching services
6. **Regression Protection**: Tests act as contracts

## Stable Feature Markers

Use JSDoc `@stable` tag to mark verified code:

```javascript
/**
 * @stable
 * @verified 2024-12-27
 * @description User registration - DO NOT MODIFY without regression tests
 */
```

## Adding New Features

1. Create new modules - don't edit stable code
2. Use events to integrate with existing features
3. Add tests before marking as stable
4. Document in this README
