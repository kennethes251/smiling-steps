/**
 * Database Backup Script
 * 
 * This script backs up your Render PostgreSQL database
 * Run this BEFORE November 12th!
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_DIR = path.join(__dirname, 'database-backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const BACKUP_FILE = path.join(BACKUP_DIR, `smiling_steps_backup_${timestamp}.sql`);

console.log('🔄 Starting database backup...\n');

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('✅ Created backup directory:', BACKUP_DIR);
}

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in .env file!');
  console.log('\n📝 Please add your Render database URL to .env:');
  console.log('DATABASE_URL="your-render-postgres-url"');
  process.exit(1);
}

console.log('📊 Database URL found');
console.log('💾 Backup file:', BACKUP_FILE);
console.log('\n⏳ Backing up database (this may take a minute)...\n');

// Use pg_dump to backup the database
const command = `pg_dump "${DATABASE_URL}" > "${BACKUP_FILE}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Backup failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('pg_dump')) {
      console.log('\n⚠️  PostgreSQL tools not installed!');
      console.log('\n📥 Install PostgreSQL:');
      console.log('Windows: https://www.postgresql.org/download/windows/');
      console.log('Mac: brew install postgresql');
      console.log('Linux: sudo apt-get install postgresql-client');
      console.log('\n💡 Or use the Node.js backup script instead:');
      console.log('node backup-database-node.js');
    }
    
    process.exit(1);
  }

  if (stderr) {
    console.log('⚠️  Warnings:', stderr);
  }

  // Check if backup file was created
  if (fs.existsSync(BACKUP_FILE)) {
    const stats = fs.statSync(BACKUP_FILE);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('✅ BACKUP SUCCESSFUL!\n');
    console.log('📁 Backup saved to:', BACKUP_FILE);
    console.log('📊 File size:', fileSizeInMB, 'MB');
    console.log('\n🎉 Your data is safe!');
    console.log('\n📋 Next steps:');
    console.log('1. Keep this backup file safe');
    console.log('2. Consider uploading to cloud storage (Google Drive, Dropbox)');
    console.log('3. Migrate to Supabase or another provider');
    console.log('4. Test the backup by restoring to a test database');
  } else {
    console.error('❌ Backup file was not created!');
    process.exit(1);
  }
});
