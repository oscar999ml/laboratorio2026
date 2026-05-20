# ViaCrom — Documento Maestro de Contexto

## 1. VISIÓN DEL SISTEMA

Plataforma colaborativa de **inteligencia geoespacial urbana en tiempo real** (tipo Waze social) enfocada en Bolivia.

Usuario final: cualquier persona que transite por avenidas, calles y carreteras, que comparte y recibe información vial en vivo.

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | Node.js + Express + Socket.io | Express 4.21, Socket.io 4.8 |
| Base de datos | SQLite (better-sqlite3) | 11.7 |
| ORM/Migraciones | Manual con PRAGMA user_version | — |
| Autenticación | JWT + bcryptjs | — |
| Frontend Web | Vite + React 19 + TypeScript 5.7 | React 19, Vite 6 |
| Mapas | Leaflet + React-Leaflet | Leaflet 1.9, React-Leaflet 5 |
| Estilos | Tailwind CSS 4 + Lucide icons | — |
| Routing | OSRM externo + motor propio A* sobre OSM (grafo local) | `backend/routing/` |
| Bloqueos en ruteo | Incremental vía socket: `blockReport()`/`unblockReport()` en tiempo real | Radio 20m (lineales), 15m (puntuales) |
| Tiempo real | Socket.io (backend + frontend) | Socket.io 4.8, socket.io-client |
| Mobile | React Native / Expo | **PAUSADO** |

**Node.js**: `B:\programsOthers\nodejss\node.exe`
**NPM cache**: B: drive
**Frontend puerto**: 3001 (5173 bloqueado)

---

## 3. ARQUITECTURA DE ROLES (8 niveles)

### Jerarquía y pesos

```typescript
super_admin:    100  — Control total del sistema
sistema:         90  — Configuración técnica, monitoreo
admin_regional:  80  — Administración por región
moderador:       60  — Moderación de reportes y usuarios
verificador:     40  — Validación de reportes (peso 3x)
premium:         30  — Usuario con beneficios (peso 2x)
usuario:         20  — Usuario normal (default)
observador:       5  — Solo lectura
```

### Helper functions (frontend `types/index.ts`)

```typescript
ROLE_HIERARCHY: Record<UserRole, number>
ROLE_LABELS:    Record<UserRole, string>   // "super_admin" → "Super Admin"
ROLE_WEIGHTS:   Record<UserRole, number>   // para confirmaciones
canModerate(): boolean                      // ≥ moderador
canVerify():  boolean                       // ≥ verificador
isStaff():    boolean                       // ≥ moderador (sinónimo)
```

---

## 4. ESTADOS DEL SISTEMA

### 4.1 Backend — ✅ 95% COMPLETO

**Rutas montadas en server.js:**

| Archivo | Rutas | Autenticación |
|---------|-------|--------------|
| `routes/auth.js` | POST /register, POST /login, GET /me, PUT /profile | register/login público; /me y /profile requieren auth |
| `routes/bloqueos.js` | POST /, GET /, GET /:id, GET /mis-reportes, POST /:id/confirm, DELETE /:id | DELETE requiere moderador+ |
| `routes/rutas.js` | POST /calcular, POST /iniciar-viaje, POST /finalizar-viaje/:id, GET /historial | Todas requieren auth |
| `routes/tracking.js` | POST /update, GET /me, GET /nearby, GET /user/:userId | Todas requieren auth |
| `routes/admin.js` | 11 endpoints (dashboard, users CRUD, reports, analytics, logs, settings) | router.use(auth + moderador) |
| `routes/feed.js` | GET / | Público (requiere lat/lng) |
| `routes/users.js` | GET /:id | Público |

**Middleware:**

| Archivo | Propósito |
|---------|-----------|
| `middleware/auth.js` | Verifica JWT, inyecta `req.user` |
| `middleware/role.js` | `requireRole(minRole)`, `requireExactRole(role)` |
| `middleware/gps-validation.js` | Valida coordenadas presentes |

**Servicios:**

