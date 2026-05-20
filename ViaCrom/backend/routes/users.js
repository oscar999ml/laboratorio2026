const express = require('express');
const router = express.Router();

// GET /api/users/:id — Public profile
router.get('/:id', (req, res) => {
  const db = req.db;
  const user = db.prepare(`
    SELECT id, alias, photo, role, reputation_score, total_reports, total_confirmations, ciudad, pais, last_active, created_at
    FROM users WHERE id = ?
  `).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const confirmedReports = db.prepare(
    "SELECT COUNT(*) as c FROM reports WHERE user_id = ? AND status = 'confirmed'"
  ).get(req.params.id).c;

  const total = user.total_reports || 1;
  const precision = user.total_reports > 0 ? Math.round((confirmedReports / user.total_reports) * 100) : 0;

  let level = 'bronce';
  if (user.reputation_score >= 0.9) level = 'diamante';
  else if (user.reputation_score >= 0.75) level = 'oro';
  else if (user.reputation_score >= 0.5) level = 'plata';

  // Recent reports by this user
  const recentReports = db.prepare(`
    SELECT id, type, description, latitude, longitude, status, confidence_score, confirmations, created_at
    FROM reports WHERE user_id = ? AND is_hidden = 0
    ORDER BY created_at DESC LIMIT 10
  `).all(req.params.id);

  const levelColors = {
    bronce: '#cd7f32',
    plata: '#a0aec0',
    oro: '#f6ad55',
    diamante: '#4299e1',
  };

  res.json({
    user: {
      id: user.id,
      alias: user.alias || 'Anónimo',
      photo: user.photo,
      role: user.role,
      ciudad: user.ciudad,
      pais: user.pais,
      reputation_score: user.reputation_score,
      level,
      level_color: levelColors[level],
      total_reports: user.total_reports || 0,
      total_confirmations: user.total_confirmations || 0,
      precision,
      last_active: user.last_active,
      created_at: user.created_at,
      recent_reports: recentReports,
    }
  });
});

module.exports = router;
