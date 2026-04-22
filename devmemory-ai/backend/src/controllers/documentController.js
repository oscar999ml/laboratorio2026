const service = require("../services/documentService");

const create = async (req, res) => {
  try {
    const { project_id, title, content, tags, category } = req.body;
    if (!project_id || !title) {
      return res.status(400).json({ error: "project_id y title son requeridos" });
    }
    const result = await service.create(project_id, title, content || "", tags || "", category || "");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await service.getByProject(projectId);
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
      return res.status(404).json({ error: "Documento no encontrado" });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags, category } = req.body;
    const result = await service.update(id, title, content || "", tags || "", category || "");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await service.remove(id);
    res.json({ message: "Documento eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const search = async (req, res) => {
  try {
    const { q } = req.query;
    const result = await service.search(q);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { create, getByProject, getAll, getById, update, remove, search };