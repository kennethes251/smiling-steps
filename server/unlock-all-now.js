// Quick script to unlock all accounts
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

async function unlockAll() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Unlock all accounts
    const [results, metadata] = await sequelize.query(`
      UPDATE "users"
      SET 
        "loginAttempts" = 0,
        "lockUntil" = NULL
      WHERE "loginAttempts" > 0 OR "lockUntil" IS NOT NULL
    `);

    console.log(`✅ Reset login attempts for all users`);
    console.log(`   Rows affected: ${metadata.rowCount || results.length || 'unknown'}\n`);

    // Show all users
    const [users] = await sequelize.query(`
      SELECT name, email, role, "loginAttempts", "lockUntil"
      FROM "users"
      WHERE role IN ('client', 'psychologist')
      ORDER BY role, name
    `);

    console.log('📊 User Status:\n');
    users.forEach(u => {
      console.log(`${u.name} (${u.email}) - ${u.role}`);
      console.log(`   Attempts: ${u.loginAttempts} | Locked: ${u.lockUntil ? 'Yes' : 'No'}`);
    });

    console.log('\n✅ All accounts unlocked and ready!');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

unlockAll();
