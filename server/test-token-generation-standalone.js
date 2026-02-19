/**
 * Standalone Token Generation Test
 * 
 * This script tests the token generation service without Jest or database dependencies
 * to verify that the cryptographically secure token generation meets all requirements.
 */

const crypto = require('crypto');

// Mock User model for testing
const mockUser = {
  findByIdAndUpdate: () => Promise.resolve({ _id: 'test-id', email: 'test@example.com' }),
  findOne: () => Promise.resolve(null),
  updateMany: () => Promise.resolve({ modifiedCount: 0 }),
  countDocuments: () => Promise.resolve(0)
};

// Mock the User model by creating a simple module cache override
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === '../models/User') {
    return mockUser;
  }
  return originalRequire.apply(this, arguments);
};

// Import the service after mocking
const tokenGenerationService = require('../services/tokenGenerationService');

console.log('🧪 Starting Token Generation Service Tests...\n');

// Test 1: Cryptographically Secure Token Generation
console.log('Test 1: Cryptographically Secure Token Generation');
try {
  const token = tokenGenerationService.generateSecureToken();
  
  // Should be 64 hex characters (32 bytes)
  console.log(`✅ Token length: ${token.length} (expected: 64)`);
  console.log(`✅ Token format: ${/^[a-f0-9]{64}$/.test(token) ? 'Valid hex' : 'Invalid'}`);
  console.log(`✅ Token sample: ${token.substring(0, 16)}...`);
  
  // Test uniqueness
  const token2 = tokenGenerationService.generateSecureToken();
  console.log(`✅ Uniqueness: ${token !== token2 ? 'Unique' : 'Not unique'}`);
  
} catch (error) {
  console.log(`❌ Token generation failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 2: Token Hashing
console.log('Test 2: Token Hashing');
try {
  const plainToken = 'test-token-123456789';
  const hash1 = tokenGenerationService.hashToken(plainToken);
  const hash2 = tokenGenerationService.hashToken(plainToken);
  
  console.log(`✅ Hash length: ${hash1.length} (expected: 64)`);
  console.log(`✅ Hash format: ${/^[a-f0-9]{64}$/.test(hash1) ? 'Valid hex' : 'Invalid'}`);
  console.log(`✅ Consistency: ${hash1 === hash2 ? 'Consistent' : 'Inconsistent'}`);
  console.log(`✅ Hash sample: ${hash1.substring(0, 16)}...`);
  
  // Test different tokens produce different hashes
  const differentToken = 'different-token-987654321';
  const differentHash = tokenGenerationService.hashToken(differentToken);
  console.log(`✅ Different inputs: ${hash1 !== differentHash ? 'Different hashes' : 'Same hash (collision!)'}`);
  
} catch (error) {
  console.log(`❌ Token hashing failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 3: Expiration Time Calculation
console.log('Test 3: Expiration Time Calculation');
try {
  const beforeTime = Date.now();
  const expirationTime = tokenGenerationService.calculateExpirationTime();
  const afterTime = Date.now();
  
  const expectedDuration = 24 * 60 * 60 * 1000; // 24 hours
  const actualDuration = expirationTime.getTime() - beforeTime;
  const maxDuration = expirationTime.getTime() - afterTime;
  
  console.log(`✅ Expiration time: ${expirationTime.toISOString()}`);
  console.log(`✅ Duration (hours): ${actualDuration / (60 * 60 * 1000)} (expected: 24)`);
  console.log(`✅ Within range: ${actualDuration >= expectedDuration && maxDuration <= expectedDuration ? 'Yes' : 'No'}`);
  
} catch (error) {
  console.log(`❌ Expiration calculation failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 4: Input Validation
console.log('Test 4: Input Validation');
try {
  // Test valid input
  const validHash = tokenGenerationService.hashToken('valid-token');
  console.log(`✅ Valid input: ${validHash ? 'Accepted' : 'Rejected'}`);
  
  // Test invalid inputs
  const invalidInputs = [null, undefined, '', 123, [], {}];
  let validationPassed = true;
  
  for (const input of invalidInputs) {
    try {
      tokenGenerationService.hashToken(input);
      console.log(`❌ Invalid input accepted: ${input}`);
      validationPassed = false;
    } catch (error) {
      console.log(`✅ Invalid input rejected: ${typeof input} (${input})`);
    }
  }
  
  console.log(`✅ Input validation: ${validationPassed ? 'Passed' : 'Failed'}`);
  
} catch (error) {
  console.log(`❌ Input validation test failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 5: Security Requirements Compliance
console.log('Test 5: Security Requirements Compliance');
try {
  console.log('📋 Checking compliance with security requirements...');
  
  // Requirement: 32-byte tokens
  const token = tokenGenerationService.generateSecureToken();
  const is32Bytes = token.length === 64; // 32 bytes = 64 hex chars
  console.log(`✅ 32-byte requirement: ${is32Bytes ? 'Met' : 'Not met'}`);
  
  // Requirement: 24-hour expiration
  const expiration = tokenGenerationService.calculateExpirationTime();
  const now = Date.now();
  const duration = expiration.getTime() - now;
  const is24Hours = Math.abs(duration - (24 * 60 * 60 * 1000)) < 1000; // 1 second tolerance
  console.log(`✅ 24-hour expiration: ${is24Hours ? 'Met' : 'Not met'}`);
  
  // Requirement: Cryptographically secure
  const cryptoSpy = {
    called: false,
    calledWith: null
  };
  
  // Mock crypto.randomBytes to check if it's called
  const originalRandomBytes = crypto.randomBytes;
  crypto.randomBytes = function(size) {
    cryptoSpy.called = true;
    cryptoSpy.calledWith = size;
    return originalRandomBytes(size);
  };
  
  tokenGenerationService.generateSecureToken();
  crypto.randomBytes = originalRandomBytes; // Restore
  
  const isCryptographicallySecure = cryptoSpy.called && cryptoSpy.calledWith === 32;
  console.log(`✅ Cryptographically secure: ${isCryptographicallySecure ? 'Met' : 'Not met'}`);
  
  // Requirement: Secure storage (hashed)
  const plainToken = 'test-token';
  const hashedToken = tokenGenerationService.hashToken(plainToken);
  const isHashed = hashedToken !== plainToken && hashedToken.length === 64;
  console.log(`✅ Secure storage (hashed): ${isHashed ? 'Met' : 'Not met'}`);
  
  console.log('\n📊 Overall Compliance:');
  const allRequirementsMet = is32Bytes && is24Hours && isCryptographicallySecure && isHashed;
  console.log(`${allRequirementsMet ? '✅ ALL REQUIREMENTS MET' : '❌ SOME REQUIREMENTS NOT MET'}`);
  
} catch (error) {
  console.log(`❌ Security compliance check failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 6: Performance Test
console.log('Test 6: Performance Test');
try {
  const iterations = 1000;
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const token = tokenGenerationService.generateSecureToken();
    tokenGenerationService.hashToken(token);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  const tokensPerSecond = Math.round((iterations * 1000) / duration);
  
  console.log(`✅ Generated and hashed ${iterations} tokens in ${duration}ms`);
  console.log(`✅ Performance: ${tokensPerSecond} tokens/second`);
  console.log(`✅ Average time per token: ${(duration / iterations).toFixed(2)}ms`);
  
} catch (error) {
  console.log(`❌ Performance test failed: ${error.message}`);
}

console.log('\n🎉 Token Generation Service Tests Complete!\n');

// Stop automatic cleanup to prevent intervals in test environment
tokenGenerationService.stopAutomaticCleanup();