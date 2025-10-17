# Sprint 5: Growth & Monetization - PRD

## 🎯 Sprint Overview

**Sprint Goal**: Transform Padelgraph from feature-complete MVP to revenue-generating, growth-optimized platform

**Duration**: TBD
**Priority**: High (Revenue & Growth)
**Dependencies**: Sprint 4 complete (Travel & Graph Intelligence)

## 📊 Success Metrics

### Revenue Targets
- [ ] First paid subscription within 2 weeks of launch
- [ ] 10 paying users within first month
- [ ] $500 MRR within 2 months
- [ ] Subscription conversion rate >5%

### Growth Metrics
- [ ] 1000+ organic search visitors/month
- [ ] 500+ registered users
- [ ] 20% month-over-month user growth
- [ ] 50% user retention at 30 days

### Analytics Coverage
- [ ] 100% of user flows tracked
- [ ] Funnel conversion metrics implemented
- [ ] Revenue attribution working
- [ ] Real-time dashboards operational

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           Growth & Monetization Layer            │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────┐│
│  │   Stripe     │  │  Analytics   │  │  SEO   ││
│  │  Integration │  │   Engine     │  │ Engine ││
│  └──────────────┘  └──────────────┘  └────────┘│
│         │                 │                │     │
│         ├─────────────────┼────────────────┤    │
│         │                 │                │     │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼───┐│
│  │Subscription │  │  Tracking   │  │Sitemap  ││
│  │   Plans     │  │   Events    │  │Generator││
│  └─────────────┘  └─────────────┘  └─────────┘│
│         │                 │                │     │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼───┐│
│  │   Billing   │  │  Funnels    │  │Schema   ││
│  │  Dashboard  │  │   Reports   │  │Markup   ││
│  └─────────────┘  └─────────────┘  └─────────┘│
│         │                 │                │     │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼───┐│
│  │   Usage     │  │  Cohort     │  │Open     ││
│  │   Limits    │  │  Analysis   │  │Graph    ││
│  └─────────────┘  └─────────────┘  └─────────┘│
└─────────────────────────────────────────────────┘
```

## 📋 Phase Breakdown

### Phase 1: PayPal Integration (Foundation) 🏦

**Goal**: Implement complete payment infrastructure

#### 1.1 PayPal Setup & Configuration
- [ ] Create PayPal Developer account and get API credentials
- [ ] Configure PayPal webhook endpoints (IPN/Webhooks)
- [ ] Set up Sandbox and Production environments
- [ ] Implement PayPal SDK client initialization
- [ ] Add PayPal environment variables (CLIENT_ID, SECRET)

#### 1.2 Subscription Plans Definition
```typescript
// Pricing tiers
const plans = {
  free: {
    name: 'Free',
    price: 0,
    features: {
      tournaments: 2,
      autoMatch: 3 / 'week',
      recommendations: 10 / 'day',
      travelPlans: 1,
    }
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    currency: 'EUR',
    interval: 'month',
    features: {
      tournaments: 'unlimited',
      autoMatch: 20 / 'week',
      recommendations: 100 / 'day',
      travelPlans: 10,
      analytics: true,
      prioritySupport: true,
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
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
    }
  },
  club: {
    name: 'Club',
    price: 99.99,
    currency: 'EUR',
    interval: 'month',
    features: {
      // Club-specific features
      clubManagement: true,
      coachTools: true,
      multiLocation: true,
    }
  }
}
```

#### 1.3 Database Schema
```sql
-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  paypal_customer_id TEXT NOT NULL,
  paypal_subscription_id TEXT,
  paypal_plan_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL, -- active, canceled, suspended, past_due
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  feature TEXT NOT NULL, -- tournament, auto_match, recommendation, travel_plan
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Payment history
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  paypal_payment_id TEXT NOT NULL,
  paypal_order_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_timestamp ON usage_logs(timestamp);
