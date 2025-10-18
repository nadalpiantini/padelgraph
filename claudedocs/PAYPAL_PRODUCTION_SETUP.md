# PayPal Production Setup Guide - PadelGraph

**Status**: ✅ Enhanced - Ready for Implementation
**Date**: 2025-10-18 (Updated)
**Goal**: Complete PayPal Production Migration Guide

---

## 📋 STEP 1: Create PayPal Business Account (10 min)

### If You DON'T Have a Business Account:

1. **Go to**: https://www.paypal.com/us/business
2. **Click**: "Sign Up" for Business Account
3. **Fill**:
   - Business Type: Individual/Sole Proprietorship or LLC (lo que aplique)
   - Business Name: PadelGraph (o tu legal name)
   - Email: (tu email business)
   - Country: United States (o tu país)
4. **Verify Email** and complete setup
5. **Important**: May require bank account verification (can take 1-2 days)

### If You Already Have Business Account:

1. **Login**: https://www.paypal.com/businessmanagement
2. **Verify**: Account is Business type (not Personal)
3. **Proceed** to Step 2

---

## 🔧 STEP 2: Access Developer Dashboard (2 min)

1. **Go to**: https://developer.paypal.com/dashboard/
2. **Login** with your Business PayPal account
3. **Switch to**: "Live" environment (top right toggle)
   - ⚠️ Make sure you see "Live" NOT "Sandbox"
4. **Navigate**: Apps & Credentials

---

## 🔑 STEP 3: Create Production App (5 min)

1. **Click**: "Create App" button
2. **Fill**:
   - App Name: `PadelGraph Production`
   - App Type: `Merchant`
3. **Click**: Create App
4. **Copy Credentials**:
   ```
   Client ID: AeXXXXXXXXXXXXXXXXXXXXXXX (live)
   Secret: EpXXXXXXXXXXXXXXXXXXXXXXX (click "Show" to reveal)
   ```
