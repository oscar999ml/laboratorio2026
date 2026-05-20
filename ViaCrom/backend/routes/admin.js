const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const router = express.Router();

const ROLES_VALIDOS = ['super_admin', 'sistema', 'admin_regional', 'moderador', 'verificador', 'premium', 'usuario', 'observador'];

// All admin routes require at least moderador
router.use(authMiddleware, requireRole('moderador'));

// GET /api/admin/dashboard
router.get('/dashboard', requireRole('admin_regional'), (req, res) => {
  const db = req.db;

  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const activeUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE last_active > datetime('now', '-1 hour')").get().c;
  const activeReports = db.prepare("SELECT COUNT(*) as c FROM reports WHERE status IN ('active','confirmed') AND is_hidden = 0").get().c;
  const reportsToday = db.prepare("SELECT COUNT(*) as c FROM reports WHERE created_at > datetime('now', '-24 hours')").get().c;
  const totalConfirmations = db.prepare('SELECT SUM(total_confirmations) as c FROM users').get().c || 0;
  const avgReputation = db.prepare('SELECT AVG(reputation_score) as avg FROM users WHERE role = ?').get('usuario')?.avg || 0;

  // Reports by type
  const byType = db.prepare(
    "SELECT type, COUNT(*) as count FROM reports WHERE status IN ('active','confirmed') GROUP BY type ORDER BY count DESC"
  ).all();

  // Reports by city (top 10)
  const byCiudad = db.prepare(`
    SELECT u.ciudad, COUNT(*) as count FROM reports r
    JOIN users u ON u.id = r.user_id
    WHERE r.status IN ('active','confirmed') AND u.ciudad IS NOT NULL AND u.ciudad != ''
    GROUP BY u.ciudad ORDER BY count DESC LIMIT 10
  `).all();

  res.json({
    total_users: totalUsers,
    users_online: activeUsers,
    active_reports: activeReports,
    reports_today: reportsToday,
    total_confirmations: totalConfirmations,
    avg_reputation: Math.round(avgReputation * 100) / 100,
    reports_by_type: byType,
    reports_by_ciudad: byCiudad
  });
});

// GET /api/admin/users
router.get('/users', requireRole('admin_regional'), (req, res) => {
  const db = req.db;
  const { search, role, page = 1, limit = 50 } = req.query;
  let query = 'SELECT id, alias, nombres, apellidos, phone, email, role, pais, ciudad, reputation_score, is_active, is_banned, total_reports, total_confirmations, created_at, last_active FROM users WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (alias LIKE ? OR nombres LIKE ? OR apellidos LIKE ? OR phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (role && ROLES_VALIDOS.includes(role)) {
    query += ' AND role = ?';
    params.push(role);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const users = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM users').get().c;

  res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', requireRole('super_admin'), (req, res) => {
  const { role } = req.body;
  if (!role || !ROLES_VALIDOS.includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }

  const db = req.db;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  logEvent(db, req.user.id, 'change_role', { target: req.params.id, new_role: role });

  res.json({ message: 'Rol actualizado' });
});

// POST /api/admin/users/:id/ban
router.post('/users/:id/ban', requireRole('super_admin'), (req, res) => {
  const { reason } = req.body;
  const db = req.db;

  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (target.role === 'super_admin') return res.status(403).json({ error: 'No puedes banear a un Super Admin' });

  db.prepare('UPDATE users SET is_banned = 1, ban_reason = ? WHERE id = ?').run(reason || 'Sin motivo', req.params.id);
  logEvent(db, req.user.id, 'ban_user', { target: req.params.id, reason });

  res.json({ message: 'Usuario suspendido' });
});

// POST /api/admin/users/:id/unban
router.post('/users/:id/unban', requireRole('super_admin'), (req, res) => {
  const db = req.db;
  db.prepare('UPDATE users SET is_banned = 0, ban_reason = NULL WHERE id = ?').run(req.params.id);
  res.json({ message: 'Usuario rehabilitado' });
});

// GET /api/admin/reports
router.get('/reports', (req, res) => {
  const db = req.db;
  const { status, type, page = 1, limit = 50 } = req.query;

  let query = 'SELECT r.*, u.alias as user_alias FROM reports r JOIN users u ON u.id = r.user_id WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }
  if (type) {
    query += ' AND r.type = ?';
    params.push(type);
  }

  query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const reports = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM reports').get().c;

  res.json({ reports, total, page: parseInt(page), limit: parseInt(limit) });
});

