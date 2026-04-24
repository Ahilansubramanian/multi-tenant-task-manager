const passport = require('passport');
require('../config/passport');

// Require authenticated user
const authenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  })(req, res, next);
};

// Require admin role within the organization
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Tenant isolation — ensures org_id in param/body matches user's org
const tenantIsolation = (req, res, next) => {
  const orgId = req.params.orgId || req.body.organization_id;
  if (orgId && orgId !== req.user.organization_id) {
    return res.status(403).json({ error: 'Access denied: cross-tenant operation' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, tenantIsolation };
