const router = require('express').Router();
const passport = require('passport');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('orgName').trim().notEmpty().withMessage('Organization name required'),
  ],
  validate,
  ctrl.register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  ctrl.login
);

router.post('/refresh', ctrl.refreshToken);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  ctrl.googleCallback
);

module.exports = router;
