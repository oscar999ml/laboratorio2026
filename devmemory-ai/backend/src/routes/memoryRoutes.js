const express = require("express");
const router = express.Router();
const controller = require("../controllers/memoryController");

router.post("/save", controller.save);
router.get("/search", controller.search);
router.get("/type/:type", controller.getByType);
router.get("/all", controller.getAll);

module.exports = router;