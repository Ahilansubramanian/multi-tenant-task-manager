const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('./database');
const { v4: uuidv4 } = require('uuid');

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'fallback_secret',
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      const result = await query(
        'SELECT u.*, o.name as org_name, o.slug as org_slug FROM users u JOIN organizations o ON u.organization_id = o.id WHERE u.id = $1 AND u.is_active = true',
        [payload.userId]
      );
      if (result.rows.length === 0) return done(null, false);
      return done(null, result.rows[0]);
    } catch (err) {
      return done(err, false);
    }
  })
);

// Google OAuth Strategy (only if credentials provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const existingUser = await query(
            'SELECT u.*, o.name as org_name, o.slug as org_slug FROM users u JOIN organizations o ON u.organization_id = o.id WHERE u.email = $1',
            [email]
          );

          if (existingUser.rows.length > 0) {
            // Update google_id if not set
            if (!existingUser.rows[0].google_id) {
              await query('UPDATE users SET google_id = $1 WHERE email = $2', [
                profile.id,
                email,
              ]);
            }
            return done(null, existingUser.rows[0]);
          }

          // New Google user — create a personal org + user
          const orgId = uuidv4();
          const orgSlug = email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-' + Date.now();
          await query(
            'INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3)',
            [orgId, `${profile.displayName}'s Workspace`, orgSlug]
          );

          const userId = uuidv4();
          const newUser = await query(
            `INSERT INTO users (id, organization_id, email, name, google_id, role, is_active)
             VALUES ($1, $2, $3, $4, $5, 'admin', true) RETURNING *`,
            [userId, orgId, email, profile.displayName, profile.id]
          );

          const userWithOrg = {
            ...newUser.rows[0],
            org_name: `${profile.displayName}'s Workspace`,
            org_slug: orgSlug,
          };
          return done(null, userWithOrg);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

module.exports = passport;