```

#### 1.4 API Endpoints
- [ ] `POST /api/paypal/create-subscription` - Initiate subscription
- [ ] `POST /api/paypal/create-order` - Create one-time payment order
- [ ] `POST /api/paypal/webhook` - Handle PayPal webhook events
- [ ] `GET /api/subscriptions/current` - Get user's subscription
- [ ] `GET /api/subscriptions/usage` - Get usage stats
- [ ] `POST /api/subscriptions/cancel` - Cancel subscription
- [ ] `POST /api/subscriptions/resume` - Resume canceled subscription
- [ ] `GET /api/paypal/billing-agreements` - Get billing agreement details

#### 1.5 Frontend Components
- [ ] `PricingTable` component - Display plans
- [ ] `CheckoutButton` component - Initiate purchase
- [ ] `SubscriptionDashboard` - Manage subscription
- [ ] `UsageMetrics` - Display usage vs limits
- [ ] `UpgradePrompt` - Convert free users
- [ ] `PaymentMethod` - Update payment info

#### 1.6 Usage Limits & Enforcement
```typescript
// Usage limit checker
export async function checkUsageLimit(
  userId: string,
  feature: 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan'
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const subscription = await getUserSubscription(userId);
  const usage = await getFeatureUsage(userId, feature);

  const limit = subscription.plan.features[feature];
  const allowed = usage < limit;
  const remaining = limit - usage;

  return { allowed, remaining, limit };
}
```

#### 1.7 Testing
- [ ] Unit tests for payment logic
- [ ] Integration tests with PayPal Sandbox
- [ ] Webhook event handling tests (verify signature)
- [ ] Usage limit enforcement tests
- [ ] Subscription lifecycle tests

**Deliverables**:
- ✅ Complete PayPal integration
- ✅ All payment flows working
- ✅ Usage limits enforced
- ✅ Billing dashboard functional
- ✅ Webhook handling reliable (signature verification)

---

### Phase 2: Analytics Engine (Intelligence) 📊

**Goal**: Comprehensive user behavior tracking and funnel analysis

#### 2.1 Analytics Architecture
```typescript
// Event tracking system
interface AnalyticsEvent {
  event_name: string;
  user_id: string | null;
  session_id: string;
  timestamp: Date;
  properties: Record<string, any>;
  page_url: string;
  referrer: string;
  device_info: DeviceInfo;
}

// Funnel definitions
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

#### 2.2 Database Schema
```sql
-- Analytics events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES profiles(user_id),
  session_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  properties JSONB,
  page_url TEXT,
  referrer TEXT,
  device_info JSONB
);

-- User sessions
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(user_id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  page_views INTEGER DEFAULT 1,
  events_count INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  entry_url TEXT,
  exit_url TEXT,
  referrer TEXT,
  device_info JSONB
);

-- Conversion funnels
CREATE TABLE funnel_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_name TEXT NOT NULL,
  step_name TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  user_id UUID REFERENCES profiles(user_id),
  session_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  properties JSONB
);

-- Indexes for performance
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX idx_user_sessions_started_at ON user_sessions(started_at);
CREATE INDEX idx_funnel_steps_funnel_name ON funnel_steps(funnel_name);
CREATE INDEX idx_funnel_steps_user_id ON funnel_steps(user_id);
```

#### 2.3 Tracking Implementation
- [ ] Client-side tracking SDK
- [ ] Server-side event tracking
- [ ] Page view tracking
- [ ] Click tracking
- [ ] Form submission tracking
- [ ] Error tracking
- [ ] Performance monitoring

#### 2.4 Key Events to Track
```typescript
// User lifecycle
- 'user_signed_up'
- 'user_logged_in'
- 'profile_completed'
- 'profile_updated'

// Feature usage
- 'tournament_viewed'
- 'tournament_registered'
- 'match_scheduled'
- 'auto_match_triggered'
- 'recommendation_clicked'
- 'travel_plan_created'
- 'club_searched'

// Engagement
- 'post_created'
- 'post_liked'
- 'comment_added'
- 'friend_added'
- 'message_sent'

// Monetization
- 'pricing_viewed'
- 'plan_selected'
- 'checkout_initiated'
- 'payment_completed'
- 'subscription_upgraded'
- 'subscription_canceled'

// Retention
- 'daily_active_user'
- 'weekly_active_user'
- 'monthly_active_user'
```

#### 2.5 Analytics Dashboard
- [ ] Real-time user activity
- [ ] Funnel conversion rates
- [ ] Cohort retention analysis
- [ ] Revenue metrics
- [ ] Feature usage statistics
- [ ] Geographic distribution
- [ ] Device/browser breakdown

#### 2.6 Reports & Insights
```typescript
// Automated reports
export async function generateWeeklyReport() {
  return {
    new_users: await countNewUsers('7d'),
    active_users: await countActiveUsers('7d'),
    revenue: await calculateRevenue('7d'),
    conversions: await getFunnelConversions('7d'),
    retention: await calculateRetention('cohort'),
    top_features: await getTopFeatures('7d'),
    churn_risk: await identifyChurnRisk(),
  };
}
```

**Deliverables**:
- ✅ Complete event tracking system
- ✅ Funnel analysis working
- ✅ Analytics dashboard live
- ✅ Automated reports configured
- ✅ Real-time monitoring active

---

### Phase 3: SEO Optimization (Discoverability) 🔍

**Goal**: Maximize organic search traffic and visibility

#### 3.1 Technical SEO Foundation
- [ ] Implement Next.js metadata API
- [ ] Generate dynamic sitemaps
- [ ] Create robots.txt
- [ ] Add canonical URLs
- [ ] Implement hreflang for i18n
- [ ] Optimize Core Web Vitals
- [ ] Add structured data (Schema.org)

