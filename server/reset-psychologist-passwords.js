// Reset psychologist passwords to 'password123'
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

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

async function resetPasswords() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Hash the new password
    const newPassword = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log('🔐 New password hash generated\n');

    // Update all psychologist passwords
    const [results, metadata] = await sequelize.query(`
      UPDATE "users"
      SET 
        password = :hashedPassword,
        "loginAttempts" = 0,
        "lockUntil" = NULL
      WHERE role = 'psychologist'
      RETURNING name, email
    `, {
      replacements: { hashedPassword }
    });

    console.log(`✅ Reset passwords for ${results.length} psychologist(s):\n`);
    results.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
      console.log(`     Password: password123`);
    });

    console.log('\n✅ All psychologist passwords reset!');
    console.log('\n🔑 You can now login with:');
    console.log('   - leon@gmail.com / password123');
    console.log('   - nancy@gmail.com / password123');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPasswords();
