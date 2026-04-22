const db = require("../config/db");

const createProject = (name, description = "") => {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO projects (name, description) VALUES (?, ?)",
      [name, description],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, name, description });
      }
    );
  });
};

const getAllProjects = () => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM projects ORDER BY updated_at DESC",
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

const getProject = (id) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM projects WHERE id = ?",
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
};

const updateProject = (id, name, description) => {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name, description, id],
      function (err) {
        if (err) reject(err);
        else resolve({ id, name, description });
      }
    );
  });
};

const deleteProject = (id) => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM projects WHERE id = ?", [id], function (err) {
      if (err) reject(err);
      else resolve({ id });
    });
  });
};

module.exports = { createProject, getAllProjects, getProject, updateProject, deleteProject };