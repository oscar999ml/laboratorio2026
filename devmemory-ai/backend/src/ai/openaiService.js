require("dotenv").config();
const model = require("../models/memoryModel");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function askWithContext(question) {
  const memories = await model.searchMemory(question);
  
  if (!OPENAI_API_KEY) {
    return {
      question,
      context: memories,
      warning: "API key no configurada. Agrega OPENAI_API_KEY en .env",
      respuesta: "Configure OPENAI_API_KEY para obtener respuesta de IA"
    };
  }

  const context = memories.map(m => `- [${m.type}] ${m.content}`).join("\n");

  const prompt = `Eres un asistente de IA especializado en desarrollo de software.
Tienes acceso a una base de conocimientos con memorias previas del proyecto.

Contexto:
${context}

Pregunta: ${question}

Responde de manera útil basada en el contexto. Si no hay información relevante, indica que no tienes esa información.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return {
        question,
        context: memories,
        respuesta: `Error: ${data.error.message}`
      };
    }
    
    return {
      question,
      context: memories,
      respuesta: data.choices?.[0]?.message?.content || "Sin respuesta"
    };
  } catch (err) {
    return {
      question,
      context: memories,
      respuesta: `Error: ${err.message}`
    };
  }
}

module.exports = { askWithContext };