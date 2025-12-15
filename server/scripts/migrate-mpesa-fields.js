/**
 * Migration Script: Add M-Pesa Payment Fields to Existing Sessions
 * 
 * This script adds the new M-Pesa payment fields to existing session records
 * and sets appropriate default values for PostgreSQL database.
 * 
 * Usage: node server/scripts/migrate-mpesa-fields.js
 */

require('dotenv').config({ path: './server/.env' });
const { Sequelize, DataTypes } = require('sequelize');

// Database connection
const connectDB = async () => {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment variables');
    }

    const sequelize = new Sequelize(databaseUrl, {
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
    console.log('✅ PostgreSQL connected successfully');
    
    return sequelize;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    process.exit(1);
  }
};

// Add new columns to sessions table
const addColumns = async (sequelize) => {
  try {
    console.log('\n🔄 Adding M-Pesa payment columns...\n');

    const queryInterface = sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable('sessions');

    const columnsToAdd = [
      {
        name: 'paymentInitiatedAt',
        definition: {
          type: DataTypes.DATE,
          allowNull: true
        }
      },
      {
        name: 'mpesaCheckoutRequestID',
        definition: {
          type: DataTypes.STRING,
          allowNull: true
        }
      },
      {
        name: 'mpesaMerchantRequestID',
        definition: {
          type: DataTypes.STRING,
          allowNull: true
        }
      },
      {
        name: 'mpesaTransactionID',
        definition: {
          type: DataTypes.STRING,
          allowNull: true
        }
      },
      {
        name: 'mpesaAmount',
        definition: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true
        }
      },
      {
        name: 'mpesaPhoneNumber',
        definition: {
          type: DataTypes.STRING,
          allowNull: true
        }
      },
      {
        name: 'mpesaResultCode',
        definition: {
          type: DataTypes.INTEGER,
          allowNull: true
        }
      },
      {
        name: 'mpesaResultDesc',
        definition: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      },
      {
        name: 'paymentAttempts',
        definition: {
          type: DataTypes.JSONB,
          allowNull: true,
          defaultValue: []
        }
      }
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const column of columnsToAdd) {
      if (!tableDescription[column.name]) {
        await queryInterface.addColumn('sessions', column.name, column.definition);
        console.log(`✅ Added column: ${column.name}`);
        addedCount++;
      } else {
        console.log(`⏭️  Column already exists: ${column.name}`);
        skippedCount++;
      }
    }

    console.log('\n📊 Column Addition Summary:');
    console.log(`   Added: ${addedCount}`);
    console.log(`   Skipped: ${skippedCount}`);

  } catch (error) {
    console.error('❌ Error adding columns:', error);
    throw error;
  }
};

// Update payment status enum to include new values
const updatePaymentStatusEnum = async (sequelize) => {
  try {
    console.log('\n🔄 Updating payment status enum...\n');

    // Check if the enum type exists and needs updating
    const [results] = await sequelize.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'enum_sessions_paymentStatus'
      );
    `);

    const existingValues = results.map(r => r.enumlabel);
    const requiredValues = ['Pending', 'Processing', 'Paid', 'Confirmed', 'Failed', 'Submitted', 'Verified', 'Refunded'];
    const missingValues = requiredValues.filter(v => !existingValues.includes(v));

    if (missingValues.length > 0) {
      for (const value of missingValues) {
        await sequelize.query(`
          ALTER TYPE "enum_sessions_paymentStatus" ADD VALUE IF NOT EXISTS '${value}';
        `);
        console.log(`✅ Added enum value: ${value}`);
      }
    } else {
      console.log('⏭️  Payment status enum already up to date');
    }

  } catch (error) {
    // If enum doesn't exist, it will be created when the model syncs
    console.log('ℹ️  Payment status enum will be created on model sync');
  }
};

// Migrate existing data
const migrateData = async (sequelize) => {
  try {
    console.log('\n🔄 Migrating existing session data...\n');

    // Set default values for existing records
    const [results] = await sequelize.query(`
      UPDATE sessions 
      SET 
        "paymentInitiatedAt" = COALESCE("paymentInitiatedAt", "createdAt"),
        "paymentAttempts" = COALESCE("paymentAttempts", '[]'::jsonb)
      WHERE "paymentStatus" != 'Pending' 
        AND "paymentInitiatedAt" IS NULL;
    `);

    console.log(`✅ Updated ${results.rowCount || 0} existing sessions with default values`);

  } catch (error) {
    console.error('❌ Error migrating data:', error);
    throw error;
  }
};

// Create indexes
const createIndexes = async (sequelize) => {
  try {
    console.log('\n🔄 Creating database indexes...\n');

    const queryInterface = sequelize.getQueryInterface();

    const indexes = [
      {
        name: 'idx_mpesa_checkout_payment_status',
        fields: ['mpesaCheckoutRequestID', 'paymentStatus']
      },
      {
        name: 'idx_client_payment_date',
        fields: ['clientId', 'paymentStatus', 'sessionDate']
      },
      {
        name: 'idx_psychologist_payment_date',
        fields: ['psychologistId', 'paymentStatus', 'sessionDate']
      }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('sessions', index.fields, {
          name: index.name
        });
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  Index already exists: ${index.name}`);
        } else {
          throw error;
        }
      }
    }

    // Create unique sparse index for mpesaTransactionID
    try {
      await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_mpesa_transaction_unique 
        ON sessions ("mpesaTransactionID") 
        WHERE "mpesaTransactionID" IS NOT NULL;
      `);
      console.log('✅ Created unique sparse index: idx_mpesa_transaction_unique');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⏭️  Index already exists: idx_mpesa_transaction_unique');
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  let sequelize;
  
  try {
    console.log('════════════════════════════════════════════════════════════');
    console.log('   M-Pesa Payment Fields Migration for PostgreSQL');
    console.log('════════════════════════════════════════════════════════════\n');

    sequelize = await connectDB();
    await addColumns(sequelize);
    await updatePaymentStatusEnum(sequelize);
    await migrateData(sequelize);
    await createIndexes(sequelize);
    
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('🎉 All migration tasks completed successfully!');
    console.log('════════════════════════════════════════════════════════════\n');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n════════════════════════════════════════════════════════════');
    console.error('❌ Migration failed:', error.message);
    console.error('════════════════════════════════════════════════════════════\n');
    
    if (sequelize) {
      await sequelize.close();
    }
    process.exit(1);
  }
};

// Run the migration
main();
