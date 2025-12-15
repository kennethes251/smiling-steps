const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://smiling_steps_db_user:Ry0Ry0Ry0Ry0Ry0Ry0Ry0Ry0Ry0Ry0@dpg-ct5bnhm8ii6s73a5rvfg-a.oregon-postgres.render.com/smiling_steps_db', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

async function checkSessions() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Check all sessions
    const [sessions] = await sequelize.query(`
      SELECT 
        s.id,
        s.status,
        s."paymentStatus",
        s."sessionType",
        s."sessionDate",
        s.price,
        c.name as client_name,
        c.email as client_email,
        p.name as psychologist_name,
        p.email as psychologist_email
      FROM "Sessions" s
      LEFT JOIN "Users" c ON s."clientId" = c.id
      LEFT JOIN "Users" p ON s."psychologistId" = p.id
      ORDER BY s."createdAt" DESC
      LIMIT 10
    `);

    console.log(`📊 Found ${sessions.length} recent sessions:\n`);
    
    sessions.forEach((session, index) => {
      console.log(`${index + 1}. Session ID: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Payment Status: ${session.paymentStatus || 'N/A'}`);
      console.log(`   Type: ${session.sessionType}`);
      console.log(`   Date: ${new Date(session.sessionDate).toLocaleString()}`);
      console.log(`   Price: KES ${session.price || 0}`);
      console.log(`   Client: ${session.client_name} (${session.client_email})`);
      console.log(`   Psychologist: ${session.psychologist_name} (${session.psychologist_email})`);
      console.log('');
    });

    // Count by status
    const [statusCounts] = await sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM "Sessions"
      GROUP BY status
      ORDER BY count DESC
    `);

    console.log('\n📈 Sessions by Status:');
    statusCounts.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
    });

    // Check users
    const [users] = await sequelize.query(`
      SELECT id, name, email, role
      FROM "Users"
      WHERE role IN ('client', 'psychologist')
      ORDER BY role, name
    `);

    console.log(`\n👥 Found ${users.length} users:\n`);
    
    const clients = users.filter(u => u.role === 'client');
    const psychologists = users.filter(u => u.role === 'psychologist');
    
    console.log(`Clients (${clients.length}):`);
    clients.forEach(u => console.log(`   - ${u.name} (${u.email})`));
    
    console.log(`\nPsychologists (${psychologists.length}):`);
    psychologists.forEach(u => console.log(`   - ${u.name} (${u.email})`));

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSessions();
