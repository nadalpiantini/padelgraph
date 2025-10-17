# 📈 SPRINT 5: Analytics, Growth & Monetization

> **Objetivo Principal:** Implementar sistema de analytics completo, monetización production-ready, gamificación y herramientas de growth
> **Duración Estimada:** 2-3 semanas (14-21 días)
> **Progreso Actual:** 0% (0/35 tareas principales)
> **Branch:** `sprint-5-growth-monetization`

---

## 📋 Contexto del Sprint

### ¿Por Qué Este Sprint?

Después de completar el core product (Sprints 1, 2, 4), necesitamos:

1. **Analytics & Gamificación**: Usuarios necesitan ver su progreso, estadísticas, achievements y rankings
2. **Monetization**: Convertir a Stripe modo production y activar subscripciones (4 planes)
3. **Growth Tools**: SEO, KPIs, campañas, A/B testing para acelerar adquisición
4. **Engagement**: Features de retención (achievements, leaderboards, referrals)

### Dependencias de Sprints Anteriores

✅ **Completado en Sprint 1:**
- User profiles con skill_level, play_style
- Auth system completo
- Social feed (likes, comments, posts)

✅ **Completado en Sprint 2:**
- Tournament system (8 formatos)
- Match history con resultados
- Tournament standings

✅ **Completado en Sprint 4:**
- Social graph (connections)
- Recommendations engine
- Travel mode data

🔗 **Requerido para Sprint 5:**
- User activity data (todo Sprint 1-4) ✅
- Match results (Sprint 2) ✅
- Social connections (Sprint 4) ✅
- Payment infrastructure (Sprint 0 - parcial) 🚧

---

## 🎯 Objetivos del Sprint

### 📊 **1. Player Analytics & Stats Dashboard**

**User Story:** Como jugador, quiero ver mis estadísticas, progreso y evolución en el tiempo con gráficos interactivos.

**Tareas:**
- [ ] Schema: tabla `player_stats` (agregados por periodo: day/week/month/all_time)
- [ ] Stats engine: cálculo automático de métricas (win rate, ELO, streaks)
- [ ] API: GET `/api/analytics/player/[userId]?period=week|month|all`
- [ ] API: GET `/api/analytics/player/[userId]/evolution` (datos para gráficos)
- [ ] UI: Analytics dashboard con Recharts (líneas, barras, área)
- [ ] Aggregation job: Vercel Cron diario para precalcular stats
- [ ] Cache: stats populares en memoria

**Métricas Clave:**
- Win rate (general + por formato de torneo)
- Average score per match
- Games won/lost ratio
- Current streak + best streak
- Most frequent opponents
- Favorite clubs/locations
- ELO rating evolution
- Tournament performance (avg placement)

**Acceptance Criteria:**
- Dashboard carga en <2s
- Gráficos interactivos (tooltips, zoom, pan)
- Filtros: periodo, formato, club, opponent
- Comparison: mi evolución vs promedio de mi nivel
- Exportable a PDF/CSV

---

### 🏆 **2. Achievements & Badges System**

**User Story:** Como jugador, quiero desbloquear achievements y badges que muestren mi progreso y me motiven a jugar más.

**Tareas:**
- [ ] Schema: tabla `achievement` (definiciones), `user_achievement` (unlocks)
- [ ] Achievement engine: detección automática post-match/post-tournament
- [ ] Badge design: 30+ badges con iconos (emojis o SVG)
- [ ] API: GET `/api/achievements`, POST `/api/achievements/claim`
- [ ] API: GET `/api/achievements/user/[userId]` (unlocked + progress)
- [ ] UI: Achievement gallery (grid, locked/unlocked states)
- [ ] Notification: toast on unlock + push notification
- [ ] Gamification: XP points por achievement + level system

**Achievement Categories (30+ total):**

**Participation:**
- 🎾 First Match - Play your first match
- 🏅 10 Matches - Complete 10 matches
- 💯 100 Matches - Reach 100 matches milestone

**Victory:**
- 🥇 First Win - Win your first match
- 🔟 10 Wins - Achieve 10 victories
- 🏆 50 Wins - Reach 50 victories
- 💪 100 Wins - Elite player with 100 wins
- 🔥 Win Streak 5 - Win 5 matches in a row
- ⚡ Win Streak 10 - Win 10 matches in a row

**Tournaments:**
- 🎪 First Tournament - Join your first tournament
- 👑 Tournament Winner - Win a tournament
- 🏆 5 Tournament Wins - Win 5 tournaments
- 🥈 Tournament Runner-Up - Finish 2nd in tournament

**Social:**
- 👥 10 Friends - Add 10 friends
- 🌐 50 Connections - Reach 50 connections
- ⭐ Six Degrees Celebrity - Connect to a pro player

**Travel:**
- ✈️ First Travel Mode - Activate travel mode
- 🗺️ 5 Cities - Play in 5 different cities
- 🌍 International Player - Play in 3+ countries

**Consistency:**
- 📅 7-Day Streak - Active for 7 consecutive days
- 🔥 30-Day Streak - Active for 30 consecutive days
- 🎉 1 Year Active - Active for 1 year

