const express = require('express');
const router = express.Router();

// GET /api/heatmap
// Returns weighted report points for heatmap rendering
// Query: ?days=7 (default), ?city=, ?min_confirmations=0
router.get('/', (req, res) => {
  const db = req.db;
  const days = parseInt(req.query.days) || 7;
  const city = req.query.city || '';
  const minConfirmations = parseInt(req.query.min_confirmations) || 0;

  let query = `
    SELECT
      r.id,
      r.latitude,
      r.longitude,
      r.type,
      r.status,
      r.created_at,
      (SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.id AND rc.vote = 1) as confirmations,
      (SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.id AND rc.vote = -1) as disputes
    FROM reports r
    WHERE r.status = 'active'
      AND r.created_at >= datetime('now', '-${days} days')
  `;

  const params = [];

  if (city) {
    query += ' AND r.city = ?';
    params.push(city);
  }

  if (minConfirmations > 0) {
    query += ' AND (SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.id AND rc.vote = 1) >= ?';
    params.push(minConfirmations);
  }

  query += ' ORDER BY r.created_at DESC';

  const reports = db.prepare(query).all(...params);

  // Calculate intensity weight for each point
  const points = reports.map(r => ({
    lat: r.latitude,
    lng: r.longitude,
    weight: calculateHeatWeight(r.confirmations, r.disputes, r.type),
    type: r.type,
  }));

  res.json({ days, total: points.length, points });
});

function calculateHeatWeight(confirmations, disputes, type) {
  const base = 1;
  const confirmBonus = Math.min(confirmations * 0.3, 2);
  const disputePenalty = Math.min(disputes * 0.2, 1);
  const typeWeight = getTypeWeight(type);
  return Math.max(0.2, base + confirmBonus - disputePenalty) * typeWeight;
}

function getTypeWeight(type) {
  const weights = {
    bloqueo_total: 1.5,
    bloqueo_parcial: 1.2,
    accidente: 1.4,
    control_policial: 1.3,
    manifestacion: 1.5,
    desvio: 1.1,
    peligro: 1.3,
    radar: 1.2,
    clima: 1.0,
    transito_lento: 0.8,
    evento: 1.0,
    obra: 1.1,
    otro: 0.9,
  };
  return weights[type] || 1.0;
}

module.exports = router;
