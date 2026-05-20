const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const SALT_ROUNDS = 10;
const ROLES_VALIDOS = ['super_admin', 'sistema', 'admin_regional', 'moderador', 'verificador', 'premium', 'usuario', 'observador'];

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { alias, phone, password, nombres, apellidos, email, pais, ciudad, fecha_nac, photo } = req.body;

  if (!alias || !phone || !password) {
    return res.status(400).json({ error: 'alias, phone y password son requeridos' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
  }

  const db = req.db;

  const existingAlias = db.prepare('SELECT id FROM users WHERE alias = ?').get(alias);
  if (existingAlias) return res.status(409).json({ error: 'El nombre de usuario ya existe' });

  const existingPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (existingPhone) return res.status(409).json({ error: 'El número de celular ya está registrado' });

  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);

  db.prepare(`
    INSERT INTO users (id, device_fingerprint, alias, nombres, apellidos, phone, email, password, pais, ciudad, fecha_nac, photo, role, reputation_score, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(id, `device_${id}`, alias, nombres || null, apellidos || null, phone, email || null, hashedPassword, pais || null, ciudad || null, fecha_nac || null, photo || null, 'usuario', 0.5);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  const token = jwt.sign(
    { id: user.id, alias: user.alias, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.status(201).json({
    token,
    user: sanitizeUser(user)
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { alias, phone, password } = req.body;

  if ((!alias && !phone) || !password) {
    return res.status(400).json({ error: 'alias o phone, y password son requeridos' });
  }

  const db = req.db;
  let user;

  if (alias) {
    user = db.prepare('SELECT * FROM users WHERE alias = ?').get(alias);
  }
  if (!user && phone) {
    user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  }

  if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

  if (!user.password) return res.status(401).json({ error: 'Cuenta sin contraseña. Usa registro completo.' });

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  if (user.is_banned) {
    return res.status(403).json({ error: `Cuenta suspendida: ${user.ban_reason || 'Sin motivo'}` });
  }

  const token = jwt.sign(
    { id: user.id, alias: user.alias, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  // Update last active
  db.prepare("UPDATE users SET last_active = datetime('now') WHERE id = ?").run(user.id);

  res.json({
    token,
    user: sanitizeUser(user)
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const db = req.db;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user: sanitizeUser(user) });
});

// PUT /api/auth/profile - update profile
router.put('/profile', authMiddleware, (req, res) => {
  const db = req.db;
  const { nombres, apellidos, email, ciudad, pais, fecha_nac, photo } = req.body;

  db.prepare(`
    UPDATE users SET nombres = COALESCE(?, nombres), apellidos = COALESCE(?, apellidos),
    email = COALESCE(?, email), ciudad = COALESCE(?, ciudad), pais = COALESCE(?, pais),
    fecha_nac = COALESCE(?, fecha_nac), photo = COALESCE(?, photo)
    WHERE id = ?
  `).run(nombres, apellidos, email, ciudad, pais, fecha_nac, photo, req.user.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: sanitizeUser(user) });
});

function sanitizeUser(user) {
  const { password, device_fingerprint, ...safe } = user;
  return safe;
}

module.exports = router;
