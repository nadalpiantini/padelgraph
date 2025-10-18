# Obtener Credenciales PayPal LIVE - Guía Rápida

**Tiempo**: 5-10 minutos
**Requisito**: Cuenta PayPal Business verificada

---

## 🎯 PASO A PASO

### 1. Accede al Developer Dashboard

**URL**: https://developer.paypal.com/dashboard/

**Login**: Usa tu cuenta PayPal Business

---

### 2. **CRÍTICO**: Switch a Modo "Live"

**Ubicación**: Esquina superior derecha del dashboard

```
[Sandbox ▼]  ←  NO ESTE
[Live    ▼]  ←  ✅ SELECCIONA ESTE
```

⚠️ **Si no ves "Live" mode**:
- Tu cuenta Business puede no estar verificada
- Puede necesitar agregar bank account
- Contacta PayPal support

---

### 3. Navega a "Apps & Credentials"

**Ruta**: Dashboard → My Apps & Credentials → Live

---

### 4. Obtener Credenciales

#### Opción A: App Existente

Si ya tienes una app en Live mode:
1. Click en el nombre de la app
2. Verás: **Client ID** (visible)
3. Click: "Show" en **Secret** → Copiar
4. ✅ Listo

#### Opción B: Crear Nueva App

Si NO tienes app en Live:
1. Click: "Create App"
2. **App Name**: `PadelGraph Live`
3. **App Type**: Merchant
4. Click: "Create App"
5. Copiar **Client ID** y **Secret**

---

### 5. Verificar Webhook (si ya existe)

**Ruta**: Developer Dashboard → Webhooks

1. Busca webhook con URL: `https://padelgraph.com/api/paypal/webhook`
2. Si existe:
   - Click para ver details
   - Copiar **Webhook ID**
3. Si NO existe:
   - Click "Add Webhook"
   - URL: `https://padelgraph.com/api/paypal/webhook`
   - Seleccionar eventos:
     - ✓ BILLING.SUBSCRIPTION.ACTIVATED
     - ✓ BILLING.SUBSCRIPTION.UPDATED
     - ✓ BILLING.SUBSCRIPTION.CANCELLED
     - ✓ BILLING.SUBSCRIPTION.SUSPENDED
     - ✓ BILLING.SUBSCRIPTION.EXPIRED
     - ✓ PAYMENT.SALE.COMPLETED
     - ✓ PAYMENT.SALE.DENIED
     - ✓ PAYMENT.SALE.REFUNDED
   - Save → Copiar Webhook ID

---

### 6. Verificar Plans (ya tienes los IDs)

Los Plan IDs que me diste:
```
✅ PAYPAL_PRO_PLAN_ID=P-8DF61561CK131203HNDZLZVQ
✅ PAYPAL_DUAL_PLAN_ID=P-3R001407AKS44845TNDZLY7
✅ PAYPAL_PREMIUM_PLAN_ID=P-88023967WE506663ENDZN2QQ
✅ PAYPAL_CLUB_PLAN_ID=P-1EVQ6856ST196634TNDZN46A
```

**Verificar** en: Products & Billing → Plans
- Deben existir en **Live** mode (NO sandbox)
- Si solo existen en Sandbox, necesitas crearlos en Live

---

## 📝 DAME ESTAS 3 CREDENCIALES:

```
PAYPAL_CLIENT_ID=Ae...  ← De tu app LIVE
PAYPAL_SECRET=Ep...      ← De tu app LIVE
PAYPAL_WEBHOOK_ID=...    ← De webhook LIVE
```

**Nota**: Los 4 Plan IDs ya los tengo ✅

---

## 🆘 Si Algo No Funciona:

### "No veo modo Live"
→ Cuenta Business no verificada. Puede requerir:
- Agregar bank account
- Completar business information
- Esperar 1-2 días para approval

### "Plans no existen en Live"
→ Los Plan IDs que diste son de Sandbox
→ Necesitas crear los 4 plans en Live mode
→ Te puedo ayudar con eso

### "No puedo crear Webhook"
→ URL debe ser HTTPS pública
→ Debe responder HTTP 200
→ Vercel ya está deployado en https://padelgraph.com ✅

---

## ⏳ Esperando...

Dame las 3 credenciales Live y continúo con el setup automático.
