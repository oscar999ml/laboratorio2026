require("dotenv").config();
const model = require("../models/memoryModel");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";

async function askWithContext(question) {
  try {
    const memories = await model.searchMemory(question);
    
    const context = memories.map(m => `[${m.type}] ${m.content}`).join("\n\n");
    
    const prompt = `Eres un asistente de IA especializado en desarrollo de software.
Tienes acceso a una base de conocimientos con memorias del proyecto.

Contexto:
${context}

Pregunta: ${question}

Responde de manera útil basada en el contexto. Si no hay información relevante, responde indicando que no tienes esa información.`;

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false
      })
    });

    const data = await response.json();
    
    return {
      question,
      context: memories,
      respuesta: data.message?.content || data.response || "Sin respuesta",
      model: OLLAMA_MODEL
    };
  } catch (err) {
    return {
      question,
      context: [],
      respuesta: `Error: ${err.message}`
    };
  }
}

module.exports = { askWithContext };