**Skill Evolution:**
- 📈 Level Up - Advance skill level
- 🎓 Intermediate - Reach intermediate level
- 🥋 Advanced - Reach advanced level
- 🏅 Pro - Reach pro level

**Community:**
- 🏢 Club Creator - Create a club
- 🎯 Tournament Host - Host a tournament
- 🤝 Fair-Play Award - Maintain positive conduct

**Acceptance Criteria:**
- Automatic unlock detection (triggers post-match/tournament)
- Real-time notification when unlocked
- Badge display on profile (public + private)
- Progress bars for in-progress achievements (e.g., "7/10 wins")
- Leaderboard: most achievements unlocked

---

### 📈 **3. Leaderboards & Rankings**

**User Story:** Como jugador, quiero ver mi ranking y compararme con otros jugadores en diferentes categorías.

**Tareas:**
- [ ] Schema: tabla `leaderboard` (rankings precalculados JSONB)
- [ ] Leaderboard types: global, club, city, country, friends
- [ ] Ranking algorithm: ELO-based + win rate + activity factor
- [ ] API: GET `/api/leaderboards?type=global&scope=club_123&metric=elo`
- [ ] API: GET `/api/leaderboards/[type]/position` (my position)
- [ ] UI: Leaderboard pages (infinite scroll, filters)
- [ ] Real-time updates: WebSocket para cambios de ranking
- [ ] Cron job: recalcular rankings diariamente

**Leaderboard Types (8 categorías):**

1. **Global Ranking** - Top 100 players worldwide (ELO)
2. **Club Ranking** - Top players per club
3. **City Ranking** - Top players per city
4. **Tournament Winners** - Most tournaments won
5. **Win Streak** - Longest active win streak
6. **Social Butterfly** - Most connections
7. **Traveler** - Most cities visited
8. **Fair-Play** - Best conduct score

**Acceptance Criteria:**
- Leaderboards updated daily (real-time for top 10)
- Filter by: skill level, age group, gender
- My position highlighted with badge
- Pagination/infinite scroll (50 per page)
- Share leaderboard position to social media
- Historical data: "You moved up 5 positions this week"

---

### 💳 **4. Stripe Production & 4-Tier Subscriptions**

**User Story:** Como negocio, necesitamos activar pagos reales y gestionar subscripciones con 4 planes diferentes.

**Tareas:**
- [ ] Stripe: cambiar de test mode a production mode
- [ ] Schema: tabla `subscription` (plan, status, period)
- [ ] API: POST `/api/subscriptions/create` (Stripe checkout session)
- [ ] API: POST `/api/subscriptions/portal` (billing portal)
- [ ] API: POST `/api/stripe/webhook` (eventos: created, updated, cancelled, payment_failed)
- [ ] API: GET `/api/subscriptions/current`, GET `/api/subscriptions/usage`
- [ ] Plans: Free, Pro (€9.99), Premium (€19.99), Club (€99.99)
- [ ] Features gating: limitar features por plan (middleware)
- [ ] Usage tracking: tabla `usage_logs` (feature, action, timestamp)
- [ ] Billing portal: Stripe customer portal integration

**Subscription Plans:**

```typescript
const plans = {
  free: {
    name: 'Free',
    price: 0,
    features: {
      tournaments: 2,              // Max 2 tournaments/month
      autoMatch: 3,                // Max 3 auto-matches/week
      recommendations: 10,          // Max 10 recommendations/day
      travelPlans: 1,              // Max 1 active travel plan
      analytics: false,            // Basic stats only
      achievements: true,          // All achievements available
      leaderboards: true,          // View leaderboards
    }
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    currency: 'EUR',
    interval: 'month',
    features: {
      tournaments: 'unlimited',
      autoMatch: 20,               // Max 20/week
      recommendations: 100,         // Max 100/day
      travelPlans: 10,
      analytics: true,             // Advanced analytics dashboard
      achievements: true,
      leaderboards: true,
      prioritySupport: true,
      adFree: true,
    }
  },
  premium: {
    name: 'Premium',
    price: 19.99,
    currency: 'EUR',
    interval: 'month',
    features: {
      tournaments: 'unlimited',
      autoMatch: 'unlimited',
      recommendations: 'unlimited',
      travelPlans: 'unlimited',
      analytics: true,
      achievements: true,
      leaderboards: true,
      prioritySupport: true,
      adFree: true,
      customBranding: true,        // Custom profile themes
      apiAccess: true,             // REST API access
      earlyAccess: true,           // Beta features
    }
  },
  club: {
    name: 'Club',
    price: 99.99,
    currency: 'EUR',
    interval: 'month',
    features: {
      // All Premium features +
      clubManagement: true,        // Multi-court management
      coachTools: true,            // Training programs, stats
      multiLocation: true,         // Multiple club locations
      bulkTournaments: true,       // Create 10+ tournaments
      customDomain: true,          // club.padelgraph.com
      whiteLabel: true,            // Remove PadelGraph branding
      dedicatedSupport: true,      // Phone + priority email
      apiUnlimited: true,          // Unlimited API calls
    }
  }
}
```

