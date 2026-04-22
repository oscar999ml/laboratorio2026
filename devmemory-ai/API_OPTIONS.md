# 💡 OPCIONES DE IA/API - ANÁLISIS COMPARATIVO

**Documento**: API_OPTIONS.md  
**Fecha**: 22 de Abril, 2026  
**Próxima decisión**: Cuando se resuelva presupuesto  

---

## 📊 COMPARATIVA GENERAL

| Criterio | Búsqueda Local | Ollama Local | OpenAI API |
|----------|----------------|--------------|-----------|
| **Costo** | $0 | $0 | $0* / $5-10/mes |
| **Setup** | 0 min | 30 min | 5 min |
| **Calidad IA** | N/A | Media | Alta |
| **Velocidad** | Rápida | Lenta (1-5s) | Rápida (1-2s) |
| **Privacidad** | 100% Local | 100% Local | Datos a OpenAI |
| **Escalabilidad** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Documentación** | - | Media | Excelente |
| **Estado en código** | ✅ Activo | 📋 Planeado | 📋 Pronto |

*$0 con crédito educativo ($200), luego $5-10/mes

---

## 🔍 OPCIÓN 1: BÚSQUEDA LOCAL (ACTUAL)

### ✅ Estado Actual
```
Implementación: COMPLETADA
Endpoint: GET /memory/search
Funciona: SÍ ✅
Tests: Manuales en test.js
```

### Características
- Búsqueda por palabras clave
- Scoring basado en coincidencias
- Filtrado por tipo (bug/decision/feature)
- 10 resultados ordenados por fecha

### Código Actual
```javascript
// backend/src/models/memoryModel.js
const searchMemory = (query, type = null) => {
  // Búsqueda con LIKE %query%
  // Scoring: 100 (exacto), 50 (substring), 10 (keyword)
  // Retorna: array de memorias ordenadas por relevancia
}
```

### Limitaciones
```
❌ No entiende semántica
❌ No puede responder preguntas
❌ Solo búsqueda literal
❌ No aprende del usuario
```

### Ejemplo de Uso
```bash
# Guardar
POST /memory/save
{ "content": "error en login con JWT", "type": "bug" }
→ { id: 1, content: "...", type: "bug" }

# Buscar
GET /memory/search?q=login
→ [
  { id: 1, content: "error en login con JWT", type: "bug", score: 60 },
  ...
]
```

### Cuándo Usar
- ✅ Desarrollo inicial
- ✅ Demostración funcional
- ✅ Sin presupuesto aún
- ✅ Bajo volumen de consultas

---

## 🦙 OPCIÓN 2: OLLAMA LOCAL (GRATUITO)

### Estado Actual
```
Implementación: PENDIENTE
Endpoint: Será POST /ai/ask (alternativa)
Funciona: NO (aún)
Complejidad: Alta
```

### Qué es Ollama
- Servicio de IA gratuito que corre localmente
- Descarga modelos (Llama2, Mistral, Neural Chat)
- No envía datos a internet
- ~4GB de RAM necesarios

### Instalación
```bash
# 1. Descargar desde: https://ollama.ai
# Windows/Mac/Linux: Ejecutar installer

# 2. Verificar instalación
ollama --version
# ollama version is 0.1.0

# 3. Descargar modelo (primera vez tarda 5-10 min)
ollama pull mistral
# o
ollama pull llama2

# 4. Ejecutar servicio
ollama serve
# Escucha en http://localhost:11434
```

### Modelos Disponibles

| Modelo | Tamaño | Velocidad | Calidad | Recomendado |
|--------|--------|-----------|---------|------------|
| Mistral | 4.1GB | Rápido | Media-Alta | ✅ MEJOR |
| Llama2 | 3.8GB | Media | Media | ⭐ |
| Neural Chat | 4GB | Media | Media | ⭐ |
| Orca | 3.5GB | Rápido | Media-Baja | - |

### Implementación en Backend

```javascript
// backend/src/ai/ollama-service.js (PENDIENTE)
const askWithOllama = async (question) => {
  const memories = await memoryModel.searchMemory(question);
  
  const prompt = `Eres asistente de desarrollo.