5. **Save** these credentials securely (we'll need them for Vercel)

---

## 💳 STEP 4: Create Subscription Plans (15-20 min)

### Plan 1: Pro ($9.99/month)

1. **Navigate**: Products & Billing → Plans
2. **Click**: "Create Plan"
3. **Fill**:
   - Plan Name: `PadelGraph Pro`
   - Plan ID: `padelgraph-pro` (auto-generated, can customize)
   - Billing Cycle: Monthly
   - Price: `$9.99 USD`
   - Setup Fee: None
   - Trial Period: None (or 7 days free if you want)
4. **Description**: `Unlimited tournaments, 50 auto-matches/month, advanced analytics, ad-free`
5. **Click**: Save
6. **Copy**: Plan ID (format: `P-XXXXXXXXXXXXXXXXX`)

### Plan 2: Dual ($15/month)

1. **Repeat** above process with:
   - Plan Name: `PadelGraph Dual`
   - Plan ID: `padelgraph-dual`
   - Price: `$15.00 USD`
   - Description: `Family plan for 2 users, unlimited features, priority support`
2. **Copy**: Plan ID

### Plan 3: Premium ($15/month)

1. **Repeat** with:
   - Plan Name: `PadelGraph Premium`
   - Plan ID: `padelgraph-premium`
   - Price: `$15.00 USD`
   - Description: `API access, custom branding, unlimited features, priority support`
2. **Copy**: Plan ID

### Plan 4: Club ($49/month)

1. **Repeat** with:
   - Plan Name: `PadelGraph Club`
   - Plan ID: `padelgraph-club`
   - Price: `$49.00 USD`
   - Description: `Multi-user management (50 users), dedicated account manager, custom integrations`
2. **Copy**: Plan ID

**✅ Save All 4 Plan IDs** - You'll need them for Vercel env vars!

---

## 🔔 STEP 5: Configure Production Webhook (10 min)

1. **Navigate**: Developer Dashboard → Webhooks
2. **Click**: "Add Webhook"
3. **Fill**:
   - Webhook URL: `https://padelgraph.com/api/paypal/webhook`
   - Event Version: 1.0
4. **Select Events** (check these boxes):
   ```
   ✓ BILLING.SUBSCRIPTION.ACTIVATED
   ✓ BILLING.SUBSCRIPTION.UPDATED
   ✓ BILLING.SUBSCRIPTION.CANCELLED
   ✓ BILLING.SUBSCRIPTION.SUSPENDED
   ✓ BILLING.SUBSCRIPTION.EXPIRED
   ✓ PAYMENT.SALE.COMPLETED
   ✓ PAYMENT.SALE.DENIED
   ✓ PAYMENT.SALE.REFUNDED
   ```
5. **Click**: Save
6. **Copy**: Webhook ID (format: `1AB2345678901234C`)

---

## 📝 CREDENTIALS SUMMARY

After completing Steps 3-5, you should have:

```bash
# Production App Credentials (Step 3)
PAYPAL_CLIENT_ID=AeXXXXXXXXXXXXXXXXXXX
PAYPAL_SECRET=EpXXXXXXXXXXXXXXXXXXXX

# Production Plan IDs (Step 4)
PAYPAL_PRO_PLAN_ID=P-XXXXXXXXX
PAYPAL_DUAL_PLAN_ID=P-XXXXXXXXX
PAYPAL_PREMIUM_PLAN_ID=P-XXXXXXXXX
PAYPAL_CLUB_PLAN_ID=P-XXXXXXXXX

# Production Webhook ID (Step 5)
PAYPAL_WEBHOOK_ID=1AB234567890
```

---

## 🚀 NEXT STEPS

Once you have all credentials:

1. **Add to Vercel** (I'll help you with commands)
2. **Deploy to production**
3. **Test subscription flow**
4. **Monitor webhook events**

---

## 🆘 Troubleshooting

### "Account Not Verified"
- PayPal may require bank account verification
- Can take 1-2 business days
- You can still create app & plans while waiting
- Webhooks may not work until verified

### "Can't Create Plans"
- Make sure you're in "Live" mode (not Sandbox)
- Business account required (not Personal)
- May need to agree to additional terms

### "Webhook Test Fails"
- URL must be publicly accessible (https://padelgraph.com)
- Must respond with HTTP 200
- Check Vercel logs for webhook delivery attempts

---

## ✅ Checklist

- [ ] PayPal Business Account created/verified
- [ ] Switched to "Live" environment in Developer Dashboard
- [ ] Production App created
- [ ] Client ID & Secret copied
- [ ] Pro Plan created ($9.99) - Plan ID copied
- [ ] Dual Plan created ($15) - Plan ID copied
- [ ] Premium Plan created ($15) - Plan ID copied
- [ ] Club Plan created ($49) - Plan ID copied
- [ ] Webhook configured with URL
- [ ] Webhook ID copied
- [ ] All 10 credentials saved securely

**When complete, let Claude know and we'll proceed to add env vars to Vercel!**

---

## 🔧 TECHNICAL IMPLEMENTATION DETAILS

### Code Changes Required

#### 1. Update Plan Mapping (Webhook Handler)

File: `src/app/api/paypal/webhook/route.ts`

After obtaining production Plan IDs, update the mapping:

```typescript
// Line ~185 in webhook route
const planMap: Record<string, string> = {
  '[PROD_PRO_PLAN_ID]': 'pro',      // Replace with actual P-XXXXX ID
  '[PROD_DUAL_PLAN_ID]': 'dual',    // Replace with actual P-XXXXX ID
  '[PROD_PREMIUM_PLAN_ID]': 'premium', // Replace with actual P-XXXXX ID
  '[PROD_CLUB_PLAN_ID]': 'club',    // Replace with actual P-XXXXX ID
};
```

**Current (Sandbox)**:
```typescript
const planMap: Record<string, string> = {
  'P-8DF61561CK131203HNDZLZVQ': 'pro',
  'P-3R001407AKS44845TNDZLY7': 'dual',
  'P-88023967WE506663ENDZN2QQ': 'premium',
  'P-1EVQ6856ST196634TNDZN46A': 'club',
};
```

#### 2. Environment-Aware API Calls

The code already handles environment switching:

```typescript
const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
```

**No changes needed** - works automatically when `PAYPAL_MODE=production`

#### 3. Webhook Signature Verification

Current implementation (already production-ready):

```typescript
// Verifies webhook signature using PayPal API
async function verifyWebhookSignature(request, body) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  // Development bypass (sandbox only)
  if (!webhookId && process.env.NODE_ENV !== 'production') {
    return true;
  }

  // Production requires valid signature
  if (!webhookId) {
    return false;
  }

  // Verify signature via PayPal API
  // ... signature verification logic
}
```

**Security**: Production webhooks MUST have signature verification enabled.

---

## 🔒 SECURITY ENHANCEMENTS

### Webhook Security (Already Implemented)

1. **Signature Verification**: All production webhooks verified via PayPal API
2. **Idempotency**: Duplicate events automatically skipped (DB unique constraint)
3. **Event Logging**: All webhook events logged in `paypal_webhook_event` table
4. **Error Recovery**: Failed events marked for manual review
5. **Atomic Updates**: Subscription + user profile updated in single transaction

### Additional Production Safeguards

File: `src/app/api/paypal/webhook/route.ts`

**Logging Enhanced**:
```typescript
// Current logging (production-ready)
log.info('PayPal webhook received', { eventId, eventType, resourceId });
log.error('Failed to log webhook event', { error, eventId });
log.warn('Unhandled PayPal event type', { eventType });
```

**Monitoring Queries**:

```sql
-- Check webhook health (last 24h)
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time
FROM paypal_webhook_event
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Find failed events requiring attention
SELECT
  id,
  event_type,
  error_message,
  created_at,
  payload
FROM paypal_webhook_event
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## 🧪 TESTING PROTOCOL

### Pre-Production Testing

#### 1. Sandbox Verification (Current State)

```bash
# Verify sandbox still works
curl -X POST https://padelgraph.com/api/paypal/webhook \
  -H "Content-Type: application/json" \
  -H "paypal-transmission-id: test-123" \
  -d '{"id":"WH-TEST","event_type":"BILLING.SUBSCRIPTION.ACTIVATED"}'

# Expected: 200 OK or signature verification warning (development)
```

#### 2. Production Smoke Test

**Test Plan**:
1. Create test subscription with real PayPal account (can cancel immediately)
2. Verify webhook receives `BILLING.SUBSCRIPTION.ACTIVATED`
3. Check database: `subscription` table has new record
4. Verify user upgraded to correct plan
5. Cancel subscription
6. Verify webhook receives `BILLING.SUBSCRIPTION.CANCELLED`
7. Check database: status = 'cancelled', plan downgraded to 'free'

**Test Script**:
```bash
# Check webhook event logging
psql $DATABASE_URL -c "
  SELECT
    event_type,
    status,
    signature_verified,
    processed
  FROM paypal_webhook_event
  ORDER BY created_at DESC
  LIMIT 5;
"

# Check subscription activation
psql $DATABASE_URL -c "
  SELECT
    user_id,
    plan,
    status,
    paypal_subscription_id
  FROM subscription
  WHERE created_at > NOW() - INTERVAL '1 hour';
"
```

---

## 🚨 ROLLBACK PROCEDURE

### If Production Fails

**Immediate Actions** (< 5 minutes):

1. **Revert Environment Variable**:
   ```bash
   # Via Vercel Dashboard
   PAYPAL_MODE=sandbox
   ```

2. **Trigger Redeployment**:
   ```bash
   vercel --prod
   ```

3. **Verify Sandbox Working**:
   ```bash
   # Test webhook endpoint
   curl https://padelgraph.com/api/paypal/webhook
   ```

4. **Customer Communication**:
   - If subscriptions affected, notify via email
   - Provide alternative payment link
   - Offer 1-week extension for affected users

**Root Cause Analysis**:
- Check Vercel logs: `vercel logs padelgraph --prod`
- Review webhook events: Query `paypal_webhook_event` table
- Verify PayPal dashboard for webhook delivery failures
- Check environment variables in Vercel

---

## 📊 MONITORING & ALERTS

### Key Metrics to Track

1. **Webhook Success Rate**
   - Target: >99%
   - Alert: <95% in 1 hour

2. **Payment Failures**
   - Target: <3%
   - Alert: >5% in 24 hours

3. **Subscription Churn**
   - Target: <5% monthly
   - Alert: >10% monthly

4. **API Response Times**
   - Target: <2s for webhook processing
   - Alert: >5s average

### Monitoring Queries

```sql
-- Daily subscription health check
SELECT
  DATE(created_at) as date,
  plan,
  status,
  COUNT(*) as count
FROM subscription
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), plan, status
ORDER BY date DESC, plan;

-- Webhook failure rate (last 24h)
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) FILTER (WHERE status = 'processed') as success,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failed') / COUNT(*), 2) as failure_rate
FROM paypal_webhook_event
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Payment failures by user
SELECT
  u.name,
  u.email,
  s.plan,
  COUNT(*) as failure_count
FROM subscription s
JOIN user_profile u ON s.user_id = u.user_id
WHERE s.status = 'past_due'
  AND s.updated_at > NOW() - INTERVAL '7 days'
GROUP BY u.name, u.email, s.plan
ORDER BY failure_count DESC;
```

---

## 📧 EMAIL NOTIFICATIONS

### Notification Types (Already Implemented)

File: `src/lib/email-templates/paypal-notifications.ts`

1. **Subscription Activated**: Welcome email with plan details
2. **Subscription Cancelled**: Confirmation with access end date
3. **Payment Failed**: Retry information and update payment method link
4. **Subscription Suspended**: Account suspended notice
5. **Subscription Expired**: Downgrade to free plan notice

**Email Verification**:
```bash
# Test email template rendering
npm run test src/lib/email-templates/paypal-notifications.test.ts
```

---

## 🔄 MIGRATION TIMELINE

### Recommended Approach: Gradual Rollout

**Phase 1: Soft Launch (Week 1)**
- Enable production for 10% of new subscriptions
- Monitor webhook success rate
- Collect customer feedback
- Maintain sandbox as fallback

**Phase 2: Expanded Rollout (Week 2)**
- Increase to 50% of new subscriptions
- Migrate existing sandbox subscribers (if any)
- Full monitoring and alerting active

**Phase 3: Full Production (Week 3)**
- 100% production mode
- Disable sandbox (keep for testing only)
- Remove sandbox credentials from production env vars
- Final security audit

---

## 🆘 EMERGENCY CONTACTS

**PayPal Support**:
- Phone: 1-888-221-1161 (Business Support)
- Live Chat: https://www.paypal.com/businesshelp/
- Developer Forum: https://www.paypal-community.com/

**Internal Escalation**:
1. Backend Team Lead
2. DevOps Engineer (Vercel access)
3. Database Admin (Supabase access)

---

## 📚 ADDITIONAL RESOURCES

**PayPal Documentation**:
- Subscriptions API: https://developer.paypal.com/docs/subscriptions/
- Webhooks Reference: https://developer.paypal.com/api/rest/webhooks/
- Production Checklist: https://developer.paypal.com/docs/checkout/production/

**Padelgraph Codebase**:
- Webhook Handler: `src/app/api/paypal/webhook/route.ts`
- Subscription Service: `src/lib/services/subscriptions.ts`
- Usage Limits: `src/lib/middleware/usage-limits.ts`
- Email Templates: `src/lib/email-templates/paypal-notifications.ts`

**Database Schema**:
- Table: `subscription` (user subscriptions)
- Table: `paypal_webhook_event` (webhook event log)
- Table: `usage_log` (feature usage tracking)
- Table: `payment_history` (transaction records)

---

## ✅ FINAL PRE-LAUNCH CHECKLIST

### Technical Readiness
- [ ] All environment variables configured in Vercel (production)
- [ ] Plan mapping updated in webhook handler
- [ ] Webhook signature verification enabled
- [ ] SSL certificate active on padelgraph.com
- [ ] Database migrations applied to production
- [ ] Email templates tested and working
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds set

### Business Readiness
- [ ] PayPal Business Account verified
- [ ] All 4 subscription plans created
- [ ] Webhook configured and tested
- [ ] Customer support trained on new flow
- [ ] Pricing page updated with production plan IDs
- [ ] Terms of Service updated (if needed)
- [ ] Privacy Policy reviewed (payment data handling)

### Testing Completed
- [ ] Sandbox subscription flow working
- [ ] Production test subscription successful
- [ ] Webhook events processing correctly
- [ ] Email notifications delivered
- [ ] Cancellation flow tested
- [ ] Payment failure scenario tested
- [ ] Rollback procedure documented and tested

---

**Document Last Updated**: 2025-10-18
**Version**: 2.0 (Enhanced Technical Guide)
**Next Review**: After first production deployment
