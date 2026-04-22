const express = require("express");
const cors = require("cors");

const memoryRoutes = require("./routes/memoryRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/memory", memoryRoutes);

module.exports = app;