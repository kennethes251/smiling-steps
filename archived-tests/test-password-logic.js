/**
 * Test Password Logic - No Database Required
 * This tests the bcrypt hashing and comparison logic directly
 */

const bcrypt = require('bcryptjs');

async function testPasswordLogic() {
  console.log('🔐 Testing Password Hashing Logic\n');
  console.log('='.repeat(60));
  
  const testPassword = 'password123';
  
  // Simulate what happens during registration (pre-save hook)
  console.log('\n1️⃣ REGISTRATION SIMULATION:');
  console.log(`   Original password: "${testPassword}"`);
  
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(testPassword, salt);
  
  console.log(`   Salt rounds: 12`);
  console.log(`   Hashed password: ${hashedPassword}`);
  console.log(`   Hash length: ${hashedPassword.length}`);
  
  // Simulate what happens during login (correctPassword method)
  console.log('\n2️⃣ LOGIN SIMULATION:');
  console.log(`   User enters: "${testPassword}"`);
  
  const isMatch = await bcrypt.compare(testPassword, hashedPassword);
  console.log(`   bcrypt.compare result: ${isMatch}`);
  
  if (isMatch) {
    console.log('   ✅ Password verification WORKS correctly!');
  } else {
    console.log('   ❌ Password verification FAILED!');
  }
  
  // Test with wrong password
  console.log('\n3️⃣ WRONG PASSWORD TEST:');
  const wrongPassword = 'wrongpassword';
  const wrongMatch = await bcrypt.compare(wrongPassword, hashedPassword);
  console.log(`   User enters: "${wrongPassword}"`);
  console.log(`   bcrypt.compare result: ${wrongMatch}`);
  console.log(`   ${wrongMatch ? '❌ Should have failed!' : '✅ Correctly rejected wrong password'}`);
  
  // Test double-hashing scenario (potential bug)
  console.log('\n4️⃣ DOUBLE-HASHING BUG TEST:');
  console.log('   If password gets hashed twice, login will fail...');
  
  const doubleHashedPassword = await bcrypt.hash(hashedPassword, 12);
  console.log(`   Double-hashed: ${doubleHashedPassword}`);
  
  const doubleHashMatch = await bcrypt.compare(testPassword, doubleHashedPassword);
  console.log(`   Original password vs double-hash: ${doubleHashMatch}`);
  console.log(`   ${doubleHashMatch ? '✅ Still works (unlikely)' : '❌ FAILS - This could be the bug!'}`);
  
  // Test if the single hash matches the double hash
  const singleHashVsDouble = await bcrypt.compare(hashedPassword, doubleHashedPassword);
  console.log(`   Single hash vs double-hash: ${singleHashVsDouble}`);
  
  // Simulate the EXACT flow from the code
  console.log('\n5️⃣ EXACT CODE FLOW SIMULATION:');
  console.log('   Simulating User.create() with pre-save hook...');
  
  // This is what User.create({ password: 'password123' }) does
  let userPassword = testPassword;
  console.log(`   Step 1: User.create receives password: "${userPassword}"`);
  
  // Pre-save hook runs
  const preSaveSalt = await bcrypt.genSalt(12);
  userPassword = await bcrypt.hash(userPassword, preSaveSalt);
  console.log(`   Step 2: Pre-save hook hashes it: ${userPassword.substring(0, 30)}...`);
  
  // Now simulate login
  const loginPassword = testPassword;
  console.log(`   Step 3: User logs in with: "${loginPassword}"`);
  
  const loginMatch = await bcrypt.compare(loginPassword, userPassword);
  console.log(`   Step 4: correctPassword() result: ${loginMatch}`);
  
  if (loginMatch) {
    console.log('\n✅ The password logic is CORRECT!');
    console.log('   The issue must be elsewhere (database, API, or frontend).');
  } else {
    console.log('\n❌ The password logic has a BUG!');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('CONCLUSION:');
  console.log('If this test passes but login fails, check:');
  console.log('  1. Is the password being modified before reaching User.create()?');
  console.log('  2. Is there a middleware hashing the password before the model?');
  console.log('  3. Is the frontend sending the password correctly?');
  console.log('  4. Is .select("+password") working in the login query?');
}

testPasswordLogic().catch(console.error);
