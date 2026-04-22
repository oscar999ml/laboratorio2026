/**
 * Utilidades de Database
 * Promisify para db.run y db.all
 */

const db = require('./db');

/**
 * Ejecutar query INSERT/UPDATE/DELETE
 * @param {string} sql - SQL query
 * @param {array} params - Parámetros bindeados
 * @returns {Promise} - Resuelve con {id, changes}
 */
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

/**
 * Ejecutar query SELECT (múltiples filas)
 * @param {string} sql - SQL query
 * @param {array} params - Parámetros bindeados
 * @returns {Promise} - Array de resultados
 */
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

/**
 * Ejecutar query SELECT (una fila)
 * @param {string} sql - SQL query
 * @param {array} params - Parámetros bindeados
 * @returns {Promise} - Un resultado o null
 */
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
};

module.exports = { dbRun, dbAll, dbGet };
