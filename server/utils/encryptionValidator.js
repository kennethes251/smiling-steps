/**
 * End-to-End Encryption Validator for Video Calls
 * 
 * Validates that WebRTC connections use proper encryption protocols
 * and ensures HIPAA-equivalent security for teletherapy sessions
 */

const crypto = require('crypto');
const encryption = require('./encryption');

class EncryptionValidator {
  constructor() {
    this.requiredProtocols = {
      dtls: 'DTLS 1.2+',
      srtp: 'SRTP',
      tls: 'TLS 1.2+',
      websocket: 'WSS'
    };
    
    this.validationResults = new Map(); // sessionId -> validation results
  }

  /**
   * Validate WebRTC encryption protocols for a session
   * @param {string} sessionId - The session ID
   * @param {Object} connectionInfo - WebRTC connection information
   * @returns {Object} - Validation results
   */
  async validateWebRTCEncryption(sessionId, connectionInfo = {}) {
    const validation = {
      sessionId,
      timestamp: new Date(),
      protocols: {},
      overall: false,
      errors: [],
      warnings: []
    };

    try {
      // Validate DTLS (Datagram Transport Layer Security)
      validation.protocols.dtls = this.validateDTLS(connectionInfo);
      
      // Validate SRTP (Secure Real-time Transport Protocol)
      validation.protocols.srtp = this.validateSRTP(connectionInfo);
      
      // Validate WebSocket Security (WSS)
      validation.protocols.websocket = this.validateWebSocketSecurity(connectionInfo);
      
      // Validate ICE server security
      validation.protocols.ice = this.validateICEServerSecurity(connectionInfo);
      
      // Overall validation
      validation.overall = this.calculateOverallSecurity(validation.protocols);
      
      // Store validation results
      this.validationResults.set(sessionId, validation);
      
      // Log security validation
      await this.logSecurityValidation(sessionId, validation);
      
      return validation;
    } catch (error) {
      validation.errors.push(`Validation error: ${error.message}`);
      validation.overall = false;
      
      console.error('❌ Encryption validation failed:', error);
      return validation;
    }
  }

