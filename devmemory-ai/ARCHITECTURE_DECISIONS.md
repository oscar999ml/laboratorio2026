# 🏗️ DECISIONES ARQUITECTÓNICAS

**Documento**: ARCHITECTURE_DECISIONS.md  
**Versión**: 1.0  
**Fecha**: 22 de Abril, 2026  
**Estado**: ACTIVO

---

## ADR-001: Búsqueda Local Sin IA (Fase Actual)

### Contexto
El proyecto necesita un sistema de búsqueda funcional. Se tienen 3 opciones de IA.

### Decisión
**Usar SOLO búsqueda local (sin IA) en Fase 1**

### Razones
1. **Ya funciona**: `/memory/search` está implementado y probado
2. **Sin dependencias externas**: No requiere conexión a APIs
3. **Sin costos**: No hay gasto mientras se evalúan opciones
4. **MVP viable**: Es suficiente para demostración
5. **Baseline**: Permite comparar mejoras futuras

### Consecuencias
✅ Positivas:
- Sistema operacional sin bloqueos
- Búsqueda por palabras clave funciona
- Scoring de relevancia implementado
- Bajo acoplamiento

⚠️ Limitaciones:
- No hay respuestas contextuales de IA
- No entiende semántica (solo keywords)
- No hay summarización
- Usuarios ven solo raw data

### Alternativas Rechazadas
- ❌ OpenAI inmediato: Sin presupuesto confirmado aún
- ❌ Ollama inmediato: Complejidad sin beneficio demostrado

### Estado
- Implementación: ✅ Completada
- Testing: ✅ En uso
- Documentación: ✅ Este archivo
- Fecha de revisión: Mayo 2026

---

## ADR-002: Estructura MVC + Service Layer

### Decisión
**Mantener arquitectura actual: Routes → Controller → Service → Model**

### Razones
1. Separación clara de responsabilidades
2. Fácil de testear cada capa
3. Reutilización de servicios
4. Estándar de la industria

### Estructura
```
Routes (API contracts)
  ↓
Controller (HTTP validation)
  ↓
Service (Business logic)
  ↓
Model (Data access)
  ↓
Database (SQLite)
```

### Ventajas Actuales
- ✅ Fácil agregar nuevas rutas
- ✅ Controlador hace validación
- ✅ Service es agnóstico a HTTP
- ✅ Model solo sabe de DB

### Mejoras Futuras
- Agregar DTO layer para transformaciones
- Agregar Repository pattern
- Considerar CQRS si crece mucho

### Estado
- Vigencia: ✅ Indefinida
- Revisión: Cuando tenga >10 rutas

---

## ADR-003: SQLite Como Base de Datos

### Decisión
**Usar SQLite para Fase 1-2. Migrar a PostgreSQL en Fase 3 si es necesario.**

### Razones
1. Zero setup: Funciona sin servidor
2. Archivo embebido: Fácil de llevar
3. Desarrollo rápido: No hay instalación
4. Suficiente para <1M registros

### Limitaciones Conocidas
⚠️ Performance:
- Sin índices: O(n) en búsquedas
- Sin caché: Cada query va a disco
- Concurrencia limitada

⚠️ Escalabilidad:
- No recomendado para >100K registros activos
- Locks si hay escrituras simultáneas

### Mejoras Planeadas
1. **Hoy**: Agregar índices en `content`
2. **Próximo**: Agregar índice compuesto (content, type)
3. **Luego**: Implementar caché Redis (opcional)
4. **Final**: Migrar a PostgreSQL si crece

### Migración Futura
```sql
-- Script de migración será en: backend/migrations/001-sqlite-to-postgres.sql
-- Preservará todos los datos
-- Será ejecutable con script automatizado
```

### Estado
- Vigencia: ✅ Fase 1-2
- Revisión: Cuando tenga >50K memorias

---

## ADR-004: Extensión VS Code + Backend Separado

### Decisión
**Backend en Node.js. Extensión en VS Code API. Comunicación HTTP.**

### Arquitectura
```
┌─────────────────────┐
│   VS Code Extension │
│  (vscode-extension/)│
└──────────┬──────────┘
           │ HTTP POST/GET
           ↓
┌─────────────────────┐
│   Node.js Backend   │
│   (backend/server)  │
└──────────┬──────────┘
           │ SQL
           ↓
┌─────────────────────┐
│   SQLite Database   │
│   (memory.db)       │
└─────────────────────┘
```

### Razones
1. **Separación**: Extension solo UI, Backend solo lógica
2. **Reutilizable**: Otros clientes pueden usar API (web, mobile, CLI)
3. **Independiente**: Ext puede reiniciarse sin perder datos
4. **Testeable**: Backend se prueba sin VS Code

### Rutas Actuales

| Método | Ruta | Usado por |
|--------|------|----------|
| GET | `/health` | Extension (healthcheck) |
| POST | `/memory/save` | Extension + tests |
| GET | `/memory/search` | Extension + tests |
| GET | `/memory/type/:type` | Planeado: filtros |
| GET | `/memory/all` | Planeado: listar todo |
| POST | `/ai/ask` | Fase 2: con IA |

### Mejoras Futuras
- [ ] Agregar autenticación (JWT token)
- [ ] Rate limiting por cliente
- [ ] Versionado de API (/v1/, /v2/)
- [ ] WebSocket para real-time updates

### Estado
- Vigencia: ✅ Indefinida
- Escalabilidad: ✅ Buena

---

## ADR-005: Sin Autenticación Por Ahora

### Decisión
**No implementar autenticación en Fase 1. Agregar en Fase 2.**

