/**
 * Test Session Data Encryption Implementation
 * 
 * Validates that sensitive session data is properly encrypted
 * and meets HIPAA compliance requirements
 */

const mongoose = require('mongoose');
const Session = require('./server/models/Session');
const User = require('./server/models/User');
const encryptionValidator = require('./server/utils/encryptionValidator');
const encryption = require('./server/utils/encryption');

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smiling_steps_test',
  testTimeout: 30000
};

// Test data
const testSessionData = {
  sessionNotes: 'Patient showed significant improvement in anxiety management. Discussed coping strategies.',
  meetingLink: 'room-abc123-def456-ghi789',
  title: 'Anxiety Management Session - Follow-up',
  sessionProof: 'https://example.com/session-proof-image.jpg',
  declineReason: 'Patient requested to reschedule due to personal emergency'
};

async function connectToDatabase() {
  try {
    await mongoose.connect(TEST_CONFIG.mongoUri);
    console.log('✅ Connected to MongoDB for testing');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}

async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ MongoDB disconnection failed:', error.message);
  }
}

async function createTestUsers() {
  try {
    // Create test client
    const testClient = new User({
      name: 'Test Client',
      email: 'testclient@example.com',
      password: 'hashedpassword123',
      role: 'client',
      profileInfo: {
        phone: '1234567890',
        dateOfBirth: new Date('1990-01-01')
      }
    });
    await testClient.save();

    // Create test psychologist
    const testPsychologist = new User({
      name: 'Dr. Test Psychologist',
      email: 'testpsychologist@example.com',
      password: 'hashedpassword123',
      role: 'psychologist',
      profileInfo: {
        phone: '0987654321',
        specialization: 'Anxiety and Depression'
      }
    });
    await testPsychologist.save();

    console.log('✅ Test users created');
    return { client: testClient, psychologist: testPsychologist };
  } catch (error) {
    console.error('❌ Failed to create test users:', error.message);
    throw error;
  }
}

