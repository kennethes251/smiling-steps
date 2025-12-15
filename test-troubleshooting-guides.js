/**
 * Test script for Video Call Troubleshooting Guides
 * Tests the completeness and accessibility of troubleshooting documentation
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Video Call Troubleshooting Guides\n');

// Test files that should exist
const requiredFiles = [
  'VIDEO_CALL_TROUBLESHOOTING_GUIDE.md',
  'VIDEO_CALL_QUICK_FIXES.md', 
  'VIDEO_CALL_SUPPORT_GUIDE.md',
  'VIDEO_CALL_FAQ.md',
  'VIDEO_CALL_HELP_CENTER.md',
  'client/src/components/VideoCall/TroubleshootingGuide.js',
  'client/src/components/VideoCall/QuickHelpPanel.js'
];

let allTestsPassed = true;

// Test 1: Check if all required files exist
console.log('📁 Test 1: Checking required files exist...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allTestsPassed = false;
  }
});

// Test 2: Check content completeness
console.log('\n📝 Test 2: Checking content completeness...');

// Check troubleshooting guide has all required sections
if (fs.existsSync('VIDEO_CALL_TROUBLESHOOTING_GUIDE.md')) {
  const content = fs.readFileSync('VIDEO_CALL_TROUBLESHOOTING_GUIDE.md', 'utf8');
  const requiredSections = [
    'Can\'t Join Video Call',
    'Camera/Video Issues', 
    'Audio/Microphone Issues',
    'Connection Problems',
    'Screen Sharing Issues',
    'Browser Compatibility Guide',
    'Error Messages Explained',
    'Getting Help'
  ];
  
  requiredSections.forEach(section => {
    if (content.includes(section)) {
      console.log(`  ✅ Section: ${section}`);
    } else {
      console.log(`  ❌ Section missing: ${section}`);
      allTestsPassed = false;
    }
  });
} else {
  console.log('  ❌ Cannot test content - main guide missing');
  allTestsPassed = false;
}

// Test 3: Check FAQ has common questions
console.log('\n❓ Test 3: Checking FAQ completeness...');
if (fs.existsSync('VIDEO_CALL_FAQ.md')) {
  const faqContent = fs.readFileSync('VIDEO_CALL_FAQ.md', 'utf8');
  const commonQuestions = [
    'What do I need for video calls?',
    'Which browsers work best?',
    'When can I join my video call?',
    'permission denied',
    'Can I turn off my camera',
    'Are video calls recorded?'
  ];
  
  commonQuestions.forEach(question => {
    if (faqContent.toLowerCase().includes(question.toLowerCase())) {
      console.log(`  ✅ Question covered: ${question}`);
    } else {
      console.log(`  ❌ Question missing: ${question}`);
      allTestsPassed = false;
    }
  });
} else {
  console.log('  ❌ Cannot test FAQ - file missing');
  allTestsPassed = false;
}

// Test 4: Check Quick Fixes has emergency solutions
console.log('\n⚡ Test 4: Checking Quick Fixes guide...');
if (fs.existsSync('VIDEO_CALL_QUICK_FIXES.md')) {
  const quickContent = fs.readFileSync('VIDEO_CALL_QUICK_FIXES.md', 'utf8');
  const quickSolutions = [
    'Join Call Button',
    'Camera Not Working',
    'No Audio',
    'Connection Issues',
    'Emergency Backup Plan'
  ];
  
  quickSolutions.forEach(solution => {
    if (quickContent.includes(solution)) {
      console.log(`  ✅ Quick fix: ${solution}`);
    } else {
      console.log(`  ❌ Quick fix missing: ${solution}`);
      allTestsPassed = false;
    }
  });
} else {
  console.log('  ❌ Cannot test Quick Fixes - file missing');
  allTestsPassed = false;
}

// Test 5: Check Support Guide has technical details
console.log('\n🛠️ Test 5: Checking Support Guide...');
if (fs.existsSync('VIDEO_CALL_SUPPORT_GUIDE.md')) {
  const supportContent = fs.readFileSync('VIDEO_CALL_SUPPORT_GUIDE.md', 'utf8');
  const technicalSections = [
    'Quick Diagnosis Checklist',
    'Common Issue Categories',
    'Technical Diagnostics',
    'Resolution Scripts',
    'Escalation Procedures'
  ];
  
  technicalSections.forEach(section => {
    if (supportContent.includes(section)) {
      console.log(`  ✅ Technical section: ${section}`);
    } else {
      console.log(`  ❌ Technical section missing: ${section}`);
      allTestsPassed = false;
    }
  });
} else {
  console.log('  ❌ Cannot test Support Guide - file missing');
  allTestsPassed = false;
}

// Test 6: Check React components exist and have required props
console.log('\n⚛️ Test 6: Checking React components...');

// Check TroubleshootingGuide component
if (fs.existsSync('client/src/components/VideoCall/TroubleshootingGuide.js')) {
  const componentContent = fs.readFileSync('client/src/components/VideoCall/TroubleshootingGuide.js', 'utf8');
  const requiredProps = ['open', 'onClose', 'error', 'context'];
  
  requiredProps.forEach(prop => {
    if (componentContent.includes(prop)) {
      console.log(`  ✅ TroubleshootingGuide has prop: ${prop}`);
    } else {
      console.log(`  ❌ TroubleshootingGuide missing prop: ${prop}`);
      allTestsPassed = false;
    }
  });
  
  // Check if component has step-by-step guide
  if (componentContent.includes('troubleshootingSteps')) {
    console.log('  ✅ TroubleshootingGuide has step-by-step guide');
  } else {
    console.log('  ❌ TroubleshootingGuide missing step-by-step guide');
    allTestsPassed = false;
  }
} else {
  console.log('  ❌ TroubleshootingGuide component missing');
  allTestsPassed = false;
}

// Check QuickHelpPanel component
if (fs.existsSync('client/src/components/VideoCall/QuickHelpPanel.js')) {
  const panelContent = fs.readFileSync('client/src/components/VideoCall/QuickHelpPanel.js', 'utf8');
  
  if (panelContent.includes('quickFixes')) {
    console.log('  ✅ QuickHelpPanel has quick fixes');
  } else {
    console.log('  ❌ QuickHelpPanel missing quick fixes');
    allTestsPassed = false;
  }
  
  if (panelContent.includes('onOpenFullGuide')) {
    console.log('  ✅ QuickHelpPanel can open full guide');
  } else {
    console.log('  ❌ QuickHelpPanel cannot open full guide');
    allTestsPassed = false;
  }
} else {
  console.log('  ❌ QuickHelpPanel component missing');
  allTestsPassed = false;
}

// Test 7: Check Help Center navigation
console.log('\n🏥 Test 7: Checking Help Center navigation...');
if (fs.existsSync('VIDEO_CALL_HELP_CENTER.md')) {
  const helpContent = fs.readFileSync('VIDEO_CALL_HELP_CENTER.md', 'utf8');
  const navigationSections = [
    'Quick Navigation',
    'Choose Your Path',
    'Most Common Issues',
    'Contact Information'
  ];
  
  navigationSections.forEach(section => {
    if (helpContent.includes(section)) {
      console.log(`  ✅ Navigation section: ${section}`);
    } else {
      console.log(`  ❌ Navigation section missing: ${section}`);
      allTestsPassed = false;
    }
  });
  
  // Check if it links to other guides
  const linkedGuides = ['Quick Fixes', 'FAQ', 'Troubleshooting Guide', 'Support Guide'];
  linkedGuides.forEach(guide => {
    if (helpContent.includes(guide)) {
      console.log(`  ✅ Links to: ${guide}`);
    } else {
      console.log(`  ❌ Missing link to: ${guide}`);
      allTestsPassed = false;
    }
  });
} else {
  console.log('  ❌ Help Center missing');
  allTestsPassed = false;
}

// Test 8: Check for contact information
console.log('\n📞 Test 8: Checking contact information...');
const contactFiles = [
  'VIDEO_CALL_TROUBLESHOOTING_GUIDE.md',
  'VIDEO_CALL_QUICK_FIXES.md',
  'VIDEO_CALL_FAQ.md',
  'VIDEO_CALL_SUPPORT_GUIDE.md'
];

contactFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('support@smilingsteps.com')) {
      console.log(`  ✅ ${file} has contact info`);
    } else {
      console.log(`  ❌ ${file} missing contact info`);
      allTestsPassed = false;
    }
  }
});

// Test 9: Check for browser compatibility information
console.log('\n🌐 Test 9: Checking browser compatibility info...');
const browserFiles = [
  'VIDEO_CALL_TROUBLESHOOTING_GUIDE.md',
  'VIDEO_CALL_FAQ.md'
];

browserFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
    let hasBrowserInfo = browsers.some(browser => content.includes(browser));
    
    if (hasBrowserInfo) {
      console.log(`  ✅ ${file} has browser compatibility info`);
    } else {
      console.log(`  ❌ ${file} missing browser compatibility info`);
      allTestsPassed = false;
    }
  }
});

// Final Results
console.log('\n' + '='.repeat(50));
if (allTestsPassed) {
  console.log('🎉 ALL TESTS PASSED!');
  console.log('✅ Troubleshooting guides are complete and comprehensive');
  console.log('✅ All required files exist');
  console.log('✅ Content covers all major issue categories');
  console.log('✅ React components are properly implemented');
  console.log('✅ Navigation and contact information is present');
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('Please review the failed tests above and update the guides accordingly.');
}

console.log('\n📋 Summary of Troubleshooting Resources:');
console.log('• VIDEO_CALL_HELP_CENTER.md - Main navigation hub');
console.log('• VIDEO_CALL_QUICK_FIXES.md - 30-second emergency solutions');
console.log('• VIDEO_CALL_FAQ.md - Common questions and answers');
console.log('• VIDEO_CALL_TROUBLESHOOTING_GUIDE.md - Comprehensive problem solving');
console.log('• VIDEO_CALL_SUPPORT_GUIDE.md - Technical guide for support staff');
console.log('• TroubleshootingGuide.js - Interactive React component');
console.log('• QuickHelpPanel.js - In-call help widget');

console.log('\n🎯 Next Steps:');
console.log('1. Review any failed tests and update documentation');
console.log('2. Test the React components in the video call interface');
console.log('3. Train support staff using the support guide');
console.log('4. Share the help center link with users');
console.log('5. Monitor support tickets to identify missing content');

process.exit(allTestsPassed ? 0 : 1);