const documentModel = require("../models/documentModel");

const create = async (projectId, title, content, tags, category) => {
  return await documentModel.createDocument(projectId, title, content, tags, category);
};

const getByProject = async (projectId) => {
  return await documentModel.getDocumentsByProject(projectId);
};

const getAll = async () => {
  return await documentModel.getAllDocuments();
};

const getById = async (id) => {
  return await documentModel.getDocument(id);
};

const update = async (id, title, content, tags, category) => {
  return await documentModel.updateDocument(id, title, content, tags, category);
};

const remove = async (id) => {
  return await documentModel.deleteDocument(id);
};

const search = async (query) => {
  return await documentModel.searchDocuments(query);
};

module.exports = { create, getByProject, getAll, getById, update, remove, search };