# 🚀 QUICK START - Social Feed Enterprise

**Status**: ✅ Código deployed (Ready)
**Pending**: ⏳ Aplicar 4 migrations SQL (5 min)

---

## ⚡ Start Here (5 minutos)

### 1. Abrir Supabase SQL Editor

🔗 **Click aquí**: https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/sql/new

---

### 2. Copiar y Ejecutar (4 veces)

**Migration 1** - `020_social_feed_enterprise.sql`:
```bash
# En tu editor local:
1. Abrir: supabase/migrations/020_social_feed_enterprise.sql
2. Cmd+A (seleccionar todo)
3. Cmd+C (copiar)

# En Supabase SQL Editor (navegador):
4. Cmd+V (pegar)
5. Click "Run" (botón verde)
6. Esperar "Success" (~5 segundos)
```

**Repetir para**:
- **Migration 2**: `021_social_feed_rls.sql` (RLS policies)
- **Migration 3**: `022_storage_media_bucket.sql` (Storage)
- **Migration 4**: `023_rpc_functions.sql` (Trending, graph)

**Tiempo total**: ~5 minutos

---

### 3. Verificar

En SQL Editor, ejecutar:

```sql
SELECT COUNT(*) FROM notification;
```

**Resultado esperado**: `0` (tabla vacía pero existe) ✅

---

### 4. Test en Producción

Ir a: https://padelgraph.com/dashboard

**Quick test**:
1. Click "Comment" en cualquier post
2. Escribir "Test comment"
3. Enter
4. ✅ Debería aparecer el comment instantáneamente

---

## 🎉 ¡Listo!

Ya tienes Social Feed Enterprise funcionando:
- ✅ Comments threading
- ✅ Media upload
- ✅ Follow system
- ✅ Real-time notifications
- ✅ Stories 24h
- ✅ Discover/Trending
- ✅ Six Degrees graph

---

## 📚 Documentación Completa

- **Guía paso a paso**: `claudedocs/APPLY_MIGRATIONS_NOW.md`
- **Docs técnicas**: `claudedocs/SOCIAL_FEED_ENTERPRISE_IMPLEMENTATION.md`
- **Troubleshooting**: `claudedocs/MANUAL_DEPLOYMENT_STEPS.md`

---

## 🆘 Si Algo Falla

1. **Error "trigger already exists"**: ✅ Ya está corregido (ahora usa DROP IF EXISTS)
2. **Error "table does not exist"**: Aplicar migrations en orden (020 → 021 → 022 → 023)
3. **Media upload falla**: Configurar CORS en Storage (ver MANUAL_DEPLOYMENT_STEPS.md)

---

🔗 **Empezar ahora**: https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/sql/new
