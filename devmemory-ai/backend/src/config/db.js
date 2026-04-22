const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./memory.db", (err) => {
  if (err) console.error(err.message);
  else console.log("Conectado a SQLite");
});

db.run(`
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT,
  type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

module.exports = db;