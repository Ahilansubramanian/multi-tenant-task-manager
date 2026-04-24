const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const generateTokens = (userId) => {
  const access = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refresh = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { access, refresh };
};

const storeRefreshToken = async (userId, token) => {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [uuidv4(), userId, hash, expires]
  );
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, orgName } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const orgId = uuidv4();
    await query(
      'INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3)',
      [orgId, orgName, orgSlug]
    );

    const hash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const user = await query(
      `INSERT INTO users (id, organization_id, email, name, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'admin') RETURNING id, email, name, role, organization_id`,
      [userId, orgId, email, name, hash]
    );

    const { access, refresh } = generateTokens(userId);
    await storeRefreshToken(userId, refresh);

    res.status(201).json({
      user: { ...user.rows[0], org_name: orgName, org_slug: orgSlug },
      accessToken: access,
      refreshToken: refresh,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT u.*, o.name as org_name, o.slug as org_slug
       FROM users u JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    const user = result.rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { access, refresh } = generateTokens(user.id);
    await storeRefreshToken(user.id, refresh);

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, accessToken: access, refreshToken: refresh });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/auth/refresh
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ error: 'Refresh token required' });

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const stored = await query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW()',
      [payload.userId, hash]
    );
    if (stored.rows.length === 0) return res.status(401).json({ error: 'Invalid refresh token' });

    const { access, refresh: newRefresh } = generateTokens(payload.userId);
    await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
    await storeRefreshToken(payload.userId, newRefresh);

    res.json({ accessToken: access, refreshToken: newRefresh });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (token) {
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  res.json({ user: safeUser });
};

// Google OAuth callback
const googleCallback = (req, res) => {
  const { access, refresh } = generateTokens(req.user.id);
  storeRefreshToken(req.user.id, refresh);
  const params = new URLSearchParams({ accessToken: access, refreshToken: refresh });
  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?${params}`);
};

module.exports = { register, login, refreshToken, logout, me, googleCallback };
