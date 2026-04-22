const express = require("express");
const cors = require("cors");

const memoryRoutes = require("./routes/memoryRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/memory", memoryRoutes);
app.use("/ai", aiRoutes);

module.exports = app;