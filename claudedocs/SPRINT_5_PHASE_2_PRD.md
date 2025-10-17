# Sprint 5 - Phase 2: PayPal Integration - Product Requirements Document

> **Project**: PadelGraph
> **Sprint**: 5 (BMAD - Business, Monetization, Analytics, Growth)
> **Phase**: 2 of 5
> **Focus**: PayPal Subscription Integration & Lifecycle Management
> **Duration**: 5-7 days
> **Dependencies**: Phase 1 (Analytics & Gamification - Complete)

---

## 🎯 Executive Summary

Complete the PayPal subscription integration (~30% done) to enable monetization through Pro, Premium, and Club tiers. Implement full subscription lifecycle, webhook handling, usage enforcement, admin management, and user-facing billing UI.

---

## 📊 Current State (30% Complete)

### ✅ What Exists

**Database Schema** (100%)
- `subscription` table with PayPal fields (paypal_subscription_id, paypal_plan_id, paypal_customer_id)
- `usage_log` table for feature tracking
- `coupon` table ready for Phase 3
- RLS policies for security

**PayPal Service** (60%)
- `lib/paypal.ts`: PayPalService class
- Order creation/capture for one-time payments
- Basic webhook signature verification
- Environment config (sandbox/production)

**Subscription Service** (50%)
- `lib/services/subscriptions.ts`
- Plan limits defined (Free: 2 tournaments, Pro: unlimited, etc.)
- `checkUsageLimit()` function
- `syncPayPalSubscription()` for webhook sync

**APIs** (40%)
- `/api/paypal/create-subscription`: Creates PayPal subscription
- `/api/paypal/webhook`: Handles subscription events (partial)
- `/api/payments/*`: One-time payment handlers

**Tests** (20%)
- E2E tests for pricing page
- PayPal button rendering checks
- Subscription UI flow tests

### ⏳ What's Missing (70%)

1. **Webhook Event Handling** (8 event types incomplete)
2. **Subscription Lifecycle** (cancel, upgrade, downgrade, reactivate)
3. **Usage Enforcement** (API middleware, feature gates)
4. **Admin UI** (subscription management, analytics)
5. **User UI** (pricing page, billing management, usage dashboard)
6. **Cron Jobs** (Phase 1 analytics + subscription sync)
7. **Testing** (PayPal sandbox, webhook E2E)

---

## 🏗️ Architecture Overview

### Data Flow

```
User → Pricing Page → PayPal Checkout → Subscription Created
  ↓
PayPal Webhook → /api/paypal/webhook → syncPayPalSubscription()
  ↓
Database Update → subscription table → user_profile.current_plan
  ↓
API Middleware → checkUsageLimit() → Allow/Deny Feature Access
```

### Technology Stack

- **Payment Provider**: PayPal Subscriptions API
- **Webhook**: PayPal → Vercel Edge Function → Supabase
- **Cron**: Vercel Cron Jobs (hourly/daily)
- **Auth**: Supabase RLS policies
- **Notifications**: Resend (email) + Twilio (WhatsApp)

---

## 📋 Feature Requirements

### 1. PayPal Webhook Complete Implementation

**Priority**: P0 (Blocking)

#### Event Types to Handle

| Event Type | Action | Database Update |
|------------|--------|-----------------|
| `BILLING.SUBSCRIPTION.ACTIVATED` | Activate subscription | Set status='active', update plan |
| `BILLING.SUBSCRIPTION.UPDATED` | Sync plan changes | Update plan, amount, period |
| `BILLING.SUBSCRIPTION.CANCELLED` | Cancel subscription | Set status='cancelled', canceled_at |
| `BILLING.SUBSCRIPTION.SUSPENDED` | Suspend due to failure | Set status='suspended' |
| `PAYMENT.SALE.COMPLETED` | Log successful payment | Create usage_log entry |
| `PAYMENT.SALE.DENIED` | Mark payment failed | Set status='past_due' |
| `PAYMENT.SALE.REFUNDED` | Handle refund | Log refund, update status |
| `BILLING.SUBSCRIPTION.EXPIRED` | Subscription ended | Downgrade to free plan |

#### Acceptance Criteria

