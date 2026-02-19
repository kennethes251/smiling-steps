/**
 * Reset password for a specific user
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const EMAIL = 'kennethes251@gmail.com';
const NEW_PASSWORD = 'client123';

async function main() {
  console.log(`🔐 Resetting password for ${EMAIL}\n`);
  
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('smiling-steps');
    const users = db.collection('users');

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

    // Update the user's password
    const result = await users.updateOne(
      { email: EMAIL },
      { 
        $set: { 
          password: hashedPassword,
          isVerified: true,
          isEmailVerified: true
        } 
      }
    );

    if (result.matchedCount === 0) {
      console.log(`❌ User not found: ${EMAIL}`);
    } else if (result.modifiedCount > 0) {
      console.log(`✅ Password reset successful!`);
      console.log(`\n📝 New credentials:`);
      console.log(`   Email: ${EMAIL}`);
      console.log(`   Password: ${NEW_PASSWORD}`);
    } else {
      console.log(`⚠️ User found but no changes made`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected');
  }
}

main();
