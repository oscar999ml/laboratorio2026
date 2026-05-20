const { v4: uuidv4 } = require('uuid');
const { haversine } = require('../utils/distancia');
const { getReputationWeight } = require('./reputationService');
const routingRouter = require('../routing/router');

function createReport(db, io, data) {
  const id = uuidv4();
  const expiryMinutes = parseInt(process.env.REPORT_EXPIRY_MINUTES || '120');
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO reports (id, user_id, type, latitude, longitude, description, photo_path, event_scope, radius_meters, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.user_id, data.type, data.latitude, data.longitude, data.description, data.photo_path, data.event_scope || 'static', data.radius_meters || 0, expiresAt);

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);

  // Update routing graph incrementally
  routingRouter.blockReport(report);

  // Emit to region
  const regionKey = `${Math.round(data.latitude / 0.1) * 0.1},${Math.round(data.longitude / 0.1) * 0.1}`;
  io.to(`region:${regionKey}`).emit('new-report', report);

  // Global broadcast
  io.emit('new-report', report);

  return report;
}

function confirmReport(db, io, data) {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(data.report_id);
  if (!report) return { error: 'Reporte no encontrado' };
  if (report.status === 'expired') return { error: 'El reporte ha expirado' };

  const existing = db.prepare(
    'SELECT id FROM report_confirmations WHERE report_id = ? AND user_id = ?'
  ).get(data.report_id, data.user_id);
  if (existing) return { error: 'Ya has votado este reporte' };

  // Get user's reputation weight
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(data.user_id);
  const userWeight = getReputationWeight(user?.role || 'usuario');

  const confirmId = uuidv4();
  db.prepare(`
    INSERT INTO report_confirmations (id, report_id, user_id, vote, latitude, longitude, weight)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(confirmId, data.report_id, data.user_id, data.vote, data.latitude, data.longitude, userWeight);

  // Get weighted counts
  const confirms = db.prepare(`
    SELECT COALESCE(SUM(weight), 0) as total FROM report_confirmations
    WHERE report_id = ? AND vote = 'confirm'
  `).get(data.report_id);

  const disputes = db.prepare(`
    SELECT COALESCE(SUM(weight), 0) as total FROM report_confirmations
    WHERE report_id = ? AND vote = 'dispute'
  `).get(data.report_id);

  const totalWeight = confirms.total + disputes.total;
  let newScore = 0.3;
  if (totalWeight > 0) {
    const confirmRatio = confirms.total / totalWeight;
    newScore = Math.min(1, Math.max(0, 0.3 + confirmRatio * 0.7));
  }

  let newStatus = report.status;
  const minConfirms = parseInt(process.env.MIN_CONFIRMATIONS || '3');
  if (confirms.total >= minConfirms && confirms.total > disputes.total * 2) {
    newStatus = 'confirmed';
  } else if (disputes.total >= minConfirms && disputes.total > confirms.total * 2) {
    newStatus = 'disputed';
  }

  // Count raw confirmations for display
  const rawConfirms = db.prepare(
    "SELECT COUNT(*) as count FROM report_confirmations WHERE report_id = ? AND vote = 'confirm'"
  ).get(data.report_id);

  db.prepare('UPDATE reports SET confidence_score = ?, status = ?, confirmations = ? WHERE id = ?')
    .run(newScore, newStatus, rawConfirms.count, data.report_id);

  const updated = db.prepare('SELECT * FROM reports WHERE id = ?').get(data.report_id);
  io.emit('report-updated', updated);

  // Notify the report creator
  io.emit('report-confirmed', { report_id: data.report_id, vote: data.vote, user_id: data.user_id });

  return { success: true, report: updated };
}

function getActiveReports(db, filters = {}) {
  let query = "SELECT r.*, u.alias as user_alias FROM reports r JOIN users u ON u.id = r.user_id WHERE r.status IN ('active','confirmed') AND r.is_hidden = 0";
  const params = [];

  if (filters.scope) {
    query += ' AND r.event_scope = ?';
    params.push(filters.scope);
  }

  if (filters.type) {
    query += ' AND r.type = ?';
    params.push(filters.type);
  }

  if (filters.status) {
    query += ' AND r.status = ?';
    params.push(filters.status);
  }

  query += ' AND r.expires_at > datetime(\'now\')';
  query += ' ORDER BY r.created_at DESC';

  let reports = db.prepare(query).all(...params);

  if (filters.latitude && filters.longitude && filters.radius) {
    reports = reports.filter(r =>
      haversine(filters.latitude, filters.longitude, r.latitude, r.longitude) <= filters.radius
    );
  }

  return reports;
}

function getReportById(db, id) {
  return db.prepare('SELECT r.*, u.alias as user_alias FROM reports r JOIN users u ON u.id = r.user_id WHERE r.id = ?').get(id);
}

function checkExpiredReports(db, io) {
  const expired = db.prepare(
    "SELECT id FROM reports WHERE status IN ('active','confirmed') AND expires_at <= datetime('now')"
  ).all();

  for (const r of expired) {
    db.prepare("UPDATE reports SET status = 'expired' WHERE id = ?").run(r.id);
    const expiredReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(r.id);
    io.emit('report-expired', expiredReport);
    routingRouter.unblockReport(r.id);
  }

  if (expired.length > 0) {
    console.log(`Expirados ${expired.length} reportes`);
  }
}

module.exports = { createReport, confirmReport, getActiveReports, getReportById, checkExpiredReports };
