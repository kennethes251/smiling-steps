/**
 * Update Booking System - PostgreSQL Migration Script
 * 
 * This script updates psychologist profiles with default rates
 * for the new booking flow
 */

require('dotenv').config();
const path = require('path');
const { Sequelize } = require(path.join(__dirname, 'server', 'node_modules', 'sequelize'));

async function updateBookingSystem() {
  let sequelize;
  
  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment variables');
    }
    
    sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });
    
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');
    
    // Load models
    const models = require('./server/models')(sequelize);
    const { User } = models;

    // Update psychologist profiles with default rates
    console.log('👨‍⚕️ Updating psychologist profiles...');
    const psychologists = await User.findAll({ 
      where: { role: 'psychologist' }
    });
    
    console.log(`Found ${psychologists.length} psychologist(s)\n`);
    
    let updatedCount = 0;
    
    for (const psych of psychologists) {
      let updated = false;
      const details = psych.psychologistDetails || {};
      
      // Add default rates if missing
      if (!details.rates) {
        details.rates = {
          Individual: { amount: 2000, duration: 60 },
          Couples: { amount: 3500, duration: 75 },
          Family: { amount: 4500, duration: 90 },
          Group: { amount: 1500, duration: 90 }
        };
        updated = true;
        console.log(`  ✓ Added rates for ${psych.name}`);
      }
      
      // Add default payment info if missing
      if (!details.paymentInfo) {
        details.paymentInfo = {
          mpesaNumber: '0707439299',
          mpesaName: psych.name
        };
        updated = true;
        console.log(`  ✓ Added payment info for ${psych.name}`);
      }
      
      // Add default specializations if missing
      if (!details.specializations || details.specializations.length === 0) {
        details.specializations = [
          'General Therapy',
          'Anxiety',
          'Depression'
        ];
        updated = true;
        console.log(`  ✓ Added specializations for ${psych.name}`);
      }
      
      // Add default experience if missing
      if (!details.experience) {
        details.experience = '5 years';
        updated = true;
        console.log(`  ✓ Added experience for ${psych.name}`);
      }
      
      if (updated) {
        psych.psychologistDetails = details;
        await psych.save();
        updatedCount++;
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount} psychologist profile(s)`);

    console.log('\n🎉 Booking system update complete!');
    console.log('\nNext steps:');
    console.log('1. Restart your server: npm run dev');
    console.log('2. Login as a client');
    console.log('3. Go to /bookings');
    console.log('4. Test the new booking flow!');
    
  } catch (error) {
    console.error('❌ Error updating booking system:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run the update
updateBookingSystem();
