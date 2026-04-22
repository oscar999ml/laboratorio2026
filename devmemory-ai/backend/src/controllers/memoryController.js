const service = require("../services/memoryService");

const save = async (req, res) => {
  try {
    const { content, type } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content es requerido" });
    }
    const result = await service.createMemory(content, type || "general");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const search = async (req, res) => {
  try {
    const { q, type } = req.query;
    const result = await service.findMemory(q, type);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getByType = async (req, res) => {
  try {
    const { type } = req.params;
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