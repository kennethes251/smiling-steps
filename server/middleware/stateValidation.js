/**
 * State Validation Middleware
 * 
 * This middleware enforces Flow Integrity rules at the API level.
 * It validates state transitions before they are processed and rejects
 * invalid transitions with clear error messages.
 * 
 * CRITICAL: This middleware must be applied to all state-changing endpoints.
 */

const { validateStateTransition } = require('../utils/stateValidation');

/**
 * Creates state validation middleware for specific entity types
 * 
 * @param {string} entityType - Type of entity ('payment', 'session', 'video')
 * @param {object} options - Configuration options
 * @param {function} options.getCurrentState - Function to get current state from request
 * @param {function} options.getNewState - Function to get new state from request
 * @param {function} options.getContext - Function to get additional context
 * @returns {function} Express middleware function
 */
function createStateValidationMiddleware(entityType, options = {}) {
  const {
    getCurrentState = (req) => req.body.currentState,
    getNewState = (req) => req.body.newState,
    getContext = (req) => ({})
  } = options;

  return async (req, res, next) => {
    try {
      const currentState = getCurrentState(req);
      const newState = getNewState(req);
      const context = getContext(req);

      // Skip validation if no state change is happening
      if (!currentState || !newState) {
        return next();
      }

      // Skip validation if states are the same (no transition)
      if (currentState === newState) {
        return next();
      }

      // Perform state validation
      const validationResult = validateStateTransition({
        entityType,
        currentState,
        newState,
        ...context
      });

      // Add validation result to request for downstream use
      req.stateValidation = validationResult;

      // Log successful validation
      console.log(`✅ State validation passed: ${entityType} ${currentState} → ${newState}`);

      next();

    } catch (error) {
      // Log validation failure
      console.error(`❌ State validation failed: ${error.message}`, {
        entityType,
        error: error.message,
        context: error.context
      });

      // Return validation error response
      res.status(400).json({
        error: 'Invalid state transition',
        message: error.message,
        code: 'INVALID_STATE_TRANSITION',
        entityType,
        context: error.context,
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Payment State Validation Middleware
 * 
 * Validates payment state transitions. Expects currentState and newState
 * in request body, along with sessionId for cross-validation.
 */
const validatePaymentState = createStateValidationMiddleware('payment', {
  getCurrentState: (req) => req.body.currentPaymentState || req.body.currentState,
  getNewState: (req) => req.body.newPaymentState || req.body.newState,
  getContext: async (req) => {
    // Get session state for cross-validation if sessionId provided
    if (req.body.sessionId) {
      try {
        const Session = require('../models/Session');
        const session = await Session.findById(req.body.sessionId);
        return {
          sessionState: session?.status,
          formsComplete: session?.formsCompleted || false
        };
      } catch (error) {
        console.warn('Could not fetch session for payment validation:', error.message);
        return {};
      }
    }
    return {};
  }
});

/**
 * Session State Validation Middleware
 * 
 * Validates session state transitions. Expects currentState and newState
 * in request body, along with payment information for cross-validation.
 */
const validateSessionState = createStateValidationMiddleware('session', {
  getCurrentState: (req) => req.body.currentSessionState || req.body.currentState,
  getNewState: (req) => req.body.newSessionState || req.body.newState,
  getContext: async (req) => {
    // Get payment state for cross-validation
    const context = {};
    
    // Try to get payment state from session
    if (req.params.id || req.body.sessionId) {
      try {
        const Session = require('../models/Session');
        const sessionId = req.params.id || req.body.sessionId;
        const session = await Session.findById(sessionId).populate('payment');
        
        if (session?.payment) {
          context.paymentState = session.payment.status;
        }
        
        context.formsComplete = session?.formsCompleted || false;
      } catch (error) {
        console.warn('Could not fetch payment for session validation:', error.message);
      }
    }
    
    return context;
  }
});

/**
 * Video Call State Validation Middleware
 * 
 * Validates video call state transitions. Expects currentState and newState
 * in request body, along with session information for cross-validation.
 */
const validateVideoState = createStateValidationMiddleware('video', {
  getCurrentState: (req) => req.body.currentVideoState || req.body.currentState,
  getNewState: (req) => req.body.newVideoState || req.body.newState,
  getContext: async (req) => {
    // Get session and payment state for cross-validation
    const context = {};
    
    if (req.body.sessionId || req.params.sessionId) {
      try {
        const Session = require('../models/Session');
        const sessionId = req.body.sessionId || req.params.sessionId;
        const session = await Session.findById(sessionId).populate('payment');
        
        context.sessionState = session?.status;
        context.formsComplete = session?.formsCompleted || false;
        
        if (session?.payment) {
          context.paymentState = session.payment.status;
        }
      } catch (error) {
        console.warn('Could not fetch session for video validation:', error.message);
      }
    }
    
    return context;
  }
});

/**
 * Generic State Validation Middleware
 * 
 * Validates any state transition based on request parameters.
 * Useful for endpoints that handle multiple entity types.
 */
const validateGenericState = async (req, res, next) => {
  try {
    const {
      entityType,
      currentState,
      newState,
      paymentState,
      sessionState,
      videoState,
      formsComplete = true
    } = req.body;

    // Skip if no entity type specified
    if (!entityType) {
      return next();
    }

    // Skip if no state change
    if (!currentState || !newState || currentState === newState) {
      return next();
    }

    // Perform validation
    const validationResult = validateStateTransition({
      entityType,
      currentState,
      newState,
      paymentState,
      sessionState,
      videoState,
      formsComplete
    });

    // Add validation result to request
    req.stateValidation = validationResult;

    console.log(`✅ Generic state validation passed: ${entityType} ${currentState} → ${newState}`);
    next();

  } catch (error) {
    console.error(`❌ Generic state validation failed: ${error.message}`, {
      error: error.message,
      context: error.context
    });

    res.status(400).json({
      error: 'Invalid state transition',
      message: error.message,
      code: 'INVALID_STATE_TRANSITION',
      context: error.context,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * State Validation Error Handler
 * 
 * Catches state validation errors and formats them consistently.
 * Should be used as error handling middleware after state validation.
 */
const handleStateValidationError = (error, req, res, next) => {
  if (error.code === 'INVALID_STATE_TRANSITION') {
    return res.status(400).json({
      error: 'Invalid state transition',
      message: error.message,
      code: 'INVALID_STATE_TRANSITION',
      context: error.context,
      timestamp: new Date().toISOString()
    });
  }
  
  // Pass other errors to default error handler
  next(error);
};

/**
 * Validation Result Logger
 * 
 * Logs successful state transitions for monitoring and debugging.
 * Should be used after successful state changes.
 */
const logStateTransition = (req, res, next) => {
  if (req.stateValidation) {
    console.log('📊 State transition completed:', {
      entityType: req.stateValidation.entityType,
      transition: req.stateValidation.transition,
      requiredActions: req.stateValidation.requiredActions,
      timestamp: new Date().toISOString(),
      userId: req.user?.id,
      sessionId: req.params.id || req.body.sessionId
    });
  }
  next();
};

module.exports = {
  createStateValidationMiddleware,
  validatePaymentState,
  validateSessionState,
  validateVideoState,
  validateGenericState,
  handleStateValidationError,
  logStateTransition
};