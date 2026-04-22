const projectModel = require("../models/projectModel");

const create = async (name, description) => {
  return await projectModel.createProject(name, description);
};

const getAll = async () => {
  return await projectModel.getAllProjects();
};

const getById = async (id) => {
  return await projectModel.getProject(id);
};

const update = async (id, name, description) => {
  return await projectModel.updateProject(id, name, description);
};

const remove = async (id) => {
  return await projectModel.deleteProject(id);
};

module.exports = { create, getAll, getById, update, remove };