const service = require("../services/memoryService");

const VALID_TYPES = ["bug", "decision", "feature", "general", "note"];

const save = async (req, res) => {
  try {
    const { content, type } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Content es requerido", code: "MISSING_CONTENT" });
    }
    
    const memoryType = type && VALID_TYPES.includes(type) ? type : "general";
    const trimmedContent = content.trim();
    
    if (trimmedContent.length < 3) {
      return res.status(400).json({ error: "Content muy corto (mínimo 3 caracteres)", code: "CONTENT_TOO_SHORT" });
    }
    
    const result = await service.createMemory(trimmedContent, memoryType);
    console.log(`[SAVE] ID:${result.id} type:${memoryType} content:"${trimmedContent.substring(0, 30)}..."`);
    res.json(result);
  } catch (err) {
    console.error(`[SAVE ERROR] ${err.message}`);
    res.status(500).json({ error: err.message, code: "SAVE_FAILED" });
  }
};

const search = async (req, res) => {
  try {
    const { q, type } = req.query;
    
    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Tipo inválido. Usar: ${VALID_TYPES.join(", ")}`, code: "INVALID_TYPE" });
    }
    
    const result = await service.findMemory(q, type);
    console.log(`[SEARCH] q:"${q || ""}" type:${type || "all"} results:${result.length}`);
    res.json(result);
  } catch (err) {
    console.error(`[SEARCH ERROR] ${err.message}`);
    res.status(500).json({ error: err.message, code: "SEARCH_FAILED" });
  }
};

const getByType = async (req, res) => {
  try {
    const { type } = req.params;
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Tipo inválido. Usar: ${VALID_TYPES.join(", ")}`, code: "INVALID_TYPE" });
    }
    const result = await service.getByType(type);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAll = async (req, res) => {
  try {
    const result = await service.getAll();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { save, search, getByType, getAll };