const express = require('express');
const authMiddleware = require('../middleware/auth');
const gpsValidation = require('../middleware/gps-validation');
const { updateLocation, getUserLocation, getNearbyReports } = require('../services/trackingService');
const router = express.Router();

// POST /api/tracking/update
router.post('/update', authMiddleware, gpsValidation(), (req, res) => {
  const { speed, heading, trip_id } = req.body;
  const result = updateLocation(req.db, req.io, {
    user_id: req.user.id,
    latitude: req.validatedCoords.latitude,
    longitude: req.validatedCoords.longitude,
    speed: parseFloat(speed || 0),
    heading: parseFloat(heading || 0),
    trip_id: trip_id || null
  });

  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// GET /api/tracking/me
router.get('/me', authMiddleware, (req, res) => {
  const loc = getUserLocation(req.db, req.user.id);
  if (!loc) return res.status(404).json({ error: 'Sin ubicación registrada' });
  res.json({ location: loc });
});

// GET /api/tracking/nearby
router.get('/nearby', authMiddleware, (req, res) => {
  const { lat, lng, radius = 1000 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat y lng requeridos' });

  const reports = getNearbyReports(req.db, parseFloat(lat), parseFloat(lng), parseFloat(radius));
  res.json({ reports });
});

// GET /api/tracking/user/:userId (moderator+)
router.get('/user/:userId', authMiddleware, (req, res) => {
  const loc = getUserLocation(req.db, req.params.userId);
  if (!loc) return res.status(404).json({ error: 'Usuario no encontrado o sin ubicación' });
  res.json({ location: loc });
});

module.exports = router;
