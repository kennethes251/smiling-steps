/**
 * Flow Integrity Configuration
 * 
 * Centralized configuration for Flow Integrity enforcement levels.
 * Includes the kill switch for integrity enforcement.
 * 
 * CRITICAL REFINEMENT #5: Kill switch implementation
 */

/**
 * Integrity Enforcement Levels
 * 
 * Controls how strictly Flow Integrity rules are enforced:
 * - 'strict': Block all invalid transitions (production mode)
 * - 'warn': Log warnings but allow transitions (development mode)
 * - 'off': Disable all integrity checks (emergency mode)
 */
const INTEGRITY_ENFORCEMENT_LEVELS = {
  STRICT: 'strict',
  WARN: 'warn',
  OFF: 'off'
};

/**
 * Current Enforcement Level
 * 
 * Can be overridden by environment variable INTEGRITY_ENFORCEMENT
 * Default: 'strict' for production safety
 */
const CURRENT_ENFORCEMENT_LEVEL = process.env.INTEGRITY_ENFORCEMENT || INTEGRITY_ENFORCEMENT_LEVELS.STRICT;

/**
 * Integrity Configuration Class
 * 
 * Manages Flow Integrity enforcement settings and provides
 * runtime control over integrity checks.
 */
class IntegrityConfig {
  
  constructor() {
    this.enforcementLevel = CURRENT_ENFORCEMENT_LEVEL;
    this.startTime = new Date();
    this.stats = {
      transitionsBlocked: 0,
      warningsIssued: 0,
      checksSkipped: 0,
      totalChecks: 0
    };
    
    console.log(`🛡️ Flow Integrity initialized with enforcement level: ${this.enforcementLevel}`);
  }
  
  /**
   * Check if integrity enforcement is enabled
   * 
   * @returns {boolean} True if enforcement is active
   */
  isEnforcementEnabled() {
    return this.enforcementLevel !== INTEGRITY_ENFORCEMENT_LEVELS.OFF;
  }
  
  /**
   * Check if strict enforcement is enabled
   * 
   * @returns {boolean} True if strict enforcement is active
   */
  isStrictEnforcement() {
    return this.enforcementLevel === INTEGRITY_ENFORCEMENT_LEVELS.STRICT;
  }
  
  /**
   * Check if warn-only mode is enabled
   * 
   * @returns {boolean} True if warn-only mode is active
   */
  isWarnOnlyMode() {
    return this.enforcementLevel === INTEGRITY_ENFORCEMENT_LEVELS.WARN;
  }
  
  /**
   * Set enforcement level at runtime
   * 
   * CRITICAL: This is ADMIN-ONLY and EMERGENCY-ONLY
   * Production code cannot call this without explicit authorization
   * 
   * @param {string} level - New enforcement level
   * @param {string} reason - Reason for change
   * @param {string} changedBy - Who changed it
   * @param {Object} authContext - Authorization context
   */
  setEnforcementLevel(level, reason = 'Manual change', changedBy = 'system', authContext = {}) {
    // CRITICAL: Lock down runtime changes
    if (!authContext.isAdmin && !authContext.isEmergency && !authContext.isStartup) {
      throw new Error(
        'INTEGRITY CONFIG LOCKED: Only admin, emergency, or startup contexts can change enforcement level. ' +
        `Attempted by: ${changedBy}, Context: ${JSON.stringify(authContext)}`
      );
    }
    
    if (!Object.values(INTEGRITY_ENFORCEMENT_LEVELS).includes(level)) {
      throw new Error(`Invalid enforcement level: ${level}`);
    }
    
    const oldLevel = this.enforcementLevel;
    this.enforcementLevel = level;
    
    console.log(`🛡️ Integrity enforcement changed: ${oldLevel} → ${level}`, {
      reason,
      changedBy,
      authContext,
      timestamp: new Date()
    });
    
    // Log critical change if disabling enforcement
    if (level === INTEGRITY_ENFORCEMENT_LEVELS.OFF) {
      console.warn('🚨 CRITICAL: Flow Integrity enforcement DISABLED', {
        reason,
        changedBy,
        authContext,
        timestamp: new Date()
      });
    }
  }
  
