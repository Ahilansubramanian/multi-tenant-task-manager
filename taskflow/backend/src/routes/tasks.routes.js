const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/tasks.controller');

router.use(authenticate);

router.get('/stats', ctrl.getStats);
router.get('/', ctrl.getTasks);
router.get('/:id', ctrl.getTask);

router.post('/',
  [
    body('title').trim().notEmpty().withMessage('Title required'),
    body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  ],
  validate,
  ctrl.createTask
);

router.put('/:id',
  [
    body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  ],
  validate,
  ctrl.updateTask
);

router.delete('/:id', ctrl.deleteTask);

module.exports = router;
