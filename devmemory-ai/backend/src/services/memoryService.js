const model = require("../models/memoryModel");

const createMemory = async (content, type) => {
  return await model.saveMemory(content, type);
};

const findMemory = async (query, type = null) => {
  return await model.searchMemory(query, type);
};

const getByType = async (type) => {
  return await model.getMemoriesByType(type);
};

const getAll = async () => {
  return await model.getAllMemories();
};

module.exports = { createMemory, findMemory, getByType, getAll };