# PadelGraph

Modern padel/tennis platform built with Next.js 15, Supabase, and Tailwind CSS.

## 🚀 Tech Stack

- **Frontend**: Next.js 15.5 + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (Auth, DB, Storage, Realtime)
- **i18n**: next-intl (EN/ES)
- **Communication**: Twilio (WhatsApp/SMS) + Resend/Postmark (Email)
- **Payments**: Stripe (upcoming)
- **Deploy**: Vercel

## 📋 Prerequisites

- Node.js 24.8.0 or higher
- npm or pnpm
- Supabase account
- Twilio account (for messaging features)
- Email provider account (Resend or Postmark)

## 🛠️ Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd Padelgraph

# Install dependencies
npm install
```

### 2. Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

Required environment variables:

```env
# Supabase (get from https://app.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Twilio (get from https://console.twilio.com)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Email (choose Resend OR Postmark)
RESEND_API_KEY=your-resend-key
# OR
# POSTMARK_SERVER_TOKEN=your-postmark-token

EMAIL_FROM=noreply@yourdomain.com
```

### 3. Database Setup

Run the database migrations on your Supabase project:

```bash
# Option 1: Using Supabase CLI
npx supabase db push

# Option 2: Run manually in Supabase SQL Editor
# 1. Copy contents of supabase/schema.sql
# 2. Run in Supabase SQL Editor
# 3. Copy contents of supabase/policies.sql
# 4. Run in Supabase SQL Editor
```

### 4. Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

## 📝 Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Type check with TypeScript
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

## 🏗️ Project Structure

```
padelgraph/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   │   └── health/     # Health check endpoint
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home page
│   ├── components/         # React components (upcoming)
│   ├── lib/                # Utility libraries
│   │   ├── supabase/      # Supabase clients
│   │   ├── email.ts       # Email service
│   │   ├── twilio.ts      # Twilio service
│   │   └── stripe.ts      # Stripe service (upcoming)
│   ├── types/             # TypeScript types
│   └── i18n/              # Internationalization
│       ├── config.ts      # i18n configuration
│       ├── routing.ts     # Routing configuration
│       └── locales/       # Translation files
│           ├── en.json    # English translations
│           └── es.json    # Spanish translations
├── supabase/
│   ├── schema.sql         # Database schema
│   ├── policies.sql       # Row Level Security policies
│   └── seed.sql           # Seed data
├── public/                # Static assets
└── claudedocs/           # Sprint documentation
```

## 🔍 Health Check

Visit `/api/health` to check system status:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-16T...",
  "version": "0.1.0",
  "checks": {
    "database": "ok",
    "environment": "ok"
  }
}
```

## 🌍 Internationalization

The app supports English and Spanish out of the box using next-intl.

- Default locale: English (en)
- Available locales: en, es
- Locale switching: Automatic based on browser settings
- Translation files: `src/i18n/locales/`

## 🗄️ Database Schema

Base tables (Sprint 0):
- `organization` - Multi-tenant organizations
- `user_profile` - User profiles (extends auth.users)
- `org_member` - Organization memberships with roles

See `supabase/schema.sql` for complete schema.

## 🔐 Authentication

Using Supabase Auth with Row Level Security (RLS) enabled.

Roles:
- `owner` - Full organization access
- `admin` - Administrative privileges
- `coach` - Coach-specific features
- `member` - Regular member
- `guest` - Limited access

## 📦 Sprint Progress

- ✅ **Sprint 0** (Infrastructure) - Completed
  - Next.js 15 setup
  - Supabase integration
  - i18n configuration
  - Service stubs
  - Health check endpoint

- 🚧 **Sprint 1** (Core & Communication) - In Progress
  - Auth and profiles
  - Communication system (Email + WhatsApp)
  - Social feed
  - Booking system
  - Admin panel

See `claudedocs/PADELGRAPH_SPRINTS.md` for complete sprint planning.

## 🤝 Contributing

This project uses:
- TypeScript strict mode
- ESLint for code quality
- Prettier for code formatting
- Conventional commits

```bash
# Before committing
npm run typecheck
npm run lint
npm run format
```

## 📄 License

[Your License Here]

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [next-intl](https://next-intl-docs.vercel.app/)

---

Built with ❤️ using BMAD-METHOD