| Archivo | Exporta | Propósito |
|---------|---------|-----------|
| `services/bloqueoService.js` | createReport, confirmReport, getActiveReports, getReportById, checkExpiredReports | Lógica de reportes con pesos y expiración |
| `services/reputationService.js` | updateReputation, checkInactiveUsers, getReputationWeight | Cálculo de reputación 0-1, decaimiento por inactividad |
| `services/trackingService.js` | updateLocation, getUserLocation, getActiveTrips, getNearbyReports | Tracking GPS, proximity warnings, ETA recalculation |
| `services/routingService.js` | calculateRoute, createTrip, endTrip, getHistory | Integración OSRM + gestión de viajes |

**Migraciones:**

| Archivo | user_version | Contenido |
|---------|-------------|-----------|
| `001-initial-schema.sql` | 1 | Tablas base: users, reports, report_confirmations, live_locations, trips |
| `002-seed-users.js` | 2 | Columnas role/phone/email/password/photo/banned, event_logs, weight, seed usuarios |

**Seed users (creados si tabla users está vacía):**

| Usuario | Contraseña | Celular | Rol |
|---------|-----------|---------|-----|
| admin | admin123 | 70000000 | super_admin |
| usuario | user123 | 70000001 | usuario |

**Eventos Socket.io emitidos por el backend:**

| Evento | Cuándo | Datos |
|--------|--------|-------|
| `new-report` | Nuevo reporte creado | report completo |
| `report-updated` | Reporte modificado (confirm, moderate) | report completo |
| `report-expired` | Reporte expira | report completo |
| `report-confirmed` | Alguien confirma/disputa | { report_id, vote, user_id } |
| `location-update` | Usuario actualiza ubicación en viaje | { user_id, latitude, longitude, speed, heading, trip_id } |
| `eta-update` | Recalculo de ETA durante viaje | { trip_id, eta_minutes, remaining_km } |
| `proximity-warning` | Usuario cerca de evento activo | { user_id, warnings: [{ report, distance }] } |
| `notification:*` | Eventos de notificación | — |
| `users-count` | Conexión/desconexión de usuario | count: number |

### 4.2 Frontend Web — ✅ 80% COMPLETO (conectado a backend)

**Estructura de archivos:**

```
src/
  main.tsx              — Entry point, providers (Auth, Theme, UI, Socket)
  App.tsx               — Router con 16 rutas, ProtectedRoute
  index.css             — Dark mode, animaciones, utilidades
  types/index.ts        — Roles, EventConfig (13 tipos), interfaces
  lib/
    api.ts              — 10 funciones API (getReports, createReport, confirmReport, calculateRoute, startTrip, endTrip, loginUser, registerUser, getProfile, updateProfile)
    admin.ts            — 11 funciones admin API
    feed.ts             — getFeed()
  contexts/
    AuthContext.tsx      — Auth con fetch real al backend
    ThemeContext.tsx     — Dark/light mode
    UiContext.tsx        — Sidebar state compartido
    SocketContext.tsx    — Socket.io connection, live reports state, connection status, join/leave region/trip
  components/
    TopBar.tsx           — Search + filter panel + sidebar menu
    BottomNav.tsx        — 5 tabs (Mapa, Reportes, Rutas, Actividad, Perfil)
    MainLayout.tsx       — TopBar + content + BottomNav
    GpsGuard.tsx         — Exige GPS en cada ruta (excepto /login /registro)
    EventModal.tsx       — Modal de reporte (seleccionar punto en mapa + tipo + descripción + foto)
    AdminSidebar.tsx     — Sidebar de admin con 6 items
  pages/
    LoginPage.tsx        — Login por usuario o celular + password (conectado a API)
    RegisterPage.tsx     — Registro con 11 campos (conectado a API)
    MapPage.tsx          — Leaflet map, modo selección de punto, 13 tipos marcadores, popups con confirmar/disputar, socket en vivo
    ReportsPage.tsx      — Lista de reportes con tabs near/all, confirmar/disputar, socket en vivo
    RoutesPage.tsx       — Búsqueda de rutas con Nominatim + OSRM, "Iniciar viaje" funcional
    FeedPage.tsx         — Feed de actividad en vivo (report, confirm, trend), tabs cerca/todas, auto-refresh 15s
    ProfilePage.tsx      — Perfil editable (alias guarda en API), reputación, estado socket
    PublicProfilePage.tsx — Perfil público /user/:id con nivel, precisión, reportes recientes
    ActiveNavigation.tsx — Navegación con tracking GPS real, ETA desde socket, finalizar viaje
    GpsRequired.tsx      — Pantalla de GPS requerido
    admin/
      Dashboard.tsx      — Stats reales desde API, reportes por tipo, top ciudades
      Users.tsx          — Lista de usuarios real, cambiar rol, ban/unban
      Reports.tsx        — Reportes reales, aprobar/rechazar/ocultar, filtro por estado
      LiveMap.tsx        — Mapa en vivo con Socket.io + reports reales + users-count
      Analytics.tsx      — Métricas reales 7 días, reportes/día, distribución roles, top reporteros
      Settings.tsx       — Config desde API + guardar + logs del sistema
```

