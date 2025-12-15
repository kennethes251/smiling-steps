/**
 * Database Restore Script
 * 
 * Restores a database from a backup file.
 * Use this for rollback procedures or disaster recovery.
 * 
 * Usage: node scripts/restore-database-backup.js <backup-file-path>
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readline = require('readline');

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
 * Prompt user for confirmation
 */
function promptConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Restore PostgreSQL database
 */
async function restorePostgreSQL(backupFile) {
  logInfo('Restoring PostgreSQL database...');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set in environment variables');
  }
  
  const dbConfig = parsePostgresUrl(databaseUrl);
  
  // Verify backup file exists
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }
  
  const stats = fs.statSync(backupFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  logInfo(`Backup file: ${backupFile}`);
  logInfo(`Backup size: ${fileSizeMB} MB`);
  
  // Set PGPASSWORD environment variable
  process.env.PGPASSWORD = dbConfig.password;
  
  const command = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${backupFile}"`;
  
  try {
    logWarning('⚠️  This will overwrite the current database!');
    const confirmed = await promptConfirmation('Are you sure you want to continue? (yes/no): ');
    
    if (!confirmed) {
      logInfo('Restore cancelled by user');
      process.exit(0);
    }
    
    logInfo('Executing: psql...');
    await execAsync(command);
    
    logSuccess('Database restored successfully');
    
    return {
      success: true,
      backupFile,
      size: fileSizeMB
    };
  } catch (error) {
    logError(`Restore failed: ${error.message}`);
    
    // Check if psql is installed
    try {
      await execAsync('psql --version');
    } catch (e) {
      logError('psql is not installed or not in PATH');
      logInfo('Install PostgreSQL client tools to use psql');
    }
    
    throw error;
  } finally {
    // Clear PGPASSWORD
    delete process.env.PGPASSWORD;
  }
}

/**
 * Restore MongoDB database
 */
async function restoreMongoDB(backupPath) {
  logInfo('Restoring MongoDB database...');
  
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in environment variables');
  }
  
  // Verify backup directory exists
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup directory not found: ${backupPath}`);
  }
  
  logInfo(`Backup directory: ${backupPath}`);
  
  const command = `mongorestore --uri="${mongoUri}" --drop "${backupPath}"`;
  
  try {
    logWarning('⚠️  This will drop and restore the database!');
    const confirmed = await promptConfirmation('Are you sure you want to continue? (yes/no): ');
    
    if (!confirmed) {
      logInfo('Restore cancelled by user');
      process.exit(0);
    }
    
    logInfo('Executing: mongorestore...');
    await execAsync(command);
    
    logSuccess('Database restored successfully');
    
    return {
      success: true,
      backupPath
    };
  } catch (error) {
    logError(`Restore failed: ${error.message}`);
    
    // Check if mongorestore is installed
    try {
      await execAsync('mongorestore --version');
    } catch (e) {
      logError('mongorestore is not installed or not in PATH');
      logInfo('Install MongoDB Database Tools to use mongorestore');
    }
    
    throw error;
  }
}

/**
 * Main restore function
 */
async function restoreDatabase() {
  console.log('\n');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('  Database Restore', 'bright');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('\n');
  
  // Get backup file path from command line arguments
  const backupPath = process.argv[2];
  
  if (!backupPath) {
    logError('No backup file path provided');
    logInfo('Usage: node scripts/restore-database-backup.js <backup-file-path>');
    logInfo('Example: node scripts/restore-database-backup.js database-backups/backup_2024-12-11.sql');
    process.exit(1);
  }
  
  logWarning('⚠️  DANGER: This will overwrite your current database!');
  logWarning('⚠️  Make sure you have a backup of the current state if needed');
  console.log('\n');
  
  try {
    let restoreInfo;
    
    // Determine database type based on backup file extension
    if (backupPath.endsWith('.sql')) {
      logInfo('Detected PostgreSQL backup file');
      const result = await restorePostgreSQL(backupPath);
      restoreInfo = {
        type: 'PostgreSQL',
        location: result.backupFile,
        size: result.size + ' MB'
      };
    } else if (fs.existsSync(backupPath) && fs.statSync(backupPath).isDirectory()) {
      logInfo('Detected MongoDB backup directory');
      const result = await restoreMongoDB(backupPath);
      restoreInfo = {
        type: 'MongoDB',
        location: result.backupPath,
        size: 'N/A'
      };
    } else {
      throw new Error('Unknown backup format. Expected .sql file or MongoDB backup directory');
    }
    
    // Summary
    console.log('\n');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    log('  Restore Summary', 'bright');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    console.log('\n');
    
    logSuccess('Restore completed successfully');
    logInfo(`Database Type: ${restoreInfo.type}`);
    logInfo(`Restored From: ${restoreInfo.location}`);
    console.log('\n');
    
    logInfo('Next steps:');
    logInfo('1. Verify database integrity');
    logInfo('2. Test application functionality');
    logInfo('3. Check data consistency');
    logInfo('4. Restart application if needed');
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.log('\n');
    logError(`Restore failed: ${error.message}`);
    console.error(error);
    console.log('\n');
    
    logError('Database may be in an inconsistent state');
    logWarning('You may need to restore from another backup');
    console.log('\n');
    
    process.exit(1);
  }
}

// Run restore
restoreDatabase();