- [ ] All 8 event types handled correctly
- [ ] Webhook signature verified (production-ready)
- [ ] Database updates atomic (no partial failures)
- [ ] User profile `current_plan` synced
- [ ] Email notifications sent for critical events
- [ ] Webhook responses logged for debugging
- [ ] Error handling with retry logic

#### Implementation

**File**: `src/app/api/paypal/webhook/route.ts`

**New Event Handlers**:
```typescript
async function handleSubscriptionUpdated(resource: PayPalSubscriptionResource): Promise<void>
async function handleSubscriptionExpired(resource: PayPalSubscriptionResource): Promise<void>
async function handlePaymentCompleted(resource: PayPalPaymentResource): Promise<void>
```

**Validation**:
- Verify webhook signature in production
- Check event uniqueness (idempotency)
- Validate PayPal data structure

---

### 2. Subscription Lifecycle Management

**Priority**: P0 (Blocking)

#### Cancel Subscription

**User Flow**:
1. User → Account → Billing → Cancel Subscription
2. Confirm cancellation modal
3. API call to PayPal: `POST /v1/billing/subscriptions/{id}/cancel`
4. Database: Set `cancel_at_period_end = true`
5. Email: Confirmation with end date

**API**: `POST /api/subscriptions/cancel`

**Acceptance Criteria**:
- [ ] Cancel via PayPal API
- [ ] Update local database
- [ ] Subscription remains active until period end
- [ ] User can reactivate before end date
- [ ] Email confirmation sent
- [ ] Admin can see cancellation pending

#### Reactivate Subscription

**User Flow**:
1. User with cancelled subscription → Reactivate button
2. API call to PayPal: `POST /v1/billing/subscriptions/{id}/activate`
3. Database: Set `cancel_at_period_end = false`
4. Email: Confirmation of reactivation

**API**: `POST /api/subscriptions/reactivate`

#### Upgrade/Downgrade

**User Flow**:
1. User → Pricing → Select different plan
2. PayPal API: `PATCH /v1/billing/subscriptions/{id}` with new plan_id
3. Database: Update plan immediately or at period end
4. Email: Confirmation with proration details

**API**: `POST /api/subscriptions/change-plan`

**Acceptance Criteria**:
- [ ] Upgrade takes effect immediately
- [ ] Downgrade at period end (default)
- [ ] Proration calculated correctly
- [ ] PayPal plan IDs mapped to internal plans
- [ ] Usage limits updated immediately on upgrade

#### Failed Payment Handling

**Flow**:
1. PayPal webhook: `PAYMENT.SALE.DENIED`
2. Database: Set status = 'past_due'
3. Email: Payment failed notification
4. Grace period: 7 days to update payment method
5. After grace: Downgrade to free plan

**Cron Job**: Check past_due subscriptions daily

**Acceptance Criteria**:
- [ ] Grace period enforced (7 days)
- [ ] Email reminders sent (Day 1, 3, 7)
- [ ] Auto-downgrade after grace period
- [ ] User can update payment method via PayPal

---

### 3. Usage Tracking & Enforcement

**Priority**: P1 (High)

#### API Middleware

**File**: `src/lib/middleware/usage-limiter.ts`

**Function**:
```typescript
async function checkFeatureAccess(
  userId: string,
  feature: 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan'
): Promise<{ allowed: boolean; remaining: number; limit: number }>
```

**Integration Points**:
- `/api/tournaments` → Check tournament limit before creation
- `/api/matches/auto` → Check auto-match limit
- `/api/recommendations` → Check recommendation limit
- `/api/travel-plans` → Check travel plan limit

**Response When Limit Reached**:
```json
{
  "error": "Usage limit exceeded",
  "code": "USAGE_LIMIT_EXCEEDED",
  "message": "You've reached your limit of 2 tournaments for the Free plan",
  "current_usage": 2,
  "limit": 2,
  "upgrade_url": "/pricing"
}
```

#### Feature-Specific Enforcement

