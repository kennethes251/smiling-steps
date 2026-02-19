/**
 * Intake Form Routes
 * 
 * API endpoints for intake form management:
 * - GET /api/intake-forms/template - Fetch form template
 * - POST /api/intake-forms - Submit completed form
 * - PUT /api/intake-forms/:id - Update/partial save
 * - GET /api/intake-forms/:sessionId - Get form for session
 * - GET /api/intake-forms/status/:sessionId - Check completion status
 * 
 * Requirements: 5.3 from Forms & Agreements System
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const IntakeForm = require('../models/IntakeForm');
const Session = require('../models/Session');
const { logAuditEvent } = require('../utils/auditLogger');

// Form template with field definitions
const INTAKE_FORM_TEMPLATE = {
  version: '1.0',
  sections: [
    {
      id: 'basic',
      title: 'Basic Information',
      fields: [
        { name: 'reasonForTherapy', label: 'What brings you to therapy?', type: 'textarea', required: true },
        { name: 'previousTherapyExperience', label: 'Previous therapy experience', type: 'textarea', required: false }
      ]
    },
    {
      id: 'medical',
      title: 'Medical Information',
      fields: [
        { name: 'currentMedications', label: 'Current medications', type: 'textarea', required: false, encrypted: true },
        { name: 'medicalConditions', label: 'Medical conditions', type: 'textarea', required: false, encrypted: true },
        { name: 'allergies', label: 'Allergies', type: 'textarea', required: false, encrypted: true }
      ]
    },
    {
      id: 'mentalHealth',
      title: 'Mental Health History',
      fields: [
        { name: 'mentalHealthHistory', label: 'Mental health history', type: 'textarea', required: false, encrypted: true },
        { name: 'substanceUseHistory', label: 'Substance use history', type: 'textarea', required: false, encrypted: true },
        { name: 'suicidalThoughts', label: 'Have you had thoughts of self-harm?', type: 'boolean', required: true },
        { name: 'suicidalThoughtsDetails', label: 'If yes, please provide details', type: 'textarea', required: false, encrypted: true, conditional: 'suicidalThoughts' }
      ]
    },
    {
      id: 'symptoms',
      title: 'Current Symptoms',
      fields: [
        { name: 'currentSymptoms', label: 'Describe your current symptoms', type: 'textarea', required: false, encrypted: true },
        { name: 'symptomSeverity', label: 'Symptom severity', type: 'select', options: ['Mild', 'Moderate', 'Severe'], required: false },
        { name: 'symptomDuration', label: 'How long have you experienced these symptoms?', type: 'text', required: false }
      ]
    },
    {
      id: 'goals',
      title: 'Therapy Goals',
      fields: [
        { name: 'therapyGoals', label: 'What do you hope to achieve through therapy?', type: 'textarea', required: true },
        { name: 'preferredApproach', label: 'Preferred therapy approach (if any)', type: 'text', required: false }
      ]
    },
    {
      id: 'emergency',
      title: 'Emergency Contact',
      fields: [
        { name: 'emergencyContactName', label: 'Emergency contact name', type: 'text', required: true, encrypted: true },
        { name: 'emergencyContactPhone', label: 'Emergency contact phone', type: 'tel', required: true, encrypted: true },
        { name: 'emergencyContactRelationship', label: 'Relationship', type: 'text', required: true, encrypted: true }
      ]
    }
  ]
};

/**
 * GET /api/intake-forms/template
 * Fetch form template with field definitions
 */
router.get('/template', auth, (req, res) => {
  res.json({ success: true, template: INTAKE_FORM_TEMPLATE });
});


/**
 * POST /api/intake-forms
 * Submit completed intake form
 */
