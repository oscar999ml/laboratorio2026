# 🚀 GUÍA DE SETUP LOCAL

**Documento**: LOCAL_SETUP.md  
**Versión**: 1.0  
**Sistema**: Windows 10/11 + VS Code  
**Fecha**: 22 de Abril, 2026  

---

## 📋 REQUISITOS PREVIOS

```bash
✅ Node.js v18+
✅ npm v9+
✅ VS Code instalado
✅ Git configurado
✅ PowerShell o Git Bash
```

### Verificar Instalación
```powershell
# En PowerShell
node --version    # v18.0.0 o superior
npm --version     # 9.0.0 o superior
git --version     # git version 2.40.0 o superior
code --version    # 1.80.0 o superior
```

---

## 🔧 PASOS DE INSTALACIÓN

### Paso 1: Clonar Repositorio
```powershell
# Navegat a donde quieras clonar
cd C:\Dev
# o
cd B:\laboratorio2026

# Clonar
git clone https://github.com/tu-usuario/devmemory-ai.git
cd devmemory-ai
```

### Paso 2: Instalar Dependencias Backend
```powershell
cd backend
npm install
# Espera a que instale todos los paquetes

# Verificar instalación
npm list
# Debe mostrar: devmemory-ai@1.0.0 con dependencias listadas
```

### Paso 3: Crear Archivo .env
```powershell
# Copiar template
Copy-Item .env.example .env

# Editar (abrir con editor)
code .env
```

**Contenido de .env:**
```bash
# Backend
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./memory.db

# OpenAI (Fase 2 - comentado por ahora)
# OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Logging
LOG_LEVEL=info
```

### Paso 4: Instalar Extensión VS Code
```powershell
# Navegar a carpeta de extensión
cd ..\vscode-extension

# Instalar dependencias (si las hay)
npm install

# Crear paquete VSIX
npx @vscode/vsce package

# Instalar en VS Code
code --install-extension devmemory-ai-1.0.0.vsix
```

**Resultado esperado:**
```
Extension 'devmemory-ai-1.0.0.vsix' was successfully installed.
```

### Paso 5: Iniciar Backend
```powershell
# Desde backend/
npm start
# o
node server.js

# Resultado esperado:
# Conectado a SQLite
# Servidor corriendo en http://localhost:3000
```

### Paso 6: Verificar Health Check
```powershell
# En nueva terminal PowerShell
$response = Invoke-WebRequest http://localhost:3000/health
$response.Content

# Debe mostrar:
# {"status":"ok","timestamp":"2026-04-22T10:30:45.123Z"}
```

### Paso 7: Probar Backend con Test
```powershell
# En terminal nueva (backend/)
node test.js

# Debe mostrar:
# === TEST HEALTH ===
# {"status":"ok",...}
# === TEST SAVE ===
# {"id":1,"content":"...","type":"bug"}
# === TEST SEARCH ===
# [{id:1,...}]
```

### Paso 8: Usar Extensión en VS Code
```
1. Abre VS Code
2. Presiona: Ctrl+Shift+P
3. Busca: "DevMemory"
4. Verás 3 comandos:
   - DevMemory: Guardar Contexto
   - DevMemory: Buscar Memoria
   - DevMemory: Preguntar a IA (Fase 2)

5. O usa atajo: Ctrl+Shift+M para guardar
```

---

## 🧪 FLUJO DE USO

### Guardar una Memoria
```
1. Selecciona texto en VS Code
2. Presiona Ctrl+Shift+M
3. Elige tipo: bug / decision / feature
4. ✅ Guardado!
```

### Buscar Memorias
```
1. Ctrl+Shift+P → "DevMemory: Buscar Memoria"
2. Escribe palabra clave: "login"
3. Ve resultados
4. Haz click para copiar contenido
```

### Preguntar a IA (Fase 2)
```
1. Ctrl+Shift+P → "DevMemory: Preguntar a IA"
2. Escribe pregunta: "¿Cómo arreglar error de login?"
3. IA busca contexto en memorias
4. Retorna respuesta basada en tu historia
```

---

## 📁 ESTRUCTURA LOCAL DESPUÉS DE SETUP

```
devmemory-ai/
├── .env                    ← PRIVADO: Configuración local
├── .gitignore              ← Debe excluir .env
├── PRIVATE_CONFIG.md       ← Documentación privada
├── ARCHITECTURE_DECISIONS.md
├── API_OPTIONS.md
├── LOCAL_SETUP.md          ← Este archivo
├── backend/
│   ├── node_modules/       ← Instalado automáticamente
│   ├── .env                ← PRIVADO
│   ├── memory.db           ← PRIVADO: DB local
│   ├── package.json
│   ├── server.js           ← Punto de entrada
│   ├── test.js             ← Tests manuales
│   ├── src/
│   │   ├── app.js
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/
│   │   ├── routes/
│   │   └── ai/
│   └── logs/               ← Futuro: Será creado
├── vscode-extension/
│   ├── node_modules/       ← Instalado automáticamente
│   ├── devmemory-ai-1.0.0.vsix  ← Compilado
│   ├── extension.js
│   └── package.json
└── README.md
```

---

## 🐛 TROUBLESHOOTING

### Problema: "address already in use :::3000"
```
Puerto 3000 ya está ocupado

Solución 1: Cambiar puerto en .env
PORT=3001

Solución 2: Matar proceso
netstat -ano | findstr :3000
taskkill /PID <PID> /F

Solución 3: Esperar 30 segundos y reintentar
```

### Problema: "Cannot find module 'express'"
```
Falta instalar dependencias

Solución:
cd backend
npm install
```

