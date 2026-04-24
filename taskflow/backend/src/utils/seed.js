require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const seed = async () => {
  console.log('Seeding demo data...');

  // Org 1
  const org1Id = uuidv4();
  await query(
    `INSERT INTO organizations (id, name, slug, description) VALUES ($1, $2, $3, $4)
     ON CONFLICT (slug) DO NOTHING`,
    [org1Id, 'Acme Corp', 'acme-corp', 'A leading tech company']
  );

  // Org 2
  const org2Id = uuidv4();
  await query(
    `INSERT INTO organizations (id, name, slug, description) VALUES ($1, $2, $3, $4)
     ON CONFLICT (slug) DO NOTHING`,
    [org2Id, 'Globex Inc', 'globex-inc', 'Innovation at scale']
  );

  const hash = await bcrypt.hash('password123', 12);

  // Org1 Admin
  const admin1Id = uuidv4();
  await query(
    `INSERT INTO users (id, organization_id, email, name, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, 'admin') ON CONFLICT (email) DO NOTHING`,
    [admin1Id, org1Id, 'admin@acme.com', 'Alice Admin', hash]
  );

  // Org1 Member
  const member1Id = uuidv4();
  await query(
    `INSERT INTO users (id, organization_id, email, name, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, 'member') ON CONFLICT (email) DO NOTHING`,
    [member1Id, org1Id, 'bob@acme.com', 'Bob Member', hash]
  );

  // Org2 Admin
  const admin2Id = uuidv4();
  await query(
    `INSERT INTO users (id, organization_id, email, name, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, 'admin') ON CONFLICT (email) DO NOTHING`,
    [admin2Id, org2Id, 'admin@globex.com', 'Carol Admin', hash]
  );

  // Tasks for Org1
  const statuses = ['todo', 'in_progress', 'review', 'done'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const taskTitles = [
    'Design new landing page', 'Fix login bug', 'Write API documentation',
    'Set up CI/CD pipeline', 'Conduct security audit', 'Optimize database queries',
    'Create onboarding flow', 'Implement dark mode',
  ];

  for (let i = 0; i < taskTitles.length; i++) {
    const taskId = uuidv4();
    const createdBy = i % 2 === 0 ? admin1Id : member1Id;
    await query(
      `INSERT INTO tasks (id, organization_id, created_by, assigned_to, title, description, status, priority, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
      [
        taskId, org1Id, createdBy,
        i % 3 === 0 ? member1Id : admin1Id,
        taskTitles[i],
        `Detailed description for: ${taskTitles[i]}`,
        statuses[i % 4], priorities[i % 4],
        [`tag-${i % 3}`, 'demo'],
      ]
    );
    await query(
      `INSERT INTO task_audit_logs (task_id, organization_id, user_id, action, changes)
       VALUES ($1, $2, $3, 'created', $4)`,
      [taskId, org1Id, createdBy, JSON.stringify({ title: taskTitles[i] })]
    );
  }

  console.log('\nDemo credentials:');
  console.log('  Org: Acme Corp');
  console.log('  Admin  → admin@acme.com  / password123');
  console.log('  Member → bob@acme.com    / password123');
  console.log('\n  Org: Globex Inc');
  console.log('  Admin  → admin@globex.com / password123');
  console.log('\nSeed complete ✓');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
