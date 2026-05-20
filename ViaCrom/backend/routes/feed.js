const express = require('express');
const router = express.Router();

const REVERSE_CACHE = {};

function reverseGeocode(lat, lng) {
  const key = `${Math.round(lat * 100) / 100},${Math.round(lng * 100) / 100}`;
  if (REVERSE_CACHE[key]) return REVERSE_CACHE[key];

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = require('child_process').execSync(
      `curl -s "${url}"`,
      { timeout: 3000, encoding: 'utf8' }
    );
    const data = JSON.parse(res);
    if (data && data.display_name) {
      const parts = data.display_name.split(',');
      const short = parts.slice(0, Math.min(3, parts.length)).join(',').trim();
      REVERSE_CACHE[key] = short;
      return short;
    }
  } catch (e) {}

  REVERSE_CACHE[key] = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return REVERSE_CACHE[key];
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function addDistanceAndLocation(items, lat, lng) {
  return items.map(item => {
    const d = item.latitude != null && item.longitude != null
      ? Math.round(haversine(lat, lng, item.latitude, item.longitude))
      : null;
    let location = item.description || '';
    if (item.latitude != null && item.longitude != null) {
      location = reverseGeocode(item.latitude, item.longitude);
    }
    return { ...item, distance: d, location };
  });
}

router.get('/', (req, res) => {
  const db = req.db;
  const { lat = -16.5, lng = -68.15, radius = 10000, limit = 50 } = req.query;
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const maxDist = parseFloat(radius);
  const maxItems = Math.min(parseInt(limit) || 50, 100);

  // 1. Recent reports
  const recentReports = db.prepare(`
    SELECT r.id, 'report' as type, r.type as event_type, u.alias as user_alias, u.id as user_id,
           r.description, r.latitude, r.longitude, r.confidence_score as confidence,
           r.confirmations, r.created_at, r.status
    FROM reports r
    JOIN users u ON u.id = r.user_id
    WHERE r.is_hidden = 0 AND r.status IN ('active', 'confirmed')
      AND r.expires_at > datetime('now')
    ORDER BY r.created_at DESC
    LIMIT ?
  `).all(maxItems);

  // 2. Milestone confirms (reports with high confirmations)
  const milestoneConfirms = db.prepare(`
    SELECT r.id, 'confirm' as type, r.type as event_type, NULL as user_alias, r.user_id,
           r.description, r.latitude, r.longitude, r.confidence_score as confidence,
           r.confirmations, r.created_at, r.status
    FROM reports r
    WHERE r.confirmations >= 3 AND r.is_hidden = 0 AND r.status IN ('active', 'confirmed')
      AND r.expires_at > datetime('now')
    ORDER BY r.confirmations DESC
    LIMIT 10
  `).all();

  // 3. Trends: cluster reports within 200m of each other
  const allActive = db.prepare(`
    SELECT id, latitude, longitude, type, created_at
    FROM reports
    WHERE is_hidden = 0 AND status IN ('active', 'confirmed')
      AND expires_at > datetime('now')
  `).all();

  const trends = [];
  const clustered = new Set();
  for (let i = 0; i < allActive.length; i++) {
    if (clustered.has(allActive[i].id)) continue;
    const cluster = [allActive[i]];
    clustered.add(allActive[i].id);
    for (let j = i + 1; j < allActive.length; j++) {
      if (clustered.has(allActive[j].id)) continue;
      const dist = haversine(
        allActive[i].latitude, allActive[i].longitude,
        allActive[j].latitude, allActive[j].longitude
      );
      if (dist <= 200) {
        cluster.push(allActive[j]);
        clustered.add(allActive[j].id);
      }
    }
    if (cluster.length >= 3) {
      const avgLat = cluster.reduce((s, r) => s + r.latitude, 0) / cluster.length;
      const avgLng = cluster.reduce((s, r) => s + r.longitude, 0) / cluster.length;
      trends.push({
        id: `trend_${cluster.length}_${Date.now()}`,
        type: 'trend',
        event_type: null,
        event_types: [...new Set(cluster.map(r => r.type))],
        description: `${cluster.length} eventos en ${Math.round(haversine(cluster[0].latitude, cluster[0].longitude, cluster[cluster.length-1].latitude, cluster[cluster.length-1].longitude))}m`,
        latitude: avgLat,
        longitude: avgLng,
        event_count: cluster.length,
        radius_m: 200,
        created_at: cluster[0].created_at,
      });
    }
  }

  // Combine and sort by recency
  const allItems = [
    ...addDistanceAndLocation(recentReports, userLat, userLng),
    ...addDistanceAndLocation(milestoneConfirms, userLat, userLng),
    ...addDistanceAndLocation(trends, userLat, userLng),
  ];

  // Filter by radius
  const filtered = allItems.filter(item => item.distance === null || item.distance <= maxDist);

  // Sort: most recent first, but trends stay in chronological order
  filtered.sort((a, b) => new Date(b.created_at + 'Z').getTime() - new Date(a.created_at + 'Z').getTime());

  const items = filtered.slice(0, maxItems);

  res.json({
    items,
    total: items.length,
    radius: maxDist,
    center: { lat: userLat, lng: userLng },
  });
});

module.exports = router;