async function testSessionDataEncryption() {
  console.log('\n🔒 Testing Session Data Encryption...\n');

  try {
    // Connect to database
    await connectToDatabase();

    // Create test users
    const { client, psychologist } = await createTestUsers();

    // Test 1: Create session with sensitive data
    console.log('📝 Test 1: Creating session with sensitive data...');
    const testSession = new Session({
      client: client._id,
      psychologist: psychologist._id,
      sessionType: 'Individual',
      sessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      price: 100,
      status: 'Confirmed',
      ...testSessionData
    });

    await testSession.save();
    console.log('✅ Session created successfully');

    // Test 2: Verify encryption in database
    console.log('\n📝 Test 2: Verifying encryption in database...');
    const savedSession = await Session.findById(testSession._id);
    
    const encryptionResults = {
      sessionNotes: encryptionValidator.isEncrypted(savedSession.sessionNotes),
      meetingLink: encryptionValidator.isEncrypted(savedSession.meetingLink),
      title: encryptionValidator.isEncrypted(savedSession.title),
      sessionProof: encryptionValidator.isEncrypted(savedSession.sessionProof),
      declineReason: encryptionValidator.isEncrypted(savedSession.declineReason)
    };

    console.log('🔍 Encryption status:', encryptionResults);

    const allEncrypted = Object.values(encryptionResults).every(encrypted => encrypted);
    if (allEncrypted) {
      console.log('✅ All sensitive fields are encrypted');
    } else {
      console.log('❌ Some sensitive fields are not encrypted');
      return false;
    }

    // Test 3: Verify decryption methods work
    console.log('\n📝 Test 3: Testing decryption methods...');
    const decryptedData = {
      sessionNotes: savedSession.getDecryptedNotes(),
      meetingLink: savedSession.getDecryptedMeetingLink(),
      title: savedSession.getDecryptedTitle(),
      sessionProof: savedSession.getDecryptedSessionProof(),
      declineReason: savedSession.getDecryptedDeclineReason()
    };

    console.log('🔓 Decrypted data:');
    Object.entries(decryptedData).forEach(([field, value]) => {
      const matches = value === testSessionData[field];
      console.log(`  ${field}: ${matches ? '✅' : '❌'} ${matches ? 'MATCH' : 'MISMATCH'}`);
      if (!matches) {
        console.log(`    Expected: ${testSessionData[field]}`);
        console.log(`    Got: ${value}`);
      }
    });

    const allDecrypted = Object.entries(decryptedData).every(([field, value]) => 
      value === testSessionData[field]
    );

    if (!allDecrypted) {
      console.log('❌ Decryption failed for some fields');
      return false;
    }

    // Test 4: Validate session encryption compliance
    console.log('\n📝 Test 4: Testing encryption compliance validation...');
    const complianceValidation = await encryptionValidator.validateSessionEncryptionCompliance(savedSession);
    
    console.log('🔍 Compliance validation results:');
    console.log(`  HIPAA Compliant: ${complianceValidation.hipaaCompliant ? '✅' : '❌'}`);
    console.log(`  Encrypted Fields: ${complianceValidation.dataEncryption.encryptedFields.join(', ')}`);
    
    if (complianceValidation.dataEncryption.unencryptedFields.length > 0) {
      console.log(`  Unencrypted Fields: ${complianceValidation.dataEncryption.unencryptedFields.join(', ')}`);
    }
    
    if (complianceValidation.errors.length > 0) {
      console.log('  Errors:', complianceValidation.errors);
    }
    
    if (complianceValidation.warnings.length > 0) {
      console.log('  Warnings:', complianceValidation.warnings);
    }

    if (!complianceValidation.hipaaCompliant) {
      console.log('❌ Session is not HIPAA compliant');
      return false;
    }

    // Test 5: Test virtual properties
    console.log('\n📝 Test 5: Testing virtual properties...');
    const virtualData = {
      decryptedNotes: savedSession.decryptedNotes,
      decryptedMeetingLink: savedSession.decryptedMeetingLink,
      decryptedTitle: savedSession.decryptedTitle,
      decryptedSessionProof: savedSession.decryptedSessionProof,
      decryptedDeclineReason: savedSession.decryptedDeclineReason
    };

    const virtualMatches = Object.entries(virtualData).every(([field, value]) => {
      const originalField = field.replace('decrypted', '').toLowerCase();
      const expectedField = originalField === 'notes' ? 'sessionNotes' : 
                           originalField === 'sessionproof' ? 'sessionProof' :
                           originalField === 'meetinglink' ? 'meetingLink' :
                           originalField === 'declinereason' ? 'declineReason' : originalField;
      return value === testSessionData[expectedField];
    });

    if (virtualMatches) {
      console.log('✅ Virtual properties work correctly');
    } else {
      console.log('❌ Virtual properties failed');
      return false;
    }

    // Test 6: Test getDecryptedData method
    console.log('\n📝 Test 6: Testing getDecryptedData method...');
    const allDecryptedData = savedSession.getDecryptedData();
    
    const allDataMatches = Object.entries(allDecryptedData).every(([field, value]) => 
      value === testSessionData[field]
    );

    if (allDataMatches) {
      console.log('✅ getDecryptedData method works correctly');
    } else {
      console.log('❌ getDecryptedData method failed');
      console.log('Expected:', testSessionData);
      console.log('Got:', allDecryptedData);
      return false;
    }

    // Clean up test data
    await Session.findByIdAndDelete(testSession._id);
    await User.findByIdAndDelete(client._id);
    await User.findByIdAndDelete(psychologist._id);
    console.log('🧹 Test data cleaned up');

    console.log('\n🎉 All session data encryption tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Session data encryption test failed:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    await disconnectFromDatabase();
  }
}

async function testEncryptionPerformance() {
  console.log('\n⚡ Testing Encryption Performance...\n');

  const testData = 'This is a test session note with sensitive patient information that needs to be encrypted for HIPAA compliance.';
  const iterations = 1000;

  console.log(`🔄 Running ${iterations} encryption/decryption cycles...`);

  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    const encrypted = encryption.encrypt(testData);
    const decrypted = encryption.decrypt(encrypted);
    
    if (decrypted !== testData) {
      console.error(`❌ Encryption/decryption mismatch at iteration ${i}`);
      return false;
    }
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;

  console.log(`✅ Performance test completed:`);
  console.log(`  Total time: ${totalTime}ms`);
  console.log(`  Average time per cycle: ${avgTime.toFixed(2)}ms`);
  console.log(`  Operations per second: ${(1000 / avgTime).toFixed(0)}`);

  if (avgTime > 10) {
    console.log('⚠️ Warning: Encryption performance may be slow for production use');
  } else {
    console.log('✅ Encryption performance is acceptable');
  }

  return true;
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Session Data Encryption Tests...\n');

  try {
    const encryptionTest = await testSessionDataEncryption();
    const performanceTest = await testEncryptionPerformance();

    if (encryptionTest && performanceTest) {
      console.log('\n🎉 All tests passed! Session data encryption is working correctly.');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed. Please check the implementation.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testSessionDataEncryption,
  testEncryptionPerformance,
  runTests
};