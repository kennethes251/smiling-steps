const mongoose = require('mongoose');
const encryption = require('../utils/encryption');

/**
 * SessionNote Model
 * 
 * Stores versioned, encrypted session notes for therapy sessions.
 * Supports note versioning, author tracking, and HIPAA-compliant encryption.
 * 
 * Requirements: 11.3 - Encrypted session notes with timestamp
 */
const SessionNoteSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
    // Note: Compound indexes below cover session queries
  },
  
  // Author information
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorRole: {
    type: String,
    enum: ['psychologist', 'admin'],
    required: true
  },
  
  // Note content (encrypted)
  content: {
    type: String,
    required: true
  },
  
  // Note type for categorization
  noteType: {
    type: String,
    enum: ['session_notes', 'clinical_observation', 'treatment_plan', 'progress_note', 'follow_up'],
    default: 'session_notes'
  },
  
  // Versioning
  version: {
    type: Number,
    default: 1
  },
  previousVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SessionNote'
  },
  isLatest: {
    type: Boolean,
    default: true
  },
  
  // Client visibility (therapist can choose to share certain notes)
  isClientVisible: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Audit trail
  editHistory: [{
    editedAt: {
      type: Date,
      default: Date.now
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changeDescription: String
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
SessionNoteSchema.index({ session: 1, isLatest: 1 });
SessionNoteSchema.index({ session: 1, version: -1 });
SessionNoteSchema.index({ author: 1, createdAt: -1 });
SessionNoteSchema.index({ session: 1, noteType: 1 });

// Helper to check if content is encrypted
SessionNoteSchema.methods.isEncrypted = function(data) {
  if (!data || typeof data !== 'string') return false;
  const parts = data.split(':');
  return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
};

// Pre-save middleware to encrypt content
SessionNoteSchema.pre('save', function(next) {
  try {
    // Encrypt content if modified and not already encrypted
    if (this.isModified('content') && this.content && !this.isEncrypted(this.content)) {
      this.content = encryption.encrypt(this.content);
      console.log('🔒 Session note content encrypted');
    }
    
    this.updatedAt = new Date();
    next();
  } catch (error) {
    console.error('Failed to encrypt session note:', error);
    next(error);
  }
});

// Method to get decrypted content
SessionNoteSchema.methods.getDecryptedContent = function() {
  if (!this.content) return '';
  
  try {
    if (this.isEncrypted(this.content)) {
      return encryption.decrypt(this.content);
    }
    return this.content;
  } catch (error) {
    console.error('Failed to decrypt session note:', error);
    return '[Encrypted - Unable to decrypt]';
  }
};

// Method to get full decrypted note object
SessionNoteSchema.methods.toDecryptedObject = function() {
  const obj = this.toObject();
  obj.content = this.getDecryptedContent();
  return obj;
};

// Static method to create a new version of a note
SessionNoteSchema.statics.createNewVersion = async function(noteId, newContent, userId, changeDescription) {
  const existingNote = await this.findById(noteId);
  if (!existingNote) {
    throw new Error('Note not found');
  }
  
  // Mark existing note as not latest
  existingNote.isLatest = false;
  await existingNote.save();
  
  // Create new version
  const newNote = new this({
    session: existingNote.session,
    author: userId,
    authorRole: existingNote.authorRole,
    content: newContent,
    noteType: existingNote.noteType,
    version: existingNote.version + 1,
    previousVersion: existingNote._id,
    isLatest: true,
    isClientVisible: existingNote.isClientVisible,
    editHistory: [{
      editedAt: new Date(),
      editedBy: userId,
      changeDescription: changeDescription || 'Note updated'
    }]
  });
  
  await newNote.save();
  console.log(`📝 Created new version ${newNote.version} of session note`);
  
  return newNote;
};

// Static method to get all versions of a note for a session
SessionNoteSchema.statics.getNoteVersionHistory = async function(sessionId, noteType = null) {
  const query = { session: sessionId };
  if (noteType) {
    query.noteType = noteType;
  }
  
  return this.find(query)
    .populate('author', 'name email role')
    .populate('editHistory.editedBy', 'name email')
    .sort({ version: -1 });
};

// Static method to get latest notes for a session
SessionNoteSchema.statics.getLatestNotes = async function(sessionId) {
  return this.find({ session: sessionId, isLatest: true })
    .populate('author', 'name email role')
    .sort({ createdAt: -1 });
};

// Static method to get client-visible notes
SessionNoteSchema.statics.getClientVisibleNotes = async function(sessionId) {
  return this.find({ 
    session: sessionId, 
    isLatest: true, 
    isClientVisible: true 
  })
    .populate('author', 'name email role')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('SessionNote', SessionNoteSchema);
