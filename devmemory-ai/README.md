# DevMemory AI

Sistema de memoria persistente para asistentes de IA basado en RAG (Retrieval Augmented Generation), con integración en entorno de desarrollo.

## Características

- Backend modular con Express.js
- Base de datos SQLite para persistencia
- Sistema de memoria con categorización (bug, decision, feature)
- Búsqueda por palabras clave con scoring
- IA local con Ollama (mistral)
- Extensión VS Code
- Interfaz UI web

## Instalación

```bash
cd backend
npm install
```

## Ejecución

```bash
node server.js
```

Servidor corriendo en http://localhost:3000

## API Endpoints

### Guardar memoria
```bash
curl -X POST http://localhost:3000/memory/save \
-H "Content-Type: application/json" \
-d '{"content":"error en login","type":"bug"}'
```

### Buscar memoria
```bash
curl "http://localhost:3000/memory/search?q=login"
```

## Estructura

```
devmemory-ai/
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── controllers/memoryController.js
│   │   ├── routes/memoryRoutes.js
│   │   ├── services/memoryService.js
│   │   └── models/memoryModel.js
│   ├── server.js
│   └── package.json
└── README.md
```

## Roadmap

- [x] Día 1-3: Backend funcional con SQLite
- [x] Día 4: Búsqueda mejorada con pseudo-IA
- [x] Día 5: Integración con OpenAI/Claude API
- [x] Día 6: Extensión de VS Code
- [x] Día 7: Pulido y documentación ✅

## Progreso

### Día 1-3: Backend ✅
- Servidor Express.js corriendo en puerto 3000
- Base de datos SQLite con tabla memories
- Endpoints: POST /memory/save, GET /memory/search

### Día 4: Pseudo-IA ✅
- Búsqueda por palabras clave con scoring
- Filtrado por tipo (bug, decision, feature)
- Nuevos endpoints: /memory/type/:type, /memory/all

### Día 5: IA ✅
- Endpoint POST /ai/ask
- Busca contexto en memorias
- Requiere OPENAI_API_KEY en .env (configuración de ejemplo en .env.example)

### Día 6: Extensión VS Code ✅
- Carpeta vscode-extension/
- Comandos: guardar, buscar, preguntar
- Atajo: Ctrl+Shift+M

### Día 7: Pulido ✅
- Health check endpoint (/health)
- Logs mejorados
- Validación de tipos
- Manejo de errores

## API Reference

### Endpoints

| Método | Ruta | Descripción |
|--------|------|------------|
| GET | /health | Health check |
| POST | /memory/save | Guardar memoria |
| GET | /memory/search?q=... | Buscar memorias |
| GET | /memory/type/:type | Filtrar por tipo |
| GET | /memory/all | Todas las memorias |
| POST | /ai/ask | Preguntar a IA |

### Tipos de memoria
- `bug` - Errores y soluciones
- `decision` - Decisiones de diseño
- `feature` - Features implementado
- `general` - Notas generales

## Interfaz UI

Abre en el navegador:
```
http://localhost:3000
```

O simplemente abre `frontend/index.html` en tu navegador.

## Estructura final

```
devmemory-ai/
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── ai/openaiService.js
│   ├── server.js
│   └── .env
├── frontend/
│   └── index.html
├── vscode-extension/
│   ├── extension.js
│   └── package.json
└── README.md
```

## Configuración

### Ollama (IA local)

```bash
# Asegúrate de tener Ollama instalado y corriendo
# Descarga un modelo: ollama pull mistral

# Configurar (opcional)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

### OpenAI (opcional)

```bash
cp .env.example .env
OPENAI_API_KEY=sk-...

"error en login" 
"error al cargar dashboard"
"decisión: usar React para frontend"