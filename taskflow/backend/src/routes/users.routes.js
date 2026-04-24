const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/users.controller');

router.use(authenticate);

router.get('/org', ctrl.getOrg);
router.get('/', requireAdmin, ctrl.getOrgMembers);
router.post('/invite', requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().notEmpty(),
  body('role').optional().isIn(['admin', 'member']),
], validate, ctrl.inviteMember);
router.patch('/me', ctrl.updateProfile);
router.patch('/:id/role', requireAdmin, [
  body('role').isIn(['admin', 'member']),
], validate, ctrl.updateMemberRole);
router.delete('/:id', requireAdmin, ctrl.removeMember);

module.exports = router;
