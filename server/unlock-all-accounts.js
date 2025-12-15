const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://smiling_steps_db_user:Ry0Ry0Ry0Ry0Ry0Ry0Ry0Ry0Ry0Ry0@dpg-ct5bnhm8ii6s73a5rvfg-a.oregon-postgres.render.com/smiling_steps_db', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

async function unlockAllAccounts() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Reset login attempts and unlock all accounts
    const [result] = await sequelize.query(`
      UPDATE "users"
      SET 
        "loginAttempts" = 0,
        "lockUntil" = NULL
      WHERE "loginAttempts" > 0 OR "lockUntil" IS NOT NULL
      RETURNING email, name, role
    `);

    if (result.length > 0) {
      console.log(`✅ Unlocked ${result.length} account(s):\n`);
      result.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
      });
    } else {
      console.log('ℹ️  No locked accounts found');
    }

    // Show all users with their status
    const [users] = await sequelize.query(`
      SELECT name, email, role, "loginAttempts", "lockUntil", active
      FROM "users"
      WHERE role IN ('client', 'psychologist')
      ORDER BY role, name
    `);

    console.log('\n📊 All User Accounts:\n');
    users.forEach(user => {
      const status = user.active ? '✅ Active' : '❌ Inactive';
      const locked = user.lockUntil ? '🔒 Locked' : '🔓 Unlocked';
      console.log(`${user.name} (${user.email})`);
      console.log(`   Role: ${user.role} | ${status} | ${locked} | Attempts: ${user.loginAttempts}`);
    });

    console.log('\n✅ All accounts are now unlocked and ready to use!');
    console.log('\n🔑 You can now login with:');
    console.log('   - leon@gmail.com / password123');
    console.log('   - nancy@gmail.com / password123');
    console.log('   - amos@gmail.com / password123');

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

unlockAllAccounts();
