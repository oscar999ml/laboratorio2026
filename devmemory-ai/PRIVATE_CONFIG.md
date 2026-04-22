# 🔐 CONFIGURACIÓN PRIVADA - NO SUBIR A GITHUB

**Última actualización**: 22 de Abril, 2026

---

## 📋 ESTADO ACTUAL DE DECISIONES

### ✅ DECISIÓN TOMADA: Búsqueda Local Sin IA (Fase 1)

**Razón**: 
- La búsqueda local ya funciona perfectamente
- Evita dependencias externas por ahora
- Permite iterar sin costos iniciales
- Baseline operacional para demostración

**Estado**: ACTIVO
- Endpoint `/memory/search` ✅ Funciona
- Scoring de relevancia ✅ Implementado
- Tests manuales ✅ Pasando

---

## 💰 OPCIONES DE PAGO EVALUADAS

### Opción 1: OpenAI API ($5-10/mes)
```
Costo: $5-10 USD mensual
Modelo: gpt-4o-mini (más barato)
Pros:
  ✅ Mejor calidad de respuestas
  ✅ Bien documentado
  ✅ Integración lista (ya existe en código)
  ✅ Production-ready
Contras:
  ❌ Costo mensual
  ❌ Requiere tarjeta de crédito
```

**Decisión**: RESERVADO para Fase 2
- Esperar a tener más features
- O si hay presupuesto de marketing

---

### Opción 2: Usar Email Institucional ($200)
```
Crédito: $200 USD vía email institucional
Duración estimada: 20 meses ($10/mes)
Procedimiento:
  1. Verificar eligibilidad con tu institución
  2. Crear cuenta OpenAI
  3. Aplicar código de crédito
  4. Agregar OPENAI_API_KEY a .env
```

**Decisión**: PENDIENTE EJECUCIÓN
- Ideal para pruebas de producción
- No consume presupuesto personal
- Revisar términos de uso de email institucional

**Pasos para activar**:
```bash
# 1. Verificar https://openai.com/free-credits
# 2. Crear cuenta: https://platform.openai.com/signup
# 3. Copiar API Key de: https://platform.openai.com/api-keys
# 4. Guardar en .env:
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

---

### Opción 3: Ollama Local (Gratuito)
```
Costo: $0
Setup: Local en tu máquina
Modelo: Llama2 o Mistral (gratuitos)
Pros:
  ✅ Sin costo
  ✅ Sin límites de tasa
  ✅ Privacidad total
  ✅ Sin conexión a internet
Contras:
  ❌ Menor calidad que GPT-4
  ❌ Requiere recursos de máquina
  ❌ Implantación más compleja
```

**Decisión**: RESERVADO para Fase 3 (si no hay presupuesto)
- Backend en `/backend/src/ai/ollama.js` pendiente
- Requiere: Docker o instalación local de Ollama
- Tests de calidad necesarios

---

## 🔧 ARCHIVOS DE CONFIGURACIÓN PRIVADA

### Archivo: `.env` (NO en git)
```bash
# Backend
PORT=3000
NODE_ENV=development

# Base de datos
DB_PATH=./memory.db

# OpenAI (Fase 2)
# OPENAI_API_KEY=sk-proj-xxxxx
# OPENAI_MODEL=gpt-4o-mini
# OPENAI_TIMEOUT=30000

# Ollama (Fase 3)
# OLLAMA_API_URL=http://localhost:11434
# OLLAMA_MODEL=mistral

# Logging
LOG_LEVEL=info
```

**Ubicación**: `backend/.env`
**En .gitignore**: ✅ SÍ
**Nunca commitar**: ✅ Confirmado

---

### Archivo: `.env.local` (Desarrollo)
```bash
# Solo para desarrollo local
DEBUG=devmemory:*
LOG_LEVEL=debug
MOCK_AI=true
```

---

## 📂 ESTRUCTURA DE ARCHIVOS PRIVADOS

```
devmemory-ai/
├── backend/
│   ├── .env (PRIVADO - NO EN GIT)
│   ├── .env.local (PRIVADO - NO EN GIT)
│   └── memory.db (PRIVADO - NO EN GIT)
├── docs/
│   ├── PRIVATE_CONFIG.md (Este archivo)
│   ├── ARCHITECTURE_DECISIONS.md
│   ├── API_OPTIONS.md
│   └── LOCAL_SETUP.md
└── .gitignore (Debe incluir arriba)
```

---

## 🚀 PRÓXIMAS DECISIONES

### Fase 2: Integración OpenAI
```
Timeline: Cuando se resuelva presupuesto
Tareas:
  1. Obtener API key (via $200 o tarjeta)
  2. Crear backend/src/ai/openaiService-v2.js (mejorado)
  3. Agregar tests para OpenAI
  4. Documentar costos por query
  5. Implementar caché para ahorrar
```

### Fase 3: Ollama Local (alternativa)
```
Timeline: Si no hay presupuesto para OpenAI
Tareas:
  1. Instalar Ollama localmente
  2. Crear backend/src/ai/ollama-service.js
  3. Implementar fallback (Ollama ↔ OpenAI)
  4. Tests de calidad
```

---

## 📊 COMPARATIVA DE COSTOS

| Servicio | Costo | Calidad | Setup | Escalabilidad |
|----------|-------|---------|-------|----------------|
| Local Search | $0 | Media | 0 min | ⭐⭐⭐ |
| Ollama | $0 | Baja | 30 min | ⭐⭐ |
| OpenAI $200 | $0* | Alta | 10 min | ⭐⭐⭐⭐ |
| OpenAI Pago | $120/año | Alta | 10 min | ⭐⭐⭐⭐⭐ |

*Usando crédito institucional

---

## ⚠️ CONSIDERACIONES LEGALES

### Email Institucional
- ✅ Confirma en reglamento de tu institución
- ✅ Uso debe ser académico/educativo
- ✅ No comercial

### Datos en OpenAI
- ⚠️ OpenAI puede usar datos para entrenar modelos
- ℹ️ Revisar política de privacidad: https://openai.com/privacy
- 💡 Alternativa: Ollama mantiene todo local

### Licencia del Proyecto
- Proyecto actual: MIT
- Sin restricciones de uso comercial
- Atribución requerida

---

## 🔍 VERIFICACIÓN DE SETUP

```bash
# Verificar que .env está en .gitignore
$ cat .gitignore
# Debe contener: .env

# Verificar que no hay keys en git
$ git log --all --full-history -- backend/.env
# Debe estar vacío

# Verificar archivo de configuración
$ ls -la backend/.env*
# .env debe existir
# .env.example sí debe estar en git
```

---

## 📝 CHECKLIST DE CAMBIOS

Cuando hagas cambios a esta configuración:
- [ ] Actualizar este archivo
- [ ] Actualizar ARCHITECTURE_DECISIONS.md
- [ ] Actualizar API_OPTIONS.md
- [ ] Revisar .env.example
- [ ] Revisar .gitignore
- [ ] NO hacer commit de .env
- [ ] Notificar a team si hay cambio de decisión

---

## 📞 REFERENCIAS

- OpenAI API: https://platform.openai.com
- Ollama: https://ollama.ai
- Créditos educativos: https://openai.com/free-credits
- .env best practices: https://12factor.net/config
