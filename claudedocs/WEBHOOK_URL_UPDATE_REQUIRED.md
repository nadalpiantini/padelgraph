# ⚠️ ACCIÓN REQUERIDA: Actualizar PayPal Webhook URL

**Prioridad**: 🔴 ALTA
**Tiempo**: 2 minutos
**Status**: PENDIENTE

---

## 🎯 Problema Identificado

Tu webhook PayPal está configurado para:
```
❌ https://padelgraph.vercel.app/api/paypal/webhook
```

Pero tu dominio custom de producción es:
```
✅ https://padelgraph.com/api/paypal/webhook
```

**Impact**: Los webhooks de PayPal NO llegarán a tu app en producción.

---

## 🔧 Solución Rápida (2 min)

### PASO 1: Ir al Dashboard
**URL**: https://developer.paypal.com/dashboard/webhooks

### PASO 2: Localizar Webhook
- Busca el webhook ID: `72E82207JL749005G`
- Click en el webhook para editarlo

### PASO 3: Actualizar URL
- **Cambiar de**: `https://padelgraph.vercel.app/api/paypal/webhook`
- **Cambiar a**: `https://padelgraph.com/api/paypal/webhook`
- Click: "Update" o "Save"

### PASO 4: Verificar
- La URL debe mostrar: `https://padelgraph.com/api/paypal/webhook`
- Status: Active
- Events: 6 events seleccionados

---

## ✅ Verification

Después de actualizar, puedes verificar que funciona:

```bash
# Test webhook endpoint está live
curl -X POST https://padelgraph.com/api/paypal/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Should respond (even if invalid, means endpoint is reachable)
```

---

## 📋 Cuando Completes

Avísame con: **"Webhook URL actualizado"** y continúo con:
1. ✅ Crear test user
2. ✅ Seed social feed
3. ✅ Deploy production
4. ✅ E2E tests

---

## 🆘 Troubleshooting

### "No puedo editar webhook"
- Asegúrate de estar en modo **"Live"** (no Sandbox)
- Puede necesitar permisos de admin en la cuenta Business

### "URL no válida"
- Debe ser HTTPS (no HTTP)
- Debe ser públicamente accesible
- padelgraph.com ya está live ✅

### "¿Necesito nuevo Webhook ID?"
- No, el ID sigue siendo el mismo: `72E82207JL749005G`
- Solo cambia la URL del endpoint
