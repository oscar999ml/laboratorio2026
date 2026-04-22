# DevMemory AI

Sistema de memoria persistente para asistentes de IA basado en RAG (Retrieval Augmented Generation), con integración en entorno de desarrollo.

## Características

- Backend modular con Express.js
- Base de datos SQLite para persistencia
- Sistema de memoria con categorización (bug, decision, feature)
- Búsqueda por palabras clave
- Listo para integración con IA (OpenAI/Claude)
- Extensión VS Code (en desarrollo)

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
- [ ] Día 4: Búsqueda mejorada con pseudo-IA
- [ ] Día 5: Integración con OpenAI/Claude API
- [ ] Día 6: Extensión de VS Code
- [ ] Día 7: Pulido y documentación