**Usage Limits Enforcement:**

```typescript
// Usage limit checker middleware
export async function checkUsageLimit(
  userId: string,
  feature: 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan'
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const subscription = await getUserSubscription(userId);
  const usage = await getFeatureUsage(userId, feature, 'current_period');

  const limit = subscription.plan.features[feature];
  if (limit === 'unlimited') {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  const allowed = usage < limit;
  const remaining = Math.max(0, limit - usage);

  return { allowed, remaining, limit };
}
```

**Acceptance Criteria:**
- Stripe production keys configured en Vercel
- Payment flow end-to-end funcional
- Subscription auto-renews correctamente
- Failed payment handling (retry logic + email)
- Downgrade/upgrade flow smooth (prorated)
- Webhook verification implemented (signature check)
- Tax calculation (EU VAT si aplica)
- Usage limits enforced en todas las features

---

### 🎁 **5. Trials, Coupons & Referral Program**

**User Story:** Como growth team, necesitamos herramientas para promociones, trials y viral growth.

**Tareas:**
- [ ] Schema: tabla `coupon` (code, discount, usage_limit)
- [ ] Trial logic: 14 días gratis de Pro al registrarse
- [ ] Coupon system: códigos de descuento aplicables
- [ ] API: POST `/api/coupons/validate/[code]`
- [ ] API: POST `/api/subscriptions/apply-coupon`
- [ ] Admin UI: crear/editar/deshabilitar coupons
- [ ] Referral program: refer a friend → ambos reciben 1 mes gratis
- [ ] Referral tracking: códigos únicos por usuario
- [ ] Referral leaderboard: top referrers

**Coupon Types:**
- **Percentage discount:** 20% off primeros 3 meses
- **Fixed amount:** €5 off
- **Free trial extension:** +7 días de trial
- **Plan upgrade:** Free upgrade a Premium por 1 mes
- **Referral bonus:** Ambos reciben 1 mes gratis

**Referral Program Flow:**
```
1. User genera código: "JUAN2025"
2. Friend usa código al registrarse
3. Friend recibe: 14 días Pro gratis
4. User recibe: 1 mes gratis al convertir Friend
5. Leaderboard: Top referrers públicos
```

**Acceptance Criteria:**
- Coupon codes case-insensitive
- Usage limit enforcement (max_uses)
- Expiration date validation
- Stackable vs non-stackable rules
- Coupon analytics: redemption rate, revenue impact
- Automated trial end reminder (email 2 días antes)
- Referral tracking analytics: conversion rate, viral coefficient

---

### 📊 **6. Business Analytics & KPI Dashboard (Admin)**

**User Story:** Como admin, necesito ver KPIs del negocio en tiempo real para tomar decisiones data-driven.

**Tareas:**
- [ ] Schema: tabla `business_metric` (daily snapshots)
- [ ] Schema: `analytics_events`, `user_sessions`, `funnel_steps`
- [ ] KPI calculation engine: DAU, MAU, MRR, LTV, churn
- [ ] API: GET `/api/admin/analytics?metric=dau&period=30d`
- [ ] API: GET `/api/admin/analytics/funnels` (conversion funnels)
- [ ] API: GET `/api/admin/analytics/cohort` (retention cohorts)
- [ ] UI: Admin analytics dashboard (Recharts)
- [ ] Real-time updates: WebSocket para live metrics
- [ ] Alerts: Slack notification si churn >10% o MRR drop >20%
- [ ] Automated reports: weekly email con key metrics

**Core KPIs:**

```typescript
interface BusinessKPIs {
  // Revenue
  mrr: number;              // Monthly Recurring Revenue
  arr: number;              // Annual Recurring Revenue
  arpu: number;             // Average Revenue Per User
  ltv: number;              // Lifetime Value
  churn_rate: number;       // % users canceling

  // Growth
  new_users: number;
  active_users: {
    dau: number;            // Daily Active Users
    wau: number;            // Weekly Active Users
    mau: number;            // Monthly Active Users
  };
  user_growth_rate: number; // % MoM

  // Engagement
  session_duration_avg: number;
  pages_per_session: number;
  bounce_rate: number;
  feature_adoption: Record<string, number>;

  // Conversion
  signup_conversion_rate: number;
  trial_to_paid_conversion: number;
  free_to_paid_conversion: number;

  // Retention
  day_1_retention: number;
  day_7_retention: number;
  day_30_retention: number;
  cohort_analysis: CohortData[];
}
```

**Event Tracking:**

```typescript
// Key events to track
const events = {
  // User lifecycle
  user_signed_up: {},
  user_logged_in: {},
  profile_completed: {},

  // Feature usage
  tournament_viewed: { tournament_id },
  tournament_registered: { tournament_id },
  match_scheduled: { match_id },
  auto_match_triggered: {},
  recommendation_clicked: { user_id },
  travel_plan_created: { destination },
  achievement_unlocked: { achievement_id },

  // Engagement
  post_created: {},
  post_liked: {},
  comment_added: {},

  // Monetization
  pricing_viewed: {},
  plan_selected: { plan_id },
  checkout_initiated: { plan_id },
  payment_completed: { amount },
  subscription_upgraded: { from, to },
  subscription_canceled: { reason },
}
```

