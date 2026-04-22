const service = require("../services/projectService");

const create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name es requerido" });
    }
    const result = await service.create(name, description || "");
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

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await service.getById(id);
    if (!result) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const result = await service.update(id, name, description || "");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await service.remove(id);
    res.json({ message: "Proyecto eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { create, getAll, getById, update, remove };