const { v4: uuidv4 } = require('uuid');
const { haversine } = require('../utils/distancia');

function updateLocation(db, io, data) {
  const { user_id, latitude, longitude, speed, heading, trip_id } = data;

  if (latitude === undefined || longitude === undefined) {
    return { error: 'Coordenadas requeridas' };
  }

  const existing = db.prepare('SELECT * FROM live_locations WHERE user_id = ?').get(user_id);

  if (existing) {
    db.prepare(`
      UPDATE live_locations SET latitude = ?, longitude = ?, speed = ?, heading = ?, trip_id = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(latitude, longitude, speed || 0, heading || 0, trip_id || null, user_id);
  } else {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO live_locations (id, user_id, latitude, longitude, speed, heading, trip_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, user_id, latitude, longitude, speed || 0, heading || 0, trip_id || null);
  }

  const location = db.prepare('SELECT * FROM live_locations WHERE user_id = ?').get(user_id);

  if (trip_id) {
    io.to(`trip:${trip_id}`).emit('location-update', {
      user_id, latitude, longitude, speed, heading, trip_id
    });
  }

  // Proximity warnings for nearby active reports
  const warnings = getNearbyWarnings(db, latitude, longitude);

  if (warnings.length > 0) {
    io.emit('proximity-warning', { user_id, warnings });
  }

  // Recalculate ETA if in a trip
  if (trip_id && speed > 0) {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND status = ?').get(trip_id, 'active');
    if (trip) {
      const remainingDist = haversine(latitude, longitude, trip.dest_lat, trip.dest_lng);
      const etaMinutes = speed > 0 ? Math.round((remainingDist / 1000) / (speed * 3.6) * 60) : null;
      if (etaMinutes) {
        io.to(`trip:${trip_id}`).emit('eta-update', { trip_id, eta_minutes: etaMinutes, remaining_km: Math.round(remainingDist / 10) / 100 });
      }
    }
  }

  return { location, warnings };
}

function getUserLocation(db, userId) {
  return db.prepare('SELECT * FROM live_locations WHERE user_id = ?').get(userId);
}

function getActiveTrips(db) {
  return db.prepare("SELECT * FROM trips WHERE status = 'active'").all();
}

function getNearbyReports(db, lat, lng, radiusMeters = 1000) {
  const reports = db.prepare(
    "SELECT * FROM reports WHERE status IN ('active','confirmed') AND is_hidden = 0 AND expires_at > datetime('now')"
  ).all();

  return reports.filter(r => {
    const dist = haversine(lat, lng, r.latitude, r.longitude);
    return dist <= radiusMeters;
  }).map(r => ({
    ...r,
    distance: Math.round(haversine(lat, lng, r.latitude, r.longitude))
  }));
}

function getNearbyWarnings(db, lat, lng) {
  const reports = db.prepare(
    "SELECT * FROM reports WHERE status IN ('active','confirmed') AND is_hidden = 0 AND expires_at > datetime('now')"
  ).all();

  const warnings = [];
  for (const report of reports) {
    const dist = haversine(lat, lng, report.latitude, report.longitude);
    if (dist < 500) {
      warnings.push({ report, distance: Math.round(dist) });
    }
  }
  return warnings;
}

module.exports = { updateLocation, getUserLocation, getActiveTrips, getNearbyReports };
