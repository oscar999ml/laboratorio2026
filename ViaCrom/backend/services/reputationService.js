const { v4: uuidv4 } = require('uuid');

const CONFIRM_WEIGHT = {
  super_admin: 10,
  sistema: 8,
  admin_regional: 6,
  moderador: 5,
  verificador: 3,
  premium: 2,
  usuario: 1,
  observador: 0,
};

function updateReputation(db, userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return;

  const totalReports = user.total_reports || 0;
  const totalConfirmations = user.total_confirmations || 0;

  // Get ratio of confirmed reports by this user
  const confirmedReports = db.prepare(
    "SELECT COUNT(*) as c FROM reports WHERE user_id = ? AND status = 'confirmed'"
  ).get(userId).c;

  // Get disputes received on this user's reports
  const disputesReceived = db.prepare(`
    SELECT COUNT(*) as c FROM report_confirmations rc
    JOIN reports r ON r.id = rc.report_id
    WHERE r.user_id = ? AND rc.vote = 'dispute'
  `).get(userId).c;

  // Calculate reputation score (0 - 1)
  let score = 0.5; // base

  // Bonus for confirmed reports
  if (totalReports > 0) {
    const accuracy = confirmedReports / totalReports;
    score += accuracy * 0.3;
  }

  // Penalty for disputes
  if (disputesReceived > 0) {
    score -= Math.min(0.2, disputesReceived * 0.05);
  }

  // Activity bonus
  score += Math.min(0.1, totalConfirmations * 0.01);
  score += Math.min(0.1, totalReports * 0.02);

  // Clamp
  score = Math.max(0, Math.min(1, score));

  db.prepare('UPDATE users SET reputation_score = ? WHERE id = ?').run(score, userId);
  return score;
}

function checkInactiveUsers(db) {
  const inactiveThreshold = parseInt(process.env.INACTIVE_DAYS || '90');
  const inactive = db.prepare(`
    SELECT id FROM users
    WHERE last_active IS NULL OR last_active < datetime('now', ?)
  `).all(`-${inactiveThreshold} days`);

  for (const user of inactive) {
    // Gradual reputation decay for inactive users
    const current = db.prepare('SELECT reputation_score FROM users WHERE id = ?').get(user.id);
    if (current && current.reputation_score > 0.3) {
      const decayed = Math.max(0.3, current.reputation_score - 0.05);
      db.prepare('UPDATE users SET reputation_score = ? WHERE id = ?').run(decayed, user.id);
    }
  }
}

function getReputationWeight(role) {
  return CONFIRM_WEIGHT[role] || 1;
}

module.exports = { updateReputation, checkInactiveUsers, getReputationWeight };