#### 3.2 Schema.org Markup
```typescript
// Structured data for different entity types
const schemas = {
  tournament: {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: 'Tournament Name',
    startDate: '2025-11-01',
    location: {
      '@type': 'Place',
      name: 'Club Name',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '...',
        addressLocality: '...',
      }
    },
    organizer: {
      '@type': 'Organization',
      name: 'Padelgraph'
    }
  },
  club: {
    '@type': 'SportsActivityLocation',
    name: 'Club Name',
    address: { ... },
    geo: { ... },
    openingHours: '...',
  },
  profile: {
    '@type': 'Person',
    name: '...',
    knowsAbout: ['Padel'],
    memberOf: {
      '@type': 'Organization',
      name: 'Padelgraph'
    }
  }
}
```

#### 3.3 Content Strategy
- [ ] SEO-optimized landing pages
- [ ] City-specific pages (Madrid Padel, Barcelona Padel)
- [ ] Tournament category pages
- [ ] Blog for content marketing
- [ ] FAQ pages
- [ ] How-to guides
- [ ] Player profiles public pages

#### 3.4 Meta Tags Implementation
```typescript
// Dynamic metadata per page
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: 'Page Title - Padelgraph',
    description: 'SEO-optimized description',
    keywords: ['padel', 'tournaments', 'Spain', '...'],
    openGraph: {
      title: '...',
      description: '...',
      images: [{ url: '...' }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: '...',
      description: '...',
      images: ['...'],
    },
    alternates: {
      canonical: 'https://padelgraph.com/...',
      languages: {
        'es-ES': 'https://padelgraph.com/es/...',
        'en-US': 'https://padelgraph.com/en/...',
      }
    }
  };
}
```

#### 3.5 Performance Optimization
- [ ] Image optimization (next/image)
- [ ] Font optimization
- [ ] Code splitting
- [ ] Static page generation (ISR)
- [ ] CDN configuration
- [ ] Lazy loading
- [ ] Compression (Brotli/Gzip)

#### 3.6 Link Building Strategy
- [ ] Internal linking structure
- [ ] Breadcrumbs
- [ ] Related content suggestions
- [ ] External backlinks strategy
- [ ] Partner integrations
- [ ] Social media integration

#### 3.7 Local SEO
- [ ] Google Business Profile
- [ ] Local schema markup
- [ ] City/region pages
- [ ] Club directory pages
- [ ] Location-based content

**Deliverables**:
- ✅ All technical SEO implemented
- ✅ Structured data on all pages
- ✅ Sitemap auto-generated
- ✅ Core Web Vitals optimized
- ✅ Content strategy launched

---

### Phase 4: KPI Dashboard (Monitoring) 📈

**Goal**: Real-time visibility into business health

#### 4.1 Core KPIs
```typescript
interface BusinessKPIs {
  // Revenue
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  arpu: number; // Average Revenue Per User
  ltv: number; // Lifetime Value
  churn_rate: number; // % users canceling

  // Growth
  new_users: number;
  active_users: {
    dau: number; // Daily Active Users
    wau: number; // Weekly Active Users
    mau: number; // Monthly Active Users
  };
  user_growth_rate: number;

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

#### 4.2 Dashboard Implementation
- [ ] Admin dashboard with role-based access
- [ ] Real-time metric updates
- [ ] Historical trend charts
- [ ] Comparison views (WoW, MoM, YoY)
- [ ] Alerts for anomalies
- [ ] Export to CSV/PDF
- [ ] Custom date ranges

#### 4.3 Metric Calculations
```typescript
// Example: Calculate MRR
export async function calculateMRR(): Promise<number> {
  const activeSubscriptions = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('status', 'active');

  const mrr = activeSubscriptions.reduce((total, sub) => {
    const planPrice = plans[sub.plan_id].price;
    return total + planPrice;
  }, 0);

  return mrr;
}

// Example: Calculate retention
export async function calculateRetention(cohort: string, day: number): Promise<number> {
  // Users who signed up in cohort
  const cohortUsers = await getUsersInCohort(cohort);

  // Users still active N days later
  const retainedUsers = await getActiveUsersOnDay(cohortUsers, day);

  return (retainedUsers / cohortUsers) * 100;
}
```

#### 4.4 Alerts & Notifications
- [ ] Revenue drop alerts
- [ ] High churn warnings
- [ ] Growth anomalies
- [ ] Error rate spikes
- [ ] Performance degradation
- [ ] Unusual user behavior

**Deliverables**:
- ✅ KPI dashboard operational
- ✅ All metrics calculating correctly
- ✅ Alerts configured
- ✅ Historical data tracking
- ✅ Export functionality working

---

### Phase 5: Growth Experiments (Optimization) 🚀

**Goal**: Systematic growth through experimentation

#### 5.1 A/B Testing Framework
```typescript
interface Experiment {
  id: string;
  name: string;
  variants: {
    control: Variant;
    treatment: Variant;
  };
  allocation: number; // 50/50 split
  start_date: Date;
  end_date: Date | null;
  success_metric: string;
  status: 'draft' | 'running' | 'completed';
}

