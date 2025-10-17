# 🏁 SPRINT 0 CONTEXT - PadelGraph Base de Producción

> **INSTRUCCIONES:** Copia este archivo completo y pégalo al inicio de una NUEVA conversación con Claude para comenzar Sprint 0.

---

## 📋 Contexto del Sprint

**Sprint:** 0 - Base de Producción (Infraestructura)
**Duración:** 3 días
**Branch:** `main` → `sprint-0-infra`
**Estado Anterior:** Proyecto nuevo, sin código previo

## 🎯 Objetivos del Sprint

### 1. Setup Proyecto Base (Día 1)
- [ ] Crear repo GitHub
- [ ] Inicializar Next.js 15
- [ ] Configurar TypeScript estricto
- [ ] Setup Tailwind CSS
- [ ] Estructura de carpetas
- [ ] ESLint + Prettier

### 2. Infraestructura Cloud (Día 1-2)
- [ ] Proyecto Supabase nuevo
- [ ] Configurar Vercel
- [ ] Conectar repo con Vercel
- [ ] Dominios y DNS
- [ ] Variables de entorno
- [ ] Storage driver decision (Supabase/R2/S3)

### 3. Servicios Externos (Día 2)
- [ ] Cuenta Twilio (sandbox WhatsApp)
- [ ] Resend o Postmark (email)
- [ ] Stripe cuenta y webhooks
- [ ] Sentry para errores
- [ ] OpenTelemetry básico

### 4. Seguridad y RLS (Día 3)
- [ ] Schema base de datos
- [ ] RLS policies con org_id
- [ ] Roles (owner/admin/coach/member/guest)
- [ ] Auth configuration
- [ ] CORS y headers seguros

## 🔧 Stack a Configurar

```yaml
Frontend:
  - Next.js: 15.0.0
  - React: 18.3.1
  - TypeScript: 5.6.3
  - Tailwind: 3.4.0
  - next-intl: 3.17.0

Backend:
  - Supabase: 2.45.0
  - Auth: Supabase Auth
  - DB: PostgreSQL 15
  - Storage: Supabase Storage
  - Realtime: Supabase Realtime

External:
  - Twilio: SDK 5.3.0
  - Email: Resend/Postmark
  - Payments: Stripe
  - Monitoring: Sentry
  - Analytics: OpenTelemetry

Deploy:
  - Hosting: Vercel
  - CDN: Vercel Edge Network
  - Domain: padelgraph.com
```

## 📁 Estructura Target

```
padelgraph/
├── .env.example
├── .env.local (ignorado)
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── prettier.config.js
├── .eslintrc.json
├── README.md
├── public/
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       └── health/route.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── stripe.ts
│   │   ├── twilio.ts
│   │   └── email.ts
│   ├── types/
│   │   └── database.types.ts
│   └── i18n/
│       ├── config.ts
│       └── locales/
│           ├── en.json
│           └── es.json
├── supabase/
│   ├── config.toml
│   ├── schema.sql
│   ├── policies.sql
│   ├── seed.sql
│   └── migrations/
└── claudedocs/
    └── [sprint management files]
```

## 🗄️ Schema Base Inicial

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations (multi-tenant)
CREATE TABLE organization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('club','group','federation')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base auth profile extension
CREATE TABLE user_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization membership
CREATE TABLE org_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organization(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profile(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner','admin','coach','member','guest')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- RLS Policies foundation
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_member ENABLE ROW LEVEL SECURITY;
```

## 🔐 Variables de Entorno

```env
# .env.example
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=

RESEND_API_KEY=
# o
POSTMARK_SERVER_TOKEN=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

STORAGE_DRIVER=supabase
# Si usas S3/R2:
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

## ✅ Definition of Done - Sprint 0

- [ ] Repo creado y pusheado a GitHub
- [ ] Next.js corriendo localmente
- [ ] Supabase proyecto creado y conectado
- [ ] Deploy inicial en Vercel funcionando
- [ ] Dominio configurado (al menos staging)
- [ ] Todas las API keys en .env
- [ ] RLS básico funcionando
- [ ] Health check endpoint respondiendo
- [ ] Sentry capturando errores de prueba
- [ ] README con instrucciones de setup

## 🚀 Comandos de Setup

```bash
# 1. Crear proyecto Next.js
npx create-next-app@latest padelgraph --typescript --tailwind --app

# 2. Instalar dependencias core
npm install @supabase/supabase-js next-intl zod
npm install -D @types/node

# 3. Setup Supabase local (opcional)
npx supabase init
npx supabase start

# 4. Crear proyecto en Supabase Cloud
# Via dashboard: app.supabase.com

# 5. Deploy inicial a Vercel
vercel --prod
```

## 📋 Checklist de Configuración

### Supabase:
- [ ] Proyecto creado en app.supabase.com
- [ ] Auth providers configurados
- [ ] Database password segura
- [ ] Backup automático activado

### Vercel:
- [ ] Proyecto importado desde GitHub
- [ ] Variables de entorno configuradas
- [ ] Dominio personalizado añadido
- [ ] Preview deployments activos

### Twilio:
- [ ] Cuenta creada (trial OK para empezar)
- [ ] WhatsApp sandbox configurado
- [ ] Webhook URL configurada

### Stripe:
- [ ] Cuenta en modo test
- [ ] Webhook endpoint creado
- [ ] Products/prices de prueba

## 🔍 Tests de Verificación

```bash
# 1. Test local
npm run dev
# Visitar http://localhost:3000

# 2. Test Supabase connection
curl http://localhost:3000/api/health

# 3. Test build
npm run build

# 4. Test types
npm run typecheck

# 5. Deploy test
git push origin sprint-0-infra
# Verificar en Vercel dashboard
```

## 📌 Notas Importantes

1. **NO implementar features** - solo infraestructura
2. **Mantener simple** - configuración mínima funcional
3. **Documentar todo** - especialmente secrets y configs
4. **Test cada servicio** - verificar conectividad
5. **Commit frecuente** - cambios atómicos

---

**INICIO DEL SPRINT:**
Claude, este es el Sprint 0 de PadelGraph - Setup de Infraestructura Base.
Por favor configura el proyecto desde cero con Next.js 15, Supabase, y los servicios externos listados.
Necesito un proyecto production-ready pero sin features, solo la base sólida.