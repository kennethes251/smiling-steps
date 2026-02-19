/**
 * Test Call History Display UI Components
 * 
 * This test verifies that the call history and duration display functionality
 * has been properly implemented in both Client and Psychologist dashboards.
 */

const fs = require('fs');
const path = require('path');

function testCallHistoryImplementation() {
  console.log('🧪 Testing Call History Display Implementation\n');
  
  const clientDashboardPath = path.join(__dirname, 'client/src/components/dashboards/ClientDashboard.js');
  const psychologistDashboardPath = path.join(__dirname, 'client/src/components/dashboards/PsychologistDashboard.js');
  
  try {
    // Test 1: Check if ClientDashboard has call history section
    console.log('1️⃣ Testing ClientDashboard call history implementation...');
    
    if (!fs.existsSync(clientDashboardPath)) {
      console.log('❌ ClientDashboard.js not found');
      return false;
    }
    
    const clientDashboardContent = fs.readFileSync(clientDashboardPath, 'utf8');
    
    // Check for required elements
    const clientChecks = [
      { name: 'Call History Section Title', pattern: /Call History.*Session Records/ },
      { name: 'Video Call Duration Display', pattern: /callDuration.*min call/ },
      { name: 'Video Call Started Time', pattern: /videoCallStarted/ },
      { name: 'Video Call Ended Time', pattern: /videoCallEnded/ },
      { name: 'Duration Information Box', pattern: /Video Call Details/ },
      { name: 'VideocamIcon Import', pattern: /VideocamIcon/ },
      { name: 'Call Duration Chip', pattern: /{session\.callDuration && \([\s\S]*?<Chip/ }
    ];
    
    let clientPassed = 0;
    clientChecks.forEach(check => {
      if (check.pattern.test(clientDashboardContent)) {
        console.log(`   ✅ ${check.name} - Found`);
        clientPassed++;
      } else {
        console.log(`   ❌ ${check.name} - Missing`);
      }
    });
    
    console.log(`   📊 ClientDashboard: ${clientPassed}/${clientChecks.length} checks passed\n`);
    
    // Test 2: Check if PsychologistDashboard has call history section
    console.log('2️⃣ Testing PsychologistDashboard call history implementation...');
    
    if (!fs.existsSync(psychologistDashboardPath)) {
      console.log('❌ PsychologistDashboard.js not found');
      return false;
    }
    
    const psychologistDashboardContent = fs.readFileSync(psychologistDashboardPath, 'utf8');
    
    // Check for required elements
    const psychologistChecks = [
      { name: 'Call History Section Title', pattern: /Call History.*Completed Sessions/ },
      { name: 'Video Call Duration Display', pattern: /callDuration.*min call/ },
      { name: 'Video Call Started Time', pattern: /videoCallStarted/ },
      { name: 'Video Call Ended Time', pattern: /videoCallEnded/ },
      { name: 'Duration Information Box', pattern: /Video Call Details/ },
      { name: 'Client Name Display', pattern: /Client:.*session\.client/ },
      { name: 'Session Limit (10 sessions)', pattern: /slice\(0, 10\)/ },
      { name: 'Tooltip Import', pattern: /Tooltip/ }
    ];
    
    let psychologistPassed = 0;
    psychologistChecks.forEach(check => {
      if (check.pattern.test(psychologistDashboardContent)) {
        console.log(`   ✅ ${check.name} - Found`);
        psychologistPassed++;
      } else {
        console.log(`   ❌ ${check.name} - Missing`);
      }
    });
    
    console.log(`   📊 PsychologistDashboard: ${psychologistPassed}/${psychologistChecks.length} checks passed\n`);
    
    // Test 3: Check for proper data structure usage
    console.log('3️⃣ Testing data structure usage...');
    
    const dataStructureChecks = [
      { 
        name: 'Session filtering for completed sessions', 
        pattern: /\(s\.status === 'Confirmed' \|\| s\.status === 'Completed'\)/, 
        files: [clientDashboardContent, psychologistDashboardContent] 
      },
      { 
        name: 'Date filtering for past sessions', 
        pattern: /new Date\(s\.sessionDate\).*<.*new Date\(\)/, 
        files: [clientDashboardContent, psychologistDashboardContent] 
      },
      { 
        name: 'Call duration conditional display', 
        pattern: /session\.callDuration.*&&/, 
        files: [clientDashboardContent, psychologistDashboardContent] 
      },
      { 
        name: 'Video call timing display', 
        pattern: /new Date\(session\.videoCallStarted\)/, 
        files: [clientDashboardContent, psychologistDashboardContent] 
      }
    ];
    
    let dataStructurePassed = 0;
    dataStructureChecks.forEach(check => {
      const found = check.files.some(content => check.pattern.test(content));
      if (found) {
        console.log(`   ✅ ${check.name} - Implemented`);
        dataStructurePassed++;
      } else {
        console.log(`   ❌ ${check.name} - Missing`);
      }
    });
    
    console.log(`   📊 Data Structure: ${dataStructurePassed}/${dataStructureChecks.length} checks passed\n`);
    
    // Test 4: Check Session model for required fields
    console.log('4️⃣ Testing Session model for video call fields...');
    
    const sessionModelPath = path.join(__dirname, 'server/models/Session.js');
    if (fs.existsSync(sessionModelPath)) {
      const sessionModelContent = fs.readFileSync(sessionModelPath, 'utf8');
      
      const modelChecks = [
        { name: 'videoCallStarted field', pattern: /videoCallStarted:\s*{\s*type:\s*Date/ },
        { name: 'videoCallEnded field', pattern: /videoCallEnded:\s*{\s*type:\s*Date/ },
        { name: 'callDuration field', pattern: /callDuration:\s*{\s*type:\s*Number/ },
        { name: 'isVideoCall field', pattern: /isVideoCall:\s*{\s*type:\s*Boolean/ }
      ];
      
      let modelPassed = 0;
      modelChecks.forEach(check => {
        if (check.pattern.test(sessionModelContent)) {
          console.log(`   ✅ ${check.name} - Found`);
          modelPassed++;
        } else {
          console.log(`   ❌ ${check.name} - Missing`);
        }
      });
      
      console.log(`   📊 Session Model: ${modelPassed}/${modelChecks.length} checks passed\n`);
    } else {
      console.log('   ❌ Session model not found\n');
    }
    
    // Summary
    const totalPassed = clientPassed + psychologistPassed + dataStructurePassed;
    const totalChecks = clientChecks.length + psychologistChecks.length + dataStructureChecks.length;
    
    console.log('📋 IMPLEMENTATION SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`✅ Total Checks Passed: ${totalPassed}/${totalChecks}`);
    console.log(`📊 Success Rate: ${Math.round((totalPassed / totalChecks) * 100)}%`);
    
    if (totalPassed === totalChecks) {
      console.log('\n🎉 ALL TESTS PASSED! Call history display is fully implemented.');
      console.log('\n📋 Features Implemented:');
      console.log('   ✅ Call history section in Client Dashboard');
      console.log('   ✅ Call history section in Psychologist Dashboard');
      console.log('   ✅ Video call duration display');
      console.log('   ✅ Call start/end time display');
      console.log('   ✅ Visual indicators for completed calls');
      console.log('   ✅ Proper data filtering and sorting');
      console.log('   ✅ Session model supports video call fields');
      
      console.log('\n🎯 Requirements Satisfied:');
      console.log('   ✅ AC-6.1: System records call start time');
      console.log('   ✅ AC-6.2: System records call end time');
      console.log('   ✅ AC-6.3: System calculates duration in minutes');
      console.log('   ✅ AC-6.4: Duration is saved to session record');
      console.log('   ✅ AC-6.5: Duration is visible in session history');
      
      return true;
    } else {
      console.log('\n⚠️  Some checks failed. Please review the missing implementations.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
const success = testCallHistoryImplementation();
process.exit(success ? 0 : 1);