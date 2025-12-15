/**
 * Unit Test for Session Data Encryption
 * 
 * Tests the encryption functionality without database dependencies
 */

const encryption = require('./server/utils/encryption');
const encryptionValidator = require('./server/utils/encryptionValidator');

// Test data
const testSessionData = {
  sessionNotes: 'Patient showed significant improvement in anxiety management. Discussed coping strategies.',
  meetingLink: 'room-abc123-def456-ghi789',
  title: 'Anxiety Management Session - Follow-up',
  sessionProof: 'https://example.com/session-proof-image.jpg',
  declineReason: 'Patient requested to reschedule due to personal emergency'
};

function testBasicEncryption() {
  console.log('📝 Test 1: Basic encryption/decryption...');
  
  try {
    for (const [field, value] of Object.entries(testSessionData)) {
      // Encrypt the data
      const encrypted = encryption.encrypt(value);
      console.log(`  ${field}: Encrypted ✅`);
      
      // Verify it's encrypted (contains ':' separators)
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        console.log(`  ❌ ${field}: Invalid encryption format`);
        return false;
      }
      
      // Decrypt the data
      const decrypted = encryption.decrypt(encrypted);
      if (decrypted !== value) {
        console.log(`  ❌ ${field}: Decryption mismatch`);
        console.log(`    Expected: ${value}`);
        console.log(`    Got: ${decrypted}`);
        return false;
      }
      
      console.log(`  ${field}: Decrypted ✅`);
    }
    
    console.log('✅ Basic encryption/decryption test passed\n');
    return true;
  } catch (error) {
    console.error('❌ Basic encryption test failed:', error.message);
    return false;
  }
}

function testEncryptionValidator() {
  console.log('📝 Test 2: Encryption validator...');
  
  try {
    // Create test session with encrypted data
    const encryptedSession = {};
    for (const [field, value] of Object.entries(testSessionData)) {
      encryptedSession[field] = encryption.encrypt(value);
    }
    
    // Validate encryption
    const validation = encryptionValidator.validateSessionDataEncryption(encryptedSession);
    
    console.log('🔍 Validation results:');
    console.log(`  Valid: ${validation.valid ? '✅' : '❌'}`);
    console.log(`  Algorithm: ${validation.algorithm}`);
    console.log(`  Key Strength: ${validation.keyStrength} bits`);
    console.log(`  Encrypted Fields: ${validation.encryptedFields.join(', ')}`);
    
    if (validation.unencryptedFields.length > 0) {
      console.log(`  Unencrypted Fields: ${validation.unencryptedFields.join(', ')}`);
    }
    
    if (validation.errors.length > 0) {
      console.log(`  Errors: ${validation.errors.join(', ')}`);
    }
    
    if (!validation.valid) {
      console.log('❌ Encryption validation failed');
      return false;
    }
    
    console.log('✅ Encryption validation test passed\n');
    return true;
  } catch (error) {
    console.error('❌ Encryption validator test failed:', error.message);
    return false;
  }
}

function testUnencryptedDataValidation() {
  console.log('📝 Test 3: Unencrypted data validation...');
  
  try {
    // Test with unencrypted data
    const validation = encryptionValidator.validateSessionDataEncryption(testSessionData);
    
    console.log('🔍 Unencrypted data validation:');
    console.log(`  Valid: ${validation.valid ? '✅' : '❌'}`);
    console.log(`  Encrypted Fields: ${validation.encryptedFields.join(', ') || 'None'}`);
    console.log(`  Unencrypted Fields: ${validation.unencryptedFields.join(', ')}`);
    
    if (validation.errors.length > 0) {
      console.log(`  Errors: ${validation.errors.join(', ')}`);
    }
    
    // Should fail validation for unencrypted sensitive data
    if (validation.valid) {
      console.log('❌ Validation should fail for unencrypted data');
      return false;
    }
    
    console.log('✅ Unencrypted data validation test passed\n');
    return true;
  } catch (error) {
    console.error('❌ Unencrypted data validation test failed:', error.message);
    return false;
  }
}

