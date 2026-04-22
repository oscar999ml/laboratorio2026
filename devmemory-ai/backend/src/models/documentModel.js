const db = require("../config/db");

const createDocument = (projectId, title, content = "", tags = "", category = "") => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO documents (project_id, title, content, tags, category) VALUES (?, ?, ?, ?, ?)",
      [projectId, title, content, tags, category],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, project_id: projectId, title, content, tags, category });
      }
    );
  });
};

const getDocumentsByProject = (projectId) => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM documents WHERE project_id = ? ORDER BY updated_at DESC",
      [projectId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

const getAllDocuments = () => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT d.*, p.name as project_name FROM documents d LEFT JOIN projects p ON d.project_id = p.id ORDER BY d.updated_at DESC",
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

const getDocument = (id) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT d.*, p.name as project_name FROM documents d LEFT JOIN projects p ON d.project_id = p.id WHERE d.id = ?",
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
};

const updateDocument = (id, title, content, tags, category) => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE documents SET title = ?, content = ?, tags = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [title, content, tags, category, id],
      function (err) {
        if (err) reject(err);
        else resolve({ id, title, content, tags, category });
      }
    );
  });
};

const deleteDocument = (id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM documents WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve({ id });
    });
  });
};

const searchDocuments = (query) => {
  return new Promise((resolve, reject) => {
    const q = `%${query}%`;
    db.all(
      "SELECT d.*, p.name as project_name FROM documents d LEFT JOIN projects p ON d.project_id = p.id WHERE d.title LIKE ? OR d.content LIKE ? OR d.tags LIKE ? ORDER BY d.updated_at DESC LIMIT 20",
      [q, q, q],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

module.exports = { 
  createDocument, 
  getDocumentsByProject, 
  getAllDocuments, 
  getDocument, 
  updateDocument, 
  deleteDocument,
  searchDocuments 
};