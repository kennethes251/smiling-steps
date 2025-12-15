/**
 * Node.js Database Backup Script (No pg_dump required)
 * 
 * This script backs up your database using Node.js
 * Works without PostgreSQL tools installed
 */

require('dotenv').config({ path: './server/.env' });
const { Client } = require('./server/node_modules/pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔍 Checking DATABASE_URL...');
if (DATABASE_URL) {
  const masked = DATABASE_URL.substring(0, 30) + '...' + DATABASE_URL.substring(DATABASE_URL.length - 10);
  console.log('   Found:', masked);
} else {
  console.log('   Not found in server/.env');
}
const BACKUP_DIR = path.join(__dirname, 'database-backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const BACKUP_FILE = path.join(BACKUP_DIR, `smiling_steps_backup_${timestamp}.json`);

console.log('🔄 Starting Node.js database backup...\n');

// Create backup directory
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('✅ Created backup directory');
}

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found!');
  process.exit(1);
}

async function backupDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    const backup = {
      timestamp: new Date().toISOString(),
      database: 'smiling_steps',
      tables: {}
    };

    // Get all tables
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`📊 Found ${tablesResult.rows.length} tables\n`);

    // Backup each table
    for (const { tablename } of tablesResult.rows) {
      console.log(`⏳ Backing up table: ${tablename}...`);
      
      try {
        const result = await client.query(`SELECT * FROM "${tablename}"`);
        backup.tables[tablename] = {
          rowCount: result.rows.length,
          data: result.rows
        };
        console.log(`   ✅ ${result.rows.length} rows backed up`);
      } catch (err) {
        console.log(`   ⚠️  Error backing up ${tablename}:`, err.message);
        backup.tables[tablename] = {
          error: err.message
        };
      }
    }

    // Save backup to file
    console.log('\n💾 Saving backup file...');
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));

    const stats = fs.statSync(BACKUP_FILE);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('\n✅ BACKUP SUCCESSFUL!\n');
    console.log('📁 Backup saved to:', BACKUP_FILE);
    console.log('📊 File size:', fileSizeInMB, 'MB');
    
    // Summary
    let totalRows = 0;
    console.log('\n📋 Backup Summary:');
    for (const [table, data] of Object.entries(backup.tables)) {
      if (data.rowCount) {
        console.log(`   ${table}: ${data.rowCount} rows`);
        totalRows += data.rowCount;
      }
    }
    console.log(`\n   Total: ${totalRows} rows backed up`);

    console.log('\n🎉 Your data is safe!');
    console.log('\n📋 Next steps:');
    console.log('1. Keep this backup file safe');
    console.log('2. Upload to cloud storage (Google Drive, Dropbox)');
    console.log('3. Migrate to Supabase before November 12th');

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

backupDatabase();
