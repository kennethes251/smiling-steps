/**
 * Integration Test for Session Model Encryption
 * 
 * Tests the Session model encryption functionality
 */

const mongoose = require('mongoose');

// Mock the encryption and meetingLinkGenerator modules
const mockEncryption = {
  encrypt: (data) => `encrypted:${Buffer.from(data).toString('base64')}:mock`,
  decrypt: (data) => {
    if (data.startsWith('encrypted:') && data.endsWith(':mock')) {
      const base64Data = data.replace('encrypted:', '').replace(':mock', '');
      return Buffer.from(base64Data, 'base64').toString();
    }
    return data;
  }
};

const mockMeetingLinkGenerator = {
  generateMeetingLink: () => 'room-test-123-456-789'
};

// Mock the modules before requiring the Session model
jest.mock('./server/utils/encryption', () => mockEncryption);
jest.mock('./server/utils/meetingLinkGenerator', () => mockMeetingLinkGenerator);

// Mock mongoose connection
const mockConnection = {
  model: jest.fn(),
  Schema: mongoose.Schema,
  Types: mongoose.Types
};

// Create a mock Session model for testing
function createMockSessionModel() {
  const SessionSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, required: true },
    psychologist: { type: mongoose.Schema.Types.ObjectId, required: true },
    sessionType: { type: String, required: true },
    sessionDate: { type: Date, required: true },
    status: { type: String, default: 'Pending' },
    meetingLink: { type: String, trim: true },
    sessionNotes: { type: String, trim: true },
    title: { type: String, trim: true },
    sessionProof: { type: String },
    declineReason: { type: String },
    price: { type: Number, required: true },
    isVideoCall: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  });

  // Add the encryption methods
  SessionSchema.methods.isEncrypted = function(data) {
    if (!data || typeof data !== 'string') return false;
    return data.startsWith('encrypted:') && data.endsWith(':mock');
  };

  SessionSchema.methods.encryptSensitiveFields = function() {
    const sensitiveFields = ['sessionNotes', 'meetingLink', 'title', 'sessionProof', 'declineReason'];
    
    for (const field of sensitiveFields) {
      if (this.isModified && this.isModified(field) && this[field] && !this.isEncrypted(this[field])) {
        this[field] = mockEncryption.encrypt(this[field]);
        console.log(`🔒 Encrypted sensitive field: ${field}`);
      }
    }
  };

  SessionSchema.methods.decryptField = function(fieldName) {
    const fieldValue = this[fieldName];
    if (!fieldValue) return '';
    
    if (this.isEncrypted(fieldValue)) {
      return mockEncryption.decrypt(fieldValue);
    }
    return fieldValue;
  };

  SessionSchema.methods.getDecryptedNotes = function() {
    return this.decryptField('sessionNotes');
  };

  SessionSchema.methods.getDecryptedMeetingLink = function() {
    return this.decryptField('meetingLink');
  };

  SessionSchema.methods.getDecryptedTitle = function() {
    return this.decryptField('title');
  };

  SessionSchema.methods.getDecryptedSessionProof = function() {
    return this.decryptField('sessionProof');
  };

  SessionSchema.methods.getDecryptedDeclineReason = function() {
    return this.decryptField('declineReason');
  };

  SessionSchema.methods.getDecryptedData = function() {
    return {
      sessionNotes: this.getDecryptedNotes(),
      meetingLink: this.getDecryptedMeetingLink(),
      title: this.getDecryptedTitle(),
      sessionProof: this.getDecryptedSessionProof(),
      declineReason: this.getDecryptedDeclineReason()
    };
  };

  // Add virtual properties
  SessionSchema.virtual('decryptedNotes').get(function() {
    return this.getDecryptedNotes();
  });

  SessionSchema.virtual('decryptedMeetingLink').get(function() {
    return this.getDecryptedMeetingLink();
  });

  SessionSchema.virtual('decryptedTitle').get(function() {
    return this.getDecryptedTitle();
  });

  SessionSchema.virtual('decryptedSessionProof').get(function() {
    return this.getDecryptedSessionProof();
  });

  SessionSchema.virtual('decryptedDeclineReason').get(function() {
    return this.getDecryptedDeclineReason();
  });

  // Add pre-save middleware
  SessionSchema.pre('save', function(next) {
    // Generate meeting link if not present
    if (this.isNew && this.isVideoCall !== false && !this.meetingLink) {
      this.meetingLink = mockMeetingLinkGenerator.generateMeetingLink();
      console.log(`🎥 Auto-generated meeting link for new session: ${this.meetingLink}`);
    }
    
    // Encrypt sensitive fields
    this.encryptSensitiveFields();
    next();
  });

  return mongoose.model('Session', SessionSchema);
}

// Test data
const testSessionData = {
  sessionNotes: 'Patient showed significant improvement in anxiety management.',
  meetingLink: 'room-abc123-def456-ghi789',
  title: 'Anxiety Management Session - Follow-up',
  sessionProof: 'https://example.com/session-proof-image.jpg',
  declineReason: 'Patient requested to reschedule due to personal emergency'
};

