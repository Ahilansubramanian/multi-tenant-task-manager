const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const logAudit = async (taskId, orgId, userId, action, changes) => {
  await query(
    'INSERT INTO task_audit_logs (id, task_id, organization_id, user_id, action, changes) VALUES ($1,$2,$3,$4,$5,$6)',
    [uuidv4(), taskId, orgId, userId, action, JSON.stringify(changes)]
  );
};

// GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const { status, priority, assigned_to, search, page = 1, limit = 20 } = req.query;
    const orgId = req.user.organization_id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ['t.organization_id = $1'];
    let params = [orgId];
    let idx = 2;

    // Members can only see their own tasks or tasks assigned to them
    if (req.user.role === 'member') {
      conditions.push(`(t.created_by = $${idx} OR t.assigned_to = $${idx})`);
      params.push(req.user.id); idx++;
    }

    if (status) { conditions.push(`t.status = $${idx}`); params.push(status); idx++; }
    if (priority) { conditions.push(`t.priority = $${idx}`); params.push(priority); idx++; }
    if (assigned_to) { conditions.push(`t.assigned_to = $${idx}`); params.push(assigned_to); idx++; }
    if (search) {
      conditions.push(`(t.title ILIKE $${idx} OR t.description ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }

    const where = conditions.join(' AND ');

    const [tasksResult, countResult] = await Promise.all([
      query(
        `SELECT t.*,
          json_build_object('id', cb.id, 'name', cb.name, 'email', cb.email) as creator,
          CASE WHEN t.assigned_to IS NOT NULL
            THEN json_build_object('id', ab.id, 'name', ab.name, 'email', ab.email)
            ELSE NULL END as assignee
         FROM tasks t
         LEFT JOIN users cb ON t.created_by = cb.id
         LEFT JOIN users ab ON t.assigned_to = ab.id
         WHERE ${where}
         ORDER BY t.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      query(`SELECT COUNT(*) FROM tasks t WHERE ${where}`, params),
    ]);

    res.json({
      tasks: tasksResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('GetTasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/tasks/:id
const getTask = async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*,
        json_build_object('id', cb.id, 'name', cb.name, 'email', cb.email) as creator,
        CASE WHEN t.assigned_to IS NOT NULL
          THEN json_build_object('id', ab.id, 'name', ab.name, 'email', ab.email)
          ELSE NULL END as assignee
       FROM tasks t
       LEFT JOIN users cb ON t.created_by = cb.id
       LEFT JOIN users ab ON t.assigned_to = ab.id
       WHERE t.id = $1 AND t.organization_id = $2`,
      [req.params.id, req.user.organization_id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Task not found' });

    const task = result.rows[0];
    // Members can only view tasks they created or are assigned to
    if (req.user.role === 'member' &&
        task.created_by !== req.user.id &&
        task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch audit logs
    const logs = await query(
      `SELECT al.*, u.name as user_name FROM task_audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.task_id = $1 ORDER BY al.created_at DESC LIMIT 50`,
      [req.params.id]
    );

    res.json({ task, auditLogs: logs.rows });
  } catch (err) {
    console.error('GetTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, description, status = 'todo', priority = 'medium', assigned_to, due_date, tags } = req.body;
    const orgId = req.user.organization_id;

    // Validate assignee belongs to same org
    if (assigned_to) {
      const assigneeCheck = await query(
        'SELECT id FROM users WHERE id = $1 AND organization_id = $2',
        [assigned_to, orgId]
      );
      if (!assigneeCheck.rows[0]) return res.status(400).json({ error: 'Invalid assignee' });
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO tasks (id, organization_id, created_by, assigned_to, title, description, status, priority, due_date, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, orgId, req.user.id, assigned_to || null, title, description || null, status, priority,
       due_date || null, tags || []]
    );

    await logAudit(id, orgId, req.user.id, 'created', { title, status, priority });
    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    console.error('CreateTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const taskResult = await query(
      'SELECT * FROM tasks WHERE id = $1 AND organization_id = $2',
      [req.params.id, orgId]
    );
    if (!taskResult.rows[0]) return res.status(404).json({ error: 'Task not found' });

    const task = taskResult.rows[0];
    // Members can only update tasks they created
    if (req.user.role === 'member' && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only update tasks you created' });
    }

    const { title, description, status, priority, assigned_to, due_date, tags } = req.body;

    if (assigned_to) {
      const check = await query('SELECT id FROM users WHERE id = $1 AND organization_id = $2', [assigned_to, orgId]);
      if (!check.rows[0]) return res.status(400).json({ error: 'Invalid assignee' });
    }

    const changes = {};
    const fields = { title, description, status, priority, assigned_to, due_date, tags };
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== task[k]) changes[k] = { from: task[k], to: v };
    });

    const updated = await query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        assigned_to = CASE WHEN $5::uuid IS NOT NULL THEN $5::uuid ELSE assigned_to END,
        due_date = COALESCE($6, due_date),
        tags = COALESCE($7, tags)
       WHERE id = $8 AND organization_id = $9 RETURNING *`,
      [title, description, status, priority, assigned_to || null, due_date, tags, req.params.id, orgId]
    );

    if (Object.keys(changes).length > 0) {
      await logAudit(req.params.id, orgId, req.user.id, 'updated', changes);
    }

    res.json({ task: updated.rows[0] });
  } catch (err) {
    console.error('UpdateTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const taskResult = await query(
      'SELECT * FROM tasks WHERE id = $1 AND organization_id = $2',
      [req.params.id, orgId]
    );
    if (!taskResult.rows[0]) return res.status(404).json({ error: 'Task not found' });

    const task = taskResult.rows[0];
    // Only admins or the task creator can delete
    if (req.user.role === 'member' && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete tasks you created' });
    }

    await logAudit(req.params.id, orgId, req.user.id, 'deleted', { title: task.title });
    await query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('DeleteTask error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/tasks/stats
const getStats = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const [statusStats, priorityStats, memberStats] = await Promise.all([
      query(`SELECT status, COUNT(*) as count FROM tasks WHERE organization_id = $1 GROUP BY status`, [orgId]),
      query(`SELECT priority, COUNT(*) as count FROM tasks WHERE organization_id = $1 GROUP BY priority`, [orgId]),
      query(
        `SELECT u.name, u.email, COUNT(t.id) as task_count
         FROM users u LEFT JOIN tasks t ON t.assigned_to = u.id AND t.organization_id = $1
         WHERE u.organization_id = $1 GROUP BY u.id ORDER BY task_count DESC LIMIT 5`,
        [orgId]
      ),
    ]);
    res.json({
      byStatus: statusStats.rows,
      byPriority: priorityStats.rows,
      topMembers: memberStats.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, getStats };
