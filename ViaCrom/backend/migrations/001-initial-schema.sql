CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    device_fingerprint TEXT UNIQUE NOT NULL,
    alias TEXT,
    reputation_score REAL DEFAULT 0.5,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('bloqueo','marcha','accidente','conflicto','ruta_cerrada')),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    description TEXT,
    photo_path TEXT,
    confidence_score REAL DEFAULT 0.3,
    confirmations INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','confirmed','expired','disputed')),
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT DEFAULT (datetime('now', '+2 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS report_confirmations (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    vote TEXT NOT NULL CHECK(vote IN ('confirm','dispute')),
    latitude REAL,
    longitude REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES reports(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(report_id, user_id)
);

CREATE TABLE IF NOT EXISTS live_locations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed REAL DEFAULT 0,
    heading REAL DEFAULT 0,
    trip_id TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    origin_lat REAL NOT NULL,
    origin_lng REAL NOT NULL,
    dest_lat REAL NOT NULL,
    dest_lng REAL NOT NULL,
    route_geometry TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
    started_at TEXT DEFAULT (datetime('now')),
    ended_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_expires ON reports(expires_at);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_live_locations_user ON live_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