**Rutas del frontend:**

| Ruta | Componente | Protección |
|------|-----------|-----------|
| `/login` | LoginPage | None |
| `/registro` | RegisterPage | None |
| `/` | MapPage | MainLayout + GpsGuard |
| `/reportes` | ReportsPage | MainLayout + GpsGuard |
| `/rutas` | RoutesPage | MainLayout + GpsGuard |
| `/actividad` | FeedPage | MainLayout + GpsGuard |
| `/perfil` | ProfilePage | MainLayout + GpsGuard |
| `/navegacion` | ActiveNavigation | MainLayout + GpsGuard |
| `/user/:id` | PublicProfilePage | MainLayout |
| `/admin` | AdminDashboard | moderador+ |
| `/admin/usuarios` | AdminUsers | moderador+ |
| `/admin/reportes` | AdminReports | moderador+ |
| `/admin/mapa` | AdminLiveMap | moderador+ |
| `/admin/analiticas` | AdminAnalytics | admin_regional+ |
| `/admin/configuracion` | AdminSettings | super_admin |

---

## 5. MAPA DE ROLES → MÓDULOS Y SU ESTADO

### VISUALIZADORES (solo lectura)

| Rol | Módulo | Estado |
|-----|--------|--------|
| **observador** | Ver mapa con eventos | ✅ |
| | Ver lista de reportes | ✅ |
| | Buscar rutas (ver resultados) | ✅ |
| | Ver feed de actividad | ✅ |
| | Ver perfil público de otros | ✅ |

| **usuario** | Todo observador + | |
| | Reportar eventos con punto en mapa | ✅ |
| | Confirmar / Disputar | ✅ |
| | Navegación paso a paso | ✅ |
| | Perfil propio con datos reales | ✅ |
| | Editar perfil (alias) | ✅ |
| | Tracking en viajes | ✅ |

| **premium** | Todo usuario + | |
| | Peso 2x en confirmaciones | ✅ Backend listo |

### VALIDADORES

| **verificador** | Todo premium + | |
| | Peso 3x en confirmaciones | ✅ Backend listo |

### MODERADORES

| **moderador** | Todo verificador + | |
| | Eliminar reportes (soft-delete) | ✅ |
| | Moderar reportes (aprobar/rechazar) | ✅ |
| | Ver panel admin con datos reales | ✅ |
| | Ver lista reportes admin | ✅ |

| **admin_regional** | Todo moderador + | |
| | Dashboard con stats reales | ✅ |
| | Gestionar usuarios (listar) | ✅ |
| | Analytics regionales | ✅ |
| | Mapa en vivo admin | ✅ |

| **sistema** | Todo admin_regional + | |
| | Configuración técnica | ✅ |
| | Ver logs del sistema | ✅ |

| **super_admin** | Todo sistema + | |
| | Cambiar roles | ✅ |
| | Banear/desbanear | ✅ |
| | Configurar parámetros globales | ✅ |