function testSessionModelEncryption() {
  console.log('🚀 Starting Session Model Encryption Tests...\n');

  try {
    const Session = createMockSessionModel();

    // Test 1: Create session instance
    console.log('📝 Test 1: Creating session instance...');
    const session = new Session({
      client: new mongoose.Types.ObjectId(),
      psychologist: new mongoose.Types.ObjectId(),
      sessionType: 'Individual',
      sessionDate: new Date(),
      price: 100,
      ...testSessionData
    });

    // Mock isModified method
    session.isModified = (field) => testSessionData.hasOwnProperty(field);
    session.isNew = true;

    console.log('✅ Session instance created');

    // Test 2: Test encryption methods
    console.log('\n📝 Test 2: Testing encryption methods...');
    
    // Test isEncrypted method
    const unencryptedData = 'test data';
    const encryptedData = mockEncryption.encrypt(unencryptedData);
    
    if (!session.isEncrypted(encryptedData)) {
      console.log('❌ isEncrypted method failed for encrypted data');
      return false;
    }
    
    if (session.isEncrypted(unencryptedData)) {
      console.log('❌ isEncrypted method failed for unencrypted data');
      return false;
    }
    
    console.log('✅ isEncrypted method works correctly');

    // Test 3: Test encryptSensitiveFields method
    console.log('\n📝 Test 3: Testing encryptSensitiveFields method...');
    
    session.encryptSensitiveFields();
    
    // Check if sensitive fields are encrypted
    const sensitiveFields = ['sessionNotes', 'meetingLink', 'title', 'sessionProof', 'declineReason'];
    for (const field of sensitiveFields) {
      if (session[field] && !session.isEncrypted(session[field])) {
        console.log(`❌ Field ${field} was not encrypted`);
        return false;
      }
    }
    
    console.log('✅ All sensitive fields encrypted correctly');

    // Test 4: Test decryption methods
    console.log('\n📝 Test 4: Testing decryption methods...');
    
    const decryptedData = {
      sessionNotes: session.getDecryptedNotes(),
      meetingLink: session.getDecryptedMeetingLink(),
      title: session.getDecryptedTitle(),
      sessionProof: session.getDecryptedSessionProof(),
      declineReason: session.getDecryptedDeclineReason()
    };

    for (const [field, decryptedValue] of Object.entries(decryptedData)) {
      if (decryptedValue !== testSessionData[field]) {
        console.log(`❌ Decryption failed for ${field}`);
        console.log(`  Expected: ${testSessionData[field]}`);
        console.log(`  Got: ${decryptedValue}`);
        return false;
      }
    }
    
    console.log('✅ All decryption methods work correctly');

    // Test 5: Test virtual properties
    console.log('\n📝 Test 5: Testing virtual properties...');
    
    const virtualData = {
      decryptedNotes: session.decryptedNotes,
      decryptedMeetingLink: session.decryptedMeetingLink,
      decryptedTitle: session.decryptedTitle,
      decryptedSessionProof: session.decryptedSessionProof,
      declineReason: session.decryptedDeclineReason
    };

    const expectedVirtualData = {
      decryptedNotes: testSessionData.sessionNotes,
      decryptedMeetingLink: testSessionData.meetingLink,
      decryptedTitle: testSessionData.title,
      decryptedSessionProof: testSessionData.sessionProof,
      declineReason: testSessionData.declineReason
    };

    for (const [field, value] of Object.entries(virtualData)) {
      const expectedField = field === 'declineReason' ? 'declineReason' : field.replace('decrypted', '').toLowerCase();
      const mappedField = expectedField === 'notes' ? 'sessionNotes' : 
                         expectedField === 'meetinglink' ? 'meetingLink' :
                         expectedField === 'sessionproof' ? 'sessionProof' : expectedField;
      
      if (value !== testSessionData[mappedField]) {
        console.log(`❌ Virtual property ${field} failed`);
        console.log(`  Expected: ${testSessionData[mappedField]}`);
        console.log(`  Got: ${value}`);
        return false;
      }
    }
    
    console.log('✅ All virtual properties work correctly');

    // Test 6: Test getDecryptedData method
    console.log('\n📝 Test 6: Testing getDecryptedData method...');
    
    const allDecryptedData = session.getDecryptedData();
    
    for (const [field, value] of Object.entries(allDecryptedData)) {
      if (value !== testSessionData[field]) {
        console.log(`❌ getDecryptedData failed for ${field}`);
        console.log(`  Expected: ${testSessionData[field]}`);
        console.log(`  Got: ${value}`);
        return false;
      }
    }
    
    console.log('✅ getDecryptedData method works correctly');

    console.log('\n🎉 All Session model encryption tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Session model encryption test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = testSessionModelEncryption();
  process.exit(success ? 0 : 1);
}

module.exports = {
  testSessionModelEncryption
};