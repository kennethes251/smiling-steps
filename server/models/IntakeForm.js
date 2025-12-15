const mongoose = require('mongoose');
const encryption = require('../utils/encryption');

const IntakeFormSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true
  },
  
  // Basic Information (encrypted)
  reasonForTherapy: {
    type: String,
    required: true
  },
  previousTherapyExperience: {
    type: String
  },
  currentMedications: {
    type: String // Encrypted list of medications
  },
  medicalConditions: {
    type: String // Encrypted list of conditions
  },
  allergies: {
    type: String // Encrypted list of allergies
  },
  
  // Mental Health History (encrypted)
  mentalHealthHistory: {
    type: String
  },
  substanceUseHistory: {
    type: String
  },
  suicidalThoughts: {
    type: Boolean,
    default: false
  },
  suicidalThoughtsDetails: {
    type: String
  },
  
  // Family History (encrypted)
  familyMentalHealthHistory: {
    type: String
  },
  
  // Current Symptoms (encrypted)
  currentSymptoms: {
    type: String
  },
  symptomSeverity: {
    type: String,
    enum: ['Mild', 'Moderate', 'Severe']
  },
  symptomDuration: {
    type: String
  },
  
  // Goals and Expectations
  therapyGoals: {
    type: String,
    required: true
  },
  preferredApproach: {
    type: String
  },
  
  // Emergency Contact (encrypted)
  emergencyContactName: {
    type: String,
    required: true
  },
  emergencyContactPhone: {
    type: String,
    required: true
  },
  emergencyContactRelationship: {
    type: String,
    required: true
  },
  
  // Completion Status
  completedAt: {
    type: Date
  },
  isComplete: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  submittedFrom: {
    ipAddress: String,
    userAgent: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Fields that should be encrypted (PHI)
const encryptedFields = [
  'reasonForTherapy',
  'previousTherapyExperience',
  'currentMedications',
  'medicalConditions',
  'allergies',
  'mentalHealthHistory',
  'substanceUseHistory',
  'suicidalThoughtsDetails',
  'familyMentalHealthHistory',
  'currentSymptoms',
  'therapyGoals',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelationship'
];

// Middleware to encrypt sensitive fields before saving
IntakeFormSchema.pre('save', function(next) {
  try {
    encryptedFields.forEach(field => {
      if (this.isModified(field) && this[field]) {
        // Check if already encrypted (contains ':' separator from encryption format)
        const value = this[field];
        if (typeof value === 'string' && (!value.includes(':') || value.split(':').length !== 3)) {
          this[field] = encryption.encrypt(value);
        }
      }
    });
    next();
  } catch (error) {
    console.error('Failed to encrypt intake form fields:', error);
    next(error);
  }
});

// Method to get decrypted form data
IntakeFormSchema.methods.getDecryptedData = function() {
  const decrypted = this.toObject();
  
  encryptedFields.forEach(field => {
    if (decrypted[field]) {
      try {
        // Check if encrypted (contains ':' separator)
        if (decrypted[field].includes(':') && decrypted[field].split(':').length === 3) {
          decrypted[field] = encryption.decrypt(decrypted[field]);
        }
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        decrypted[field] = '[Encrypted - Unable to decrypt]';
      }
    }
  });
  
  return decrypted;
};

// Index for efficient querying
IntakeFormSchema.index({ client: 1, session: 1 }, { unique: true });
IntakeFormSchema.index({ createdAt: -1 });

module.exports = mongoose.model('IntakeForm', IntakeFormSchema);