**Tournament Creation**:
```typescript
// Before creating tournament
const { allowed, remaining } = await checkUsageLimit(userId, 'tournament');
if (!allowed) {
  return ApiResponse.error('Tournament limit reached. Upgrade to Pro for unlimited tournaments.', 403);
}

// After creation
await logFeatureUsage(userId, 'tournament', 'create', { tournament_id });
```

**Acceptance Criteria**:
- [ ] Middleware checks limits before feature access
- [ ] Usage logged after successful operation
- [ ] Clear error messages with upgrade CTA
- [ ] Admin override capability
- [ ] Usage dashboard shows current/limit

#### Monthly Usage Reset

**Cron Job**: `src/app/api/cron/reset-usage/route.ts`

**Schedule**: First day of month at 00:00 UTC

**Logic**:
```typescript
// Reset usage_log for new billing period
// Only for active subscriptions
// Send summary email of previous month
```

**Acceptance Criteria**:
- [ ] Usage resets on billing cycle (not calendar month)
- [ ] Previous period data archived
- [ ] Summary email sent with usage stats
- [ ] Free plan resets monthly (calendar month)

---

### 4. Admin Subscription Management

**Priority**: P1 (High)

#### Admin Dashboard

**Route**: `/[locale]/admin/subscriptions`

**Features**:
- List all subscriptions with filters (active, cancelled, past_due)
- Search by user email/name
- Subscription details view
- Manual override actions

**Table Columns**:
- User (name, email)
- Plan (Free, Pro, Premium, Club)
- Status (active, cancelled, suspended, past_due)
- MRR (Monthly Recurring Revenue)
- Next billing date
- Actions (view, override, cancel)

#### Manual Override

**Use Cases**:
- Grant free premium to VIP user
- Extend subscription for support case
- Cancel problematic subscription
- Reset usage limits manually

**API**: `POST /api/admin/subscriptions/{id}/override`

**Payload**:
```typescript
{
  action: 'extend_trial' | 'upgrade_free' | 'reset_usage' | 'force_cancel';
  duration_days?: number;
  plan?: 'pro' | 'premium' | 'club';
  reason: string;
}
```

**Acceptance Criteria**:
- [ ] Only admin role can access
- [ ] All actions logged in audit trail
- [ ] Reason required for overrides
- [ ] Email notification to user
- [ ] Changes visible immediately

#### Subscription Analytics

**Metrics**:
- Total MRR (Monthly Recurring Revenue)
- Churn rate (cancellations / active)
- Conversion rate (free → paid)
- ARPU (Average Revenue Per User)
- Lifetime Value (LTV)

**Charts**:
- MRR trend (last 12 months)
- Plan distribution pie chart
- Churn cohort analysis
- Payment failure rate

**API**: `/api/admin/analytics/subscriptions`

---

### 5. User-Facing UI

**Priority**: P1 (High)

#### Pricing Page

**Route**: `/[locale]/pricing`

**Layout**:
```
┌─────────────────────────────────────────┐
│          Pricing Plans                  │
├─────────┬─────────┬─────────┬──────────┤
│  Free   │   Pro   │ Premium │   Club   │
│  $0/mo  │ $9/mo   │ $19/mo  │ $49/mo   │
├─────────┼─────────┼─────────┼──────────┤
│ Features│ Features│ Features│ Features │
│ - 2 tour│ - ∞ tour│ - All   │ - All    │
│ - 3 auto│ - 20 aut│   Pro   │   Premium│
│         │         │ - API   │ - White  │
│         │         │         │   label  │
├─────────┼─────────┼─────────┼──────────┤
│ Current │ PayPal  │ PayPal  │ Contact  │
│  Plan   │  Button │  Button │    Us    │
└─────────┴─────────┴─────────┴──────────┘
```

**PayPal Button Integration**:
```typescript
<PayPalButtons
  createSubscription={async () => {
    const res = await fetch('/api/paypal/create-subscription', {
      method: 'POST',
      body: JSON.stringify({ plan_id: 'pro' })
    });
    return res.json().subscription_id;
  }}
  onApprove={async (data) => {
    // Subscription created, redirect to success
    window.location.href = '/account/billing?success=true';
  }}
/>
```

