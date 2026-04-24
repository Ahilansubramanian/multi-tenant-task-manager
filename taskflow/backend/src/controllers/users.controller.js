const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

// GET /api/users — list org members (admin only)
const getOrgMembers = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, name, role, is_active, avatar_url, created_at
       FROM users WHERE organization_id = $1 ORDER BY created_at ASC`,
      [req.user.organization_id]
    );
    res.json({ members: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/users/invite — admin invites a new member
const inviteMember = async (req, res) => {
  try {
    const { email, name, role = 'member' } = req.body;
    const orgId = req.user.organization_id;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

    // Create user with a temporary password they should change
    const tempPassword = Math.random().toString(36).slice(-10);
    const hash = await bcrypt.hash(tempPassword, 12);
    const id = uuidv4();

    const result = await query(
      `INSERT INTO users (id, organization_id, email, name, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, email, name, role`,
      [id, orgId, email, name, hash, role]
    );

    res.status(201).json({
      member: result.rows[0],
      tempPassword, // In production, send via email
      message: 'Member invited. Share the temporary password securely.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/users/:id/role — admin changes a member's role
const updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    const orgId = req.user.organization_id;

    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const result = await query(
      `UPDATE users SET role = $1 WHERE id = $2 AND organization_id = $3 RETURNING id, email, name, role`,
      [role, req.params.id, orgId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Member not found' });
    res.json({ member: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/users/:id — admin removes a member
const removeMember = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }
    const result = await query(
      'UPDATE users SET is_active = false WHERE id = $1 AND organization_id = $2 RETURNING id',
      [req.params.id, orgId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Member not found' });
    res.json({ message: 'Member deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PATCH /api/users/me — update own profile
const updateProfile = async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
    }

    const hash = newPassword ? await bcrypt.hash(newPassword, 12) : undefined;
    const result = await query(
      `UPDATE users SET
        name = COALESCE($1, name),
        password_hash = COALESCE($2, password_hash)
       WHERE id = $3 RETURNING id, email, name, role, organization_id`,
      [name || null, hash || null, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/org — get organization details
const getOrg = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, slug, description, created_at FROM organizations WHERE id = $1',
      [req.user.organization_id]
    );
    res.json({ organization: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getOrgMembers, inviteMember, updateMemberRole, removeMember, updateProfile, getOrg };
