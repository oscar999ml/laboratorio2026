const db = require("../config/db");

const saveMemory = (content, type) => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO memories (content, type) VALUES (?, ?)",
      [content, type],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, content, type });
      }
    );
  });
};

const searchMemory = (query, type = null) => {
  return new Promise((resolve, reject) => {
    let sql = "SELECT * FROM memories";
    const params = [];
    const conditions = [];

    if (query) {
      const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);
      keywords.forEach(keyword => {
        conditions.push("LOWER(content) LIKE ?");
        params.push(`%${keyword}%`);
      });
    }

    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC LIMIT 10";

    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else {
        const scored = rows.map(row => {
          let score = 0;
          const qLower = query.toLowerCase();
          const contentLower = row.content.toLowerCase();
          
          if (contentLower === qLower) score += 100;
          else if (contentLower.includes(qLower)) score += 50;
          
          const keywords = qLower.split(/\s+/);
          keywords.forEach(kw => {
            if (contentLower.includes(kw)) score += 10;
          });
          
          return { ...row, score };
        });
        
        scored.sort((a, b) => b.score - a.score);
        resolve(scored);
      }
    });
  });
};

const getMemoriesByType = (type) => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM memories WHERE type = ? ORDER BY created_at DESC",
      [type],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

const getAllMemories = () => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM memories ORDER BY created_at DESC",
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

module.exports = { saveMemory, searchMemory, getMemoriesByType, getAllMemories };