**Acceptance Criteria**:
- [ ] All 4 plans displayed clearly
- [ ] PayPal buttons for Pro, Premium, Club
- [ ] Feature comparison table
- [ ] FAQ section
- [ ] Testimonials/social proof
- [ ] Mobile responsive

#### Account Billing Page

**Route**: `/[locale]/account/billing`

**Sections**:

1. **Current Plan**
   - Plan name badge
   - Status (active, cancelled, past_due)
   - Next billing date
   - Monthly cost
   - Cancel/Upgrade/Reactivate buttons

2. **Usage This Month**
   - Tournaments: 5/unlimited (Pro)
   - Auto-matches: 12/20 (Pro)
   - Recommendations: 45/100 (Pro)
   - Progress bars

3. **Billing History**
   - Table of past invoices
   - Date, Amount, Status, Receipt (PDF)

4. **Payment Method**
   - Managed via PayPal
   - Link to PayPal account

**API**: `GET /api/account/billing`

**Acceptance Criteria**:
- [ ] Real-time subscription status
- [ ] Usage data accurate
- [ ] Cancel flow with confirmation
- [ ] Upgrade redirects to pricing
- [ ] Billing history from PayPal API

#### Usage Dashboard

**Component**: `<UsageDashboard />` (embedded in `/account/billing`)

**Metrics**:
- Monthly usage per feature
- Charts showing usage trends
- Alerts when approaching limits
- Upgrade CTA when limit reached

---

### 6. Cron Jobs

**Priority**: P1 (High)

#### Phase 1 Completion: Stats & Leaderboards

**File**: `src/app/api/cron/calculate-stats/route.ts`

**Schedule**: Daily at 02:00 UTC

**Logic**:
```typescript
// For all active tournaments with matches in last 24h
// 1. Update player_stats (weekly, monthly, all-time)
// 2. Detect new achievements
// 3. Notify users of achievements
// 4. Update leaderboard rankings
```

**Acceptance Criteria**:
- [ ] Runs daily without errors
- [ ] Stats accurate for all periods
- [ ] Achievements detected correctly
- [ ] Leaderboards precalculated
- [ ] Notifications sent for achievements
- [ ] Performance < 10s for 1000 users

**File**: `src/app/api/cron/update-leaderboards/route.ts`

**Schedule**: Every 6 hours

**Logic**:
```typescript
// Precalculate leaderboard rankings
// Store in leaderboard table (JSONB)
// Types: global, weekly, monthly, club, location
```

#### Phase 2: Subscription Sync

**File**: `src/app/api/cron/sync-subscriptions/route.ts`

**Schedule**: Daily at 03:00 UTC

**Logic**:
```typescript
// 1. Check PayPal for subscription status updates
// 2. Sync any discrepancies with database
// 3. Handle expired subscriptions
// 4. Process grace period expirations
```

**Acceptance Criteria**:
- [ ] Syncs all active subscriptions
- [ ] Handles API failures gracefully
- [ ] Logs discrepancies for review
- [ ] Sends alerts for critical issues

#### Failed Payment Retry

**File**: `src/app/api/cron/retry-failed-payments/route.ts`

**Schedule**: Daily at 04:00 UTC

**Logic**:
```typescript
// 1. Find subscriptions in 'past_due' status
// 2. Calculate days since failure
// 3. Send reminder emails (Day 1, 3, 7)
// 4. Auto-downgrade after 7 days
```

**Acceptance Criteria**:
- [ ] Reminder emails sent at correct intervals
- [ ] Auto-downgrade after grace period
- [ ] User can still update payment method
- [ ] Notification sent before downgrade

---

### 7. Testing & Validation

**Priority**: P1 (High)

#### PayPal Sandbox Setup

**Steps**:
1. Create PayPal sandbox account
2. Set up test subscription plans
3. Configure webhook in sandbox
4. Update env vars for testing

**Env Vars**:
```
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=<sandbox_client_id>
PAYPAL_SECRET=<sandbox_secret>
PAYPAL_WEBHOOK_ID=<sandbox_webhook_id>
PAYPAL_PRO_PLAN_ID=P-12345
PAYPAL_PREMIUM_PLAN_ID=P-67890
PAYPAL_CLUB_PLAN_ID=P-11111
```

