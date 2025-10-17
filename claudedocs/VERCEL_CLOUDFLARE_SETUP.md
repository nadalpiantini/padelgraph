# 🚀 Vercel + Cloudflare Setup Guide

**Project:** PadelGraph
**Dominios:** padelgraph.com (principal) + padelgraph.app (secundario)
**Repository:** https://github.com/nadalpiantini/padelgraph
**DNS Provider:** Cloudflare

---

## ✅ Configuración Completada

- [x] GitHub repository configurado
- [x] Branches pusheados (main + sprint-1-core)
- [x] vercel.json creado con headers de seguridad
- [ ] Vercel project conectado a GitHub
- [ ] Dominios configurados en Vercel
- [ ] DNS configurado en Cloudflare
- [ ] SSL/HTTPS activo
- [ ] Environment variables actualizadas

---

## 📋 Paso 1: Conectar Vercel a GitHub

### 1.1 Ir a Vercel Dashboard
URL: https://vercel.com/new

### 1.2 Import Git Repository
1. Click "Add New Project"
2. Select "Import Git Repository"
3. Buscar: `nadalpiantini/padelgraph`
4. Click "Import"

### 1.3 Configure Project
**Framework Preset:** Next.js
**Root Directory:** `./` (default)
**Build Command:** `npm run build` (auto-detected)
**Output Directory:** `.next` (auto-detected)
**Install Command:** `npm install` (auto-detected)

**Environment Variables:**
```bash
# Copiar todas desde .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
RESEND_API_KEY=
EMAIL_FROM=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_MODE=sandbox
NEXT_PUBLIC_APP_URL=https://padelgraph.com
```

### 1.4 Deploy
1. Click "Deploy"
2. Esperar build (~2-3 min)
3. Verificar deployment exitoso

---

## 📋 Paso 2: Configurar Dominios en Vercel

### 2.1 Agregar padelgraph.com (Dominio Principal)

**En Vercel Dashboard:**
1. Ir a tu proyecto → Settings → Domains
2. Click "Add Domain"
3. Ingresar: `padelgraph.com`
4. Click "Add"

**Vercel te mostrará los DNS records necesarios:**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

### 2.2 Agregar www.padelgraph.com

1. Click "Add Domain"
2. Ingresar: `www.padelgraph.com`
3. Vercel auto-configurará redirect a apex domain

### 2.3 Agregar padelgraph.app (Dominio Secundario)

1. Click "Add Domain"
2. Ingresar: `padelgraph.app`
3. Click "Add"

**Configuración recomendada:**
- Opción A: Redirect a padelgraph.com (más simple)
- Opción B: Servir mismo contenido (alias)

---

## 📋 Paso 3: Configurar DNS en Cloudflare

### 3.1 Login a Cloudflare
URL: https://dash.cloudflare.com/

### 3.2 Configurar padelgraph.com

**Ir a:** padelgraph.com → DNS → Records

**Agregar/Modificar records:**

1. **CNAME @ (Apex Domain)**
   ```
   Type: CNAME
   Name: @
   Target: cname.vercel-dns.com
   Proxy status: Proxied (🟠 naranja)
   TTL: Auto
   ```

2. **CNAME www**
   ```
   Type: CNAME
   Name: www
   Target: cname.vercel-dns.com
   Proxy status: Proxied (🟠 naranja)
   TTL: Auto
   ```

**⚠️ IMPORTANTE:**
- Eliminar cualquier A record existente con `@` o `www`
- Proxy status debe estar **Proxied** (naranja) para SSL de Cloudflare

### 3.3 Configurar padelgraph.app

**Ir a:** padelgraph.app → DNS → Records

**Agregar/Modificar records:**

1. **CNAME @ (Apex Domain)**
   ```
   Type: CNAME
   Name: @
   Target: cname.vercel-dns.com
   Proxy status: Proxied (🟠 naranja)
   TTL: Auto
   ```

2. **CNAME www**
   ```
   Type: CNAME
   Name: www
   Target: cname.vercel-dns.com
   Proxy status: Proxied (🟠 naranja)
   TTL: Auto
   ```

### 3.4 Configurar SSL/TLS en Cloudflare

**Para ambos dominios:**

1. Ir a: SSL/TLS tab
2. Seleccionar modo: **Full (strict)**
   - ⚠️ NO usar "Flexible" (inseguro)
   - ✅ "Full (strict)" verifica certificado de Vercel

3. Habilitar opciones:
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ HTTP Strict Transport Security (HSTS)

---

## 📋 Paso 4: Verificar Configuración

### 4.1 Verificar DNS Propagation
URL: https://dnschecker.org/

Verificar para ambos dominios:
- `padelgraph.com` → CNAME apunta a vercel
- `www.padelgraph.com` → CNAME apunta a vercel
- `padelgraph.app` → CNAME apunta a vercel
- `www.padelgraph.app` → CNAME apunta a vercel

**Tiempo de propagación:** 5-10 minutos (hasta 48h en casos extremos)

### 4.2 Verificar SSL en Vercel

**En Vercel Dashboard:**
1. Ir a: Settings → Domains
2. Cada dominio debe mostrar: ✅ Valid Configuration
3. SSL debe estar: ✅ Enabled

