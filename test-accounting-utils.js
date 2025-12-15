/**
 * Simple test for accounting utility functions
 */

const { generateAccountingExport, generateJournalEntries, getSupportedFormats, CHART_OF_ACCOUNTS } = require('./server/utils/accountingExport');

// Sample transaction data
const sampleTransactions = [
  {
    mpesaTransactionID: 'MPESA123456',
    price: 3000,
    paymentVerifiedAt: new Date('2024-12-14T10:30:00Z'),
    paymentStatus: 'Paid',
    sessionType: 'Individual Therapy',
    client: {
      name: 'John Doe',
      email: 'john@example.com'
    },
    psychologist: {
      name: 'Dr. Jane Smith',
      email: 'jane@smilingsteps.com'
    }
  },
  {
    mpesaTransactionID: 'MPESA789012',
    price: 4500,
    paymentVerifiedAt: new Date('2024-12-14T14:15:00Z'),
    paymentStatus: 'Paid',
    sessionType: 'Couples Therapy',
    client: {
      name: 'Alice Johnson',
      email: 'alice@example.com'
    },
    psychologist: {
      name: 'Dr. Bob Wilson',
      email: 'bob@smilingsteps.com'
    }
  }
];

console.log('🧪 Testing Accounting Utility Functions');
console.log('======================================');

// Test 1: Get supported formats
console.log('\n📋 Testing getSupportedFormats()...');
const formats = getSupportedFormats();
console.log('✅ Supported formats:', formats.map(f => f.name).join(', '));

// Test 2: Chart of accounts
console.log('\n🏦 Testing CHART_OF_ACCOUNTS...');
console.log('✅ Chart of accounts:', Object.keys(CHART_OF_ACCOUNTS).join(', '));

// Test 3: Generate exports for each format
console.log('\n📤 Testing export generation...');
formats.forEach(format => {
  try {
    const exportContent = generateAccountingExport(sampleTransactions, format.key);
    console.log(`✅ ${format.name} export: ${exportContent.length} characters`);
    
    // Show first line of export
    const firstLine = exportContent.split('\n')[0];
    console.log(`   First line: ${firstLine.substring(0, 60)}${firstLine.length > 60 ? '...' : ''}`);
  } catch (error) {
    console.log(`❌ ${format.name} export failed:`, error.message);
  }
});

// Test 4: Generate journal entries
console.log('\n📚 Testing journal entries generation...');
try {
  const journalEntries = generateJournalEntries(sampleTransactions);
  console.log(`✅ Journal entries generated: ${journalEntries.length} entries`);
  
  // Calculate totals
  let totalDebits = 0;
  let totalCredits = 0;
  
  journalEntries.forEach(entry => {
    entry.entries.forEach(line => {
      totalDebits += parseFloat(line.debit || 0);
      totalCredits += parseFloat(line.credit || 0);
    });
  });
  
  console.log(`💰 Total debits: KES ${totalDebits.toFixed(2)}`);
  console.log(`💰 Total credits: KES ${totalCredits.toFixed(2)}`);
  console.log(`⚖️ Balanced: ${Math.abs(totalDebits - totalCredits) < 0.01 ? 'Yes' : 'No'}`);
  
  // Show sample entry
  if (journalEntries.length > 0) {
    const sampleEntry = journalEntries[0];
    console.log(`📝 Sample entry: ${sampleEntry.date} - ${sampleEntry.description}`);
    sampleEntry.entries.forEach(line => {
      console.log(`   ${line.account} ${line.accountName}: Dr ${line.debit} Cr ${line.credit}`);
    });
  }
} catch (error) {
  console.log('❌ Journal entries generation failed:', error.message);
}

// Test 5: Test error handling
console.log('\n🚨 Testing error handling...');

// Test with empty transactions
try {
  const emptyExport = generateAccountingExport([], 'generic');
  console.log('✅ Empty transactions handled gracefully');
} catch (error) {
  console.log('❌ Empty transactions caused error:', error.message);
}

// Test with invalid format
try {
  const invalidExport = generateAccountingExport(sampleTransactions, 'invalid-format');
  console.log('✅ Invalid format defaulted to generic');
} catch (error) {
  console.log('❌ Invalid format caused error:', error.message);
}

console.log('\n🎉 Accounting Utility Tests Complete');
console.log('===================================');