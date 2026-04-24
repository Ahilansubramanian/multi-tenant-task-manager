require('dotenv').config();
const { query } = require('../config/database');

const migrate = async () => {
  console.log('Running migrations...');

  await query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255),
      google_id VARCHAR(255),
      role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
      is_active BOOLEAN NOT NULL DEFAULT true,
      avatar_url VARCHAR(500),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
      priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      due_date TIMESTAMP WITH TIME ZONE,
      tags TEXT[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS task_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      changes JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Indexes for performance
  await query(`CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_task ON task_audit_logs(task_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_org ON task_audit_logs(organization_id);`);

  // Updated_at trigger function
  await query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ language 'plpgsql';
  `);

  for (const table of ['organizations', 'users', 'tasks']) {
    await query(`
      DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
      CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  console.log('Migrations complete ✓');
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
