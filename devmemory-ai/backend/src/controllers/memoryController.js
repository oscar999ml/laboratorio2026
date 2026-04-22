const service = require("../services/memoryService");
const constants = require("../config/constants");

const save = async (req, res) => {
  try {
    const { content, type } = req.body;
    
    if (!content) {
      return res.status(400).json({ 
        error: "Content es requerido", 
        code: constants.ERROR_CODES.MISSING_CONTENT 
      });
    }
    
    const memoryType = type && constants.VALID_TYPES.includes(type) ? type : constants.DEFAULT_TYPE;
    const trimmedContent = content.trim();
    
    if (trimmedContent.length < constants.CONTENT_MIN_LENGTH) {
      return res.status(400).json({ 
        error: `Content muy corto (mínimo ${constants.CONTENT_MIN_LENGTH} caracteres)`, 
        code: constants.ERROR_CODES.CONTENT_TOO_SHORT 
      });
    }

    if (trimmedContent.length > constants.CONTENT_MAX_LENGTH) {
      return res.status(400).json({ 
        error: `Content muy largo (máximo ${constants.CONTENT_MAX_LENGTH} caracteres)`, 
        code: constants.ERROR_CODES.CONTENT_TOO_SHORT 
      });
    }
    
    const result = await service.createMemory(trimmedContent, memoryType);
    console.log(`[SAVE] ID:${result.id} type:${memoryType} content:"${trimmedContent.substring(0, 30)}..."`);
    res.json(result);
  } catch (err) {
    console.error(`[SAVE ERROR] ${err.message}`);
    res.status(500).json({ error: err.message, code: constants.ERROR_CODES.DB_ERROR });
  }
};

const search = async (req, res) => {
  try {
    const { q, type, limit = constants.SEARCH_LIMIT_DEFAULT, offset = constants.SEARCH_OFFSET_DEFAULT } = req.query;
    
    if (type && !constants.VALID_TYPES.includes(type)) {
      return res.status(400).json({ 
        error: `Tipo inválido. Usar: ${constants.VALID_TYPES.join(", ")}`, 
        code: constants.ERROR_CODES.INVALID_TYPE 
      });
    }
    
    const result = await service.findMemory(q, type, Math.min(parseInt(limit), constants.SEARCH_LIMIT_MAX), parseInt(offset));
    console.log(`[SEARCH] q:"${q || ""}" type:${type || "all"} results:${result.length}`);
    res.json(result);
  } catch (err) {
    console.error(`[SEARCH ERROR] ${err.message}`);
    res.status(500).json({ error: err.message, code: constants.ERROR_CODES.DB_ERROR });
  }
};

const getByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = constants.SEARCH_LIMIT_DEFAULT, offset = constants.SEARCH_OFFSET_DEFAULT } = req.query;
    
    if (!constants.VALID_TYPES.includes(type)) {
      return res.status(400).json({ 
        error: `Tipo inválido. Usar: ${constants.VALID_TYPES.join(", ")}`, 
        code: constants.ERROR_CODES.INVALID_TYPE 
      });
    }
    const result = await service.getByType(type, Math.min(parseInt(limit), constants.SEARCH_LIMIT_MAX), parseInt(offset));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, code: constants.ERROR_CODES.DB_ERROR });
  }
};

const getAll = async (req, res) => {
  try {
    const { limit = constants.SEARCH_LIMIT_DEFAULT, offset = constants.SEARCH_OFFSET_DEFAULT } = req.query;
    const result = await service.getAll(Math.min(parseInt(limit), constants.SEARCH_LIMIT_MAX), parseInt(offset));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, code: constants.ERROR_CODES.DB_ERROR });
  }
};

module.exports = { save, search, getByType, getAll };