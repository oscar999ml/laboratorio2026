const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = function runMigrations(db) {
  const currentVersion = db.pragma('user_version')[0]?.user_version || 0;

  if (currentVersion < 2) {
    // Add new columns to users
    try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'usuario'`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN phone TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN email TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN nombres TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN apellidos TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN pais TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN ciudad TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN fecha_nac TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN photo TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN password TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN ban_reason TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN total_reports INTEGER DEFAULT 0`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN total_confirmations INTEGER DEFAULT 0`); } catch (e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN last_active TEXT`); } catch (e) {}

    // Drop old CHECK constraint by recreating table with new type list
    try { db.exec(`ALTER TABLE reports ADD COLUMN event_scope TEXT DEFAULT 'static' CHECK(event_scope IN ('static','dynamic','area'))`); } catch (e) {}
    try { db.exec(`ALTER TABLE reports ADD COLUMN radius_meters REAL DEFAULT 0`); } catch (e) {}
    try { db.exec(`ALTER TABLE reports ADD COLUMN is_hidden INTEGER DEFAULT 0`); } catch (e) {}
    try { db.exec(`ALTER TABLE reports ADD COLUMN moderated_by TEXT`); } catch (e) {}

    // Drop the old CHECK constraint on reports.type by recreating table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS reports_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          description TEXT,
          photo_path TEXT,
          confidence_score REAL DEFAULT 0.3,
          confirmations INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active' CHECK(status IN ('active','confirmed','expired','disputed')),
          event_scope TEXT DEFAULT 'static' CHECK(event_scope IN ('static','dynamic','area')),
          radius_meters REAL DEFAULT 0,
          is_hidden INTEGER DEFAULT 0,
          moderated_by TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          expires_at TEXT DEFAULT (datetime('now', '+2 hours')),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Copy data if old table exists with data
      const oldCount = db.prepare("SELECT COUNT(*) as c FROM reports").get();
      if (oldCount.c > 0) {
        db.exec(`
          INSERT OR IGNORE INTO reports_new (id, user_id, type, latitude, longitude, description, photo_path, confidence_score, confirmations, status, created_at, expires_at)
          SELECT id, user_id, type, latitude, longitude, description, photo_path, confidence_score, confirmations, status, created_at, expires_at FROM reports
        `);
      }
      db.exec(`DROP TABLE IF EXISTS reports`);
      db.exec(`ALTER TABLE reports_new RENAME TO reports`);
    } catch (e) {
      console.warn('Schema migration warning:', e.message);
    }

    // Add weight column to report_confirmations
    try { db.exec(`ALTER TABLE report_confirmations ADD COLUMN weight REAL DEFAULT 1`); } catch (e) {}

    // Add push_subscriptions table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT,
          auth TEXT,
          device_type TEXT DEFAULT 'web',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
    } catch (e) {}

    // Add event_logs table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS event_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
    } catch (e) {}

    // Seed users
    seedUsers(db);

    db.pragma('user_version = 2');
    console.log('Migración v2 aplicada: roles, teléfono, país, ciudad, email, foto, event_scope, logs');
  }
};

function seedUsers(db) {
  const existing = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (existing.c > 0) return;

  const salt = bcrypt.genSaltSync(10);
  const now = new Date().toISOString();

  const adminId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, device_fingerprint, alias, nombres, apellidos, phone, password, role, pais, ciudad, reputation_score, created_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    adminId, 'super_admin_device', 'admin', 'Super', 'Admin', '70000000',
    bcrypt.hashSync('admin123', salt),
    'super_admin', 'Bolivia', 'La Paz', 1.0, now
  );

  const userId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, device_fingerprint, alias, nombres, apellidos, phone, password, role, pais, ciudad, reputation_score, created_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    userId, 'normal_user_device', 'usuario', 'Usuario', 'Normal', '70000001',
    bcrypt.hashSync('user123', salt),
    'usuario', 'Bolivia', 'Cochabamba', 0.5, now
  );

  console.log('Usuarios semilla creados:');
  console.log('  admin    → usuario: admin    / contraseña: admin123  (super_admin)');
  console.log('  usuario  → usuario: usuario  / contraseña: user123   (usuario)');
}