// POST /api/admin/reports/:id/moderate
router.post('/reports/:id/moderate', (req, res) => {
  const { action } = req.body; // 'approve', 'reject', 'hide', 'feature'
  const db = req.db;

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });

  switch (action) {
    case 'approve':
      db.prepare("UPDATE reports SET status = 'confirmed', moderated_by = ? WHERE id = ?").run(req.user.id, req.params.id);
      break;
    case 'reject':
      db.prepare("UPDATE reports SET status = 'disputed', is_hidden = 1, moderated_by = ? WHERE id = ?").run(req.user.id, req.params.id);
      break;
    case 'hide':
      db.prepare('UPDATE reports SET is_hidden = 1, moderated_by = ? WHERE id = ?').run(req.user.id, req.params.id);
      break;
    default:
      return res.status(400).json({ error: 'Acción inválida' });
  }

  const updated = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  req.io.emit('report-updated', updated);
  logEvent(db, req.user.id, 'moderate_report', { report_id: req.params.id, action });

  res.json({ report: updated });
});

// GET /api/admin/analytics
router.get('/analytics', requireRole('admin_regional'), (req, res) => {
  const db = req.db;
  const { days = 7 } = req.query;

  const reportsByDay = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM reports WHERE created_at > datetime('now', ?)
    GROUP BY DATE(created_at) ORDER BY date
  `).all(`-${days} days`);

  const registrationsByDay = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM users WHERE created_at > datetime('now', ?)
    GROUP BY DATE(created_at) ORDER BY date
  `).all(`-${days} days`);

  const roleDistribution = db.prepare(
    'SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC'
  ).all();

  const topReporters = db.prepare(`
    SELECT u.id, u.alias, u.total_reports, u.total_confirmations, u.reputation_score
    FROM users u ORDER BY u.total_reports DESC LIMIT 20
  `).all();

  res.json({
    reports_by_day: reportsByDay,
    registrations_by_day: registrationsByDay,
    role_distribution: roleDistribution,
    top_reporters: topReporters
  });
});

// GET /api/admin/logs
router.get('/logs', requireRole('super_admin'), (req, res) => {
  const db = req.db;
  const { page = 1, limit = 50 } = req.query;

  const logs = db.prepare(`
    SELECT el.*, u.alias as user_alias FROM event_logs el
    LEFT JOIN users u ON u.id = el.user_id
    ORDER BY el.created_at DESC LIMIT ? OFFSET ?
  `).all(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const total = db.prepare('SELECT COUNT(*) as c FROM event_logs').get().c;
  res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/admin/settings
router.get('/settings', requireRole('super_admin'), (req, res) => {
  res.json({
    max_report_distance: parseInt(process.env.MAX_REPORT_DISTANCE || '200'),
    report_expiry_minutes: parseInt(process.env.REPORT_EXPIRY_MINUTES || '120'),
    min_confirmations: parseInt(process.env.MIN_CONFIRMATIONS || '3'),
    tracking_interval: parseInt(process.env.TRACKING_INTERVAL || '5000')
  });
});

// PUT /api/admin/settings
router.put('/settings', requireRole('super_admin'), (req, res) => {
  const { max_report_distance, report_expiry_minutes, min_confirmations } = req.body;

  // Apply to process.env immediately (no restart needed)
  if (max_report_distance) {
    process.env.MAX_REPORT_DISTANCE = String(max_report_distance);
  }
  if (report_expiry_minutes) {
    process.env.REPORT_EXPIRY_MINUTES = String(report_expiry_minutes);
  }
  if (min_confirmations) {
    process.env.MIN_CONFIRMATIONS = String(min_confirmations);
  }

  // Persist in DB for next restart
  const db = req.db;
  db.prepare("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)").run();
  if (max_report_distance) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('MAX_REPORT_DISTANCE', ?)").run(String(max_report_distance));
  }
  if (report_expiry_minutes) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('REPORT_EXPIRY_MINUTES', ?)").run(String(report_expiry_minutes));
  }
  if (min_confirmations) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('MIN_CONFIRMATIONS', ?)").run(String(min_confirmations));
  }

  logEvent(req.db, req.user.id, 'update_settings', req.body);

  res.json({
    message: 'Configuración actualizada',
    settings: req.body
  });
});

module.exports = router;

function logEvent(db, userId, action, details) {
  try {
    db.prepare('INSERT INTO event_logs (id, user_id, action, details) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), userId, action, JSON.stringify(details));
  } catch (e) {}
}
