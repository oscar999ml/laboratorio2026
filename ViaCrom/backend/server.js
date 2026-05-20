require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, process.env.DB_PATH || './db/database.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run initial schema
const schema = fs.readFileSync(path.join(__dirname, 'migrations', '001-initial-schema.sql'), 'utf8');
db.exec(schema);

// Run seed & migration v2
require('./migrations/002-seed-users')(db);

// Load persisted settings from DB into process.env
try {
  const settings = db.prepare("SELECT key, value FROM settings").all();
  for (const s of settings) {
    process.env[s.key] = s.value;
  }
} catch (e) {} // table may not exist yet

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  req.db = db;
  req.io = io;
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const bloqueosRoutes = require('./routes/bloqueos');
const rutasRoutes = require('./routes/rutas');
const trackingRoutes = require('./routes/tracking');
const adminRoutes = require('./routes/admin');
const feedRoutes = require('./routes/feed');
const usersRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const heatmapRoutes = require('./routes/heatmap');

app.use('/api/auth', authRoutes);
app.use('/api/bloqueos', bloqueosRoutes);
app.use('/api/rutas', rutasRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/heatmap', heatmapRoutes);

app.get('/api/health', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const reportCount = db.prepare("SELECT COUNT(*) as c FROM reports WHERE status IN ('active','confirmed')").get().c;
  res.json({ status: 'ok', timestamp: new Date().toISOString(), users: userCount, active_reports: reportCount });
});

const { checkExpiredReports } = require('./services/bloqueoService');
const { checkInactiveUsers } = require('./services/reputationService');

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  broadcastUserCount();

  socket.on('join-trip', (tripId) => {
    socket.join(`trip:${tripId}`);
  });

  socket.on('leave-trip', (tripId) => {
    socket.leave(`trip:${tripId}`);
  });

  socket.on('join-region', (region) => {
    socket.join(`region:${region}`);
  });

  socket.on('leave-region', (region) => {
    socket.leave(`region:${region}`);
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    broadcastUserCount();
  });
});

function broadcastUserCount() {
  const count = io.engine?.clientsCount || 0;
  io.emit('users-count', count);
}

// Initialize routing graph
const routingRouter = require('./routing/router');

setInterval(() => {
  try { checkExpiredReports(db, io, routingRouter); } catch (e) { console.error('Error checking expired reports:', e.message); }
  try { checkInactiveUsers(db); } catch (e) { console.error('Error checking inactive users:', e.message); }
}, 60000);
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

routingRouter.initGraph(process.env.ROUTING_CITY || 'La Paz', dataDir).then(() => {
  if (routingRouter.isReady()) {
    console.log('  Routing engine: LOCAL (OSM graph)');
  } else {
    console.log('  Routing engine: OSRM (fallback)');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\nViaCrom backend corriendo en puerto ${PORT}`);
  console.log(`   Salud: http://localhost:${PORT}/api/health`);
});