#### Webhook E2E Tests

**File**: `tests/e2e/paypal-webhooks.spec.ts`

**Test Cases**:
- [ ] Subscription activated webhook
- [ ] Subscription cancelled webhook
- [ ] Payment completed webhook
- [ ] Payment failed webhook
- [ ] Signature verification
- [ ] Idempotency (duplicate events)

**Tool**: `ngrok` or Vercel preview deployments

#### Subscription Lifecycle Tests

**File**: `tests/e2e/subscription-lifecycle.spec.ts`

**Scenarios**:
1. **Happy Path**: Sign up → Subscribe Pro → Use features → Cancel → Reactivate
2. **Failed Payment**: Subscribe → Payment fails → Grace period → Downgrade
3. **Upgrade**: Free → Pro → Premium
4. **Downgrade**: Premium → Pro (at period end)

**Acceptance Criteria**:
- [ ] All scenarios pass
- [ ] Database state correct at each step
- [ ] Emails sent at correct times
- [ ] Usage limits enforced

---

## 🔧 Technical Implementation Details

### PayPal Plan IDs Setup

**Create Plans in PayPal**:
1. Login to PayPal Developer Dashboard
2. Navigate to: Apps & Credentials → REST API apps
3. Create 3 subscription plans:
   - **Pro Plan**: $9/month
   - **Premium Plan**: $19/month
   - **Club Plan**: $49/month
4. Copy plan IDs to environment variables

**Plan Configuration**:
```json
{
  "name": "PadelGraph Pro",
  "description": "Unlimited tournaments, advanced analytics",
  "type": "SERVICE",
  "billing_cycles": [{
    "frequency": { "interval_unit": "MONTH", "interval_count": 1 },
    "tenure_type": "REGULAR",
    "sequence": 1,
    "total_cycles": 0,
    "pricing_scheme": {
      "fixed_price": { "value": "9.00", "currency_code": "EUR" }
    }
  }],
  "payment_preferences": {
    "auto_bill_outstanding": true,
    "setup_fee_failure_action": "CANCEL"
  }
}
```

### Webhook Security

**Signature Verification**:
```typescript
// Already implemented in webhook/route.ts
// Verify using PayPal SDK or manual verification
// Headers required:
// - paypal-transmission-id
// - paypal-transmission-time
// - paypal-transmission-sig
// - paypal-cert-url
// - paypal-auth-algo
```

**Rate Limiting**:
```typescript
// Vercel Edge Config for webhook rate limiting
// Max 100 requests/minute from PayPal
```

### Database Triggers

**Auto-update user_profile on subscription change**:
```sql
CREATE OR REPLACE FUNCTION sync_user_plan()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profile
  SET current_plan = NEW.plan
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_plan_sync
AFTER INSERT OR UPDATE ON subscription
FOR EACH ROW
EXECUTE FUNCTION sync_user_plan();
```

---

## ✅ Acceptance Criteria (Phase 2 Complete)

### Functional Requirements

- [ ] All 8 PayPal webhook events handled correctly
- [ ] Subscription lifecycle complete (cancel, reactivate, upgrade, downgrade)
- [ ] Usage limits enforced across all features
- [ ] Admin can view and manage all subscriptions
- [ ] Users can subscribe, cancel, and view billing
- [ ] Failed payments handled with grace period
- [ ] Cron jobs running for stats and subscriptions
- [ ] PayPal sandbox testing complete

### Technical Requirements

- [ ] TypeScript compilation: 0 errors
- [ ] Tests: 80%+ passing, 70%+ coverage
- [ ] Performance: API responses < 500ms
- [ ] Security: RLS policies enforced
- [ ] Logging: All critical events logged
- [ ] Monitoring: Error alerts configured

### Business Requirements

- [ ] Pricing page live and conversion-optimized
- [ ] MRR tracking and reporting
- [ ] Churn rate < 5% (target)
- [ ] Payment success rate > 95%
- [ ] Support documentation complete

---

## 📝 Implementation Checklist

**Week 1: Webhook & Lifecycle** (Days 1-3)
- [ ] Complete webhook event handlers
- [ ] Implement cancel subscription
- [ ] Implement upgrade/downgrade
- [ ] Implement reactivate
- [ ] Failed payment handling
- [ ] Test webhook with sandbox

