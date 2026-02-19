/**
 * Session Rate Management Routes
 * 
 * Handles CRUD operations for therapist session rates
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');
const SessionRate = require('../models/SessionRate');
const User = require('../models/User');
const Session = require('../models/Session');
const { auditLog } = require('../utils/auditLogger');

// Validation helper
const validateRateData = (sessionType, amount, duration) => {
  const errors = [];
  
  const validSessionTypes = ['Individual', 'Couples', 'Family', 'Group'];
  if (!validSessionTypes.includes(sessionType)) {
    errors.push('Invalid session type. Must be one of: Individual, Couples, Family, Group');
  }
  
  if (!amount || amount < 0 || !Number.isInteger(amount)) {
    errors.push('Amount must be a positive integer');
  }
  
  if (!duration || duration < 15 || duration > 240 || !Number.isInteger(duration)) {
    errors.push('Duration must be an integer between 15 and 240 minutes');
  }
  
  return errors;
};

// GET /api/therapist/rates - Get current rates for authenticated therapist
router.get('/therapist/rates', auth, requireRole('psychologist'), async (req, res) => {
  try {
    const therapistId = req.user.id;
    
    // Get all current rates for this therapist
    const currentRates = await SessionRate.getCurrentRates(therapistId);
    
    // If no rates exist, return default rates from User model
    if (currentRates.length === 0) {
      const therapist = await User.findById(therapistId);
      if (!therapist) {
        return res.status(404).json({ message: 'Therapist not found' });
      }
      
      // Convert User model rates to SessionRate format
      const defaultRates = [];
      const sessionTypes = ['Individual', 'Couples', 'Family', 'Group'];
      const rateMapping = {
        'Individual': therapist.sessionRates?.individual || 2000,
        'Couples': therapist.sessionRates?.couples || 3500,
        'Family': therapist.sessionRates?.family || 5000,
        'Group': therapist.sessionRates?.group || 5000
      };
      
      for (const sessionType of sessionTypes) {
        defaultRates.push({
          sessionType,
          amount: rateMapping[sessionType],
          duration: 60,
          isActive: true,
          effectiveFrom: new Date(),
          isDefault: true // Flag to indicate these are default rates
        });
      }
      
      return res.json({
        success: true,
        rates: defaultRates,
        message: 'Showing default rates. Set custom rates to override.'
      });
    }
    
    res.json({
      success: true,
      rates: currentRates
    });
    
  } catch (error) {
    console.error('Error fetching therapist rates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch rates',
      error: error.message 
    });
  }
});

// GET /api/therapist/rates/history - Get rate history for authenticated therapist
router.get('/therapist/rates/history', auth, requireRole('psychologist'), async (req, res) => {
  try {
    const therapistId = req.user.id;
    const { sessionType, limit = 50, skip = 0 } = req.query;
    
    const rateHistory = await SessionRate.getRateHistory(
      therapistId, 
      sessionType, 
      { limit: parseInt(limit), skip: parseInt(skip) }
    );
    
    res.json({
      success: true,
      history: rateHistory,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        total: rateHistory.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching rate history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch rate history',
      error: error.message 
    });
  }
});

// POST /api/therapist/rates - Create or update rate for authenticated therapist
router.post('/therapist/rates', auth, requireRole('psychologist'), async (req, res) => {
  try {
    const therapistId = req.user.id;
    const { sessionType, amount, duration, changeReason } = req.body;
    
    // Validate input data
    const validationErrors = validateRateData(sessionType, amount, duration);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Check if therapist exists and is approved
    const therapist = await User.findById(therapistId);
    if (!therapist) {
      return res.status(404).json({ 
        success: false, 
        message: 'Therapist not found' 
      });
    }
    
    if (therapist.approvalStatus !== 'approved') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only approved therapists can set rates' 
      });
    }
    
    // Get current rate to check if it's actually changing
    const currentRate = await SessionRate.getCurrentRate(therapistId, sessionType);
    if (currentRate && currentRate.amount === amount && currentRate.duration === duration) {
      return res.status(400).json({
        success: false,
        message: 'New rate is the same as current rate'
      });
    }
    
    // Create new rate (this will automatically deactivate the old one)
    const newRate = await SessionRate.setRate(
      therapistId,
      sessionType,
      amount,
      duration,
      therapistId, // createdBy
      changeReason
    );
    
    // Audit log the rate change
    await auditLog({
      action: 'session_rate_updated',
      entityType: 'session_rate',
      entityId: newRate._id,
      userId: therapistId,
      details: {
        sessionType,
        newAmount: amount,
        newDuration: duration,
        previousAmount: currentRate?.amount || null,
        previousDuration: currentRate?.duration || null,
        changeReason
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Populate the created rate for response
    await newRate.populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Rate updated successfully',
      rate: newRate,
      note: 'This rate will apply to all future bookings. Existing bookings retain their original rates.'
    });
    
  } catch (error) {
    console.error('Error creating/updating rate:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update rate',
      error: error.message 
    });
  }
});

// GET /api/therapist/:therapistId/rates - Get current rates for specific therapist (public endpoint for booking)
router.get('/therapist/:therapistId/rates', async (req, res) => {
  try {
    const { therapistId } = req.params;
    
    // Validate therapist exists and is approved
    const therapist = await User.findById(therapistId);
    if (!therapist) {
      return res.status(404).json({ 
        success: false, 
        message: 'Therapist not found' 
      });
    }
    
    if (therapist.approvalStatus !== 'approved') {
      return res.status(403).json({ 
        success: false, 
        message: 'Therapist is not approved' 
      });
    }
    
    // Get current rates
    const currentRates = await SessionRate.getCurrentRates(therapistId);
    
    // If no custom rates exist, return default rates from User model
    if (currentRates.length === 0) {
      const sessionTypes = ['Individual', 'Couples', 'Family', 'Group'];
      const rateMapping = {
        'Individual': therapist.sessionRates?.individual || 2000,
        'Couples': therapist.sessionRates?.couples || 3500,
        'Family': therapist.sessionRates?.family || 5000,
        'Group': therapist.sessionRates?.group || 5000
      };
      
      const defaultRates = sessionTypes.map(sessionType => ({
        sessionType,
        amount: rateMapping[sessionType],
        duration: 60,
        isActive: true,
        effectiveFrom: new Date(),
        isDefault: true
      }));
      
      return res.json({
        success: true,
        rates: defaultRates,
        therapist: {
          id: therapist._id,
          name: therapist.name
        }
      });
    }
    
    res.json({
      success: true,
      rates: currentRates,
      therapist: {
        id: therapist._id,
        name: therapist.name
      }
    });
    
  } catch (error) {
    console.error('Error fetching therapist rates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch therapist rates',
      error: error.message 
    });
  }
});

// GET /api/therapist/:therapistId/rates/:sessionType - Get specific rate for therapist and session type
router.get('/therapist/:therapistId/rates/:sessionType', async (req, res) => {
  try {
    const { therapistId, sessionType } = req.params;
    
    // Validate session type
    const validSessionTypes = ['Individual', 'Couples', 'Family', 'Group'];
    if (!validSessionTypes.includes(sessionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session type'
      });
    }
    
    // Validate therapist exists and is approved
    const therapist = await User.findById(therapistId);
    if (!therapist || therapist.approvalStatus !== 'approved') {
      return res.status(404).json({ 
        success: false, 
        message: 'Therapist not found or not approved' 
      });
    }
    
    // Get current rate for this session type
    let rate = await SessionRate.getCurrentRate(therapistId, sessionType);
    
    // If no custom rate exists, return default rate from User model
    if (!rate) {
      const rateMapping = {
        'Individual': therapist.sessionRates?.individual || 2000,
        'Couples': therapist.sessionRates?.couples || 3500,
        'Family': therapist.sessionRates?.family || 5000,
        'Group': therapist.sessionRates?.group || 5000
      };
      
      rate = {
        sessionType,
        amount: rateMapping[sessionType],
        duration: 60,
        isActive: true,
        effectiveFrom: new Date(),
        isDefault: true
      };
    }
    
    res.json({
      success: true,
      rate,
      therapist: {
        id: therapist._id,
        name: therapist.name
      }
    });
    
  } catch (error) {
    console.error('Error fetching specific rate:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch rate',
      error: error.message 
    });
  }
});

// Admin endpoints for rate management

// GET /api/admin/rates - Get all rates (admin only)
router.get('/admin/rates', auth, requireRole('admin'), async (req, res) => {
  try {
    const { therapistId, sessionType, isActive, limit = 50, skip = 0 } = req.query;
    
    const query = {};
    if (therapistId) query.therapist = therapistId;
    if (sessionType) query.sessionType = sessionType;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const rates = await SessionRate.find(query)
      .populate('therapist', 'name email approvalStatus')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await SessionRate.countDocuments(query);
    
    res.json({
      success: true,
      rates,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error fetching all rates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch rates',
      error: error.message 
    });
  }
});

// GET /api/sessions/:sessionId/locked-rate - Get the locked rate for a specific session
router.get('/sessions/:sessionId/locked-rate', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findById(sessionId)
      .populate('psychologist', 'name email')
      .populate('client', 'name email');
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Check if user has permission to view this session
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole !== 'admin' && 
        session.client._id.toString() !== userId && 
        session.psychologist._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Get the rate that was effective when the session was created
    const sessionCreatedAt = session.createdAt;
    const lockedRate = await SessionRate.getRateAtDate(
      session.psychologist._id,
      session.sessionType,
      sessionCreatedAt
    );
    
    res.json({
      success: true,
      session: {
        id: session._id,
        sessionType: session.sessionType,
        createdAt: session.createdAt,
        price: session.price,
        sessionRate: session.sessionRate
      },
      lockedRate: lockedRate || {
        message: 'No custom rate found, using default rate',
        isDefault: true
      }
    });
    
  } catch (error) {
    console.error('Error fetching locked rate:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch locked rate',
      error: error.message 
    });
  }
});

module.exports = router;