**Funnel Analysis:**

```typescript
const funnels = {
  registration: [
    'landing_view',
    'signup_click',
    'signup_complete',
    'profile_complete',
    'first_action'
  ],
  subscription: [
    'pricing_view',
    'plan_select',
    'checkout_start',
    'payment_submit',
    'subscription_active'
  ],
  tournament_registration: [
    'tournament_view',
    'register_click',
    'payment_submit',
    'registration_complete'
  ]
}
```

**Acceptance Criteria:**
- Dashboard updates cada 30 min (real-time para critical metrics)
- Historical data: 6 meses mínimo
- Export to CSV/PDF
- Automated weekly email report a stakeholders
- Alerts para critical metrics (churn spike, revenue drop)
- Funnel conversion rates calculadas automáticamente
- Cohort retention heatmaps

---

### 🔍 **7. SEO & Public Pages**

**User Story:** Como marketing, necesitamos páginas públicas SEO-friendly para adquisición orgánica.

**Tareas:**
- [ ] Public profiles: `/players/[username]` (SSR + meta tags)
- [ ] Public leaderboards: `/leaderboards/global` (SSR)
- [ ] Public tournaments: `/tournaments/[slug]` (SSR)
- [ ] Public clubs: `/clubs/[slug]` (SSR)
- [ ] Blog/Content: `/blog/[slug]` (CMS integration - Sanity/Contentful)
- [ ] Sitemap generation: automated XML sitemap (/sitemap.xml)
- [ ] Schema.org markup: Person, SportsEvent, SportsOrganization
- [ ] Meta tags: OpenGraph, Twitter Cards
- [ ] Core Web Vitals optimization: Lighthouse score >90

**SEO Pages (SSR con Next.js 15):**

1. **Player Profiles:**
   - URL: `/players/[username]`
   - Meta: player name, bio, stats, badges
   - Schema.org: Person

2. **Leaderboards:**
   - URL: `/leaderboards/global`, `/leaderboards/city/madrid`
   - Meta: top players, rankings
   - Schema.org: ItemList

3. **Tournaments:**
   - URL: `/tournaments/madrid-open-2025`
   - Meta: tournament name, date, location, participants
   - Schema.org: SportsEvent

4. **Clubs:**
   - URL: `/clubs/[slug]`
   - Meta: club name, location, members
   - Schema.org: SportsOrganization

5. **Blog:**
   - URL: `/blog/how-to-improve-your-padel-serve`
   - Meta: article content
   - Schema.org: Article

**Schema.org Markup Examples:**

```typescript
// Tournament structured data
const tournamentSchema = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: 'Madrid Open 2025',
  startDate: '2025-11-01T10:00:00Z',
  endDate: '2025-11-03T18:00:00Z',
  location: {
    '@type': 'Place',
    name: 'Club Padel Madrid',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Calle Ejemplo 123',
      addressLocality: 'Madrid',
      postalCode: '28001',
      addressCountry: 'ES'
    }
  },
  organizer: {
    '@type': 'Organization',
    name: 'PadelGraph'
  },
  offers: {
    '@type': 'Offer',
    price: '25',
    priceCurrency: 'EUR'
  }
}

// Player profile structured data
const playerSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Juan García',
  knowsAbout: ['Padel'],
  memberOf: {
    '@type': 'Organization',
    name: 'PadelGraph'
  },
  sameAs: [
    'https://twitter.com/juanpadel',
    'https://instagram.com/juanpadel'
  ]
}
```

**Acceptance Criteria:**
- Todas las páginas públicas SSR (Server-Side Rendered)
- Meta tags completos (title, description, OG, Twitter)
- Structured data validation (Google Rich Results Test)
- sitemap.xml auto-generated daily
- robots.txt optimizado
- Core Web Vitals green: LCP <2.5s, FID <100ms, CLS <0.1
- Lighthouse score >90 en todas las páginas públicas

---

### 📧 **8. Automated Email Campaigns**

**User Story:** Como growth team, necesitamos automatizar emails de onboarding, retention y re-engagement.

**Tareas:**
- [ ] Schema: tabla `email_campaign` (definiciones)
- [ ] Email templates: React Email components
- [ ] Onboarding sequence: 5 emails (D0, D1, D2, D5, D14)
- [ ] Retention campaigns: weekly digest, achievement unlocked
- [ ] Re-engagement: inactive user emails (14d, 30d, 60d)
- [ ] API: POST `/api/campaigns/trigger`, GET `/api/campaigns/stats`
- [ ] Resend integration: transactional + marketing emails
- [ ] Unsubscribe management: preferences center
- [ ] A/B testing: subject lines, CTAs

**Email Campaigns:**

**Onboarding Sequence:**
1. **Welcome Email** (immediately after signup)
   - Subject: "Welcome to PadelGraph! 🎾"
   - Content: Quick start guide, first steps

2. **Complete Profile** (Day 1 if incomplete)
   - Subject: "Complete your profile and unlock Pro trial"
   - Content: Benefits of complete profile, 14-day Pro trial

