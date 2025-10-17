# 🥇 SPRINT 1 CONTEXT - PadelGraph Core & Comunicación

> **INSTRUCCIONES:** Copia este archivo completo y pégalo al inicio de una NUEVA conversación con Claude para comenzar Sprint 1.

---

## 📋 Contexto del Sprint

**Sprint:** 1 - Core & Comunicación
**Duración:** 7-10 días
**Branch:** `sprint-1-core`
**Estado Anterior:** Sprint 0 completado (infra base lista)

## 🎯 Objetivos del Sprint

### 1. Auth y Perfiles (2 días)
- [ ] Supabase Auth con email/teléfono
- [ ] Tabla `user_profile` con campos completos
- [ ] Preferences (idioma, notificaciones, privacidad)
- [ ] Endpoints: GET/PUT `/api/profile`

### 2. Sistema de Comunicación (2 días)
- [ ] Twilio Conversations setup
- [ ] Email provider (Resend/Postmark)
- [ ] Notification preferences por canal
- [ ] Webhooks handlers
- [ ] Templates EN/ES

### 3. Feed Social Básico (2 días)
- [ ] Modelo `post` con media
- [ ] Storage signed URLs
- [ ] Likes y comentarios
- [ ] Endpoint: `/api/feed`

### 4. Reservas Simples (2 días)
- [ ] Modelos: `court`, `availability`, `booking`
- [ ] CRUD de canchas
- [ ] Calendario de disponibilidad
- [ ] Booking flow básico

### 5. Admin Panel Clubs (1 día)
- [ ] UI admin para clubs
- [ ] Gestión de horarios
- [ ] Precios y slots
- [ ] Dashboard básico

## 🔧 Stack Confirmado
```
Frontend: Next.js 15 + next-intl + Tailwind
Backend: Supabase (Auth, DB, Storage, Realtime)
Comms: Twilio (WhatsApp/SMS) + Resend/Postmark (Email)
Deploy: Vercel
```

## 📁 Estructura Existente (Sprint 0)
```
padelgraph/
├── .env (configurado)
├── package.json (deps instaladas)
├── supabase/
│   ├── schema.sql (base)
│   └── policies.sql (RLS)
├── src/
│   ├── lib/
│   │   ├── supabase.ts ✅
│   │   ├── email.ts (stub)
│   │   └── twilio.ts (stub)
│   └── app/
│       ├── layout.tsx ✅
│       └── page.tsx ✅
```

## 🗄️ Esquema DB Requerido

```sql
-- Extender desde Sprint 0
CREATE TABLE user_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE,
  phone TEXT,
  name TEXT,
  level NUMERIC DEFAULT 3.0,
  city TEXT,
  country TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{"lang":"en","notifications":{"email":true,"whatsapp":true}}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profile(id),
  content TEXT,
  media_urls TEXT[],
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE court (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('indoor','outdoor','covered')),
  surface TEXT CHECK (surface IN ('carpet','concrete','grass','crystal'))
);

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID REFERENCES court(id),
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  price_per_hour NUMERIC
);

CREATE TABLE booking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID REFERENCES court(id),
  user_id UUID REFERENCES user_profile(id),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  total_price NUMERIC
);
```

## 📝 Entregables del Sprint

### APIs a Implementar:
1. `GET/PUT /api/profile` - Perfil de usuario
2. `PUT /api/preferences` - Preferencias
3. `POST /api/email/send` - Enviar email
4. `POST /api/whatsapp/send` - Enviar WhatsApp
5. `GET /api/feed` - Timeline social
6. `POST /api/posts` - Crear post
7. `GET /api/courts` - Lista canchas
8. `GET /api/availability/:courtId` - Disponibilidad
9. `POST /api/bookings` - Crear reserva
10. `GET /api/clubs/:id/admin` - Panel admin

### UI Componentes:
1. ProfileForm.tsx
2. NotificationPreferences.tsx
3. FeedCard.tsx
4. CourtCalendar.tsx
5. BookingFlow.tsx
6. ClubAdminDashboard.tsx

## ✅ Definition of Done

- [ ] Todos los endpoints funcionando
- [ ] i18n EN/ES completo
- [ ] RLS políticas aplicadas
- [ ] Tests básicos (>60% coverage)
- [ ] Deploy en Vercel staging
- [ ] Documentación de APIs

## 🚀 Comandos para Empezar

```bash
# Crear branch
git checkout -b sprint-1-core

# Instalar deps si falta algo
npm install

# Correr migraciones
npx supabase db push

# Desarrollo local
npm run dev

# Tests
npm run test
```

## 📌 Notas Importantes

1. **Auth:** Usar Supabase Auth, NO implementar custom
2. **i18n:** Todos los textos deben estar en locale files
3. **Storage:** Usar Supabase Storage para media
4. **Validación:** Zod en todos los endpoints
5. **Errores:** Manejo consistente con try/catch

## 🔗 Referencias

- Sprint Master: `claudedocs/PADELGRAPH_SPRINTS.md`
- PRD Completo: [No incluido para ahorrar tokens]
- Diseño: Seguir patrones de shadcn/ui

---

**INICIO DEL SPRINT:**
Claude, este es el Sprint 1 de PadelGraph. El Sprint 0 (infra) ya está completado.
Por favor implementa los objetivos listados arriba, empezando por Auth y Perfiles.
Stack: Next.js 15 + Supabase + Tailwind + Twilio + Resend/Postmark.