Contexto: ${memories.map(m => m.content).join('\n')}
Pregunta: ${question}
Responde brevemente.`;
  
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'mistral',
      prompt: prompt,
      stream: false
    })
  });
  
  const data = await response.json();
  return {
    question,
    respuesta: data.response,
    memoria: memories
  };
};
```

### Ventajas
✅ Completamente gratuito
✅ Sin límites de uso
✅ Máxima privacidad (todo local)
✅ Sin conexión a internet requerida
✅ Puede correr 24/7 sin costo

### Desventajas
❌ Calidad inferior a OpenAI
❌ Respuestas más genéricas
❌ Requiere ~4GB RAM
❌ Más lento (2-5 segundos por respuesta)
❌ Menos documentación
❌ Modelo no específico para código

### Cuándo Usar
- ✅ Sin presupuesto disponible
- ✅ Máxima privacidad requerida
- ✅ Bajo volumen de consultas
- ✅ No necesita respuestas perfectas
- ✅ Máquina con suficiente RAM

### Estimación de Trabajo
```
Setup local: 15 min
Código backend: 1-2 horas
Tests: 1 hora
Total: 2-3 horas
```

---

## 🤖 OPCIÓN 3: OPENAI API ($200 EDUCATIVO O $5-10/MES)

### Estado Actual
```
Implementación: PARCIAL (necesita mejora)
Endpoint: POST /ai/ask
Funciona: Sí, si hay OPENAI_API_KEY
Status: Esperando presupueto
```

### Modelos Disponibles

| Modelo | Costo | Velocidad | Calidad | Recomendado |
|--------|-------|-----------|---------|------------|
| gpt-4o-mini | $0.15/1M in | Ultra-rápido | Muy Alta | ✅ MEJOR |
| gpt-4 turbo | $10/1M in | Rápido | Excelente | 💰 Caro |
| gpt-3.5-turbo | $0.50/1M in | Muy rápido | Media-Alta | - |

**Recomendado**: gpt-4o-mini (mejor relación costo/beneficio)

### Calculadora de Costos

```
Promedio por query: 500 tokens entrada + 200 tokens salida = 700 tokens
Costo por query: 700 * $0.15/1M = $0.000105 ≈ 0.01¢

Estimaciones mensuales:
- 10 queries/día: $0.03/mes (negligible)
- 100 queries/día: $0.30/mes
- 1000 queries/día: $3/mes
- 10000 queries/día: $30/mes

Entonces: $200 USD = ~2000 meses de uso promedio 🎉
```

### Instalación

```bash
# 1. Crear cuenta OpenAI
Ir a: https://platform.openai.com/signup

# 2. Obtener API Key
Ir a: https://platform.openai.com/api-keys
Crear nueva key: "DevMemory"
Copiar: sk-proj-xxxxxxxxxxxxx

# 3. Agregar a .env
echo "OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx" > backend/.env

# 4. Verificar en código
En backend/src/ai/openaiService.js ya está la implementación
```

### Implementación Actual

```javascript
// backend/src/ai/openaiService.js
async function askWithContext(question) {
  const memories = await model.searchMemory(question);
  
  const context = memories
    .map(m => `- [${m.type}] ${m.content}`)
    .join("\n");
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  });
  
  return response.json();
}
```

### Mejoras Necesarias

```javascript
// TODO 1: Agregar timeout
const timeout = 30000; // 30 segundos
const controller = new AbortController();
const id = setTimeout(() => controller.abort(), timeout);

// TODO 2: Mejor error handling
try {
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
} catch (err) {
  if (err.name === 'AbortError') {
    return { error: 'Timeout esperando respuesta de IA' };
  }
}

// TODO 3: Implementar retry logic
// TODO 4: Agregar token counting
// TODO 5: Implementar caché de respuestas
```

### Ventajas
✅ Mejor calidad de respuestas
✅ Entiende contexto y semántica
✅ Rápido (1-2 segundos)
✅ Bien documentado
✅ Soporte 24/7
✅ Bajo costo ($200 educativo)
✅ Production-ready

