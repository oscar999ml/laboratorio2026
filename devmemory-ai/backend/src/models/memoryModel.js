const { dbRun, dbAll } = require("../config/dbUtils");
const { scoreResults } = require("../utils/scorer");
const constants = require("../config/constants");

/**
 * Guardar una memoria en BD
 */
const saveMemory = async (content, type) => {
  const result = await dbRun(
    "INSERT INTO memories (content, type) VALUES (?, ?)",
    [content, type]
  );
  return { id: result.id, content, type };
};

/**
 * Buscar memorias por query con scoring
 */
const searchMemory = async (query, type = null, limit = constants.SEARCH_LIMIT_DEFAULT, offset = constants.SEARCH_OFFSET_DEFAULT) => {
  let sql = "SELECT * FROM memories";
  const params = [];
  const conditions = [];

  if (query && query.length >= constants.QUERY_MIN_LENGTH) {
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

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const rows = await dbAll(sql, params);
  return scoreResults(rows, query);
};

/**
 * Obtener memorias por tipo
 */
const getMemoriesByType = async (type, limit = constants.SEARCH_LIMIT_DEFAULT, offset = constants.SEARCH_OFFSET_DEFAULT) => {
  return await dbAll(
    "SELECT * FROM memories WHERE type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [type, limit, offset]
  );
};

/**
 * Obtener todas las memorias
 */
const getAllMemories = async (limit = constants.SEARCH_LIMIT_DEFAULT, offset = constants.SEARCH_OFFSET_DEFAULT) => {
  return await dbAll(
    "SELECT * FROM memories ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );
};

module.exports = { saveMemory, searchMemory, getMemoriesByType, getAllMemories };