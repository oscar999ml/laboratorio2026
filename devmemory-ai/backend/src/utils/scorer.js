/**
 * Algoritmo de Scoring para búsqueda
 * Calcula relevancia basada en coincidencias
 */

const constants = require('../config/constants');

/**
 * Calcula score de relevancia para un resultado
 * @param {string} query - Consulta del usuario
 * @param {string} content - Contenido a evaluar
 * @returns {number} - Score de 0 a 1000
 */
function calculateScore(query, content) {
  if (!query || !content) return 0;
  
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  let score = 0;
  
  // Exact match
  if (contentLower === queryLower) {
    score += constants.SCORE_EXACT_MATCH;
  }
  // Substring match
  else if (contentLower.includes(queryLower)) {
    score += constants.SCORE_SUBSTRING;
  }
  
  // Keyword matching
  const keywords = queryLower
    .split(/\s+/)
    .filter(k => k.length > 0);
    
  keywords.forEach(keyword => {
    if (contentLower.includes(keyword)) {
      score += constants.SCORE_KEYWORD;
    }
  });
  
  return score;
}

/**
 * Ordena resultados por score (descendente)
 * @param {array} results - Resultados con score
 * @returns {array} - Resultados ordenados
 */
function sortByScore(results) {
  return [...results].sort((a, b) => b.score - a.score);
}

/**
 * Procesa resultados agregando score
 * @param {array} rows - Filas de BD
 * @param {string} query - Consulta
 * @returns {array} - Resultados con score
 */
function scoreResults(rows, query) {
  return rows
    .map(row => ({
      ...row,
      score: calculateScore(query, row.content)
    }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  calculateScore,
  sortByScore,
  scoreResults
};