### Desventajas
❌ Requiere presupuesto ($200 o tarjeta)
❌ Datos enviados a OpenAI
❌ Dependencia de conectividad
❌ Límites de rate (si mucho uso)
❌ Requiere API key (riesgo de exposición)

### Cuándo Usar
- ✅ Presupuesto confirmado
- ✅ Calidad alta requerida
- ✅ Respuestas contextuales
- ✅ Production deployment
- ✅ Soporte profesional necesario

### Estimación de Trabajo
```
Setup API: 10 min
Mejorar error handling: 1-2 horas
Implementar retry: 1 hora
Tests: 1 hora
Total: 3-4 horas
```

---

## 🤔 OPCIONES DE PRESUPUETO

### Opción A: Usar Email Institucional ($200)

```
Procesos:
1. Verificar elegibilidad: https://openai.com/free-credits
2. Crear cuenta OpenAI con email institucional
3. Aplicar código de crédito ($200)
4. Configurar billing (no requiere tarjeta si hay crédito)
5. Copiar API key a .env

Duración: ~20 meses de uso normal
Costo de bolsillo: $0
Requisitos: Email educativo activo
```

✅ RECOMENDADO - Sin costo y educativo

### Opción B: Tarjeta de Crédito Personal

```
Costo: $5-10 USD mensual (aproximado)
Inicio: Inmediato después de billing
Duración: Indefinida
Requisitos: Tarjeta de crédito
```

⚠️ Segundo best - Recurrente pero low cost

### Opción C: Presupuesto de Institución

```
Requiere: Aprobación de finanzas/TI
Proceso: Solicitud formal
Tiempo: 2-4 semanas
```

❌ Lento para MVP

---

## 📋 DECISIÓN RECOMENDADA

### AHORA (Fase 1 - ACTUAL)
```
✅ USAR: Búsqueda Local
  - Ya funciona
  - Cero presupuesto
  - MVP operacional
  - Tests pasando

Duración: 2-3 semanas (hasta resolver presupuesto)
```

### PRONTO (Fase 2 - MAYO)
```
Si hay $200 educativo:
  → USAR: OpenAI API
  → Mejorar error handling
  → Implementar tests
  → Production-ready

Si no hay presupuesto:
  → USAR: Ollama Local
  → Privacidad total
  → Bajo costo
  → Buena experiencia de desarrollo
```

### FUTURO (Fase 3)
```
Posible: Implementar AMBAS
  - OpenAI como preferente
  - Ollama como fallback
  - Usuario elige en settings
```

---

## 🎯 ACCIÓN RECOMENDADA AHORA

```bash
# 1. Documentar esta decisión ✅ (HECHO)

# 2. Resolver presupuesto
   [ ] Contactar institución por $200
   [ ] Revisar términos de uso
   [ ] Crear cuenta OpenAI si aprobado

# 3. Mantener búsqueda local funcionando
   [x] Tests pasando
   [x] Documentación
   [ ] Agregar indices DB (mejora performance)

# 4. Preparar para integración IA
   [ ] Revisar openaiService.js
   [ ] Crear plan de mejora
   [ ] Diseñar tests para IA
```

---

## 📞 REFERENCIAS

### OpenAI
- Sitio: https://platform.openai.com
- API Keys: https://platform.openai.com/api-keys
- Pricing: https://openai.com/pricing
- Créditos educativos: https://openai.com/free-credits
- Documentación: https://platform.openai.com/docs

### Ollama
- Sitio: https://ollama.ai
- Modelos: https://ollama.ai/library
- GitHub: https://github.com/ollama/ollama
- Documentación: https://github.com/ollama/ollama/wiki

### Búsqueda Local
- SQLite: https://www.sqlite.org
- Mejora: Considera PostgreSQL pg_trgm para búsqueda semántica

---

**Documento mantenido por**: Equipo DevMemory  
**Última actualización**: 22 de Abril, 2026  
**Próxima revisión**: Mayo 2026 (cuando se resuelva presupuesto)
