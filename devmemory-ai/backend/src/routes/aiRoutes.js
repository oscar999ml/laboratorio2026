const express = require("express");
const router = express.Router();
const aiController = require("../ai/aiController");

router.post("/ask", aiController.ask);

module.exports = router;