router.post('/', auth, async (req, res) => {
  try {
    const { sessionId, ...formData } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }
    
    // Verify session exists and belongs to user
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    if (session.client.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    // Check for existing form
    let intakeForm = await IntakeForm.findOne({ session: sessionId, client: req.user.id });
    
    if (intakeForm) {
      // Update existing form
      Object.assign(intakeForm, formData);
      intakeForm.isComplete = true;
      intakeForm.completedAt = new Date();
      intakeForm.submittedFrom = { ipAddress: req.ip, userAgent: req.get('User-Agent') };
    } else {
      // Create new form
      intakeForm = new IntakeForm({
        client: req.user.id,
        session: sessionId,
        ...formData,
        isComplete: true,
        completedAt: new Date(),
        submittedFrom: { ipAddress: req.ip, userAgent: req.get('User-Agent') }
      });
    }
    
    await intakeForm.save();
    
    // Update session
    session.intakeFormCompleted = true;
    session.intakeFormCompletedAt = new Date();
    await session.save();
    
    await logAuditEvent({
      action: 'INTAKE_FORM_SUBMITTED',
      userId: req.user.id,
      sessionId,
      details: { formId: intakeForm._id }
    });
    
    res.status(201).json({
      success: true,
      message: 'Intake form submitted successfully',
      form: { id: intakeForm._id, completedAt: intakeForm.completedAt }
    });
  } catch (error) {
    console.error('Error submitting intake form:', error);
    res.status(500).json({ success: false, message: 'Failed to submit intake form' });
  }
});

/**
 * PUT /api/intake-forms/:id
 * Partial save / update form
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const intakeForm = await IntakeForm.findById(req.params.id);
    
    if (!intakeForm) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    
    if (intakeForm.client.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    const { isComplete, ...formData } = req.body;
    Object.assign(intakeForm, formData);
    
    if (isComplete) {
      intakeForm.isComplete = true;
      intakeForm.completedAt = new Date();
      
      const session = await Session.findById(intakeForm.session);
      if (session) {
        session.intakeFormCompleted = true;
        session.intakeFormCompletedAt = new Date();
        await session.save();
      }
    }
    
    await intakeForm.save();
    
    res.json({ success: true, message: 'Form saved', form: { id: intakeForm._id, isComplete: intakeForm.isComplete } });
  } catch (error) {
    console.error('Error updating intake form:', error);
    res.status(500).json({ success: false, message: 'Failed to update form' });
  }
});

/**
 * GET /api/intake-forms/:sessionId
 * Get form for session (therapist or client)
 */
router.get('/:sessionId', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    const isClient = session.client.toString() === req.user.id;
    const isTherapist = session.psychologist.toString() === req.user.id;
    
    if (!isClient && !isTherapist && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    const intakeForm = await IntakeForm.findOne({ session: req.params.sessionId });
    
    if (!intakeForm) {
      return res.json({ success: true, form: null, exists: false });
    }
    
    // Therapists and admins get decrypted data
    const formData = (isTherapist || req.user.role === 'admin') ? intakeForm.getDecryptedData() : intakeForm.toObject();
    
    await logAuditEvent({
      action: 'INTAKE_FORM_ACCESSED',
      userId: req.user.id,
      sessionId: req.params.sessionId,
      details: { formId: intakeForm._id, accessedBy: req.user.role }
    });
    
    res.json({ success: true, form: formData, exists: true });
  } catch (error) {
    console.error('Error fetching intake form:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch form' });
  }
});

/**
 * GET /api/intake-forms/status/:sessionId
 * Check form completion status
 */
router.get('/status/:sessionId', auth, async (req, res) => {
  try {
    const intakeForm = await IntakeForm.findOne({ session: req.params.sessionId })
      .select('isComplete completedAt');
    
    res.json({
      success: true,
      status: {
        exists: !!intakeForm,
        isComplete: intakeForm?.isComplete || false,
        completedAt: intakeForm?.completedAt
      }
    });
  } catch (error) {
    console.error('Error checking form status:', error);
    res.status(500).json({ success: false, message: 'Failed to check status' });
  }
});

module.exports = router;
