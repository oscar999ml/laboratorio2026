/**
 * Constantes centralizadas para el proyecto
 */

module.exports = {
  // API
  API_PORT: process.env.PORT || 3000,
  API_HOST: 'localhost',
  
  // Database
  DB_PATH: process.env.DB_PATH || './memory.db',
  
  // Memory Types
  VALID_TYPES: ['bug', 'decision', 'feature', 'general', 'note'],
  DEFAULT_TYPE: 'general',
  
  // Search
  SEARCH_LIMIT_DEFAULT: 10,
  SEARCH_LIMIT_MAX: 100,
  SEARCH_OFFSET_DEFAULT: 0,
  
  // Validation
  CONTENT_MIN_LENGTH: 3,
  CONTENT_MAX_LENGTH: 5000,
  QUERY_MIN_LENGTH: 1,
  
  // Scoring
  SCORE_EXACT_MATCH: 100,
  SCORE_SUBSTRING: 50,
  SCORE_KEYWORD: 10,
  
  // Errors
  ERROR_CODES: {
    MISSING_CONTENT: 'MISSING_CONTENT',
    CONTENT_TOO_SHORT: 'CONTENT_TOO_SHORT',
    INVALID_TYPE: 'INVALID_TYPE',
    MISSING_QUERY: 'MISSING_QUERY',
    DB_ERROR: 'DB_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
  },
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};
