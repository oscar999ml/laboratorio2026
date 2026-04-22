const aiService = require("./openaiService");

const ask = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question es requerido" });
    }
    const result = await aiService.askWithContext(question);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { ask };