**Week 1-2: Usage & Admin** (Days 4-5)
- [ ] Usage middleware implementation
- [ ] Feature enforcement integration
- [ ] Admin subscription dashboard
- [ ] Manual override tools
- [ ] Subscription analytics

**Week 2: User UI** (Days 6-7)
- [ ] Pricing page with PayPal buttons
- [ ] Account billing page
- [ ] Usage dashboard component
- [ ] Billing history integration

**Week 2: Cron & Testing** (Day 7)
- [ ] Stats calculation cron (Phase 1)
- [ ] Leaderboard precalc cron (Phase 1)
- [ ] Subscription sync cron
- [ ] Failed payment retry cron
- [ ] E2E test suite
- [ ] PayPal sandbox validation

---

## 🚀 Deployment Plan

### Pre-Deployment

1. **Environment Variables** (Production)
   ```bash
   PAYPAL_MODE=production
   PAYPAL_CLIENT_ID=<prod_client_id>
   PAYPAL_SECRET=<prod_secret>
   PAYPAL_WEBHOOK_ID=<prod_webhook_id>
   PAYPAL_PRO_PLAN_ID=<prod_pro_plan>
   PAYPAL_PREMIUM_PLAN_ID=<prod_premium_plan>
   PAYPAL_CLUB_PLAN_ID=<prod_club_plan>
   CRON_SECRET=<secure_random_string>
   ```

2. **PayPal Webhook Registration**
   - Register production webhook URL
   - Events: BILLING.*, PAYMENT.SALE.*
   - URL: `https://padelgraph.com/api/paypal/webhook`

3. **Database Migration**
   - Already deployed (03_monetization.sql)
   - Verify RLS policies active

### Deployment Steps

1. Merge to `main` branch
2. Vercel auto-deploy
3. Verify cron jobs scheduled
4. Test webhook with PayPal simulator
5. Monitor logs for errors

### Post-Deployment

1. Test complete subscription flow with real PayPal account
2. Verify webhooks received and processed
3. Check cron job execution
4. Monitor error rates
5. Track MRR metrics

---

## 📚 Dependencies

### From Sprint 1
- `auth.users` (user authentication)
- `user_profile` (user data, current_plan)
- Email service (Resend)
- WhatsApp service (Twilio)

### From Phase 1
- `player_stats` (usage data)
- `achievement` (gamification)
- `leaderboard` (rankings)
- Analytics service

### External APIs
- PayPal Subscriptions API
- PayPal Webhooks API
- Vercel Cron

---

## 🎯 Success Metrics

**Technical Metrics**
- Webhook processing time: < 200ms
- API response time: < 500ms
- Uptime: 99.9%
- Test coverage: > 70%

**Business Metrics**
- Free → Paid conversion: > 5%
- Churn rate: < 5%
- MRR growth: +20% month-over-month
- Payment success rate: > 95%

**User Experience**
- Subscription completion rate: > 80%
- Cancellation flow completion: > 90%
- Support tickets (payment): < 10/week

---

## 📞 Support & Documentation

**Admin Documentation**
- Subscription management guide
- Manual override procedures
- Failed payment handling
- Webhook debugging

**User Documentation**
- How to subscribe
- How to cancel/reactivate
- How to upgrade/downgrade
- Payment troubleshooting
- Usage limits explained

**Developer Documentation**
- API reference
- Webhook events
- Testing guide
- Deployment checklist

---

## 🏁 Definition of Done

Phase 2 is complete when:

✅ All webhook events handled and tested
✅ Subscription lifecycle flows working end-to-end
✅ Usage limits enforced across features
✅ Admin can manage subscriptions
✅ Users can subscribe and manage billing
✅ Cron jobs running reliably
✅ PayPal sandbox tests passing
✅ Production deployment successful
✅ MRR tracking active
✅ Documentation complete
✅ Support team trained

---

**Created**: 2025-10-17
**Author**: AI Development Team
**Project**: PadelGraph Sprint 5
**Next Phase**: Phase 3 - Trials & Coupons