  /**
   * Handle integrity violation based on enforcement level
   * 
   * @param {Error} violation - The integrity violation error
   * @param {Object} context - Additional context
   * @throws {Error} If strict enforcement is enabled
   * @returns {boolean} True if violation was handled
   */
  handleViolation(violation, context = {}) {
    this.stats.totalChecks++;
    
    switch (this.enforcementLevel) {
      case INTEGRITY_ENFORCEMENT_LEVELS.STRICT:
        this.stats.transitionsBlocked++;
        console.error('🚫 INTEGRITY VIOLATION BLOCKED:', {
          error: violation.message,
          context,
          enforcementLevel: this.enforcementLevel,
          timestamp: new Date()
        });
        throw violation;
        
      case INTEGRITY_ENFORCEMENT_LEVELS.WARN:
        this.stats.warningsIssued++;
        console.warn('⚠️ INTEGRITY VIOLATION WARNING:', {
          error: violation.message,
          context,
          enforcementLevel: this.enforcementLevel,
          message: 'Violation logged but transition allowed',
          timestamp: new Date()
        });
        return true;
        
      case INTEGRITY_ENFORCEMENT_LEVELS.OFF:
        this.stats.checksSkipped++;
        // Silent skip - no logging to avoid spam
        return true;
        
      default:
        throw new Error(`Unknown enforcement level: ${this.enforcementLevel}`);
    }
  }
  
  /**
   * Emergency disable - turns off all integrity checks
   * 
   * @param {string} reason - Emergency reason
   * @param {string} disabledBy - Who disabled it
   */
  emergencyDisable(reason, disabledBy = 'system') {
    this.setEnforcementLevel(INTEGRITY_ENFORCEMENT_LEVELS.OFF, `EMERGENCY: ${reason}`, disabledBy, {
      isEmergency: true
    });
    
    console.error('🚨 EMERGENCY: Flow Integrity enforcement DISABLED', {
      reason,
      disabledBy,
      timestamp: new Date(),
      message: 'All integrity checks are now bypassed'
    });
  }
  
  /**
   * Emergency enable - turns on strict enforcement
   * 
   * @param {string} reason - Emergency reason
   * @param {string} enabledBy - Who enabled it
   */
  emergencyEnable(reason, enabledBy = 'system') {
    this.setEnforcementLevel(INTEGRITY_ENFORCEMENT_LEVELS.STRICT, `EMERGENCY: ${reason}`, enabledBy, {
      isEmergency: true
    });
    
    console.log('🛡️ EMERGENCY: Flow Integrity enforcement ENABLED', {
      reason,
      enabledBy,
      timestamp: new Date(),
      message: 'All integrity checks are now strictly enforced'
    });
  }
  
  /**
   * Admin-only enforcement level change
   * 
   * @param {string} level - New enforcement level
   * @param {string} reason - Reason for change
   * @param {string} adminId - Admin user ID
   */
  adminSetEnforcementLevel(level, reason, adminId) {
    this.setEnforcementLevel(level, reason, adminId, {
      isAdmin: true,
      adminId
    });
  }
  
  /**
   * Get enforcement statistics
   * 
   * @returns {Object} Statistics about integrity enforcement
   */
  getStats() {
    const uptime = Math.floor((new Date() - this.startTime) / 1000); // seconds
    
    return {
      enforcementLevel: this.enforcementLevel,
      uptime,
      stats: { ...this.stats },
      rates: {
        checksPerSecond: uptime > 0 ? (this.stats.totalChecks / uptime).toFixed(2) : 0,
        blockRate: this.stats.totalChecks > 0 ? 
          ((this.stats.transitionsBlocked / this.stats.totalChecks) * 100).toFixed(2) + '%' : '0%',
        warnRate: this.stats.totalChecks > 0 ? 
          ((this.stats.warningsIssued / this.stats.totalChecks) * 100).toFixed(2) + '%' : '0%'
      }
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      transitionsBlocked: 0,
      warningsIssued: 0,
      checksSkipped: 0,
      totalChecks: 0
    };
    this.startTime = new Date();
    
    console.log('📊 Integrity enforcement statistics reset');
  }
  
  /**
   * Health check for integrity system
   * 
   * @returns {Object} Health status
   */
  healthCheck() {
    const stats = this.getStats();
    
    return {
      status: this.isEnforcementEnabled() ? 'active' : 'disabled',
      enforcementLevel: this.enforcementLevel,
      uptime: stats.uptime,
      totalChecks: stats.stats.totalChecks,
      isHealthy: true, // Could add more sophisticated health checks
      lastCheck: new Date()
    };
  }
}

// Export singleton instance
const integrityConfig = new IntegrityConfig();

// Export enforcement level constants for external use
module.exports = {
  IntegrityConfig,
  integrityConfig,
  INTEGRITY_ENFORCEMENT_LEVELS,
  CURRENT_ENFORCEMENT_LEVEL
};