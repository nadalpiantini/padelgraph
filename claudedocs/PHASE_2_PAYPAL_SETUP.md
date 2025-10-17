# Sprint 5 Phase 2: PayPal Sandbox Setup Guide

**Status**: Phase 1 Complete ✅ → Phase 2 Starting 🚀

---

## Prerequisites Completed ✅

- ✅ TypeScript: 0 compilation errors
- ✅ Build: Production build successful
- ✅ UI Components: All Shadcn components created
- ✅ ESLint: Cleaned from 5 errors to 0 errors (47 warnings acceptable)
- ✅ Edge Runtime: Fixed all cron jobs to use Node.js runtime

---

## Phase 2 Objectives

### 1. PayPal Sandbox Configuration 🎯

**Required Environment Variables:**

```bash
# PayPal Authentication
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_SECRET=your_sandbox_secret  # Note: code uses PAYPAL_SECRET not CLIENT_SECRET

# PayPal Webhook
PAYPAL_WEBHOOK_ID=your_webhook_id

# PayPal Plan IDs (from PayPal Dashboard)
PAYPAL_PRO_PLAN_ID=P-XXXXXXXXXXXXX
PAYPAL_PREMIUM_PLAN_ID=P-XXXXXXXXXXXXX
PAYPAL_CLUB_PLAN_ID=P-XXXXXXXXXXXXX

# Public Plan IDs (for frontend)
NEXT_PUBLIC_PAYPAL_PLAN_PRO=P-XXXXXXXXXXXXX
NEXT_PUBLIC_PAYPAL_PLAN_PREMIUM=P-XXXXXXXXXXXXX
NEXT_PUBLIC_PAYPAL_PLAN_CLUB=P-XXXXXXXXXXXXX

# Cron Secret (for cron job authentication)
CRON_SECRET=generate_random_32_char_string
```

**Current Status:**
- ❌ No PayPal variables configured in `.env.local`
- ✅ Code references found:
  - `pricing/page.tsx` uses `NEXT_PUBLIC_PAYPAL_PLAN_*`
  - `change-plan/route.ts` uses `PAYPAL_PRO_PLAN_ID`, `PAYPAL_PREMIUM_PLAN_ID`, `PAYPAL_CLUB_PLAN_ID`
  - All routes use `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET`

---

### 2. PayPal Subscription Plans Setup

**Plans to Create in PayPal Sandbox:**

| Plan | Price | Billing Cycle | Plan ID Variable |
|------|-------|---------------|------------------|
| Pro | $9.99/month | Monthly | `PAYPAL_PRO_PLAN_ID` |
| Premium | $19.99/month | Monthly | `PAYPAL_PREMIUM_PLAN_ID` |
| Club | $49.99/month | Monthly | `PAYPAL_CLUB_PLAN_ID` |

**Steps:**
1. Login to PayPal Developer Dashboard: https://developer.paypal.com
2. Navigate to "Apps & Credentials" → "Sandbox" tab
3. Create REST API app or use existing
4. Copy Client ID and Secret
5. Navigate to "Products & Subscriptions"
6. Create 3 subscription plans with above pricing
7. Copy each Plan ID

---

### 3. Webhook Configuration 🔔

**Webhook Events to Subscribe To:**

```javascript
[
  'BILLING.SUBSCRIPTION.CREATED',        // New subscription
  'BILLING.SUBSCRIPTION.ACTIVATED',       // Subscription activated
  'BILLING.SUBSCRIPTION.UPDATED',         // Plan changed
  'BILLING.SUBSCRIPTION.CANCELLED',       // User cancelled
  'BILLING.SUBSCRIPTION.SUSPENDED',       // Payment failed
  'BILLING.SUBSCRIPTION.EXPIRED',         // Subscription expired
  'PAYMENT.SALE.COMPLETED',               // Payment successful
  'PAYMENT.SALE.REFUNDED'                 // Payment refunded
]
```

**Webhook URL:**
- **Local Development**: Use ngrok or similar: `https://your-ngrok-url.ngrok.io/api/paypal/webhook`
- **Vercel Preview**: `https://padelgraph-xxxx.vercel.app/api/paypal/webhook`
- **Production**: `https://padelgraph.com/api/paypal/webhook`

**Setup Steps:**
1. In PayPal Dashboard → "Webhooks"
2. Click "Add Webhook"
3. Enter webhook URL
4. Select all 8 events listed above
5. Save and copy the Webhook ID

---

### 4. Testing Checklist 📋

#### 4.1 API Authentication Test
```bash
# Test: Get PayPal access token
curl -X POST https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "CLIENT_ID:SECRET" \
  -d "grant_type=client_credentials"
```

#### 4.2 Create Subscription Test
- [ ] Navigate to `/pricing` page
- [ ] Click "Upgrade" on Pro plan
- [ ] Verify redirects to PayPal checkout
- [ ] Complete sandbox payment with test account
- [ ] Verify redirect back to `/account/billing?success=true`
- [ ] Check subscription record created in database

