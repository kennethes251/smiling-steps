/**
 * Simple Test for Session Model Encryption Methods
 * 
 * Tests the Session model encryption methods without database dependencies
 */

const mongoose = require('mongoose');

// Simple mock encryption for testing
const mockEncryption = {
  encrypt: (data) => `mock_encrypted:${Buffer.from(data).toString('base64')}`,
  decrypt: (data) => {
    if (data.startsWith('mock_encrypted:')) {
      const base64Data = data.replace('mock_encrypted:', '');
      return Buffer.from(base64Data, 'base64').toString();
    }
    return data;
  }
};

// Create a test session schema with encryption methods
function createTestSessionSchema() {
  const SessionSchema = new mongoose.Schema({
    sessionNotes: String,
    meetingLink: String,
    title: String,
    sessionProof: String,
    declineReason: String
  });

  // Add encryption methods (copied from actual implementation)
  SessionSchema.methods.isEncrypted = function(data) {
    if (!data || typeof data !== 'string') return false;
    return data.startsWith('mock_encrypted:');
  };

  SessionSchema.methods.encryptSensitiveFields = function() {
    const sensitiveFields = ['sessionNotes', 'meetingLink', 'title', 'sessionProof', 'declineReason'];
    
    for (const field of sensitiveFields) {
      if (this[field] && !this.isEncrypted(this[field])) {
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

  // Virtual properties
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

  return SessionSchema;
}

// Test data
const testData = {
  sessionNotes: 'Patient showed significant improvement in anxiety management.',
  meetingLink: 'room-abc123-def456-ghi789',
  title: 'Anxiety Management Session - Follow-up',
  sessionProof: 'https://example.com/session-proof-image.jpg',
  declineReason: 'Patient requested to reschedule due to personal emergency'
};

function runTests() {
  console.log('🚀 Starting Session Model Encryption Method Tests...\n');

  try {
    const SessionSchema = createTestSessionSchema();
    
    // Create a test document (without connecting to database)
    const TestSession = mongoose.model('TestSession', SessionSchema);
    const session = new TestSession(testData);

    console.log('📝 Test 1: Initial data setup...');
    console.log('✅ Test session created with unencrypted data');

    // Test 2: Test isEncrypted method
    console.log('\n📝 Test 2: Testing isEncrypted method...');
    
    const unencryptedText = 'test data';
    const encryptedText = mockEncryption.encrypt(unencryptedText);
    
    if (session.isEncrypted(encryptedText) && !session.isEncrypted(unencryptedText)) {
      console.log('✅ isEncrypted method works correctly');
    } else {
      console.log('❌ isEncrypted method failed');
      return false;
    }

    // Test 3: Test encryption of sensitive fields
    console.log('\n📝 Test 3: Testing encryptSensitiveFields method...');
    
    session.encryptSensitiveFields();
    
    // Verify all fields are encrypted
    const sensitiveFields = ['sessionNotes', 'meetingLink', 'title', 'sessionProof', 'declineReason'];
    let allEncrypted = true;
    
    for (const field of sensitiveFields) {
      if (!session.isEncrypted(session[field])) {
        console.log(`❌ Field ${field} was not encrypted`);
        allEncrypted = false;
      }
    }
    
    if (allEncrypted) {
      console.log('✅ All sensitive fields encrypted successfully');
    } else {
      return false;
    }

    // Test 4: Test decryption methods
    console.log('\n📝 Test 4: Testing individual decryption methods...');
    
    const decryptionTests = [
      { method: 'getDecryptedNotes', field: 'sessionNotes' },
      { method: 'getDecryptedMeetingLink', field: 'meetingLink' },
      { method: 'getDecryptedTitle', field: 'title' },
      { method: 'getDecryptedSessionProof', field: 'sessionProof' },
      { method: 'getDecryptedDeclineReason', field: 'declineReason' }
    ];

    for (const test of decryptionTests) {
      const decrypted = session[test.method]();
      if (decrypted !== testData[test.field]) {
        console.log(`❌ ${test.method} failed`);
        console.log(`  Expected: ${testData[test.field]}`);
        console.log(`  Got: ${decrypted}`);
        return false;
      }
      console.log(`  ${test.method}: ✅`);
    }

    // Test 5: Test virtual properties
    console.log('\n📝 Test 5: Testing virtual properties...');
    
    const virtualTests = [
      { property: 'decryptedNotes', field: 'sessionNotes' },
      { property: 'decryptedMeetingLink', field: 'meetingLink' },
      { property: 'decryptedTitle', field: 'title' },
      { property: 'decryptedSessionProof', field: 'sessionProof' },
      { property: 'decryptedDeclineReason', field: 'declineReason' }
    ];

    for (const test of virtualTests) {
      const virtualValue = session[test.property];
      if (virtualValue !== testData[test.field]) {
        console.log(`❌ Virtual property ${test.property} failed`);
        console.log(`  Expected: ${testData[test.field]}`);
        console.log(`  Got: ${virtualValue}`);
        return false;
      }
      console.log(`  ${test.property}: ✅`);
    }

    // Test 6: Test getDecryptedData method
    console.log('\n📝 Test 6: Testing getDecryptedData method...');
    
    const allDecryptedData = session.getDecryptedData();
    
    for (const [field, value] of Object.entries(allDecryptedData)) {
      if (value !== testData[field]) {
        console.log(`❌ getDecryptedData failed for ${field}`);
        console.log(`  Expected: ${testData[field]}`);
        console.log(`  Got: ${value}`);
        return false;
      }
    }
    
    console.log('✅ getDecryptedData method works correctly');

    // Test 7: Test edge cases
    console.log('\n📝 Test 7: Testing edge cases...');
    
    // Test with empty session
    const emptySession = new TestSession({});
    const emptyDecrypted = emptySession.getDecryptedData();
    
    const expectedEmpty = {
      sessionNotes: '',
      meetingLink: '',
      title: '',
      sessionProof: '',
      declineReason: ''
    };
    
    for (const [field, value] of Object.entries(emptyDecrypted)) {
      if (value !== expectedEmpty[field]) {
        console.log(`❌ Empty session test failed for ${field}`);
        return false;
      }
    }
    
    console.log('✅ Edge cases handled correctly');

    console.log('\n🎉 All Session model encryption method tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };