/**
 * Confidentiality Agreement Routes
 * 
 * API endpoints for agreement management:
 * - GET /api/agreements/current - Fetch current agreement version
 * - POST /api/agreements/accept - Accept agreement with digital signature
 * - GET /api/agreements/status - Check client's agreement status
 * - GET /api/agreements/history - Get client's agreement history
 * 
 * Requirements: 5.2 from Forms & Agreements System
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ConfidentialityAgreement = require('../models/ConfidentialityAgreement');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * GET /api/agreements/current
 * Fetch current agreement version and content
 */
router.get('/current', auth, async (req, res) => {
  try {
    const currentVersion = ConfidentialityAgreement.getCurrentVersion();
    const content = ConfidentialityAgreement.getAgreementContent(currentVersion);
    const contentHash = ConfidentialityAgreement.generateContentHash(content);
    
    // Check if user already has this version signed
    const existingAgreement = await ConfidentialityAgreement.findOne({
      client: req.user.id,
      agreementVersion: currentVersion,
      status: 'active'
    });
    
    res.json({
      success: true,
      agreement: {
        version: currentVersion,
        content,
        contentHash,
        alreadySigned: !!existingAgreement,
        signedAt: existingAgreement?.acceptedAt
      }
    });
  } catch (error) {
    console.error('Error fetching agreement:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch agreement' });
  }
});

/**
 * POST /api/agreements/accept
 * Accept agreement with digital signature
 */
router.post('/accept', auth, async (req, res) => {
  try {
    const { typedSignature, signatureConfirmation, agreementVersion, contentHash } = req.body;
    
    // Validation
    if (!typedSignature || typedSignature.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Please type your full name as signature' });
    }
    
    if (!signatureConfirmation) {
      return res.status(400).json({ success: false, message: 'Please confirm you have read and agree to the terms' });
    }
    
    const currentVersion = agreementVersion || ConfidentialityAgreement.getCurrentVersion();
    const content = ConfidentialityAgreement.getAgreementContent(currentVersion);
    const expectedHash = ConfidentialityAgreement.generateContentHash(content);
    
    // Verify content integrity
    if (contentHash && contentHash !== expectedHash) {
      return res.status(400).json({ success: false, message: 'Agreement content has changed. Please refresh and try again.' });
    }
    
    // Check for existing active agreement
    const existingAgreement = await ConfidentialityAgreement.findOne({
      client: req.user.id,
      agreementVersion: currentVersion,
      status: 'active'
    });
    
    if (existingAgreement) {
      return res.status(400).json({ success: false, message: 'You have already signed this version of the agreement', agreementId: existingAgreement._id });
    }
    
    // Supersede any older active agreements
    await ConfidentialityAgreement.updateMany(
      { client: req.user.id, status: 'active' },
      { status: 'superseded', supersededAt: new Date() }
    );
    
    // Create new agreement
    const agreement = new ConfidentialityAgreement({
      client: req.user.id,
      agreementVersion: currentVersion,
      agreementContent: content,
      agreementContentHash: expectedHash,
      typedSignature: typedSignature.trim(),
      signatureConfirmation: true,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    
    await agreement.save();
    
    // Audit log
    await logAuditEvent({
      action: 'AGREEMENT_SIGNED',
      userId: req.user.id,
      details: { agreementId: agreement._id, version: currentVersion, signature: typedSignature.trim() }
    });
    
    res.status(201).json({
      success: true,
      message: 'Agreement accepted successfully',
      agreement: { id: agreement._id, version: currentVersion, acceptedAt: agreement.acceptedAt }
    });
  } catch (error) {
    console.error('Error accepting agreement:', error);
    res.status(500).json({ success: false, message: 'Failed to accept agreement' });
  }
});


/**
 * GET /api/agreements/status
 * Check client's agreement status
 */
router.get('/status', auth, async (req, res) => {
  try {
    const currentVersion = ConfidentialityAgreement.getCurrentVersion();
    const hasValidAgreement = await ConfidentialityAgreement.hasValidAgreement(req.user.id, currentVersion);
    const latestAgreement = await ConfidentialityAgreement.getLatestAgreement(req.user.id);
    
    res.json({
      success: true,
      status: {
        hasValidAgreement,
        currentVersion,
        signedVersion: latestAgreement?.agreementVersion,
        signedAt: latestAgreement?.acceptedAt,
        needsUpdate: latestAgreement && latestAgreement.agreementVersion !== currentVersion
      }
    });
  } catch (error) {
    console.error('Error checking agreement status:', error);
    res.status(500).json({ success: false, message: 'Failed to check agreement status' });
  }
});

/**
 * GET /api/agreements/history
 * Get client's agreement history
 */
router.get('/history', auth, async (req, res) => {
  try {
    const agreements = await ConfidentialityAgreement.find({ client: req.user.id })
      .select('agreementVersion status acceptedAt typedSignature supersededAt')
      .sort({ acceptedAt: -1 });
    
    res.json({ success: true, agreements });
  } catch (error) {
    console.error('Error fetching agreement history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch agreement history' });
  }
});

/**
 * GET /api/agreements/:sessionId/check
 * Check if client has valid agreement for a session
 */
router.get('/:sessionId/check', auth, async (req, res) => {
  try {
    const Session = require('../models/Session');
    const session = await Session.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    // Verify user is client of this session
    if (session.client.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    const hasValidAgreement = await ConfidentialityAgreement.hasValidAgreement(req.user.id);
    
    res.json({
      success: true,
      sessionId: req.params.sessionId,
      hasValidAgreement,
      canProceed: hasValidAgreement
    });
  } catch (error) {
    console.error('Error checking session agreement:', error);
    res.status(500).json({ success: false, message: 'Failed to check session agreement' });
  }
});

module.exports = router;
