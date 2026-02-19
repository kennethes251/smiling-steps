/**
 * Test script for IntakeForm encryption/decryption
 * Run with: node test-intake-form-encryption.js
 */

const encryption = require('./server/utils/encryption');

console.log('🔐 Testing Intake Form Encryption/Decryption\n');

// Test data
const testData = {
  reasonForTherapy: 'Experiencing anxiety and stress from work',
  currentMedications: 'Sertraline 50mg daily, Lorazepam as needed',
  medicalConditions: 'Generalized Anxiety Disorder, Hypertension',
  emergencyContactName: 'John Doe',
  emergencyContactPhone: '+254712345678'
};

console.log('📝 Original Data:');
console.log(JSON.stringify(testData, null, 2));
console.log('\n' + '='.repeat(60) + '\n');

// Test encryption
console.log('🔒 Encrypting data...\n');
const encrypted = {};
Object.keys(testData).forEach(key => {
  encrypted[key] = encryption.encrypt(testData[key]);
  console.log(`${key}:`);
  console.log(`  Encrypted: ${encrypted[key].substring(0, 50)}...`);
});

console.log('\n' + '='.repeat(60) + '\n');

// Test decryption
console.log('🔓 Decrypting data...\n');
const decrypted = {};
let allMatch = true;

Object.keys(encrypted).forEach(key => {
  decrypted[key] = encryption.decrypt(encrypted[key]);
  const matches = decrypted[key] === testData[key];
  allMatch = allMatch && matches;
  
  console.log(`${key}:`);
  console.log(`  Decrypted: ${decrypted[key]}`);
  console.log(`  Matches: ${matches ? '✅' : '❌'}`);
});

console.log('\n' + '='.repeat(60) + '\n');

// Final result
if (allMatch) {
  console.log('✅ SUCCESS: All fields encrypted and decrypted correctly!');
  console.log('✅ Encryption roundtrip test PASSED');
} else {
  console.log('❌ FAILURE: Some fields did not match after decryption');
  process.exit(1);
}

// Test masking
console.log('\n' + '='.repeat(60) + '\n');
console.log('🎭 Testing Data Masking:\n');
console.log(`Phone: ${testData.emergencyContactPhone}`);
console.log(`Masked: ${encryption.maskPhoneNumber(testData.emergencyContactPhone)}`);
console.log(`\nMedications: ${testData.currentMedications}`);
console.log(`Masked: ${encryption.mask(testData.currentMedications, 10)}`);

console.log('\n✅ All encryption tests completed successfully!\n');
