#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Script to help clean up redundant test files
function cleanupTests() {
    console.log('🧹 SMILING STEPS TEST CLEANUP HELPER\n');
    
    const rootTestFiles = fs.readdirSync('.').filter(f => f.startsWith('test-') && f.endsWith('.js'));
    
    // Create archive directory
    const archiveDir = 'archived-tests';
    if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir);
        console.log(`📁 Created ${archiveDir} directory\n`);
    }
    
    // Identify files to archive
    const toArchive = identifyFilesToArchive(rootTestFiles);
    
    console.log('📋 FILES RECOMMENDED FOR ARCHIVING:\n');
    
    if (toArchive.debug.length > 0) {
        console.log('🐛 DEBUG/DIAGNOSTIC TESTS (likely one-time use):');
        toArchive.debug.forEach(f => console.log(`   - ${f}`));
        console.log('');
    }
    
    if (toArchive.redundant.length > 0) {
        console.log('🔄 REDUNDANT TESTS (duplicating functionality):');
        toArchive.redundant.forEach(f => console.log(`   - ${f}`));
        console.log('');
    }
    
    if (toArchive.old.length > 0) {
        console.log('📅 OLD/OUTDATED TESTS:');
        toArchive.old.forEach(f => console.log(`   - ${f}`));
        console.log('');
    }
    
    // Show files to keep
    const toKeep = rootTestFiles.filter(f => 
        !toArchive.debug.includes(f) && 
        !toArchive.redundant.includes(f) && 
        !toArchive.old.includes(f)
    );
    
    console.log('✅ FILES TO KEEP (core functionality):');
    toKeep.forEach(f => console.log(`   - ${f}`));
    console.log('');
    
    // Provide consolidation suggestions
    console.log('💡 CONSOLIDATION SUGGESTIONS:\n');
    provideConsolidationSuggestions(toKeep);
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Review the files listed above');
    console.log('2. Run: node cleanup-tests.js --execute (to actually move files)');
    console.log('3. Consolidate remaining tests into organized structure');
    console.log('4. Update package.json with new test scripts');
    
    // If --execute flag is passed, actually move files
    if (process.argv.includes('--execute')) {
        executeCleanup(toArchive, archiveDir);
    }
}

function identifyFilesToArchive(testFiles) {
    const debug = [];
    const redundant = [];
    const old = [];
    
    testFiles.forEach(file => {
        const lower = file.toLowerCase();
        
        // Debug/diagnostic files
        if (lower.includes('debug') || lower.includes('diagnose') || 
            lower.includes('fix-') || lower.includes('quick-')) {
            debug.push(file);
        }
        // Redundant login tests (keep only 1-2 core ones)
        else if (lower.includes('login') && (
            lower.includes('simple') || lower.includes('debug') || 
            lower.includes('comprehensive') || lower.includes('flow')
        )) {
            redundant.push(file);
        }
        // Old migration/setup tests
        else if (lower.includes('migration') || lower.includes('setup') || 
                 lower.includes('postgres') || lower.includes('sequelize')) {
            old.push(file);
        }
        // Redundant booking tests
        else if (lower.includes('booking') && (
            lower.includes('complete') || lower.includes('flow') || 
            lower.includes('fixed')
        )) {
            redundant.push(file);
        }
    });
    
    return { debug, redundant, old };
}

function provideConsolidationSuggestions(keepFiles) {
    const authTests = keepFiles.filter(f => f.includes('auth') || f.includes('login'));
    const bookingTests = keepFiles.filter(f => f.includes('booking') || f.includes('session'));
    const paymentTests = keepFiles.filter(f => f.includes('payment') || f.includes('mpesa'));
    const adminTests = keepFiles.filter(f => f.includes('admin'));
    
    if (authTests.length > 0) {
        console.log('🔐 AUTH TESTS - Consolidate into server/test/core/auth.test.js:');
        authTests.forEach(f => console.log(`   - ${f}`));
        console.log('');
    }
    
    if (bookingTests.length > 0) {
        console.log('📅 BOOKING TESTS - Consolidate into server/test/core/booking.test.js:');
        bookingTests.forEach(f => console.log(`   - ${f}`));
        console.log('');
    }
    
    if (paymentTests.length > 0) {
        console.log('💳 PAYMENT TESTS - Consolidate into server/test/core/payment.test.js:');
        paymentTests.forEach(f => console.log(`   - ${f}`));
        console.log('');
    }
    
    if (adminTests.length > 0) {
        console.log('👑 ADMIN TESTS - Consolidate into server/test/core/admin.test.js:');
        adminTests.forEach(f => console.log(`   - ${f}`));
        console.log('');
    }
}

function executeCleanup(toArchive, archiveDir) {
    console.log('\n🚀 EXECUTING CLEANUP...\n');
    
    let movedCount = 0;
    
    [...toArchive.debug, ...toArchive.redundant, ...toArchive.old].forEach(file => {
        try {
            const sourcePath = file;
            const destPath = path.join(archiveDir, file);
            
            fs.renameSync(sourcePath, destPath);
            console.log(`✅ Moved ${file} to ${archiveDir}/`);
            movedCount++;
        } catch (error) {
            console.log(`❌ Failed to move ${file}: ${error.message}`);
        }
    });
    
    console.log(`\n🎉 Cleanup complete! Moved ${movedCount} files to ${archiveDir}/`);
    console.log('📝 Create a README.md in archived-tests/ to document what was moved and why');
}

// Run cleanup
cleanupTests();