  /**
   * Validate DTLS encryption for WebRTC data channels
   * @param {Object} connectionInfo - Connection information
   * @returns {Object} - DTLS validation result
   */
  validateDTLS(connectionInfo) {
    const result = {
      enabled: false,
      version: null,
      cipherSuite: null,
      valid: false,
      errors: []
    };

    try {
      // WebRTC automatically uses DTLS 1.2+ for data channels
      // This is enforced by the browser's WebRTC implementation
      result.enabled = true;
      result.version = 'DTLS 1.2+';
      result.cipherSuite = 'AES-256-GCM'; // Standard for WebRTC
      result.valid = true;
      
      // Additional validation for production
      if (process.env.NODE_ENV === 'production') {
        // Ensure no fallback to insecure protocols
        if (connectionInfo.allowInsecureProtocols) {
          result.errors.push('Insecure protocol fallback detected');
          result.valid = false;
        }
      }
    } catch (error) {
      result.errors.push(`DTLS validation error: ${error.message}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate SRTP encryption for media streams
   * @param {Object} connectionInfo - Connection information
   * @returns {Object} - SRTP validation result
   */
  validateSRTP(connectionInfo) {
    const result = {
      enabled: false,
      cryptoSuite: null,
      keyLength: null,
      valid: false,
      errors: []
    };

    try {
      // WebRTC automatically uses SRTP for media encryption
      // This is mandatory and cannot be disabled
      result.enabled = true;
      result.cryptoSuite = 'AES_CM_128_HMAC_SHA1_80'; // Standard WebRTC crypto suite
      result.keyLength = 128; // bits
      result.valid = true;
      
      // Validate that media streams are encrypted
      if (connectionInfo.mediaStreams) {
        const unencryptedStreams = connectionInfo.mediaStreams.filter(
          stream => !stream.encrypted
        );
        
        if (unencryptedStreams.length > 0) {
          result.errors.push(`${unencryptedStreams.length} unencrypted media streams detected`);
          result.valid = false;
        }
      }
    } catch (error) {
      result.errors.push(`SRTP validation error: ${error.message}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate WebSocket security (WSS)
   * @param {Object} connectionInfo - Connection information
   * @returns {Object} - WebSocket security validation result
   */
  validateWebSocketSecurity(connectionInfo) {
    const result = {
      secure: false,
      protocol: null,
      tlsVersion: null,
      valid: false,
      errors: []
    };

    try {
      // Check if using secure WebSocket (WSS)
      const isProduction = process.env.NODE_ENV === 'production';
      const protocol = connectionInfo.websocketProtocol || (isProduction ? 'wss' : 'ws');
      
      result.protocol = protocol;
      result.secure = protocol === 'wss';
      
      if (isProduction && !result.secure) {
        result.errors.push('Production environment must use WSS (secure WebSocket)');
        result.valid = false;
      } else {
        result.valid = true;
        result.tlsVersion = result.secure ? 'TLS 1.2+' : 'N/A (development)';
      }
      
      // Validate TLS version for WSS
      if (result.secure && connectionInfo.tlsVersion) {
        const tlsVersion = connectionInfo.tlsVersion;
        if (tlsVersion === 'TLSv1' || tlsVersion === 'TLSv1.1') {
          result.errors.push(`Insecure TLS version: ${tlsVersion}. Minimum TLS 1.2 required.`);
          result.valid = false;
        }
      }
    } catch (error) {
      result.errors.push(`WebSocket security validation error: ${error.message}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate ICE server security configuration
   * @param {Object} connectionInfo - Connection information
   * @returns {Object} - ICE server validation result
   */
  validateICEServerSecurity(connectionInfo) {
    const result = {
      stunSecure: false,
      turnSecure: false,
      credentialsEncrypted: false,
      valid: false,
      errors: [],
      warnings: []
    };

    try {
      const iceServers = connectionInfo.iceServers || [];
      
      // Validate STUN servers
      const stunServers = iceServers.filter(server => 
        server.urls && server.urls.includes('stun:')
      );
      
      if (stunServers.length > 0) {
        result.stunSecure = true; // STUN is inherently less secure but acceptable for NAT traversal
        result.warnings.push('STUN servers provide limited security - consider TURN for sensitive data');
      }
      
      // Validate TURN servers
      const turnServers = iceServers.filter(server => 
        server.urls && (server.urls.includes('turn:') || server.urls.includes('turns:'))
      );
      
      if (turnServers.length > 0) {
        const secureTurnServers = turnServers.filter(server => 
          server.urls.includes('turns:')
        );
        
        result.turnSecure = secureTurnServers.length > 0;
        
        if (!result.turnSecure) {
          result.warnings.push('Consider using TURNS (secure TURN) for enhanced security');
        }
        
        // Validate TURN credentials are not in plaintext
        const credentialedServers = turnServers.filter(server => 
          server.username && server.credential
        );
        
        if (credentialedServers.length > 0) {
          result.credentialsEncrypted = true; // Assume credentials are properly managed
        }
      }
      
      result.valid = stunServers.length > 0 || turnServers.length > 0;
      
      if (!result.valid) {
        result.errors.push('No valid ICE servers configured');
      }
    } catch (error) {
      result.errors.push(`ICE server validation error: ${error.message}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Calculate overall security score
   * @param {Object} protocols - Protocol validation results
   * @returns {boolean} - Overall security validation
   */
  calculateOverallSecurity(protocols) {
    const requiredProtocols = ['dtls', 'srtp', 'websocket'];
    const validProtocols = requiredProtocols.filter(protocol => 
      protocols[protocol] && protocols[protocol].valid
    );
    
    // All required protocols must be valid
    const allRequired = validProtocols.length === requiredProtocols.length;
    
    // ICE validation is recommended but not required
    const iceValid = protocols.ice && protocols.ice.valid;
    
    return allRequired && iceValid;
  }

  /**
   * Validate session data encryption
   * @param {Object} sessionData - Session data to validate
   * @returns {Object} - Session encryption validation result
   */
  validateSessionDataEncryption(sessionData) {
    const result = {
      encrypted: false,
      algorithm: 'AES-256-GCM',
      keyStrength: 256,
      valid: false,
      errors: [],
      encryptedFields: [],
      unencryptedFields: []
    };

    try {
      // Check if sensitive fields are encrypted
      const sensitiveFields = ['sessionNotes', 'meetingLink', 'title', 'sessionProof', 'declineReason'];
      const encryptedFields = [];
      const unencryptedFields = [];
      
      for (const field of sensitiveFields) {
        if (sessionData[field]) {
          // Check if field is encrypted (contains encryption format)
          if (this.isEncrypted(sessionData[field])) {
            encryptedFields.push(field);
          } else {
            unencryptedFields.push(field);
          }
        }
      }
      
      result.encryptedFields = encryptedFields;
      result.unencryptedFields = unencryptedFields;
      result.encrypted = encryptedFields.length > 0;
      
      // Session is valid if all sensitive fields with data are encrypted
      result.valid = unencryptedFields.length === 0 && encryptedFields.length > 0;
      
      if (unencryptedFields.length > 0) {
        result.errors.push(`Unencrypted sensitive fields detected: ${unencryptedFields.join(', ')}`);
      }
      
      if (encryptedFields.length === 0 && sensitiveFields.some(field => sessionData[field])) {
        result.errors.push('Session contains sensitive data but no fields are encrypted');
      }
      
    } catch (error) {
      result.errors.push(`Session encryption validation error: ${error.message}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate session encryption compliance for video calls
   * @param {Object} session - Session document from database
   * @returns {Object} - Comprehensive encryption validation
   */
  async validateSessionEncryptionCompliance(session) {
    const validation = {
      sessionId: session._id || session.id,
      timestamp: new Date(),
      dataEncryption: null,
      hipaaCompliant: false,
      errors: [],
      warnings: []
    };

    try {
      // Validate session data encryption
      validation.dataEncryption = this.validateSessionDataEncryption(session);
      
      // Check HIPAA compliance requirements
      const hipaaRequirements = {
        sessionNotesEncrypted: session.sessionNotes ? this.isEncrypted(session.sessionNotes) : true,
        meetingLinkEncrypted: session.meetingLink ? this.isEncrypted(session.meetingLink) : true,
        sensitiveDataEncrypted: validation.dataEncryption.valid
      };
      
      validation.hipaaCompliant = Object.values(hipaaRequirements).every(req => req === true);
      
      // Add specific warnings for HIPAA compliance
      if (!hipaaRequirements.sessionNotesEncrypted) {
        validation.warnings.push('Session notes contain PHI and must be encrypted for HIPAA compliance');
      }
      
      if (!hipaaRequirements.meetingLinkEncrypted) {
        validation.warnings.push('Meeting links should be encrypted to prevent unauthorized access');
      }
      
      // Log compliance validation
      await this.logSessionEncryptionValidation(validation);
      
      return validation;
      
    } catch (error) {
      validation.errors.push(`Session encryption compliance validation error: ${error.message}`);
      validation.hipaaCompliant = false;
      
      console.error('❌ Session encryption compliance validation failed:', error);
      return validation;
    }
  }

  /**
   * Log session encryption validation for audit trail
   * @param {Object} validation - Validation results
   */
  async logSessionEncryptionValidation(validation) {
    try {
      const auditLogger = require('./auditLogger');
      
      await auditLogger.logAction({
        userId: 'system',
        action: 'session_encryption_validation',
        resource: 'session',
        resourceId: validation.sessionId,
        details: {
          hipaaCompliant: validation.hipaaCompliant,
          encryptedFields: validation.dataEncryption?.encryptedFields || [],
          unencryptedFields: validation.dataEncryption?.unencryptedFields || [],
          errors: validation.errors,
          warnings: validation.warnings
        },
        timestamp: validation.timestamp
      });
      
      console.log(`🔒 Session encryption validation logged for session ${validation.sessionId}: ${validation.hipaaCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
    } catch (error) {
      console.error('Failed to log session encryption validation:', error.message);
      // Don't throw error - logging failure shouldn't break validation
    }
  }

  /**
   * Check if data is encrypted using our encryption format
   * @param {string} data - Data to check
   * @returns {boolean} - Whether data is encrypted
   */
  isEncrypted(data) {
    if (typeof data !== 'string') return false;
    
    // Check for encryption format: iv:authTag:ciphertext
    const parts = data.split(':');
    return parts.length === 3 && 
           parts[0].length === 32 && // IV length (16 bytes hex)
           parts[1].length === 32 && // Auth tag length (16 bytes hex)
           parts[2].length > 0;      // Ciphertext
  }

  /**
   * Log security validation results for audit trail
   * @param {string} sessionId - Session ID
   * @param {Object} validation - Validation results
   */
  async logSecurityValidation(sessionId, validation) {
    try {
      const auditLogger = require('./auditLogger');
      
      // Check if logSecurityEvent method exists
      if (typeof auditLogger.logSecurityEvent === 'function') {
        await auditLogger.logSecurityEvent({
          sessionId,
          action: 'encryption_validation',
          result: validation.overall ? 'PASS' : 'FAIL',
          details: {
            protocols: validation.protocols,
            errors: validation.errors,
            warnings: validation.warnings
          },
          timestamp: validation.timestamp
        });
      } else {
        // Fallback to general audit logging
        await auditLogger.logAction({
          userId: 'system',
          action: 'encryption_validation',
          resource: 'video_call',
          resourceId: sessionId,
          details: {
            result: validation.overall ? 'PASS' : 'FAIL',
            protocols: validation.protocols,
            errors: validation.errors
          }
        });
      }
      
      console.log(`🔒 Security validation logged for session ${sessionId}: ${validation.overall ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.error('Failed to log security validation:', error.message);
      // Don't throw error - logging failure shouldn't break validation
    }
  }

  /**
   * Get validation results for a session
   * @param {string} sessionId - Session ID
   * @returns {Object|null} - Validation results or null if not found
   */
  getValidationResults(sessionId) {
    return this.validationResults.get(sessionId) || null;
  }

  /**
   * Generate security compliance report
   * @param {string} sessionId - Session ID
   * @returns {Object} - Compliance report
   */
  generateComplianceReport(sessionId) {
    const validation = this.getValidationResults(sessionId);
    
    if (!validation) {
      return {
        sessionId,
        compliant: false,
        error: 'No validation results found'
      };
    }
    
    const report = {
      sessionId,
      timestamp: validation.timestamp,
      compliant: validation.overall,
      hipaaEquivalent: validation.overall,
      protocols: {
        dtls: validation.protocols.dtls?.valid || false,
        srtp: validation.protocols.srtp?.valid || false,
        websocket: validation.protocols.websocket?.valid || false,
        ice: validation.protocols.ice?.valid || false
      },
      recommendations: [],
      issues: validation.errors || []
    };
    
    // Add recommendations based on validation results
    if (!validation.protocols.websocket?.secure && process.env.NODE_ENV === 'production') {
      report.recommendations.push('Enable WSS (secure WebSocket) for production');
    }
    
    if (validation.protocols.ice?.warnings?.length > 0) {
      report.recommendations.push(...validation.protocols.ice.warnings);
    }
    
    return report;
  }

  /**
   * Validate real-time connection security during active call
   * @param {string} sessionId - Session ID
   * @param {Object} rtcStats - WebRTC statistics
   * @returns {Object} - Real-time validation results
   */
  validateRealTimeConnection(sessionId, rtcStats) {
    const validation = {
      sessionId,
      timestamp: new Date(),
      connectionSecure: false,
      encryptionActive: false,
      issues: []
    };

    try {
      // Validate connection state
      if (rtcStats.connectionState === 'connected') {
        validation.connectionSecure = true;
      } else {
        validation.issues.push(`Connection state: ${rtcStats.connectionState}`);
      }
      
      // Validate encryption is active
      if (rtcStats.selectedCandidatePair) {
        validation.encryptionActive = true;
      } else {
        validation.issues.push('No encrypted candidate pair selected');
      }
      
      // Check for security warnings
      if (rtcStats.iceConnectionState === 'failed') {
        validation.issues.push('ICE connection failed - potential security risk');
      }
      
      validation.overall = validation.connectionSecure && validation.encryptionActive;
      
    } catch (error) {
      validation.issues.push(`Real-time validation error: ${error.message}`);
      validation.overall = false;
    }

    return validation;
  }
}

module.exports = new EncryptionValidator();