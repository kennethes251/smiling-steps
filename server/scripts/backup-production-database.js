/**
 * Production Database Backup Script
 * 
 * Creates a backup of the production database before running migrations.
 * Supports both PostgreSQL and MongoDB databases.
 * 
 * Usage: node scripts/backup-production-database.js
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

/**
 * Parse PostgreSQL connection string
 */
function parsePostgresUrl(url) {
  const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  
  if (!match) {
    throw new Error('Invalid PostgreSQL connection string');
  }
  
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5]
  };
}

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDirectory() {
  const backupDir = path.join(__dirname, '..', '..', 'database-backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    logSuccess(`Created backup directory: ${backupDir}`);
  }
  
  return backupDir;
}

/**
 * Backup PostgreSQL database
 */
async function backupPostgreSQL() {
  logInfo('Backing up PostgreSQL database...');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set in environment variables');
  }
  
  const dbConfig = parsePostgresUrl(databaseUrl);
  const backupDir = ensureBackupDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                    new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('-')[0];
  const backupFile = path.join(backupDir, `smiling_steps_backup_${timestamp}.sql`);
  
  // Set PGPASSWORD environment variable for pg_dump
  process.env.PGPASSWORD = dbConfig.password;
  
  const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F p -f "${backupFile}"`;
  
  try {
    logInfo(`Executing: pg_dump...`);
    await execAsync(command);
    
    // Verify backup file was created
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      logSuccess(`Backup created successfully: ${backupFile}`);
      logSuccess(`Backup size: ${fileSizeMB} MB`);
      
      return {
        success: true,
        backupFile,
        size: fileSizeMB
      };
    } else {
      throw new Error('Backup file was not created');
    }
  } catch (error) {
    logError(`Backup failed: ${error.message}`);
    
    // Check if pg_dump is installed
    try {
      await execAsync('pg_dump --version');
    } catch (e) {
      logError('pg_dump is not installed or not in PATH');
      logInfo('Install PostgreSQL client tools to use pg_dump');
      logInfo('Ubuntu/Debian: sudo apt-get install postgresql-client');
      logInfo('macOS: brew install postgresql');
      logInfo('Windows: Download from https://www.postgresql.org/download/windows/');
    }
    
    throw error;
  } finally {
    // Clear PGPASSWORD
    delete process.env.PGPASSWORD;
  }
}

/**
 * Backup MongoDB database
 */
async function backupMongoDB() {
  logInfo('Backing up MongoDB database...');
  
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in environment variables');
  }
  
  const backupDir = ensureBackupDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                    new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('-')[0];
  const backupPath = path.join(backupDir, `mongodb_backup_${timestamp}`);
  
  const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;
  
  try {
    logInfo(`Executing: mongodump...`);
    await execAsync(command);
    
    // Verify backup directory was created
    if (fs.existsSync(backupPath)) {
      logSuccess(`Backup created successfully: ${backupPath}`);
      
      return {
        success: true,
        backupPath
      };
    } else {
      throw new Error('Backup directory was not created');
    }
  } catch (error) {
    logError(`Backup failed: ${error.message}`);
    
    // Check if mongodump is installed
    try {
      await execAsync('mongodump --version');
    } catch (e) {
      logError('mongodump is not installed or not in PATH');
      logInfo('Install MongoDB Database Tools to use mongodump');
      logInfo('Download from: https://www.mongodb.com/try/download/database-tools');
    }
    
    throw error;
  }
}

/**
 * Create backup metadata file
 */
function createBackupMetadata(backupInfo) {
  const metadata = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    databaseType: backupInfo.type,
    backupLocation: backupInfo.location,
    size: backupInfo.size || 'N/A',
    status: 'completed',
    notes: 'Pre-migration backup for M-Pesa payment integration'
  };
  
  const metadataFile = backupInfo.location + '.metadata.json';
  
  try {
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    logSuccess(`Backup metadata created: ${metadataFile}`);
  } catch (error) {
    logWarning(`Failed to create metadata file: ${error.message}`);
  }
}

/**
 * Main backup function
 */
async function backupDatabase() {
  console.log('\n');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('  Production Database Backup', 'bright');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('\n');
  
  logWarning('⚠️  IMPORTANT: This will create a backup of your production database');
  logWarning('⚠️  Ensure you have sufficient disk space available');
  console.log('\n');
  
  try {
    let backupInfo;
    
    // Determine database type
    if (process.env.DATABASE_URL) {
      logInfo('Detected PostgreSQL database');
      const result = await backupPostgreSQL();
      backupInfo = {
        type: 'PostgreSQL',
        location: result.backupFile,
        size: result.size + ' MB'
      };
    } else if (process.env.MONGODB_URI) {
      logInfo('Detected MongoDB database');
      const result = await backupMongoDB();
      backupInfo = {
        type: 'MongoDB',
        location: result.backupPath,
        size: 'N/A'
      };
    } else {
      throw new Error('No database connection string found in environment variables');
    }
    
    // Create metadata
    createBackupMetadata(backupInfo);
    
    // Summary
    console.log('\n');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    log('  Backup Summary', 'bright');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    console.log('\n');
    
    logSuccess('Backup completed successfully');
    logInfo(`Database Type: ${backupInfo.type}`);
    logInfo(`Backup Location: ${backupInfo.location}`);
    logInfo(`Backup Size: ${backupInfo.size}`);
    console.log('\n');
    
    logInfo('Next steps:');
    logInfo('1. Verify backup file exists and is not corrupted');
    logInfo('2. Test restore procedure on staging environment');
    logInfo('3. Proceed with database migration');
    logInfo('4. Keep backup file until migration is verified successful');
    console.log('\n');
    
    logWarning('⚠️  Store backup in a secure location');
    logWarning('⚠️  Do not commit backup files to version control');
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.log('\n');
    logError(`Backup failed: ${error.message}`);
    console.error(error);
    console.log('\n');
    
    logError('Cannot proceed with migration without a backup');
    logInfo('Please fix the issues above and try again');
    console.log('\n');
    
    process.exit(1);
  }
}

// Run backup
backupDatabase();