### Razones
1. MVP no lo requiere
2. Backend corre localmente en puerto 3000
3. Asumimos usuario único (local)
4. Complejidad prematura

### Riesgos Actuales
⚠️ Bajo (porque):
- Servidor solo en localhost:3000
- No expuesto a internet
- Usuario está en su máquina

### Cuándo Implementar
- Cuando se exponga a red/internet
- Cuando haya múltiples usuarios
- Cuando tenga datos sensibles

### Plan Futuro
```javascript
// Fase 2: Agregar JWT
POST /auth/login { user, password }
→ Retorna JWT token

// Luego: En headers
Authorization: Bearer <token>

// Middleware en app.js
app.use(authMiddleware)
```

### Estado
- Urgencia: 🟠 BAJA (por ahora)
- Revisión: Cuando haya múltiples usuarios

---

## ADR-006: Scoring de Búsqueda Simplista (Ahora) → Mejora Futura

### Decisión Actual
**Usar scoring basado en coincidencias (100, 50, 10 puntos)**

### Implementación Actual
```javascript
// En memoryModel.js searchMemory()
if (contentLower === qLower) score += 100;      // Match exacto
else if (contentLower.includes(qLower)) score += 50;  // Substring
keywords.forEach(kw => {
  if (contentLower.includes(kw)) score += 10;  // Palabra
});
```

### Limitaciones
❌ Sin TF-IDF: No considera frecuencia
❌ Sin semántica: No entiende significado
❌ Sin contexto: No usa tipo de memoria

### Plan de Mejora

**Fase 2: Scoring Mejorado**
```javascript
// Agregar ponderación por tipo
const typeWeight = { bug: 1.5, decision: 1.2, feature: 1.0 };

// Considerar fecha (memorias recientes pesan más)
const daysSinceCreation = (Date.now() - created_at) / (1000*60*60*24);
const recencyBoost = 1 + (1 / Math.log10(daysSinceCreation));

// Final
finalScore = basicScore * typeWeight * recencyBoost;
```

**Fase 3: Machine Learning (opcional)**
- Vectorizar contenido (embeddings)
- Usar similitud coseno
- Aprender del feedback del usuario

### Estado
- Vigencia: ✅ Funcional, pero simple
- Mejora: Mayo 2026

---

## ADR-007: Logging Básico Ahora → Centralizado Luego

### Decisión Actual
**Usar console.log() + Middleware de timing**

### Implementación
```javascript
// En app.js
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${method} ${path} - ${status} (${duration}ms)`);
  });
  next();
});
```

### Limitaciones
⚠️ Logs no persistentes
⚠️ Sin niveles (info/warn/error)
⚠️ Sin contexto de usuario
⚠️ Difícil de buscar en producción

### Plan Futuro
**Fase 2: Logging Centralizado**
```javascript
// Usar winston o pino
const logger = require('winston');

logger.info('Memory saved', { id: 123, type: 'bug' });
logger.error('Search failed', { query: 'login', error: err.message });
```

**Persistencia**:
- Logs en archivo: `backend/logs/app.log`
- Rotación diaria
- Archivo de errores separado: `backend/logs/errors.log`

### Estado
- Urgencia: 🟡 MEDIA
- Revisión: Cuando esté en producción

---

## ADR-008: Testing Inexistente → Estrategia de Tests

### Decisión Actual
**Solo test.js manual. Sin tests automatizados.**

### Razones
- MVP enfoque: Funcionalidad primero
- Validación manual funciona por ahora
- Código pequeño aún

### Riesgos
🔴 ALTO:
- Cambios pueden romper features
- No hay regresión detection
- Difícil onboarding para otros

### Plan de Tests
**Fase 2: Tests Básicos**
```
/backend/tests/
├── unit/
│   ├── memoryModel.test.js
│   ├── memoryService.test.js
│   └── memoryController.test.js
├── integration/
│   ├── api.test.js
│   └── search.test.js
└── fixtures/
    └── sample-memories.json
```

**Framework**: Jest (recomendado)
**Coverage Target**: >80%
**Pre-commit**: Correr tests antes de push

### Estado
- Urgencia: 🔴 ALTA
- Fecha objetivo: Mayo 2026

---

## 📊 MATRIZ DE DECISIONES

| ADR | Tema | Estado | Vigencia | Revisión |
|-----|------|--------|----------|----------|
| 001 | Local Search | ✅ Activo | Fase 1-2 | Mayo |
| 002 | MVC + Service | ✅ Activo | Indefinida | >10 rutas |
| 003 | SQLite | ✅ Activo | Fase 1-2 | >50K |
| 004 | HTTP API | ✅ Activo | Indefinida | - |
| 005 | Sin Auth | ✅ Activo | Fase 1 | Multi-user |
| 006 | Scoring Simple | ✅ Activo | Fase 1-2 | Mayo |
| 007 | Logging Basic | ✅ Activo | Fase 1 | Producción |
| 008 | Sin Tests | ⚠️ Riesgo | Fase 1 | Mayo |

---

## 🚀 PRÓXIMAS DECISIONES A TOMAR

- [ ] ADR-009: Paginación vs Limit
- [ ] ADR-010: Caché (Redis o en-memory)
- [ ] ADR-011: Rate Limiting
- [ ] ADR-012: CI/CD Pipeline
- [ ] ADR-013: Migración BD (SQLite → PostgreSQL)

---

**Documento mantenido por**: Equipo DevMemory  
**Última actualización**: 22 de Abril, 2026  
**Próxima revisión**: Mayo 2026