3. **Join First Match** (Day 2 if no match)
   - Subject: "Find your first match! 🏆"
   - Content: How to join tournaments, browse clubs

4. **Explore Features** (Day 5)
   - Subject: "Discover PadelGraph features"
   - Content: Travel mode, achievements, analytics

5. **Upgrade to Pro** (Day 14 - trial ending)
   - Subject: "Your Pro trial ends tomorrow"
   - Content: Benefits recap, upgrade CTA

**Engagement Campaigns:**
1. **Weekly Digest** (every Monday)
   - Matches this week
   - Friends activity
   - New tournaments nearby
   - Achievements progress

2. **Achievement Unlocked**
   - Notification when unlock achievement
   - Share to social media CTA

3. **New Tournament Nearby**
   - Alert when tournament created near user

**Re-engagement Campaigns:**
1. **"We miss you"** (14 days inactive)
   - Subject: "Come back and see what's new!"
   - Content: New features, tournaments nearby

2. **"What's new"** (30 days inactive)
   - Subject: "Check out these new features"
   - Content: Product updates, community highlights

3. **"Last chance"** (60 days inactive)
   - Subject: "We'd love to have you back"
   - Content: Special offer (1 month Pro free)

**Acceptance Criteria:**
- Emails triggered automatically based on user behavior
- Personalization: name, stats, recommendations
- A/B testing: subject lines (test 2 variants, 50/50 split)
- Analytics: open rate >25%, click rate >5%
- Unsubscribe link en todos los emails
- GDPR compliant: consent management, data export
- Email deliverability: spam score <3, inbox rate >95%

---

### 🚀 **9. A/B Testing & Growth Experiments**

**User Story:** Como growth team, necesitamos experimentar sistemáticamente para optimizar conversión y crecimiento.

**Tareas:**
- [ ] Schema: tabla `experiment` (definiciones), `experiment_variant` (assignments)
- [ ] A/B testing framework: random assignment, tracking, analysis
- [ ] API: POST `/api/experiments/assign` (get variant for user)
- [ ] API: POST `/api/experiments/track` (track conversion)
- [ ] API: GET `/api/admin/experiments/[id]/results` (análisis estadístico)
- [ ] UI: Admin experiments dashboard
- [ ] First 3 experiments: pricing CTA color, trial duration, onboarding flow

**A/B Testing Framework:**

```typescript
interface Experiment {
  id: string;
  name: string;
  variants: {
    control: Variant;
    treatment: Variant;
  };
  allocation: number;          // 50/50 split
  start_date: Date;
  end_date: Date | null;
  success_metric: string;      // e.g., 'checkout_initiated'
  status: 'draft' | 'running' | 'completed';
  results?: {
    control_conversion: number;
    treatment_conversion: number;
    p_value: number;
    winner: 'control' | 'treatment' | 'no_difference';
  };
}

// Example experiments
const experiments = [
  {
    name: 'Pricing Page CTA Color',
    variants: ['blue', 'green'],
    metric: 'checkout_initiated',
    hypothesis: 'Green CTA increases conversion'
  },
  {
    name: 'Free Trial Duration',
    variants: ['7d', '14d', '30d'],
    metric: 'trial_to_paid_conversion',
    hypothesis: '14 days optimal for conversion'
  },
  {
    name: 'Onboarding Flow',
    variants: ['short', 'detailed'],
    metric: 'profile_completion_rate',
    hypothesis: 'Shorter flow increases completion'
  }
]
```

**Acceptance Criteria:**
- Random assignment con consistent bucketing (user_id hash)
- Track conversions automáticamente
- Statistical significance calculation (chi-square test)
- Admin dashboard: view results, declare winner
- Auto-stop experiments cuando significance reached
- Rollout winner to 100% automáticamente

---

## 🗄️ Database Schema (Sprint 5)

### New Tables

