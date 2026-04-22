const model = require("../models/memoryModel");

const createMemory = async (content, type) => {
  return await model.saveMemory(content, type);
};

const findMemory = async (query, type = null, limit = 10, offset = 0) => {
  return await model.searchMemory(query, type, limit, offset);
};

const getByType = async (type, limit = 10, offset = 0) => {
  return await model.getMemoriesByType(type, limit, offset);
};

const getAll = async (limit = 10, offset = 0) => {
  return await model.getAllMemories(limit, offset);
};

module.exports = { createMemory, findMemory, getByType, getAll };