# 💳 GUÍA: Obtener Crédito Educativo OpenAI ($200)

**Fecha**: 22 de Abril, 2026  
**Objetivo**: Activar $200 USD en crédito educativo OpenAI  
**Duración**: ~15 minutos  

---

## ✅ REQUISITOS PREVIOS

Necesitas:
- ✅ Email institucional activo (de tu universidad/institución)
- ✅ Navegador web (Chrome, Firefox, Edge)
- ✅ Acceso a internet
- ⚠️ Revisar términos de uso de tu institución

---

## 🚀 PASOS PASO A PASO

### PASO 1: Ir al Portal de Créditos OpenAI

Abre en tu navegador:
```
https://openai.com/free-credits
```

O accede directamente a:
```
https://platform.openai.com/account/free-trial
```

---

### PASO 2: Hacer Login con Cuenta OpenAI

Si **NO tienes cuenta OpenAI aún**:
```
1. Click en "Sign Up"
2. Completa el formulario
3. Selecciona: "Educator / Student"
4. Email: Tu correo institucional
   (ej: nombre@university.edu)
5. Continúa con el proceso
```

Si **YA tienes cuenta OpenAI**:
```
1. Click en "Log In"
2. Ingresa: email + contraseña
```

---

### PASO 3: Aplicar al Programa de Créditos Educativos

Una vez logeado, deberías ver:

```
┌─────────────────────────────────────┐
│  OpenAI Free Credits Program        │
│                                     │
│  $5 de crédito válido por 3 meses   │
│  (o $200 si eres elegible)          │
│                                     │
│  [ Aplicar a programa educativo ]   │
└─────────────────────────────────────┘
```

**Click en**: "Apply for education program" o similar

---

### PASO 4: Llenar Formulario de Elegibilidad

Te pedirá información como:

```
□ Nombre completo
□ Email institucional (@university.edu)
□ Institución (nombre de tu universidad)
□ Rol: [ ] Estudiante [ ] Profesor [ ] Staff
□ Propósito del uso: [ ] Educativo [ ] Investigación
□ Términos de servicio: [✓] Aceptar
```

**Completa con:**
- Email: Tu correo institucional
- Institución: Tu universidad/institución
- Rol: Estudiante (o la que aplique)

---

### PASO 5: Verificación de Email

OpenAI te enviará email a tu correo institucional:

```
📧 From: noreply@openai.com
   Subject: Verify your email address
   
   [ Click here to verify ]
```

**Haz click en el enlace** para verificar

---

### PASO 6: Aprobación

Espera respuesta (normalmente **24-48 horas**):

```
Escenario A: APROBADO ✅
  📧 Email: "Your application was approved!"
  💳 $200 crédito agregado a tu cuenta
  ✅ Listo para usar
  
Escenario B: RECHAZADO ❌
  📧 Email: Explicación del rechazo
  🔄 Puedes apelar o usar tarjeta personal
```

---

## 🔑 VERIFICAR CRÉDITO DISPONIBLE

Cuando sea aprobado:

```
1. Ve a: https://platform.openai.com/account/billing/limits
2. Verás en "Billing":
   ├─ Usage (cuánto has gastado)
   ├─ Free Trial Credits: $200.00 ✅
   └─ Expiration: [Fecha límite]
```

---

## 💰 CÓMO USAR EL CRÉDITO

### Agregar OPENAI_API_KEY a tu Proyecto

Una vez aprobado:

```powershell
# 1. Ir a: https://platform.openai.com/api-keys
# 2. Click en "Create new secret key"
# 3. Selecciona "DevMemory" como nombre (opcional)
# 4. Copia la key: sk-proj-xxxxxxxxxxxxx

# 5. Edita backend/.env
cd B:\laboratorio2026\devmemory-ai\backend
code .env
```

En `.env` agrega:

```bash
# Descomenta y agrega tu key
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT=30000
```

### 6. Reinicia el Backend

```powershell
# En terminal de backend (donde está npm start)
# Presiona: Ctrl+C
# Luego:
npm start
```

---

## 📊 CALCULADORA DE COSTOS

Con **$200 USD**:

```
Costo por query (promedio):
  - 500 tokens entrada
  - 200 tokens salida
  - Total: 700 tokens
  - Costo: 700 × $0.15/1M = $0.000105

Estimación de uso:
  - 10 queries/día   = $0.03/mes
  - 100 queries/día  = $0.30/mes
  - 1000 queries/día = $3/mes
  - 10000 queries/día= $30/mes

Con $200:
  → ~2000 meses de uso promedio ✅
  → Suficiente para cualquier desarrollo
```

---

## ⚠️ TÉRMINOS A REVISAR

Antes de aplicar, **verifica tu institución permite**:

```
✅ Preguntas a revisar:
  1. ¿Puedo usar créditos educativos para proyecto personal?
  2. ¿Hay restricciones de uso comercial?
  3. ¿Los datos van a estar protegidos?
  4. ¿Puedo transferir el crédito a otros?

ℹ️ OpenAI Policy:
  - Los créditos son personales, no transferibles
  - Uso académico/educativo permitido
  - Datos pueden ser usados para mejorar modelos
  - Revisar: https://openai.com/privacy
```

---

## 🔐 SEGURIDAD DE LA API KEY

**MUY IMPORTANTE:**

```
❌ NUNCA compartir tu API key
❌ NUNCA commitear .env a git
❌ NUNCA pegar la key en mensajes públicos

✅ SEGURO:
  - Guardar en .env (en .gitignore)
  - Guardar en variables de entorno
  - Regenerar si se expone
```

Si accidentalmente expones tu key:

```powershell
# 1. Ve a: https://platform.openai.com/api-keys
# 2. Find y delete la key expuesta
# 3. Click "Create new secret key"
# 4. Actualiza en .env
```

---

## 📋 CHECKLIST DE CONFIGURACIÓN

```
Obtener Crédito:
├─ [ ] Visitar https://openai.com/free-credits
├─ [ ] Crear/login en cuenta OpenAI
├─ [ ] Aplicar programa educativo
├─ [ ] Verificar email
├─ [ ] Esperar aprobación (24-48h)
└─ [ ] Confirmar $200 crédito en cuenta

Configurar en Proyecto:
├─ [ ] Generar API key en platform.openai.com
├─ [ ] Copiar: sk-proj-xxxxx
├─ [ ] Editar backend/.env
├─ [ ] OPENAI_API_KEY=sk-proj-xxxxx
└─ [ ] npm start (reiniciar backend)

Probar:
├─ [ ] Ctrl+Shift+P → "DevMemory: Preguntar a IA"
├─ [ ] Hacer una pregunta
├─ [ ] Ver respuesta basada en contexto
└─ [ ] ✅ Funciona!
```

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Problema: "Application rejected"

```
Causas posibles:
  ❌ Email no es institucional
  ❌ Institución no reconocida
  ❌ Cuenta muy nueva

Solución:
  ✅ Contactar soporte OpenAI
  ✅ O usar tarjeta de crédito ($5-10/mes)
  ✅ O usar Ollama local (gratuito)
```

### Problema: "Key keeps failing"

```
Verificar:
  ❌ API key copiada correctamente
  ❌ .env tiene formato correcto
  ❌ Backend reiniciado después de cambio

Solución:
  ✅ Verificar en https://platform.openai.com/account/api-keys
  ✅ Regenerar key si es necesario
  ✅ Ver logs del backend: npm start
```

### Problema: "Usage exceeds limit"

```
Si agotaste el crédito:
  ❌ Agregar tarjeta de crédito
  ❌ O cambiar a Ollama local
  ❌ O reducir queries

Ver uso actual:
  → https://platform.openai.com/account/billing/usage
```

---

## 📞 CONTACTOS Y RECURSOS

### OpenAI
- Free Credits: https://openai.com/free-credits
- API Dashboard: https://platform.openai.com
- Documentación: https://platform.openai.com/docs
- Support: https://help.openai.com

### Tu Institución
- Revisar política de créditos educativos
- Contactar IT/Finanzas si hay dudas
- Confirmar que permite uso educativo

---

## 🎯 RESUMEN DEL PROCESO

```
Paso 1: Aplicar (5 min)
  → https://openai.com/free-credits
  
Paso 2: Verificar email (2 min)
  → Click en enlace que envíen
  
Paso 3: Esperar aprobación (24-48 horas)
  → Revisar email regularmente
  
Paso 4: Configurar en proyecto (5 min)
  → Copiar API key
  → Pegar en .env
  → Reiniciar backend
  
Paso 5: Probar (2 min)
  → Hacer pregunta a IA
  → Ver que funciona
  
Total: ~40 minutos + espera
```

---

## ⏰ TIMELINE

```
HOY (22 de Abril):
├─ 15:00 - Aplicas a programa ✅
└─ Esperas respuesta

MAÑANA O PASADO (23-24 Abril):
├─ Email de aprobación llega ✅
├─ Generas API key ✅
├─ Actualizas .env ✅
└─ Pruebas IA ✅ FUNCIONANDO

DESPUÉS:
├─ Tienes $200 durante ~20 meses
├─ Usas IA en tus proyectos
└─ Sin costo personal
```

---

## ✨ PRÓXIMO PASO

**Ya:** Aplica ahora mismo
```
https://openai.com/free-credits
```

**Cuando sea aprobado:** Vuelve y sigue estos pasos:
1. Genera API key
2. Actualiza .env con OPENAI_API_KEY
3. Reinicia backend
4. Prueba comando "DevMemory: Preguntar a IA"
5. ¡Funciona! 🚀

---

**Documento creado**: 22 de Abril, 2026  
**Estado**: Listo para aplicar  
**Próxima revisión**: Cuando sea aprobado