function testEncryptionFormat() {
  console.log('📝 Test 4: Encryption format validation...');
  
  try {
    const testValue = 'Test sensitive data';
    const encrypted = encryption.encrypt(testValue);
    
    // Test isEncrypted function
    const isEncrypted = encryptionValidator.isEncrypted(encrypted);
    if (!isEncrypted) {
      console.log('❌ isEncrypted function failed');
      return false;
    }
    
    // Test with non-encrypted data
    const isNotEncrypted = encryptionValidator.isEncrypted(testValue);
    if (isNotEncrypted) {
      console.log('❌ isEncrypted should return false for unencrypted data');
      return false;
    }
    
    // Test with invalid format
    const invalidFormat = 'invalid:format';
    const isInvalid = encryptionValidator.isEncrypted(invalidFormat);
    if (isInvalid) {
      console.log('❌ isEncrypted should return false for invalid format');
      return false;
    }
    
    console.log('✅ Encryption format validation test passed\n');
    return true;
  } catch (error) {
    console.error('❌ Encryption format test failed:', error.message);
    return false;
  }
}

function testPerformance() {
  console.log('📝 Test 5: Performance test...');
  
  try {
    const testData = 'This is a test session note with sensitive patient information.';
    const iterations = 100;
    
    console.log(`🔄 Running ${iterations} encryption/decryption cycles...`);
    
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const encrypted = encryption.encrypt(testData);
      const decrypted = encryption.decrypt(encrypted);
      
      if (decrypted !== testData) {
        console.log(`❌ Mismatch at iteration ${i}`);
        return false;
      }
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Average time per cycle: ${avgTime.toFixed(2)}ms`);
    console.log(`  Operations per second: ${(1000 / avgTime).toFixed(0)}`);
    
    if (avgTime > 10) {
      console.log('⚠️ Warning: Performance may be slow');
    }
    
    console.log('✅ Performance test passed\n');
    return true;
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    return false;
  }
}

function testEdgeCases() {
  console.log('📝 Test 6: Edge cases...');
  
  try {
    // Test empty string
    try {
      encryption.encrypt('');
      console.log('❌ Should not encrypt empty string');
      return false;
    } catch (error) {
      console.log('  Empty string handling: ✅');
    }
    
    // Test null/undefined
    const nullEncrypted = encryptionValidator.isEncrypted(null);
    const undefinedEncrypted = encryptionValidator.isEncrypted(undefined);
    
    if (nullEncrypted || undefinedEncrypted) {
      console.log('❌ null/undefined should not be considered encrypted');
      return false;
    }
    
    console.log('  Null/undefined handling: ✅');
    
    // Test very long string
    const longString = 'A'.repeat(10000);
    const encryptedLong = encryption.encrypt(longString);
    const decryptedLong = encryption.decrypt(encryptedLong);
    
    if (decryptedLong !== longString) {
      console.log('❌ Long string encryption failed');
      return false;
    }
    
    console.log('  Long string handling: ✅');
    
    console.log('✅ Edge cases test passed\n');
    return true;
  } catch (error) {
    console.error('❌ Edge cases test failed:', error.message);
    return false;
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Session Data Encryption Unit Tests...\n');
  
  const tests = [
    testBasicEncryption,
    testEncryptionValidator,
    testUnencryptedDataValidation,
    testEncryptionFormat,
    testPerformance,
    testEdgeCases
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      console.error(`❌ Test failed with error: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    console.log('🎉 All session data encryption unit tests passed!');
    return true;
  } else {
    console.log('❌ Some tests failed. Please check the implementation.');
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testBasicEncryption,
  testEncryptionValidator,
  testUnencryptedDataValidation,
  testEncryptionFormat,
  testPerformance,
  testEdgeCases
};