// Example experiments
const experiments = [
  {
    name: 'Pricing Page CTA Color',
    variants: ['blue', 'green'],
    metric: 'checkout_initiated',
  },
  {
    name: 'Free Trial Duration',
    variants: ['7d', '14d', '30d'],
    metric: 'trial_to_paid_conversion',
  },
  {
    name: 'Onboarding Flow',
    variants: ['short', 'detailed'],
    metric: 'profile_completion_rate',
  }
]
```

#### 5.2 Referral Program
- [ ] Referral code generation
- [ ] Tracking referral conversions
- [ ] Reward system (credits, free months)
- [ ] Leaderboard
- [ ] Share tools (email, social)

#### 5.3 Email Marketing
- [ ] Welcome email sequence
- [ ] Feature announcement emails
- [ ] Re-engagement campaigns
- [ ] Win-back campaigns
- [ ] Newsletter (weekly digest)
- [ ] Transactional emails

#### 5.4 Conversion Optimization
- [ ] Reduce friction in signup
- [ ] Social proof (testimonials, user count)
- [ ] Trust signals (secure, verified)
- [ ] Exit intent popups
- [ ] Free trial optimization
- [ ] Upgrade prompts

#### 5.5 Viral Loops
- [ ] Share tournament results
- [ ] Invite friends to tournaments
- [ ] Social media integration
- [ ] Embeddable widgets
- [ ] Public profile pages

**Deliverables**:
- ✅ A/B testing infrastructure
- ✅ First 3 experiments running
- ✅ Referral program live
- ✅ Email sequences active
- ✅ Viral loops implemented

---

## 🎯 Definition of Done

### Technical
- [ ] All API endpoints tested and documented
- [ ] TypeScript compilation: 0 errors
- [ ] Test coverage: >70%
- [ ] Build time: <5s
- [ ] No console errors in production
- [ ] Security audit passed
- [ ] Performance benchmarks met

### Business
- [ ] Stripe integration live in production
- [ ] First paying customer acquired
- [ ] Analytics tracking all key events
- [ ] SEO audit score >85
- [ ] KPI dashboard accessible to stakeholders
- [ ] Growth experiments documented

### Documentation
- [ ] API documentation complete
- [ ] User guides updated
- [ ] Admin documentation created
- [ ] Runbooks for common issues
- [ ] Analytics playbook written

## 📊 Risk Assessment

### High Risk
- **PayPal Integration Complexity**: Webhook signature verification, subscription lifecycle edge cases
  - *Mitigation*: Extensive testing with Sandbox, idempotency keys, robust error handling

- **Privacy Compliance**: GDPR, user data tracking
  - *Mitigation*: Cookie consent, data retention policies, audit trail

### Medium Risk
- **SEO Competition**: Saturated padel market
  - *Mitigation*: Long-tail keywords, local SEO, unique content

- **Conversion Rate**: Free to paid conversion
  - *Mitigation*: A/B testing, user feedback, clear value prop

### Low Risk
- **Analytics Accuracy**: Event tracking reliability
  - *Mitigation*: Validation, QA, monitoring

## 🔗 Dependencies

### External Services
- PayPal (payments & subscriptions)
- Google Analytics / Mixpanel (optional backup)
- Resend / SendGrid (email)
- Google Search Console
- Cloudflare (CDN)

### Internal Dependencies
- Supabase database (schema changes)
- Vercel deployment pipeline
- Environment variable management

## 📅 Timeline Estimate

**Total Duration**: 4-6 weeks

- Phase 1 (PayPal): 1-2 weeks
- Phase 2 (Analytics): 1 week
- Phase 3 (SEO): 1-2 weeks
- Phase 4 (KPIs): 1 week
- Phase 5 (Growth): Ongoing

## 🎓 Learning Goals

- Master PayPal Subscriptions API patterns
- Understand funnel analysis
- Learn SEO best practices
- Implement growth hacking techniques
- Build real-time dashboards

## 🚀 Success Criteria

**Sprint 5 is successful if**:
1. We have paying customers
2. Organic traffic is growing
3. All key metrics are tracked
4. We can measure ROI of features
5. Growth experiments are running

---

*Document Version: 1.0*
*Created: 2025-10-17*
*Status: Draft*