### Problema: "ENOENT: no such file or directory, open './memory.db'"
```
Archivo de DB corrupto o eliminado

Solución:
rm backend/memory.db
npm start
(Se creará automáticamente)
```

### Problema: Extensión no aparece en VS Code
```
Solución:
1. Verificar: code --list-extensions | findstr devmemory
2. Si no aparece, reinstalar:
   code --uninstall-extension devmemory.devmemory-ai
   code --install-extension vscode-extension/devmemory-ai-1.0.0.vsix
3. Reiniciar VS Code
```

### Problema: Test.js retorna errores de conexión
```
Backend no está corriendo

Solución:
1. Verificar si servidor está arriba: http://localhost:3000/health
2. Si no, iniciar: cd backend && npm start
3. Esperar 2 segundos a que inicialice
4. Reintentar test.js
```

### Problema: "OPENAI_API_KEY no configurada" en /ai/ask
```
Es normal en Fase 1

Solución (Fase 2):
1. Obtener API key de https://platform.openai.com/api-keys
2. Agregar a .env:
   OPENAI_API_KEY=sk-proj-xxxxx
3. Reiniciar servidor
```

---

## 📊 VERIFICACIÓN DE SETUP

Ejecuta este script para verificar todo está OK:

```powershell
# checkup.ps1
Write-Host "=== DevMemory AI - Setup Verification ===" -ForegroundColor Green

# 1. Verificar Node.js
Write-Host "1. Node.js version:"
node --version

# 2. Verificar npm
Write-Host "2. npm version:"
npm --version

# 3. Verificar carpetas
Write-Host "3. Carpetas requeridas:"
Test-Path "backend" -PathType Container
Test-Path "vscode-extension" -PathType Container

# 4. Verificar node_modules
Write-Host "4. Dependencias instaladas:"
Test-Path "backend/node_modules" -PathType Container

# 5. Verificar .env
Write-Host "5. Archivo .env:"
Test-Path "backend/.env"

# 6. Health check
Write-Host "6. Backend health check:"
try {
  $response = Invoke-WebRequest http://localhost:3000/health -TimeoutSec 2
  Write-Host "✅ Backend está corriendo" -ForegroundColor Green
} catch {
  Write-Host "❌ Backend no responde" -ForegroundColor Red
  Write-Host "   Ejecuta: cd backend && npm start"
}

# 7. Verificar extensión
Write-Host "7. Extensión VS Code:"
code --list-extensions | Select-String "devmemory"

Write-Host "=== Setup Verification Complete ===" -ForegroundColor Green
```

Guarda como `checkup.ps1` en raíz del proyecto y ejecuta:
```powershell
.\checkup.ps1
```

---

## 🔄 CICLO DE DESARROLLO

### Día a Día

```powershell
# Terminal 1: Backend
cd backend
npm start
# Mantén esto corriendo siempre

# Terminal 2: VS Code
code .
# Abre el proyecto
# Usa extensión con Ctrl+Shift+M
```

### Hacer Cambios en Backend

```powershell
# Editar archivo (ej: memoryModel.js)

# El servidor recarga automáticamente? NO, requiere reinicio
# Detener: Ctrl+C en terminal 1
# Reiniciar: npm start
```

### Hacer Cambios en Extensión

```powershell
# Editar extension.js en vscode-extension/

# Opción 1: Testing local
# F5 en VS Code para Debug Mode

# Opción 2: Recompilar
cd vscode-extension
npx @vscode/vsce package
code --install-extension devmemory-ai-1.0.0.vsix

# Opción 3: Reiniciar VS Code
# Ctrl+Shift+P → Developer: Reload Window
```

---

## 🚀 COMANDOS ÚTILES

```powershell
# Desde backend/

# Iniciar servidor
npm start

# Correr tests
node test.js

# Ver base de datos
sqlite3 memory.db
# En SQLite:
sqlite> SELECT * FROM memories LIMIT 5;
sqlite> .exit

# Instalar nuevos paquetes
npm install <paquete>

# Ver historial de cambios
git log --oneline | head -10

# Ver cambios no commiteados
git status
git diff backend/src/models/memoryModel.js
```

---

## 📚 ESTRUCTURA DE ARCHIVOS QUE NO SE SUBEN

```
.gitignore debe tener:
backend/.env           ← PRIVADO: Configuración
backend/memory.db      ← PRIVADO: Base de datos
backend/logs/          ← PRIVADO: Logs
.env.local             ← PRIVADO: Env local
*.log                  ← PRIVADO: Log files
node_modules/          ← NO está en git (grande)
*.vsix                 ← Generado (está en repo pero regenerable)
```

---

## 🎯 PRÓXIMAS MEJORAS

```
[ ] Agregar hot-reload con nodemon
[ ] Crear script de setup automatizado (setup.ps1)
[ ] Agregar linting (ESLint)
[ ] Agregar formatter (Prettier)
[ ] Crear pre-commit hooks
[ ] Agregar watch mode para tests
```

---

## 📞 SUPPORT

Si algo no funciona:

1. **Revisa este documento** (90% de problemas están aquí)
2. **Revisa terminal de errores** (lee el stack trace completo)
3. **Ejecuta checkup.ps1** (verifica setup)
4. **Revisa ARCHITECTURE_DECISIONS.md** (entiende las decisiones)
5. **Consulta API_OPTIONS.md** (si es sobre IA)

---

**Documento mantenido por**: Equipo DevMemory  
**Última actualización**: 22 de Abril, 2026  
**Próxima revisión**: Cuando se agreguen nuevas features  