```sql
-- Player Statistics (aggregated)
CREATE TABLE player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,

  -- Time period
  period_type VARCHAR(20) NOT NULL, -- day, week, month, all_time
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Match stats
  total_matches INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2),

  -- Game stats
  total_games_won INTEGER DEFAULT 0,
  total_games_lost INTEGER DEFAULT 0,
  games_diff INTEGER,
  avg_score_per_match DECIMAL(4,1),

  -- Streaks
  current_win_streak INTEGER DEFAULT 0,
  best_win_streak INTEGER DEFAULT 0,

  -- Tournament stats
  tournaments_played INTEGER DEFAULT 0,
  tournaments_won INTEGER DEFAULT 0,
  avg_tournament_placement DECIMAL(4,1),

  -- Skill evolution
  elo_rating INTEGER DEFAULT 1200,
  elo_change INTEGER,
  skill_level VARCHAR(20),

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_type, period_start)
);

-- Achievements
CREATE TABLE achievement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- participation, victory, social, travel
  requirement_type VARCHAR(50),
  requirement_value INTEGER,
  xp_points INTEGER DEFAULT 0,
  badge_icon VARCHAR(100),
  badge_color VARCHAR(20),
  is_hidden BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements
CREATE TABLE user_achievement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievement(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Leaderboards (precalculated)
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  scope_id UUID,
  metric VARCHAR(50) NOT NULL,
  period_type VARCHAR(20) DEFAULT 'all_time',
  period_start DATE,
  period_end DATE,
  rankings JSONB NOT NULL, -- [{user_id, rank, value}]
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, scope_id, metric, period_type, period_start)
);

-- Subscriptions
CREATE TABLE subscription (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100) UNIQUE,
  plan VARCHAR(50) NOT NULL, -- free, pro, premium, club
  status VARCHAR(50) NOT NULL, -- active, cancelled, past_due, trialing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  amount INTEGER,
  currency VARCHAR(3) DEFAULT 'EUR',
  interval VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Usage Tracking
CREATE TABLE usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  feature VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Coupons
CREATE TABLE coupon (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20),
  discount_value DECIMAL(10,2),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  applicable_plans VARCHAR(50)[],
  first_time_only BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Analytics Events
CREATE TABLE analytics_event (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES user_profile(user_id),
  session_id VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  properties JSONB,
  page_url TEXT,
  referrer TEXT,
  device_info JSONB
);

-- User Sessions
CREATE TABLE user_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID REFERENCES user_profile(user_id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  page_views INTEGER DEFAULT 1,
  events_count INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  entry_url TEXT,
  exit_url TEXT,
  referrer TEXT,
  device_info JSONB
);

-- Funnel Steps
CREATE TABLE funnel_step (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_name VARCHAR(50) NOT NULL,
  step_name VARCHAR(50) NOT NULL,
  step_order INTEGER NOT NULL,
  user_id UUID REFERENCES user_profile(user_id),
  session_id VARCHAR(100) NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  properties JSONB
);

-- Business Metrics
CREATE TABLE business_metric (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_name, date)
);

-- Email Campaigns
CREATE TABLE email_campaign (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  campaign_type VARCHAR(50),
  trigger_type VARCHAR(50),
  subject_line VARCHAR(200),
  body_template TEXT,
  target_segment VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Testing Experiments
CREATE TABLE experiment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  success_metric VARCHAR(100) NOT NULL,
  variants JSONB NOT NULL,
  allocation DECIMAL(3,2) DEFAULT 0.5,
  status VARCHAR(20) DEFAULT 'draft',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiment Assignments
CREATE TABLE experiment_assignment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiment(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profile(user_id) ON DELETE CASCADE,
  variant VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  UNIQUE(experiment_id, user_id)
);

-- Indexes
CREATE INDEX idx_player_stats_user ON player_stats(user_id);
CREATE INDEX idx_achievement_category ON achievement(category);
CREATE INDEX idx_user_achievement_user ON user_achievement(user_id);
CREATE INDEX idx_user_achievement_unlocked ON user_achievement(is_unlocked);
CREATE INDEX idx_leaderboard_type ON leaderboard(type, scope_id);
CREATE INDEX idx_subscription_user ON subscription(user_id);
CREATE INDEX idx_subscription_status ON subscription(status);
CREATE INDEX idx_usage_log_user ON usage_log(user_id);
CREATE INDEX idx_coupon_code ON coupon(code);
CREATE INDEX idx_analytics_event_timestamp ON analytics_event(timestamp);
CREATE INDEX idx_analytics_event_user ON analytics_event(user_id);
CREATE INDEX idx_analytics_event_name ON analytics_event(event_name);
CREATE INDEX idx_user_session_started ON user_session(started_at);
CREATE INDEX idx_funnel_step_funnel ON funnel_step(funnel_name);
CREATE INDEX idx_business_metric_name ON business_metric(metric_name, date);
```

### Schema Extensions

```sql
-- Add to user_profile
ALTER TABLE user_profile
  ADD COLUMN xp_points INTEGER DEFAULT 0,
  ADD COLUMN level INTEGER DEFAULT 1,
  ADD COLUMN current_plan VARCHAR(50) DEFAULT 'free',
  ADD COLUMN is_public BOOLEAN DEFAULT true,
  ADD COLUMN email_preferences JSONB DEFAULT '{"marketing": true, "digest": true, "achievements": true}'::jsonb;
```

---

## 📡 API Endpoints (Sprint 5)

### Analytics
```
GET    /api/analytics/player/[userId]           - Player stats
GET    /api/analytics/player/[userId]/evolution - Stats over time
GET    /api/analytics/compare?user1=X&user2=Y   - Compare players
```

### Achievements
```
GET    /api/achievements                        - All achievements + user progress
GET    /api/achievements/user/[userId]          - User's unlocked achievements
POST   /api/achievements/claim/[achievementId]  - Claim achievement
```

### Leaderboards
```
GET    /api/leaderboards                        - List leaderboard types
GET    /api/leaderboards/[type]                 - Specific leaderboard
GET    /api/leaderboards/[type]/position        - My position
```

