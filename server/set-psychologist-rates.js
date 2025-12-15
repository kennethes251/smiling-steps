// Set session rates for psychologists
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

async function setRates() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Set default session rate for all psychologists
    const defaultRate = 2500; // KES 2500 per session

    const [results, metadata] = await sequelize.query(`
      UPDATE "users"
      SET "psychologistDetails" = jsonb_set(
        COALESCE("psychologistDetails", '{}'::jsonb),
        '{sessionRate}',
        :rate::text::jsonb
      )
      WHERE role = 'psychologist'
      RETURNING name, email, "psychologistDetails"
    `, {
      replacements: { rate: defaultRate }
    });

    console.log(`✅ Set session rates for ${results.length} psychologist(s):\n`);
    results.forEach(user => {
      const rate = user.psychologistDetails?.sessionRate || defaultRate;
      console.log(`   - ${user.name} (${user.email})`);
      console.log(`     Rate: KES ${rate} per session`);
    });

    console.log('\n✅ All psychologist rates set!');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setRates();
