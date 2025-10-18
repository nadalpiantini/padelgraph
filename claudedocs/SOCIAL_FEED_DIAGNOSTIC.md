# Social Feed Diagnostic Report
**Date**: 2025-10-18
**Status**: ⚠️ Feed no visible en frontend

---

## 📋 Resumen

El usuario reporta que **no ve el frontend del feed social** después del deployment.

## ✅ Verificaciones Completadas

### 1. **Deployment Status**
- ✅ Push a producción: exitoso (`250ee1f`)
- ✅ Site respondiendo: **HTTP 200** en https://padelgraph.com
- ✅ TypeScript: **0 errores**

### 2. **Estructura del Código**
```
Frontend (Client):
├─ src/app/[locale]/dashboard/page.tsx:117
│  └─ <SocialFeed currentUser={currentUser} showCreatePost={true} />
│
Components:
├─ src/components/social/SocialFeed.tsx (línea 61)
│  └─ fetch('/api/feed?${params}')
│
API:
└─ src/app/api/feed/route.ts
   └─ Consulta: supabase.from('post').select(...)
```

### 3. **Base de Datos**
```sql
Tabla base: post
├─ Creada en: migrations/001_sprint_1_schema.sql
├─ Extensión enterprise: migrations/020_social_feed_enterprise.sql
├─ RLS policies: migrations/021_social_feed_rls.sql
└─ Estado: ⚠️ NECESITA VERIFICACIÓN
```

---

## 🔍 Posibles Causas

### Opción 1: **Migraciones no aplicadas en producción**
```bash
# La tabla 'post' podría no existir en la DB de producción
# Síntoma: API devuelve error 500 o "table does not exist"
```

### Opción 2: **Tabla vacía (sin posts)**
```bash
# La tabla existe pero no tiene datos
# Síntoma: Feed muestra mensaje "No posts yet"
```

### Opción 3: **RLS Policies bloqueando acceso**
```bash
# Las políticas de RLS impiden SELECT
# Síntoma: API devuelve [] vacío o 403
```

### Opción 4: **Error en la API**
```bash
# La API /api/feed tiene un bug
# Síntoma: Error en console del navegador
```

---

## 🔧 Pasos de Debugging Recomendados

### **1. Verificar tabla en producción**
```sql
-- Conectarse a Supabase Dashboard → SQL Editor
SELECT COUNT(*) FROM post;
-- Resultado esperado: número > 0 o error "table does not exist"
```

### **2. Verificar API Response**
```bash
# Abrir DevTools → Network
# Ir a /dashboard
# Buscar request a /api/feed
# Ver: status code, response body, errores
```

### **3. Verificar logs de Vercel**
```bash
# Ir a Vercel Dashboard → Logs
# Filtrar por: /api/feed
# Buscar: errores, stack traces
```

### **4. Test manual de API**
```bash
# En la consola del navegador (estando logueado):
fetch('/api/feed?limit=10')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

---

## 📊 Estado Actual del Feed

**Componente**: `SocialFeed.tsx`
**Comportamiento esperado**:
1. Monta componente → llama `loadFeed(true)` (línea 39)
2. Fetch a `/api/feed?limit=10` (línea 61)
3. Si success → muestra posts
4. Si vacío → muestra mensaje "No posts yet"
5. Si error → muestra en console

**Comportamiento observado**:
- ⚠️ Usuario reporta: "no veo el front end"
- Posibles síntomas:
  - Pantalla en blanco
  - Loader infinito
  - Mensaje de error
  - Nada renderiza

---

## 🎯 Acción Inmediata Sugerida

**Para el usuario**:
1. Abrir https://padelgraph.com/dashboard
2. Abrir DevTools (F12)
3. Ir a pestaña **Console**
4. Ir a pestaña **Network**
5. Refrescar página (F5)
6. Compartir:
   - ¿Qué mensajes aparecen en Console?
   - ¿Qué status code tiene /api/feed en Network?
   - ¿Qué response body devuelve /api/feed?

**Para Claude (siguiente sesión)**:
```bash
# Si tabla no existe:
npm run migrate:prod

# Si tabla vacía:
npm run seed:social-feed

# Si RLS bloquea:
# Revisar migrations/021_social_feed_rls.sql
# Verificar que policies permiten SELECT

# Si API tiene bug:
# Revisar src/app/api/feed/route.ts
# Agregar más logging
```

---

## 📁 Archivos Clave

```
Frontend:
src/app/[locale]/dashboard/page.tsx
src/components/social/SocialFeed.tsx
src/components/social/PostCard.tsx
src/components/social/CreatePost.tsx

API:
src/app/api/feed/route.ts

Database:
supabase/migrations/001_sprint_1_schema.sql (tabla post)
supabase/migrations/020_social_feed_enterprise.sql (features)
supabase/migrations/021_social_feed_rls.sql (policies)

Types:
src/lib/types/post.ts
src/lib/validations/feed.ts
```

---

## 🚨 Commit Reciente Relacionado

**Commit**: `250ee1f` - "chore: cleanup unused test files and update recommendations API"

**Cambios**:
- ❌ Borrados: tests legacy de usage-limits
- ✏️ Modificado: src/app/api/recommendations/route.ts
- ✏️ Modificado: supabase/migrations/023_rpc_functions.sql

**Impacto en feed**: ❓ Cambios no relacionados directamente con feed social

---

## 💡 Hipótesis Principal

**Más probable**: Las migraciones del feed social (`020_social_feed_enterprise.sql`, `021_social_feed_rls.sql`) **no se han aplicado en producción** aún.

**Razón**:
- El deployment solo hace push del código
- Las migraciones SQL deben aplicarse manualmente a Supabase
- Sin las tablas, la API falla silenciosamente

**Solución**:
1. Aplicar migraciones pendientes a base de datos de producción
2. Seed de datos iniciales (opcional)
3. Verificar RLS policies

---

## ✅ Next Steps

1. **Usuario verifica Console/Network** en browser
2. **Claude aplica migraciones** si es necesario
3. **Seed de datos de prueba** si tabla está vacía
4. **Verificar RLS** si persiste el problema