---

## 6. BRECHA COMPLETA POR MÓDULO (13 módulos de la visión)

| # | Módulo | Backend | Frontend | Estado |
|---|--------|---------|----------|--------|
| 1 | **Socket.io tiempo real** | ✅ | ✅ | **Completo** |
| 2 | **Confirmar/Disputar** | ✅ | ✅ | **Completo** |
| 3 | **Modal reporte profesional** | ✅ | ✅ | **Completo** |
| 4 | **Admin con datos reales** | ✅ | ✅ | **Completo** |
| 5 | **Feed social / actividad** | ✅ | ✅ | **Completo** |
| 6 | **Navegación real paso a paso** | ✅ | ✅ | **Completo** |
| 7 | **Perfiles públicos** | ✅ | ✅ | **Completo** |
| 8 | **Notificaciones** | ✅ web-push, VAPID, subscribe/unsubscribe/alert | ✅ Service Worker + toggle en perfil | **Completo** |
| 9 | **Sistema geoespacial (GIS)** | ❌ Solo puntos | ❌ No existe | **Pendiente** |
| 10 | **Engine de confianza** | ✅ Pesos por rol+GPS | ⚠️ Sin mostrar en UI | **Parcial** |
| 11 | **Zonas calientes (heatmaps)** | ✅ GET /api/heatmap | ✅ Leaflet.heat layer con toggle | **Completo** |
| 12 | **Offline** | ❌ No existe | ❌ No existe | **Pendiente** |
| 13 | **Detección automática** | ❌ No existe | ❌ No existe | **Pendiente** |

---

## 7. PRIORIDADES RECOMENDADAS

### COMPLETADO
```
FASE 1 — Socket.io + Confirmar/Disputar + Modal básico + Perfil conectado + Navegación
FASE 2 — Admin con datos reales (6 páginas)
FASE 3.1 — Modal de reporte con selección de punto en mapa
FASE 3.2 — Feed social / actividad (Waze-style)
FASE 3.3 — Perfiles públicos (/user/:id)
```

### PENDIENTE
```
FASE 5   — GIS avanzado (polígonos, PostGIS futuro)
FASE 6   — Soporte offline (Service Worker + IndexedDB)
FASE 7   — Detección automática de eventos por densidad
```

---

## 8. DEPENDENCIAS

```bash
# Ya instaladas
socket.io-client        # Tiempo real

# Pendientes
leaflet.heat            # Zonas calientes (FASE 4)
leaflet-draw            # Dibujar polígonos (FASE 5)
```

---

## 9. COMANDOS DE DESARROLLO

```powershell
# Backend
cd backend
B:\programsOthers\nodejss\node.exe server.js

# Frontend
cd frontend
npx vite --host 0.0.0.0 --port 3001

# Verificar backend
curl http://localhost:3000/api/health

# Probar ruteo con/sin bloqueos
# GET /api/rutas/test?origin_lat=-16.562&origin_lng=-68.219&dest_lat=-16.566262&dest_lng=-68.219360&report_lat=-16.565639&report_lng=-68.219352
```

**Node.js path:** `B:\programsOthers\nodejss\node.exe`
**NPM:** `B:\programsOthers\nodejss\npm.cmd`

---

## 10. REGLAS DE ARQUITECTURA

1. **No comentarios en código** (excepto JSDoc si es necesario)
2. **No emojis** en archivos de código
3. **No crear README.md** a menos que se solicite explícitamente
4. **Mantener consistencia**: seguir los patrones existentes de carpetas, naming, imports
5. **GPS obligatorio** para todas las funcionalidades excepto login/register
6. **Políticamente neutral**: la plataforma es para el bien común
7. **OpenStreetMap + OSRM gratuitos**: sin APIs pagas
8. **Respeta la jerarquía de roles**: cada endpoint/función verifica el rol mínimo necesario

---

> *Documento actualizado el 2026-05-20. Contenido: FASE 1, 2, 3, 4 completas, motor de ruteo propio iniciado (9/13 módulos).*
