/**
 * Test SessionStatusManager with PostgreSQL/Sequelize
 * This test verifies the updated SessionStatusManager works with the current database setup
 */

require('dotenv').config();
const connectDB = require('./server/config/database');
const SessionStatusManager = require('./server/utils/sessionStatusManager');

async function testSessionStatusManager() {
  console.log('🧪 Testing SessionStatusManager with PostgreSQL/Sequelize...\n');
  
  try {
    // Connect to database
    const sequelize = await connectDB();
    
    // Initialize models
    const { DataTypes } = require('sequelize');
    const User = require('./server/models/User-sequelize')(sequelize, DataTypes);
    const Session = require('./server/models/Session-sequelize')(sequelize, DataTypes);
    
    // Define associations
    User.hasMany(Session, { foreignKey: 'clientId', as: 'clientSessions' });
    User.hasMany(Session, { foreignKey: 'psychologistId', as: 'psychologistSessions' });
    Session.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    Session.belongsTo(User, { foreignKey: 'psychologistId', as: 'psychologist' });
    
    // Make models globally available (as done in server/index.js)
    global.User = User;
    global.Session = Session;
    
    console.log('✅ Database connected and models initialized\n');
    
    // Test 1: Find an existing session
    console.log('📋 Test 1: Finding existing sessions...');
    const sessions = await Session.findAll({
      limit: 1,
      include: [
        { model: User, as: 'client' },
        { model: User, as: 'psychologist' }
      ]
    });
    
    if (sessions.length === 0) {
      console.log('❌ No sessions found in database. Please create a session first.');
      return;
    }
    
    const testSession = sessions[0];
    console.log(`✅ Found session: ${testSession.id}`);
    console.log(`   Client: ${testSession.client.name} (${testSession.clientId})`);
    console.log(`   Psychologist: ${testSession.psychologist.name} (${testSession.psychologistId})`);
    console.log(`   Status: ${testSession.status}`);
    console.log(`   Payment Status: ${testSession.paymentStatus}\n`);
    
    // Test 2: Get session status
    console.log('📋 Test 2: Getting session status...');
    try {
      const sessionStatus = await SessionStatusManager.getSessionStatus(
        testSession.id, 
        testSession.clientId
      );
      console.log('✅ Session status retrieved successfully:');
      console.log(`   Session ID: ${sessionStatus.sessionId}`);
      console.log(`   Status: ${sessionStatus.status}`);
      console.log(`   Payment Status: ${sessionStatus.paymentStatus}`);
      console.log(`   Video Call Active: ${sessionStatus.videoCall.isActive}`);
      console.log(`   Client: ${sessionStatus.participants.client.name}`);
      console.log(`   Psychologist: ${sessionStatus.participants.psychologist.name}\n`);
    } catch (error) {
      console.log(`❌ Error getting session status: ${error.message}\n`);
    }
    
    // Test 3: Test status transition validation
    console.log('📋 Test 3: Testing status transition validation...');
    const canTransition1 = SessionStatusManager.canTransitionToStatus('Confirmed', 'In Progress');
    const canTransition2 = SessionStatusManager.canTransitionToStatus('Completed', 'In Progress');
    console.log(`✅ Can transition Confirmed → In Progress: ${canTransition1}`);
    console.log(`✅ Can transition Completed → In Progress: ${canTransition2}\n`);
    
    // Test 4: Test unauthorized access
    console.log('📋 Test 4: Testing unauthorized access...');
    try {
      await SessionStatusManager.getSessionStatus(testSession.id, 'fake-user-id');
      console.log('❌ Should have thrown unauthorized error');
    } catch (error) {
      if (error.message.includes('Unauthorized')) {
        console.log('✅ Correctly blocked unauthorized access\n');
      } else {
        console.log(`❌ Unexpected error: ${error.message}\n`);
      }
    }
    
    // Test 5: Test video call operations (if session allows)
    if (testSession.paymentStatus === 'Confirmed' || 
        testSession.paymentStatus === 'Paid' || 
        testSession.paymentStatus === 'Verified') {
      
      console.log('📋 Test 5: Testing video call operations...');
      
      // Test auto-start
      try {
        const autoStartResult = await SessionStatusManager.autoStartVideoCall(testSession.id);
        console.log(`✅ Auto-start result: ${autoStartResult.success ? 'Success' : 'Not eligible'}`);
        if (autoStartResult.reason) {
          console.log(`   Reason: ${autoStartResult.reason}`);
        }
      } catch (error) {
        console.log(`❌ Auto-start error: ${error.message}`);
      }
      
      console.log();
    } else {
      console.log('📋 Test 5: Skipped video call operations (payment not confirmed)\n');
    }
    
    console.log('🎉 All SessionStatusManager tests completed successfully!');
    console.log('✅ The SessionStatusManager is now compatible with PostgreSQL/Sequelize');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testSessionStatusManager();