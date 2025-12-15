/**
 * Video Call Security Middleware
 * 
 * Provides security validation and enforcement for video call endpoints
 * Ensures HIPAA-equivalent security for teletherapy sessions
 */

const encryptionValidator = require('../utils/encryptionValidator');
const { securityHeaders, enforceTLS } = require('./security');

/**
 * Middleware to validate encryption for video call sessions
 */
const validateEncryption = async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required for encryption validation' });
    }
    
    // Get connection information from request
    const connectionInfo = {
      websocketProtocol: process.env.NODE_ENV === 'production' ? 'wss' : 'ws',
      tlsVersion: req.connection?.getCipher?.()?.version,
      iceServers: req.body.iceServers || [],
      allowInsecureProtocols: process.env.ALLOW_INSECURE_PROTOCOLS === 'true'
    };
    
    // Validate WebRTC encryption
    const validation = await encryptionValidator.validateWebRTCEncryption(sessionId, connectionInfo);
    
    // Store validation results in request for later use
    req.encryptionValidation = validation;
    
    // In production, reject if validation fails
    if (process.env.NODE_ENV === 'production' && !validation.overall) {
      console.error(`❌ Encryption validation failed for session ${sessionId}:`, validation.errors);
      return res.status(403).json({ 
        error: 'Security validation failed',
        details: validation.errors,
        sessionId
      });
    }
    
    // In development, log warnings but allow connection
    if (!validation.overall) {
      console.warn(`⚠️ Encryption validation warnings for session ${sessionId}:`, validation.errors);
    }
    
    next();
  } catch (error) {
    console.error('Encryption validation middleware error:', error);
    res.status(500).json({ error: 'Security validation error' });
  }
};

/**
 * Middleware to enforce secure WebSocket connections in production
 */
const enforceSecureWebSocket = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Check if request is coming through secure connection
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    if (!isSecure) {
      return res.status(426).json({
        error: 'Secure connection required',
        message: 'Video calls require HTTPS/WSS in production'
      });
    }
  }
  
  next();
};

/**
 * Middleware to validate session data encryption
 */
const validateSessionEncryption = async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;
    
    // Get session data (this would typically come from database)
    const session = await global.Session.findByPk(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Validate session data encryption
    const sessionData = {
      meetingLink: session.meetingLink,
      participantData: JSON.stringify({
        clientId: session.clientId,
        psychologistId: session.psychologistId
      }),
      callMetadata: JSON.stringify({
        sessionType: session.sessionType,
        paymentStatus: session.paymentStatus
      })
    };
    
    const encryptionValidation = encryptionValidator.validateSessionDataEncryption(sessionData);
    
    // Store validation in request
    req.sessionEncryptionValidation = encryptionValidation;
    
    // Log validation results
    if (!encryptionValidation.valid) {
      console.warn(`⚠️ Session data encryption validation failed for session ${sessionId}:`, encryptionValidation.errors);
    }
    
    next();
  } catch (error) {
    console.error('Session encryption validation error:', error);
    res.status(500).json({ error: 'Session encryption validation error' });
  }
};

/**
 * Middleware to add security headers specific to video calls
 */
const videoCallSecurityHeaders = (req, res, next) => {
  // Apply general security headers first
  securityHeaders(req, res, () => {
    // Add video call specific headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Permissions policy for camera and microphone
    res.setHeader(
      'Permissions-Policy',
      'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()'
    );
    
    // Content Security Policy for WebRTC
    const csp = [
      "default-src 'self'",
      "connect-src 'self' wss: ws: https:",
      "media-src 'self' blob:",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', csp);
    
    next();
  });
};

/**
 * Complete security middleware stack for video calls
 */
const videoCallSecurity = [
  enforceTLS,
  enforceSecureWebSocket,
  videoCallSecurityHeaders,
  validateEncryption,
  validateSessionEncryption
];

/**
 * Lightweight security middleware for non-critical endpoints
 */
const basicVideoCallSecurity = [
  enforceTLS,
  videoCallSecurityHeaders
];

module.exports = {
  validateEncryption,
  enforceSecureWebSocket,
  validateSessionEncryption,
  videoCallSecurityHeaders,
  videoCallSecurity,
  basicVideoCallSecurity
};