const express = require('express');
const webpush = require('web-push');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BMfRwimSHSRlvX4mkiXEoCyYHCJB2Vtp4Yc5k5gN7P6PwRxC5uB0c2ar1IyzkT8ZT8bAkXWqNv3R8aSl5z69YmY';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'bWOdFvmvSazE9o1HWoI8AmEmCx7maBG35dKGj-EBmHw';

webpush.setVapidDetails(
  'mailto:soporte@viacrom.app',
  PUBLIC_KEY,
  PRIVATE_KEY
);

// GET /api/notifications/vapid-key — public key for frontend
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: PUBLIC_KEY });
});

// POST /api/notifications/subscribe
router.post('/subscribe', authMiddleware, (req, res) => {
  const { subscription, device_type } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Suscripción inválida' });
  }

  const db = req.db;
  const existing = db.prepare(
    'SELECT id FROM push_subscriptions WHERE endpoint = ?'
  ).get(subscription.endpoint);

  if (existing) {
    db.prepare('UPDATE push_subscriptions SET updated_at = datetime(\'now\') WHERE id = ?')
      .run(existing.id);
    return res.json({ message: 'Suscripción actualizada' });
  }

  db.prepare(`
    INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, device_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    require('crypto').randomUUID(),
    req.user.id,
    subscription.endpoint,
    subscription.keys?.p256dh || '',
    subscription.keys?.auth || '',
    device_type || 'web'
  );

  res.json({ message: 'Suscripción exitosa' });
});

// POST /api/notifications/unsubscribe
router.post('/unsubscribe', authMiddleware, (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Endpoint requerido' });

  const db = req.db;
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?')
    .run(endpoint, req.user.id);

  res.json({ message: 'Desuscrito' });
});

// POST /api/notifications/send — send to a specific user (internal/admin)
router.post('/send', authMiddleware, (req, res) => {
  const { userId, title, body, data } = req.body;
  if (!userId || !title) return res.status(400).json({ error: 'userId y title requeridos' });

  const db = req.db;
  const subs = db.prepare(
    'SELECT * FROM push_subscriptions WHERE user_id = ?'
  ).all(userId);

  if (subs.length === 0) return res.status(404).json({ error: 'Usuario sin suscripciones' });

  const payload = JSON.stringify({ title, body, data: data || {}, icon: '/icon-192.png', badge: '/badge-72.png' });

  const results = [];
  for (const sub of subs) {
    try {
      webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, payload);
      results.push({ endpoint: sub.endpoint, status: 'sent' });
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
        results.push({ endpoint: sub.endpoint, status: 'expired' });
      } else {
        results.push({ endpoint: sub.endpoint, status: 'error', error: err.message });
      }
    }
  }

  res.json({ sent: results.filter(r => r.status === 'sent').length, results });
});

// POST /api/notifications/alert — proximity alert (called by tracking service)
router.post('/alert', authMiddleware, (req, res) => {
  const { userIds, title, body, data } = req.body;
  if (!userIds || !userIds.length || !title) {
    return res.status(400).json({ error: 'userIds y title requeridos' });
  }

  const db = req.db;
  let sent = 0;

  for (const userId of userIds) {
    const subs = db.prepare(
      'SELECT * FROM push_subscriptions WHERE user_id = ?'
    ).all(userId);

    const payload = JSON.stringify({ title, body, data: data || {}, icon: '/icon-192.png', badge: '/badge-72.png' });

    for (const sub of subs) {
      try {
        webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
        }
      }
    }
  }

  res.json({ sent });
});

module.exports = router;
