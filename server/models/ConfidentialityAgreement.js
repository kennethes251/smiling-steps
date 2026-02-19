/**
 * Confidentiality Agreement Model
 * 
 * Stores client acceptance of confidentiality agreements with:
 * - Version tracking for agreement updates
 * - Digital signature fields (typed name + checkbox)
 * - Timestamp and IP address tracking
 * - Audit trail for compliance
 * 
 * Requirements: 5.1, 5.2 from Forms & Agreements System
 */

const mongoose = require('mongoose');

const confidentialityAgreementSchema = new mongoose.Schema({
  // Client reference
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // Note: Compound index { client: 1, status: 1 } covers client queries
  },
  
  // Session reference (optional - can be signed before first session)
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
    // Note: Session is optional and typically queried with client
  },
  
  // Agreement version tracking
  agreementVersion: {
    type: String,
    required: true,
    default: '1.0'
  },
  
  agreementContent: {
    type: String,
    required: true
  },
  
  agreementContentHash: {
    type: String,
    required: true
  },
  
  // Digital signature
  signatureType: {
    type: String,
    enum: ['typed', 'drawn', 'checkbox'],
    default: 'typed'
  },
  
  typedSignature: {
    type: String,
    required: true,
    trim: true
  },
  
  signatureConfirmation: {
    type: Boolean,
    required: true,
    default: false
  },
  
  // Acceptance tracking
  acceptedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  ipAddress: {
    type: String,
    required: true
  },
  
  userAgent: {
    type: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'superseded', 'revoked'],
    default: 'active'
  },
  
  supersededBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConfidentialityAgreement'
  },
  
  supersededAt: {
    type: Date
  },
  
  // Audit fields
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});


// Indexes for efficient querying
confidentialityAgreementSchema.index({ client: 1, status: 1 });
confidentialityAgreementSchema.index({ agreementVersion: 1 });
confidentialityAgreementSchema.index({ acceptedAt: -1 });

// Static method to get current agreement version
confidentialityAgreementSchema.statics.getCurrentVersion = function() {
  return '1.0';
};

// Static method to get agreement content by version
confidentialityAgreementSchema.statics.getAgreementContent = function(version = '1.0') {
  const agreements = {
    '1.0': `
CONFIDENTIALITY AGREEMENT - SMILING STEPS TELETHERAPY PLATFORM

Effective Date: This agreement is effective as of the date of electronic signature.

1. PURPOSE
This Confidentiality Agreement ("Agreement") establishes the terms under which Smiling Steps ("Platform") and its licensed psychologists ("Therapists") will protect your personal health information during teletherapy services.

2. CONFIDENTIALITY OF SESSIONS
All information shared during therapy sessions is strictly confidential. Your Therapist will not disclose any information about you or your treatment without your written consent, except as required by law.

3. LIMITS OF CONFIDENTIALITY
Confidentiality may be broken in the following circumstances:
- Imminent danger to yourself or others
- Suspected child, elder, or dependent adult abuse
- Court order or legal requirement
- Emergency medical situations

4. ELECTRONIC COMMUNICATIONS
- Video sessions are encrypted end-to-end
- Session recordings require separate consent
- Platform communications are secured but not guaranteed

5. DATA PROTECTION
Your personal health information is:
- Encrypted at rest and in transit
- Stored securely in compliance with data protection laws
- Accessible only to authorized personnel
- Subject to regular security audits

6. YOUR RIGHTS
You have the right to:
- Access your records
- Request corrections to your information
- Revoke consent (with limitations)
- File complaints about privacy violations

7. ACKNOWLEDGMENT
By signing below, you acknowledge that you have read, understood, and agree to the terms of this Confidentiality Agreement.
    `.trim()
  };
  
  return agreements[version] || agreements['1.0'];
};

// Generate content hash for integrity verification
confidentialityAgreementSchema.statics.generateContentHash = function(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
};

// Instance method to check if agreement is valid
confidentialityAgreementSchema.methods.isValid = function() {
  return this.status === 'active' && this.signatureConfirmation === true;
};

// Instance method to supersede with new version
confidentialityAgreementSchema.methods.supersede = async function(newAgreementId) {
  this.status = 'superseded';
  this.supersededBy = newAgreementId;
  this.supersededAt = new Date();
  return this.save();
};

// Static method to check if client has valid agreement
confidentialityAgreementSchema.statics.hasValidAgreement = async function(clientId, version = null) {
  const query = { client: clientId, status: 'active', signatureConfirmation: true };
  if (version) query.agreementVersion = version;
  
  const agreement = await this.findOne(query).sort({ acceptedAt: -1 });
  return !!agreement;
};

// Static method to get client's latest agreement
confidentialityAgreementSchema.statics.getLatestAgreement = async function(clientId) {
  return this.findOne({ client: clientId, status: 'active' }).sort({ acceptedAt: -1 });
};

const ConfidentialityAgreement = mongoose.model('ConfidentialityAgreement', confidentialityAgreementSchema);

module.exports = ConfidentialityAgreement;
