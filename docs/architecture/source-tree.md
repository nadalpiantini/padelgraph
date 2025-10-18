# Source Tree Structure - Padelgraph

## 📁 Project Structure

```
/Users/nadalpiantini/Dev/Padelgraph/
├─ src/
│  ├─ app/
│  │  ├─ [locale]/           # i18n routes
│  │  │  ├─ (auth)/          # Auth pages
│  │  │  ├─ dashboard/       # Main dashboard
│  │  │  ├─ discover/        # Discovery UI ✅
│  │  │  ├─ travel/          # Travel Mode ✅
│  │  │  ├─ feed/            # Social feed
│  │  │  ├─ profile/         # User profile
│  │  │  ├─ account/         # Settings, billing
│  │  │  └─ tournaments/     # Tournaments
│  │  └─ api/                # API routes
│  │     ├─ feed/
│  │     ├─ recommendations/
│  │     ├─ subscriptions/   # PayPal ✅
│  │     ├─ travel-plans/    # Travel ✅
│  │     └─ paypal/          # PayPal webhooks ✅
│  ├─ components/
│  │  ├─ discovery/          # Discovery components ✅
│  │  ├─ travel/             # Travel components ✅
│  │  ├─ subscription/       # Billing components ✅
│  │  ├─ social/             # Social feed components ✅
│  │  └─ profile/            # Profile components ✅
│  └─ lib/
│     ├─ supabase/           # DB clients
│     ├─ validations/        # Zod schemas
│     ├─ middleware/         # Usage limits ✅
│     ├─ recommendations/    # Collaborative filtering ✅
│     └─ travel/             # Travel types ✅
├─ supabase/
│  └─ migrations/            # SQL migrations (25+ files)
├─ public/                   # Static assets
├─ tests/                    # E2E tests (Playwright)
├─ __tests__/                # Unit tests (Vitest)
├─ docs/                     # BMAD documentation
│  ├─ prd/                   # Epic files ✅
│  ├─ stories/               # User stories ✅
│  └─ architecture/          # Architecture docs ✅
├─ claudedocs/               # Session checkpoints
└─ scripts/                  # Utility scripts

```

---

## 🎯 Key Directories

**Pages**: `src/app/[locale]/`
**Components**: `src/components/{domain}/`
**APIs**: `src/app/api/{resource}/`
**Types**: `src/lib/{domain}/types.ts`
**Validation**: `src/lib/validations/`
**Migrations**: `supabase/migrations/`

---

**Updated**: 2025-10-18
