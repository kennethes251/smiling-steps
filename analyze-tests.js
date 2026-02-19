#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Analyze test files and identify redundancy
function analyzeTests() {
    const testDir = 'server/test';
    const rootTestFiles = fs.readdirSync('.').filter(f => f.startsWith('test-') && f.endsWith('.js'));
    
    console.log('🔍 SMILING STEPS TEST ANALYSIS\n');
    
    // Count test files
    const serverTests = fs.existsSync(testDir) ? 
        getAllTestFiles(testDir).length : 0;
    const rootTests = rootTestFiles.length;
    
    console.log(`📊 TEST FILE COUNTS:`);
    console.log(`   Server tests: ${serverTests}`);
    console.log(`   Root tests: ${rootTests}`);
    console.log(`   Total: ${serverTests + rootTests}\n`);
    
    // Analyze by category
    console.log(`📋 TEST CATEGORIES:`);
    analyzeTestCategories(rootTestFiles);
    
    // Find duplicates
    console.log(`\n🔄 POTENTIAL DUPLICATES:`);
    findDuplicateTests(rootTestFiles);
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    provideRecommendations(rootTestFiles);
}

function getAllTestFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            files = files.concat(getAllTestFiles(fullPath));
        } else if (item.endsWith('.test.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

function analyzeTestCategories(testFiles) {
    const categories = {
        auth: [],
        login: [],
        booking: [],
        payment: [],
        mpesa: [],
        admin: [],
        video: [],
        email: [],
        debug: [],
        production: [],
        other: []
    };
    
    testFiles.forEach(file => {
        const lower = file.toLowerCase();
        if (lower.includes('auth') || lower.includes('login')) {
            if (lower.includes('login')) categories.login.push(file);
            else categories.auth.push(file);
        } else if (lower.includes('booking') || lower.includes('session')) {
            categories.booking.push(file);
        } else if (lower.includes('payment') || lower.includes('mpesa')) {
            if (lower.includes('mpesa')) categories.mpesa.push(file);
            else categories.payment.push(file);
        } else if (lower.includes('admin')) {
            categories.admin.push(file);
        } else if (lower.includes('video')) {
            categories.video.push(file);
        } else if (lower.includes('email')) {
            categories.email.push(file);
        } else if (lower.includes('debug') || lower.includes('diagnose')) {
            categories.debug.push(file);
        } else if (lower.includes('production') || lower.includes('deploy')) {
            categories.production.push(file);
        } else {
            categories.other.push(file);
        }
    });
    
    Object.entries(categories).forEach(([category, files]) => {
        if (files.length > 0) {
            console.log(`   ${category.toUpperCase()}: ${files.length} files`);
            if (files.length > 3) {
                console.log(`     ⚠️  Too many ${category} tests - consider consolidating`);
            }
        }
    });
}

function findDuplicateTests(testFiles) {
    const patterns = [
        { pattern: /test-login/, name: 'Login tests' },
        { pattern: /test-auth/, name: 'Auth tests' },
        { pattern: /test-booking/, name: 'Booking tests' },
        { pattern: /test-mpesa/, name: 'M-Pesa tests' },
        { pattern: /test-admin/, name: 'Admin tests' },
        { pattern: /debug-/, name: 'Debug tests' },
        { pattern: /test-production/, name: 'Production tests' }
    ];
    
    patterns.forEach(({ pattern, name }) => {
        const matches = testFiles.filter(f => pattern.test(f));
        if (matches.length > 1) {
            console.log(`   ${name}: ${matches.length} files`);
            matches.forEach(f => console.log(`     - ${f}`));
        }
    });
}

function provideRecommendations(testFiles) {
    const debugTests = testFiles.filter(f => f.includes('debug') || f.includes('diagnose'));
    const loginTests = testFiles.filter(f => f.includes('login'));
    const bookingTests = testFiles.filter(f => f.includes('booking'));
    const mpesaTests = testFiles.filter(f => f.includes('mpesa'));
    
    if (debugTests.length > 0) {
        console.log(`   🗑️  Archive ${debugTests.length} debug/diagnostic tests`);
    }
    
    if (loginTests.length > 3) {
        console.log(`   📦 Consolidate ${loginTests.length} login tests into server/test/core/auth.test.js`);
    }
    
    if (bookingTests.length > 3) {
        console.log(`   📦 Consolidate ${bookingTests.length} booking tests into server/test/core/booking.test.js`);
    }
    
    if (mpesaTests.length > 3) {
        console.log(`   📦 Consolidate ${mpesaTests.length} M-Pesa tests into server/test/core/payment.test.js`);
    }
    
    console.log(`   ✅ Keep stable tests (auth-login.stable.test.js) - NEVER modify`);
    console.log(`   🎯 Focus on quality over quantity`);
    console.log(`   ⚡ Use npm run test:quick for daily development`);
}

// Run analysis
analyzeTests();