### 4.3 Test Endpoints

**Una vez activo, verificar:**

```bash
# Dominio principal
curl -I https://padelgraph.com/api/health
# Debe retornar: 200 OK

# www redirect
curl -I https://www.padelgraph.com
# Debe redirect a: https://padelgraph.com

# Dominio secundario
curl -I https://padelgraph.app/api/health
# Debe retornar: 200 OK (o redirect según configuración)
```

---

## 📋 Paso 5: Actualizar Environment Variables

### 5.1 En Vercel Dashboard

**Ir a:** Settings → Environment Variables

**Actualizar:**
```bash
NEXT_PUBLIC_APP_URL=https://padelgraph.com
```

**Scope:** Production + Preview + Development

### 5.2 Redeploy

**Después de cambiar env vars:**
1. Ir a: Deployments
2. Click en el último deployment
3. Click "⋯" → "Redeploy"
4. Confirmar redeploy

---

## 📋 Paso 6: Configurar Auto-Deploy desde GitHub

### 6.1 Verificar Git Integration

**En Vercel Dashboard:**
1. Ir a: Settings → Git
2. Verificar: ✅ Production Branch: `main`
3. Verificar: ✅ Deploy Hooks enabled

### 6.2 Configurar Branch Deployments

**Production:**
- Branch: `main`
- Auto-deploy: ✅ Enabled

**Preview:**
- Pull Requests: ✅ Enabled
- Branches: All branches except main

### 6.3 Test Auto-Deploy

```bash
# Local
echo "# Test" >> README.md
git add README.md
git commit -m "test: verify auto-deploy"
git push origin main

# Vercel automáticamente deployará
```

---

## 🔧 Configuración Avanzada (Opcional)

### Cloudflare Page Rules

**Para mejor performance:**

1. **Cache Everything** (para assets estáticos)
   ```
   URL: padelgraph.com/*
   Settings: Cache Level: Cache Everything
   ```

2. **Bypass Cache** (para API routes)
   ```
   URL: padelgraph.com/api/*
   Settings: Cache Level: Bypass
   ```

### Vercel Edge Config

**Para mejor latency:**
1. Habilitar Edge Functions donde aplique
2. Configurar Edge Middleware si necesitas geo-routing

---

## 📊 Verificación Final

### Checklist Completo

- [ ] ✅ padelgraph.com carga correctamente
- [ ] ✅ www.padelgraph.com redirige a padelgraph.com
- [ ] ✅ padelgraph.app carga o redirige correctamente
- [ ] ✅ HTTPS funciona en todos los dominios
- [ ] ✅ SSL certificates válidos (sin warnings)
- [ ] ✅ API endpoints responden correctamente
- [ ] ✅ Auto-deploy desde main funciona
- [ ] ✅ Preview deployments desde PRs funcionan
- [ ] ✅ Environment variables configuradas
- [ ] ✅ Headers de seguridad activos

### Test de Performance

```bash
# Lighthouse CI
npx lighthouse https://padelgraph.com --view

# Targets:
# Performance: >90
# SEO: >90
# Best Practices: >90
# Accessibility: >90
```

---

## 🆘 Troubleshooting

### Problema: DNS no propaga

**Solución:**
1. Verificar CNAME en Cloudflare está correcto
2. Esperar 10-15 minutos
3. Flush DNS local: `sudo dscacheutil -flushcache` (macOS)
4. Verificar en: https://dnschecker.org/

### Problema: SSL Invalid

**Solución:**
1. En Cloudflare: SSL/TLS → Full (strict)
2. En Vercel: Regenerar SSL certificate
3. Esperar 5 minutos para propagación

### Problema: API routes retornan 401

**Solución:**
1. Verificar environment variables en Vercel
2. Redeploy después de cambiar vars
3. Verificar NEXT_PUBLIC_APP_URL es correcto

### Problema: Deployment falla

**Solución:**
1. Verificar build logs en Vercel
2. Correr `npm run build` localmente
3. Verificar todas las deps están en package.json
4. Verificar no hay TypeScript errors

---

## 📞 Recursos Útiles

- **Vercel Docs:** https://vercel.com/docs
- **Cloudflare Docs:** https://developers.cloudflare.com/
- **DNS Checker:** https://dnschecker.org/
- **SSL Test:** https://www.ssllabs.com/ssltest/
- **Vercel Support:** https://vercel.com/support

---

## 🎉 Configuración Completada

Una vez todos los pasos estén ✅, tu aplicación estará:
- ✅ Live en producción con dominios custom
- ✅ SSL/HTTPS completo
- ✅ Auto-deploy desde GitHub
- ✅ Headers de seguridad activos
- ✅ Performance optimizada con Cloudflare + Vercel

**Next Steps:**
- Configurar monitoring (Sentry)
- Configurar analytics (Google Analytics / Mixpanel)
- Configurar uptime monitoring (UptimeRobot)
- Cambiar `PAYPAL_MODE=production` cuando estés listo

---

*Última actualización: 2025-10-17*
*Sprint 1 completado - Ready for production!*