### Subscriptions
```
POST   /api/subscriptions/create                - Create subscription
GET    /api/subscriptions/current               - My subscription
PUT    /api/subscriptions/update                - Update subscription
DELETE /api/subscriptions/cancel                - Cancel subscription
POST   /api/subscriptions/reactivate            - Reactivate
GET    /api/subscriptions/billing-portal        - Stripe portal URL
GET    /api/subscriptions/usage                 - Usage stats
POST   /api/stripe/webhook                      - Stripe webhook
```

### Coupons
```
GET    /api/coupons/validate/[code]             - Validate coupon
POST   /api/subscriptions/apply-coupon          - Apply coupon
GET    /api/admin/coupons                       - List coupons (admin)
POST   /api/admin/coupons                       - Create coupon (admin)
```

### Business Metrics (Admin)
```
GET    /api/admin/analytics/metrics             - All metrics
GET    /api/admin/analytics/kpi?metric=dau      - Specific KPI
GET    /api/admin/analytics/cohort              - Cohort retention
GET    /api/admin/analytics/funnel              - Conversion funnel
```

### Email Campaigns (Admin)
```
GET    /api/admin/campaigns                     - List campaigns
POST   /api/admin/campaigns                     - Create campaign
POST   /api/admin/campaigns/[id]/send           - Trigger send
GET    /api/admin/campaigns/[id]/stats          - Campaign stats
```

### A/B Testing
```
POST   /api/experiments/assign                  - Get variant for user
POST   /api/experiments/track                   - Track conversion
GET    /api/admin/experiments                   - List experiments (admin)
GET    /api/admin/experiments/[id]/results      - Experiment results (admin)
```

---

## 🎨 UI Components (Sprint 5)

### 1. Analytics Dashboard
**Location:** `src/app/analytics/page.tsx`
- Stats cards (matches, win rate, streak)
- Charts (Recharts): win rate evolution, matches per week
- Filters: period, format, club
- Comparison: vs average
- Export (PDF/CSV)

### 2. Achievements Gallery
**Location:** `src/components/achievements/AchievementsGallery.tsx`
- Grid layout with cards
- Locked/unlocked states
- Progress bars
- Filter by category
- Details modal

### 3. Leaderboard Page
**Location:** `src/app/leaderboards/page.tsx`
- Type selector tabs
- Rankings table (infinite scroll)
- My position highlight
- Filters
- Share button

### 4. Subscription Plans Page
**Location:** `src/app/pricing/page.tsx`
- 4-column plan comparison
- Features table
- Trial badge
- CTAs (Stripe checkout)
- FAQ section

### 5. Billing Portal
**Location:** `src/app/account/billing/page.tsx`
- Current plan card
- Usage stats
- Payment method
- Billing history
- Upgrade/downgrade/cancel

### 6. Admin Analytics Dashboard
**Location:** `src/app/admin/analytics/page.tsx`
- KPI cards (DAU, MAU, MRR, churn)
- Graphs (Recharts)
- Metric selector
- Date range picker
- Export CSV

### 7. Public Player Profile
**Location:** `src/app/players/[username]/page.tsx`
- SSR for SEO
- Avatar, name, bio
- Stats summary
- Badges
- Recent matches
- Leaderboard positions

### 8. Email Preferences Center
**Location:** `src/app/account/email-preferences/page.tsx`
- Toggle switches
- Frequency selector
- Unsubscribe all
- Save button

### 9. Admin Experiments Dashboard
**Location:** `src/app/admin/experiments/page.tsx`
- List experiments
- Create experiment
- View results (statistical significance)
- Declare winner
- Rollout

---

## 🔧 Technical Stack Additions

### Analytics
- **Recharts**: Chart library
- **date-fns**: Date manipulation
- **SQL Views**: Precalculated aggregations

### Payments
- **Stripe SDK**: `@stripe/stripe-js`, `stripe`

### Email
- **Resend**: Already integrated
- **React Email**: Email templates

### SEO
- **Next.js 15**: SSR, metadata API
- **schema-dts**: Schema.org TypeScript
- **next-sitemap**: Sitemap generation

### Background Jobs
- **Vercel Cron**: Daily aggregation jobs

---

## 📊 Success Metrics (Sprint 5)

| Métrica | Target | Measurement |
|---------|--------|-------------|
| **Analytics Adoption** | 70% of active users | % que visitan analytics primeros 7 días |
| **Achievement Unlock** | 80% unlock 1+ | % users con ≥1 achievement |
| **Free → Paid Conv** | 5% after trial | % trial → paid |
| **MRR Growth** | €1,000 @ month 1 | Monthly recurring revenue |
| **Coupon Redemption** | 30% of codes | % coupons claimed |
| **Email Open Rate** | 25% average | Opens / sends |
| **D7 Retention** | 40% | % active Day 7 |
| **SEO Traffic** | 500 organic/mo | Google Analytics |
| **Referral Conv** | 20% of referrals | % referred users convert |

---

## 🚀 Implementation Plan

### **Phase 1: Analytics & Gamification (Days 1-5)**
- [ ] Database: player_stats, achievement, user_achievement, leaderboard
- [ ] Stats calculation engine
- [ ] Achievement definitions (30+)
- [ ] Leaderboard ranking algorithm
- [ ] Daily aggregation job (Vercel Cron)
- [ ] APIs: analytics, achievements, leaderboards
- [ ] UI: Analytics dashboard, achievements gallery, leaderboards
- [ ] Testing: stats accuracy, achievement triggers

