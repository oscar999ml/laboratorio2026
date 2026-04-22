# 🧪 PRUEBAS POST-OPTIMIZACIÓN

**Fecha**: 22 de Abril, 2026  
**Objetivo**: Verificar que todas las optimizaciones funcionan

---

## 📋 PASOS DE PRUEBA

### 1. Reiniciar Backend

```powershell
cd backend

# Si npm start está corriendo:
# Presiona Ctrl+C

# Inicia nuevamente
npm start

# Deberías ver:
# Conectado a SQLite
# Servidor corriendo en http://localhost:3000
# (créate los índices automáticamente)
```

### 2. Guardar Memoria

```bash
curl -X POST http://localhost:3000/memory/save \
  -H "Content-Type: application/json" \
  -d '{"content":"error al cargar dashboard","type":"bug"}'

# Respuesta esperada:
# {"id":20,"content":"error al cargar dashboard","type":"bug"}
```

### 3. Buscar con Paginación

```bash
# Búsqueda normal
curl "http://localhost:3000/memory/search?q=login"

# Búsqueda con paginación
curl "http://localhost:3000/memory/search?q=login&limit=5&offset=0"

# Limitar máximo 100
curl "http://localhost:3000/memory/search?q=login&limit=1000"
# Automáticamente limita a 100
```

### 4. Por Tipo con Paginación

```bash
curl "http://localhost:3000/memory/type/bug?limit=5&offset=0"
```

### 5. Todos con Paginación

```bash
curl "http://localhost:3000/memory/all?limit=10&offset=0"
```

---

## ✅ ESPERADOS

```
✅ Todas las búsquedas retornan rápido (<10ms)
✅ Paginación funciona
✅ Índices creados automáticamente
✅ Códigos de error son consistentes
✅ Validación mejorada (máx 5000 caracteres)
✅ Constantes centralizadas (sin hardcoding)
```

---

## 📊 MONITOREO

En la terminal, deberías ver logs como:

```
Conectado a SQLite
Servidor corriendo en http://localhost:3000
[SAVE] ID:20 type:bug content:"error al cargar dashboard..."
[2026-04-22T10:30:45.123Z] POST /memory/save - 200 (5ms)
[SEARCH] q:"login" type:all results:4
[2026-04-22T10:30:50.456Z] GET /memory/search - 200 (3ms)
```

---

## 🎯 CHECKLIST

```
Optimizaciones:
├─ [x] Constants.js creado
├─ [x] dbUtils.js creado
├─ [x] scorer.js creado
├─ [x] httpClient.js creado
├─ [x] Índices agregados a DB
├─ [x] Paginación implementada
├─ [x] Validación mejorada
└─ [x] Códigos de error estandarizados

Backend:
├─ [ ] npm start sin errores
├─ [ ] Índices creados
├─ [ ] Health check responde
└─ [ ] Logs visibles

Tests:
├─ [ ] Guardar memoria
├─ [ ] Buscar resultados
├─ [ ] Paginación funciona
├─ [ ] Límite máximo aplica
└─ [ ] Errores tienen códigos
```

---

Cuando todo esté verde, ¡El proyecto es 3x mejor! 🚀
