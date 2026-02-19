/**
 * Event Bus - Central Event System
 * 
 * Provides event-driven architecture for decoupled side effects.
 * 
 * @stable
 * @verified 2024-12-27
 * @module events/eventBus
 */

const EventEmitter = require('events');

class AppEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this._eventLog = [];
    this._logEvents = process.env.NODE_ENV !== 'production';
  }

  emitEvent(eventName, payload = {}) {
    const eventData = {
      event: eventName,
      timestamp: new Date().toISOString(),
      correlationId: payload.correlationId || this._generateCorrelationId(),
      ...payload
    };

    if (this._logEvents) {
      this._eventLog.push({ eventName, timestamp: eventData.timestamp });
    }

    this.emit(eventName, eventData);
    this.emit('*', eventData);
  }

  _generateCorrelationId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getEventLog(limit = 100) {
    return this._eventLog.slice(-limit);
  }

  clearEventLog() {
    this._eventLog = [];
  }
}

const eventBus = new AppEventBus();

const AUTH_EVENTS = {
  REGISTER_SUCCESS: 'auth:register:success',
  REGISTER_FAILURE: 'auth:register:failure',
  LOGIN_SUCCESS: 'auth:login:success',
  LOGIN_FAILURE: 'auth:login:failure',
  LOGOUT: 'auth:logout',
  PASSWORD_RESET_REQUESTED: 'auth:password-reset:requested',
  PASSWORD_RESET_SUCCESS: 'auth:password-reset:success',
  EMAIL_VERIFICATION_SENT: 'auth:email-verification:sent',
  EMAIL_VERIFICATION_SUCCESS: 'auth:email-verification:success',
  ACCOUNT_LOCKED: 'auth:account:locked'
};

const USER_EVENTS = {
  CREATED: 'user:created',
  UPDATED: 'user:updated',
  DELETED: 'user:deleted',
  PROFILE_UPDATED: 'user:profile:updated'
};

const SESSION_EVENTS = {
  BOOKED: 'session:booked',
  CONFIRMED: 'session:confirmed',
  CANCELLED: 'session:cancelled',
  COMPLETED: 'session:completed'
};

const PAYMENT_EVENTS = {
  INITIATED: 'payment:initiated',
  SUCCESS: 'payment:success',
  FAILURE: 'payment:failure'
};

const NOTIFICATION_EVENTS = {
  EMAIL_QUEUED: 'notification:email:queued',
  EMAIL_SENT: 'notification:email:sent',
  EMAIL_FAILED: 'notification:email:failed'
};

const SYSTEM_EVENTS = {
  ERROR: 'system:error',
  WARNING: 'system:warning'
};

module.exports = {
  eventBus,
  AUTH_EVENTS,
  USER_EVENTS,
  SESSION_EVENTS,
  PAYMENT_EVENTS,
  NOTIFICATION_EVENTS,
  SYSTEM_EVENTS
};