### **Phase 2: Monetization (Days 6-10)**
- [ ] Stripe production setup
- [ ] Database: subscription, usage_log, coupon
- [ ] Subscription APIs (create, update, cancel)
- [ ] Stripe webhooks (subscription events)
- [ ] Usage limit enforcement (middleware)
- [ ] Billing portal integration
- [ ] Coupons & trials system
- [ ] Referral program
- [ ] UI: Pricing page, billing portal
- [ ] Testing: full payment flow

### **Phase 3: Business Intelligence (Days 11-14)**
- [ ] Database: analytics_event, user_session, funnel_step, business_metric
- [ ] Event tracking SDK (client + server)
- [ ] Funnel analysis engine
- [ ] KPI calculation functions
- [ ] APIs: admin analytics, funnels, cohorts
- [ ] UI: Admin analytics dashboard
- [ ] Automated reports (weekly email)
- [ ] Testing: event tracking, KPI calculations

### **Phase 4: SEO & Growth (Days 15-18)**
- [ ] SSR: public profiles, leaderboards, tournaments, clubs
- [ ] Meta tags (OpenGraph, Twitter)
- [ ] Schema.org markup (Person, SportsEvent, Organization)
- [ ] Sitemap generation (automated)
- [ ] Email campaigns: onboarding sequence
- [ ] Email campaigns: retention + re-engagement
- [ ] A/B testing framework
- [ ] First 3 experiments
- [ ] Testing: SEO validation (Lighthouse), email deliverability

### **Phase 5: Testing & Polish (Days 19-21)**
- [ ] E2E tests: subscription flow
- [ ] E2E tests: analytics dashboard
- [ ] Load testing: analytics queries
- [ ] SEO validation: Lighthouse, Rich Results Test
- [ ] Email testing: spam score
- [ ] Stripe production verification
- [ ] Documentation: API docs, admin guides
- [ ] Launch checklist

---

## 🔗 Referencias Importantes

### Documentación Sprint
- **Este contexto:** `claudedocs/SPRINT_5_CONTEXT.md`
- **PRD técnico:** `claudedocs/SPRINT_5_PRD.md`
- **Roadmap general:** `claudedocs/PADELGRAPH_SPRINTS.md`
- **Sprint anterior:** `claudedocs/SPRINT_4_MERGE_DEPLOYMENT_GUIDE.md`

### Dependencies
- Sprint 1: User profiles, auth ✅
- Sprint 2: Tournaments, match history ✅
- Sprint 4: Social graph, recommendations ✅

### External Resources
- **Stripe Docs:** https://stripe.com/docs
- **Recharts:** https://recharts.org/
- **React Email:** https://react.email/
- **Next.js SEO:** https://nextjs.org/docs/app/building-your-application/optimizing/metadata
- **Schema.org:** https://schema.org/

---

## 📝 Notas para el Desarrollo

### BMAD Workflow Recomendado

1. **Planning:**
   ```bash
   # En chat de BMAD (Gemini/ChatGPT):
   *pm
   Paste este documento SPRINT_5_CONTEXT.md
   ```

2. **Implementation:**
   ```bash
   # En Claude Code/Cursor:
   Leer claudedocs/SPRINT_5_CONTEXT.md
   Implementar fase por fase
   ```

3. **Validation:**
   - TypeScript: `npm run typecheck`
   - Build: `npm run build`
   - Tests: `npm test`
   - Stripe: Use test cards for verification

### Critical Paths

1. **Stripe Production:** MUST configure production keys antes de launch
2. **Stats Aggregation:** Daily cron job para performance
3. **Email Deliverability:** Warm up Resend domain, monitor spam score
4. **SEO:** SSR para public pages desde el inicio
5. **Achievement Triggers:** Automatización post-match/tournament

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Stripe webhook failures | Retry logic + dead letter queue + idempotency |
| Stats calculation slow | Precalculate daily, cache popular queries |
| Email spam | Warm up domain, monitor deliverability, double opt-in |
| SEO not ranking | Quality content, backlinks, local SEO |
| Conversion low | A/B test pricing, optimize onboarding, trials |
| Achievement spam | Rate limit, validation, admin review |

---

## ✅ Ready to Start

**Pre-requisitos:**
- [x] Sprint 4 completado al 100%
- [x] Database migrations applied
- [x] TypeScript 0 errors
- [x] Production deployment exitoso
- [ ] Stripe account created (production mode)
- [ ] Email domain warmed up (Resend)
- [ ] Achievement badge designs (30+ iconos)

**Primer comando:**
```bash
git checkout -b sprint-5-growth-monetization
cat claudedocs/SPRINT_5_CONTEXT.md
```

---

**🚀 ¡Sprint 5 Ready to Launch!**

**Estimación Final:** 2-3 semanas (14-21 días)
**Timeline:** Oct 25 - Nov 15 (approx)

*Última actualización: 2025-10-17*