#### 4.3 Webhook Handler Tests
- [ ] SUBSCRIPTION.CREATED - New subscription webhook received
- [ ] SUBSCRIPTION.ACTIVATED - Subscription status updated to 'active'
- [ ] PAYMENT.SALE.COMPLETED - Payment recorded in database
- [ ] SUBSCRIPTION.UPDATED - Plan change reflected
- [ ] SUBSCRIPTION.CANCELLED - Status updated, user retains access until period end
- [ ] SUBSCRIPTION.SUSPENDED - Grace period started, user notified
- [ ] SUBSCRIPTION.EXPIRED - User downgraded to free
- [ ] PAYMENT.SALE.REFUNDED - Payment status updated

#### 4.4 Subscription Management Tests
- [ ] **Cancel Subscription**: `/api/subscriptions/cancel`
- [ ] **Reactivate Subscription**: `/api/subscriptions/reactivate`
- [ ] **Change Plan**: `/api/subscriptions/change-plan`
  - [ ] Upgrade (immediate)
  - [ ] Downgrade (next billing cycle)

---

### 5. Cron Jobs Configuration ⏰

**Required Cron Secret:**
```bash
# Generate with: openssl rand -base64 32
CRON_SECRET=your_32_character_random_string
```

**Vercel Cron Configuration:**
Create `vercel.json` (already exists):
```json
{
  "crons": [
    {
      "path": "/api/cron/calculate-stats",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/sync-subscriptions",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/retry-failed-payments",
      "schedule": "0 4 * * *"
    },
    {
      "path": "/api/cron/update-leaderboards",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/reset-usage",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/cron/check-in-reminders",
      "schedule": "0 */1 * * *"
    }
  ]
}
```

---

### 6. Manual Testing Commands 🧪

```bash
# Test cron job manually (with CRON_SECRET from .env.local)
curl -X GET http://localhost:3000/api/cron/sync-subscriptions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test webhook signature verification
curl -X POST http://localhost:3000/api/paypal/webhook \
  -H "Content-Type: application/json" \
  -H "PAYPAL-TRANSMISSION-ID: test-id" \
  -H "PAYPAL-TRANSMISSION-TIME: 2024-01-01T00:00:00Z" \
  -H "PAYPAL-TRANSMISSION-SIG: test-sig" \
  -H "PAYPAL-CERT-URL: https://api.sandbox.paypal.com/cert" \
  -H "PAYPAL-AUTH-ALGO: SHA256withRSA" \
  -d '{
    "event_type": "BILLING.SUBSCRIPTION.CREATED",
    "resource": {...}
  }'
```

---

### 7. Database Verification Queries 🗄️

```sql
-- Check subscription records
SELECT id, user_id, plan, status, paypal_subscription_id, current_period_end
FROM subscription
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;

-- Check usage logs
SELECT user_id, feature, action, timestamp
FROM usage_log
WHERE user_id = 'YOUR_TEST_USER_ID'
ORDER BY timestamp DESC
LIMIT 20;

-- Check payment history
SELECT user_id, amount, status, paypal_payment_id, created_at
FROM payment_history
WHERE user_id = 'YOUR_TEST_USER_ID'
ORDER BY created_at DESC;
```

---

### 8. Expected Files Modified/Created ✏️

**No code changes needed** - All PayPal integration code already implemented in Sprint 5 Phase 1.

**Configuration needed:**
1. ✅ `.env.local` - Add PayPal variables
2. ✅ PayPal Dashboard - Create plans and webhook
3. ✅ Vercel Dashboard (for production) - Add environment variables

---

### 9. Success Criteria ✅

Phase 2 is complete when:
- [ ] All PayPal environment variables configured
- [ ] 3 subscription plans created in PayPal Sandbox
- [ ] Webhook configured and receiving events
- [ ] Test subscription created successfully
- [ ] All 8 webhook events tested and working
- [ ] Cancel/Reactivate/Change Plan flows working
- [ ] Cron jobs can be triggered manually with CRON_SECRET
- [ ] Database records created correctly for all flows

---

### 10. Next Phase Preview 🔮

**Phase 3: E2E Testing Suite (Playwright)**
- User authentication flows
- Subscription creation flow
- Subscription management (cancel, reactivate, change plan)
- Usage limit enforcement
- Webhook event simulation
- Admin subscription dashboard

---

## Notes & Observations 📝

1. **Edge Runtime Removed**: All 5 cron jobs now use Node.js runtime (needed for logger and Supabase server)
2. **Secret Name**: Code uses `PAYPAL_SECRET` not `PAYPAL_CLIENT_SECRET`
3. **Plan IDs**: Code expects both server-side (`PAYPAL_*_PLAN_ID`) and public (`NEXT_PUBLIC_PAYPAL_PLAN_*`) versions
4. **Currency**: Code currently hardcoded to EUR in some places (needs confirmation)
5. **Cron Auth**: All cron routes check `Authorization: Bearer ${CRON_SECRET}` header

---

## Ready to Proceed? 🚦

**Current Status**:
- ✅ Phase 1 Complete
- 🔄 Phase 2 Ready to Start

**Required Actions**:
1. Create PayPal Sandbox account (if not exists)
2. Create 3 subscription plans
3. Configure webhook
4. Add all environment variables to `.env.local`
5. Generate CRON_SECRET
6. Run manual tests

**Estimated Time**: 30-45 minutes for PayPal setup + 15-30 minutes for testing = **1-1.5 hours total**
