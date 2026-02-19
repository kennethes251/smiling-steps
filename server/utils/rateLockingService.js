/**
 * Rate Locking Service
 * 
 * Handles locking session rates at booking time to ensure
 * future rate changes don't affect existing bookings
 * Requirements: 14.3, 14.4
 */

const SessionRate = require('../models/SessionRate');
const User = require('../models/User');

/**
 * Get and lock the current rate for a therapist and session type
 * @param {string} therapistId - The therapist's ID
 * @param {string} sessionType - The session type (Individual, Couples, Family, Group)
 * @param {Date} bookingDate - The date when the booking is created (defaults to now)
 * @returns {Object} - The locked rate information
 */
async function lockRateForBooking(therapistId, sessionType, bookingDate = new Date()) {
  try {
    // Validate inputs
    if (!therapistId || !sessionType) {
      throw new Error('Therapist ID and session type are required');
    }
    
    const validSessionTypes = ['Individual', 'Couples', 'Family', 'Group'];
    if (!validSessionTypes.includes(sessionType)) {
      throw new Error(`Invalid session type: ${sessionType}`);
    }
    
    // Get the therapist to ensure they exist and are approved
    const therapist = await User.findById(therapistId);
    if (!therapist) {
      throw new Error('Therapist not found');
    }
    
    if (therapist.approvalStatus !== 'approved') {
      throw new Error('Therapist is not approved');
    }
    
    // Try to get current custom rate from SessionRate model
    let currentRate = await SessionRate.getCurrentRate(therapistId, sessionType);
    
    // If no custom rate exists, use default rate from User model
    if (!currentRate) {
      const rateMapping = {
        'Individual': therapist.sessionRates?.individual || 2000,
        'Couples': therapist.sessionRates?.couples || 3500,
        'Family': therapist.sessionRates?.family || 5000,
        'Group': therapist.sessionRates?.group || 5000
      };
      
      // Create a virtual rate object for consistency
      currentRate = {
        therapist: therapistId,
        sessionType,
        amount: rateMapping[sessionType],
        duration: 60,
        effectiveFrom: bookingDate,
        isActive: true,
        isDefault: true, // Flag to indicate this is a default rate
        source: 'user_model'
      };
    } else {
      currentRate.source = 'session_rate_model';
    }
    
    // Return the locked rate information
    return {
      success: true,
      lockedRate: {
        therapistId,
        therapistName: therapist.name,
        sessionType,
        amount: currentRate.amount,
        duration: currentRate.duration,
        effectiveFrom: currentRate.effectiveFrom,
        lockedAt: bookingDate,
        source: currentRate.source,
        isDefault: currentRate.isDefault || false,
        rateId: currentRate._id || null
      }
    };
    
  } catch (error) {
    console.error('Error locking rate for booking:', error);
    return {
      success: false,
      error: error.message,
      lockedRate: null
    };
  }
}

/**
 * Get the rate that was effective at a specific date (for historical lookups)
 * @param {string} therapistId - The therapist's ID
 * @param {string} sessionType - The session type
 * @param {Date} effectiveDate - The date to check the rate for
 * @returns {Object} - The rate information
 */
async function getRateAtDate(therapistId, sessionType, effectiveDate) {
  try {
    // Try to get rate from SessionRate model first
    const historicalRate = await SessionRate.getRateAtDate(therapistId, sessionType, effectiveDate);
    
    if (historicalRate) {
      return {
        success: true,
        rate: {
          therapistId,
          sessionType,
          amount: historicalRate.amount,
          duration: historicalRate.duration,
          effectiveFrom: historicalRate.effectiveFrom,
          source: 'session_rate_model',
          rateId: historicalRate._id
        }
      };
    }
    
    // Fallback to User model default rates
    const therapist = await User.findById(therapistId);
    if (!therapist) {
      throw new Error('Therapist not found');
    }
    
    const rateMapping = {
      'Individual': therapist.sessionRates?.individual || 2000,
      'Couples': therapist.sessionRates?.couples || 3500,
      'Family': therapist.sessionRates?.family || 5000,
      'Group': therapist.sessionRates?.group || 5000
    };
    
    return {
      success: true,
      rate: {
        therapistId,
        sessionType,
        amount: rateMapping[sessionType],
        duration: 60,
        effectiveFrom: effectiveDate,
        source: 'user_model_default',
        isDefault: true
      }
    };
    
  } catch (error) {
    console.error('Error getting historical rate:', error);
    return {
      success: false,
      error: error.message,
      rate: null
    };
  }
}

/**
 * Calculate the total cost for a session based on locked rate
 * @param {Object} lockedRate - The locked rate object
 * @param {number} actualDuration - Actual session duration in minutes (optional)
 * @returns {Object} - Cost calculation details
 */
function calculateSessionCost(lockedRate, actualDuration = null) {
  try {
    if (!lockedRate || !lockedRate.amount || !lockedRate.duration) {
      throw new Error('Invalid locked rate data');
    }
    
    const baseCost = lockedRate.amount;
    const baseDuration = lockedRate.duration;
    
    // If no actual duration provided, use base cost
    if (!actualDuration) {
      return {
        success: true,
        cost: {
          baseCost,
          baseDuration,
          actualDuration: baseDuration,
          totalCost: baseCost,
          overtime: 0,
          overtimeCost: 0,
          ratePerMinute: baseCost / baseDuration
        }
      };
    }
    
    // Calculate overtime if session ran longer than base duration
    const overtime = Math.max(0, actualDuration - baseDuration);
    const ratePerMinute = baseCost / baseDuration;
    const overtimeCost = overtime * ratePerMinute;
    const totalCost = baseCost + overtimeCost;
    
    return {
      success: true,
      cost: {
        baseCost,
        baseDuration,
        actualDuration,
        totalCost: Math.round(totalCost), // Round to nearest KES
        overtime,
        overtimeCost: Math.round(overtimeCost),
        ratePerMinute
      }
    };
    
  } catch (error) {
    console.error('Error calculating session cost:', error);
    return {
      success: false,
      error: error.message,
      cost: null
    };
  }
}

/**
 * Validate that a session's locked rate is still valid
 * @param {Object} session - The session object
 * @returns {Object} - Validation result
 */
async function validateLockedRate(session) {
  try {
    if (!session.price || !session.sessionType || !session.psychologist) {
      return {
        valid: false,
        reason: 'Missing required session data for rate validation'
      };
    }
    
    // Get the rate that was effective when the session was created
    const rateAtBooking = await getRateAtDate(
      session.psychologist,
      session.sessionType,
      session.createdAt
    );
    
    if (!rateAtBooking.success) {
      return {
        valid: false,
        reason: 'Could not retrieve historical rate data'
      };
    }
    
    // Check if the locked price matches the rate that was effective at booking time
    const expectedAmount = rateAtBooking.rate.amount;
    const actualAmount = session.price;
    
    if (expectedAmount !== actualAmount) {
      return {
        valid: false,
        reason: 'Session price does not match the rate that was effective at booking time',
        expectedAmount,
        actualAmount,
        difference: actualAmount - expectedAmount
      };
    }
    
    return {
      valid: true,
      reason: 'Session rate is correctly locked',
      lockedAmount: actualAmount,
      effectiveRate: rateAtBooking.rate
    };
    
  } catch (error) {
    console.error('Error validating locked rate:', error);
    return {
      valid: false,
      reason: 'Error during rate validation',
      error: error.message
    };
  }
}

module.exports = {
  lockRateForBooking,
  getRateAtDate,
  calculateSessionCost,
  validateLockedRate
};