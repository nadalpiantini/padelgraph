# Technology Stack - Padelgraph

**Project**: Padelgraph
**Version**: 1.0
**Updated**: 2025-10-18

---

## 🎯 Core Technologies

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS 3.x
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: lucide-react
- **State**: React hooks (useState, useEffect, useCallback)
- **Forms**: HTML5 + custom validation
- **i18n**: next-intl

### Backend
- **Runtime**: Node.js 24.x
- **Framework**: Next.js API Routes
- **Database**: Supabase (PostgreSQL 15 + PostGIS)
- **ORM**: Supabase client (direct SQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (buckets)

### Payments
- **Provider**: PayPal Subscriptions
- **SDK**: @paypal/checkout-server-sdk
- **Webhooks**: PayPal IPN/Webhooks

### Infrastructure
- **Hosting**: Vercel (Production + Preview)
- **Database**: Supabase (hosted PostgreSQL)
- **CDN**: Vercel Edge Network
- **Domain**: padelgraph.com

---

## 📦 Key Dependencies

```json
{
  "next": "15.x",
  "react": "19.x",
  "typescript": "5.x",
  "@supabase/supabase-js": "^2.x",
  "zod": "^3.x",
  "tailwindcss": "^3.x",
  "@radix-ui/*": "latest",
  "@paypal/checkout-server-sdk": "^1.x"
}
```

---

## 🏗️ Architecture Pattern

- **Type**: Monolithic Next.js app (SSR + API Routes)
- **Data Layer**: Supabase PostgreSQL with RLS
- **Auth**: Session-based (Supabase)
- **API**: RESTful JSON APIs
- **Validation**: Zod schemas
- **Error Handling**: Try-catch + error boundaries

---

## 🔒 Security

- **RLS**: Row Level Security on all tables
- **Auth**: Supabase JWT tokens
- **CORS**: Configured in next.config
- **Environment**: .env.local for secrets
- **Storage**: Signed URLs for private media

---

## 📝 Code Standards

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Next.js config
- **Formatting**: Prettier (if configured)
- **Testing**: Vitest + Playwright
- **Git**: Feature branches + PR workflow

---

**Maintained by**: Development Team
**Review Frequency**: Per sprint
