const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const gpsValidation = require('../middleware/gps-validation');
const { requireRole } = require('../middleware/role');
const router = express.Router();

const ALLOWED_TYPES = [
  'bloqueo', 'marcha', 'accidente', 'accidente_vehicular', 'conflicto',
  'ruta_cerrada', 'peligro', 'incendio', 'inundacion', 'manifestacion',
  'cierre_calle', 'evento_especial', 'otro'
];

const EVENT_SCOPES = ['static', 'dynamic', 'area'];

const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const { createReport, confirmReport, getActiveReports, getReportById, moderateReport } = require('../services/bloqueoService');
const routingRouter = require('../routing/router');

// POST /api/bloqueos - create report
router.post('/', authMiddleware, upload.single('photo'), gpsValidation(), (req, res) => {
  try {
    const { type, description, report_latitude, report_longitude, event_scope, radius_meters } = req.body;

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Tipo de evento inválido' });
    }

    if (!report_latitude || !report_longitude) {
      return res.status(400).json({ error: 'Coordenadas del evento requeridas' });
    }

    const scope = event_scope || 'static';
    if (!EVENT_SCOPES.includes(scope)) {
      return res.status(400).json({ error: 'event_scope inválido (static, dynamic, area)' });
    }

    const { haversine } = require('../utils/distancia');
    const distance = haversine(
      req.validatedCoords.latitude, req.validatedCoords.longitude,
      parseFloat(report_latitude), parseFloat(report_longitude)
    );

    const maxDist = parseInt(process.env.MAX_REPORT_DISTANCE || '200');
    if (distance > maxDist) {
      return res.status(403).json({
        error: `Debes estar a menos de ${maxDist}m del evento (estás a ${Math.round(distance)}m)`,
        distance: Math.round(distance)
      });
    }

    const report = createReport(req.db, req.io, {
      user_id: req.user.id,
      type,
      latitude: parseFloat(report_latitude),
      longitude: parseFloat(report_longitude),
      description: description || null,
      photo_path: req.file ? req.file.filename : null,
      event_scope: scope,
      radius_meters: scope === 'area' ? parseFloat(radius_meters || 100) : 0
    });

    // Update user report count
    req.db.prepare('UPDATE users SET total_reports = total_reports + 1 WHERE id = ?').run(req.user.id);

    // Log event
    logEvent(req.db, req.user.id, 'create_report', { type, report_id: report.id });

    res.status(201).json({ report });
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Error al crear reporte' });
  }
});

// GET /api/bloqueos - list reports
router.get('/', (req, res) => {
  const { lat, lng, radius, scope, type, status } = req.query;
  const reports = getActiveReports(req.db, {
    latitude: lat ? parseFloat(lat) : null,
    longitude: lng ? parseFloat(lng) : null,
    radius: radius ? parseFloat(radius) : null,
    scope: scope || null,
    type: type || null,
    status: status || null
  });
  res.json({ reports });
});

// GET /api/bloqueos/:id
router.get('/mis-reportes', authMiddleware, (req, res) => {
  const db = req.db;
  const reports = db.prepare(
    'SELECT r.*, u.alias as user_alias FROM reports r JOIN users u ON u.id = r.user_id WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 50'
  ).all(req.user.id);
  res.json({ reports });
});

router.get('/:id', (req, res) => {
  const report = getReportById(req.db, req.params.id);
  if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
  res.json({ report });
});

// POST /api/bloqueos/:id/confirm
router.post('/:id/confirm', authMiddleware, gpsValidation(), (req, res) => {
  const { vote } = req.body;
  if (!vote || !['confirm', 'dispute'].includes(vote)) {
    return res.status(400).json({ error: 'Voto debe ser confirm o dispute' });
  }

  const result = confirmReport(req.db, req.io, {
    report_id: req.params.id,
    user_id: req.user.id,
    vote,
    latitude: req.validatedCoords.latitude,
    longitude: req.validatedCoords.longitude
  });

  if (result.error) return res.status(400).json(result);

  // Update user confirmation count
  req.db.prepare('UPDATE users SET total_confirmations = total_confirmations + 1 WHERE id = ?').run(req.user.id);

  // Reputation update
  const { updateReputation } = require('../services/reputationService');
  updateReputation(req.db, req.user.id);

  res.json(result);
});

// DELETE /api/bloqueos/:id (moderator+)
router.delete('/:id', authMiddleware, requireRole('moderador'), (req, res) => {
  const report = getReportById(req.db, req.params.id);
  if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });

  req.db.prepare('UPDATE reports SET status = ?, is_hidden = 1, moderated_by = ? WHERE id = ?')
    .run('expired', req.user.id, req.params.id);

  routingRouter.unblockReport(req.params.id);
  req.io.emit('report-removed', { id: req.params.id });
  logEvent(req.db, req.user.id, 'delete_report', { report_id: req.params.id });

  res.json({ message: 'Reporte eliminado' });
});

module.exports = router;

function logEvent(db, userId, action, details) {
  try {
    db.prepare('INSERT INTO event_logs (id, user_id, action, details) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), userId, action, JSON.stringify(details));
  } catch (e) {}
}
