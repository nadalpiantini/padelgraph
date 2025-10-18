# PayPal Subscription Integration - Padelgraph

**Status**: ✅ Implementation Complete
**Environment**: Sandbox (Development)
**Last Updated**: 2025-10-17

## Overview

Padelgraph uses PayPal Subscriptions API for recurring subscription billing across 4 pricing tiers:
- **Free**: $0/month (default, unlimited duration)
- **Pro**: $9.99/month (1 user, enhanced features)
- **Dual**: $15.00/month (2 users with family invitations)
- **Premium**: $15.00/month (1 user with advanced features + API access)

**Note**: A **Club** plan ($49/month, 50 users) exists but is not prominently promoted on the pricing page.

## Plan Structure

### Free Plan (Tier 0)
- **Price**: $0/month
- **Users**: 1
- **Features**:
  - 2 tournaments/month
  - 5 auto-matches/month
  - 10 player recommendations/month
  - 1 travel plan/month
  - Basic achievements & leaderboards
  - Ads supported

### Pro Plan (Tier 1) - Most Popular
- **Price**: $9.99/month
- **Users**: 1
- **PayPal Plan ID**: `P-8DF61561CK131203HNDZLZVQ`
- **Features**:
  - Unlimited tournaments
  - 50 auto-matches/month
  - Unlimited player recommendations
  - 10 travel plans/month
  - Advanced analytics
  - Achievements & leaderboards
  - Ad-free experience

### Dual Plan (Tier 2)
- **Price**: $15.00/month
- **Users**: 2 (family/couple plan with invitations)
- **PayPal Plan ID**: `P-3R001407AKS44845TNDZLY7`
- **Features**:
  - All Pro features
  - Family invitation system (2 users)
  - Unlimited auto-matches
  - Unlimited travel plans
  - Priority support
  - Shared analytics dashboard

### Premium Plan (Tier 2)
- **Price**: $15.00/month
- **Users**: 1
- **PayPal Plan ID**: `P-88023967WE506663ENDZN2QQ`
- **Features**:
  - All Pro features
  - Unlimited auto-matches
  - Unlimited travel plans
  - Priority support
  - Custom tournament branding
  - API access

### Club Plan (Tier 3) - Available but not promoted
- **Price**: $49.00/month
- **Users**: 50 (multi-user management)
- **PayPal Plan ID**: `P-1EVQ6856ST196634TNDZN46A`
- **Features**:
  - All Premium features
  - Multi-user management (50 users)
  - Custom integrations
  - Dedicated account manager

## Environment Variables

### Required in `.env.local`

```bash
# PayPal Configuration (Sandbox)
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=AeYU9ZqcETlNxfqkIPflGclyActmJbdE3vvb_WlVvg61qguy_cNXUYlkcCqykd36Ua7TCHHnmMGoXDSu
PAYPAL_SECRET=El3kursgHwkc53RLjOBiu-b7MhJ6KPPh7u-vgfYkZjCqAbZUxJ6AjsHwGGOFTGDZlkh6t7GalXK3b0NH
PAYPAL_WEBHOOK_ID=59T32216L4406620F

# PayPal Plan IDs - Server Side
PAYPAL_PRO_PLAN_ID=P-8DF61561CK131203HNDZLZVQ
PAYPAL_DUAL_PLAN_ID=P-3R001407AKS44845TNDZLY7
PAYPAL_PREMIUM_PLAN_ID=P-88023967WE506663ENDZN2QQ
PAYPAL_CLUB_PLAN_ID=P-1EVQ6856ST196634TNDZN46A

# PayPal Plan IDs - Client Side (Public)
NEXT_PUBLIC_PAYPAL_PLAN_PRO=P-8DF61561CK131203HNDZLZVQ
NEXT_PUBLIC_PAYPAL_PLAN_DUAL=P-3R001407AKS44845TNDZLY7
NEXT_PUBLIC_PAYPAL_PLAN_PREMIUM=P-88023967WE506663ENDZN2QQ
NEXT_PUBLIC_PAYPAL_PLAN_CLUB=P-1EVQ6856ST196634TNDZN46A
```

### For Production

Update the following variables:
- `PAYPAL_MODE=production`
- Use production Client ID and Secret
- Use production Webhook ID
- Use production Plan IDs

## API Endpoints

### 1. Create Subscription
**Endpoint**: `POST /api/paypal/create-subscription`
**Purpose**: Create a new PayPal subscription
**Authentication**: Required (authenticated user)

**Request Body**:
```json
{
  "plan_id": "pro" | "dual" | "premium" | "club"
}
```

**Response**:
```json
{
  "subscription_id": "I-BW452GLLEP1G",
  "approval_url": "https://www.sandbox.paypal.com/checkoutnow?token=6XG69026AR2774033"
}
```

**Implementation**: `src/app/api/paypal/create-subscription/route.ts`

### 2. Change Subscription Plan
**Endpoint**: `POST /api/subscriptions/change-plan`
**Purpose**: Upgrade or downgrade an existing subscription
**Authentication**: Required (authenticated user)

**Request Body**:
```json
{
  "new_plan": "pro" | "dual" | "premium" | "club",
  "immediate": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Subscription upgraded successfully",
  "subscription": {
    "current_plan": "premium",
    "new_plan": null,
    "change_effective": "2025-10-17T20:30:00Z",
    "is_immediate": true
  }
}
```

**Plan Hierarchy Logic**:
- Upgrades (higher tier): Immediate by default
- Downgrades (lower tier): Effective at end of billing period (can be forced immediate)
- Dual and Premium are at same tier (2), but have different features

**Implementation**: `src/app/api/subscriptions/change-plan/route.ts`

### 3. Webhook Handler
**Endpoint**: `POST /api/paypal/webhook`
**Purpose**: Handle PayPal subscription events
**Authentication**: PayPal signature verification

**Webhook URL**: `https://padelgraph.vercel.app/api/paypal/webhook`
**Webhook ID**: `59T32216L4406620F`

**Handled Events**:
- `BILLING.SUBSCRIPTION.ACTIVATED` - Subscription becomes active
- `BILLING.SUBSCRIPTION.UPDATED` - Subscription plan/status changes
- `BILLING.SUBSCRIPTION.CANCELLED` - User cancels subscription
- `BILLING.SUBSCRIPTION.SUSPENDED` - Payment issues suspend subscription
- `BILLING.SUBSCRIPTION.EXPIRED` - Subscription period ends
- `PAYMENT.SALE.COMPLETED` - Successful payment
- `PAYMENT.SALE.DENIED` - Failed payment
- `PAYMENT.SALE.REFUNDED` - Payment refunded

**Implementation**: `src/app/api/paypal/webhook/route.ts`

## Database Schema

### `subscription` Table
```sql
CREATE TABLE subscription (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  paypal_customer_id TEXT,
  paypal_subscription_id TEXT UNIQUE,
  paypal_plan_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro' | 'dual' | 'premium' | 'club'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'cancelled' | 'suspended' | 'past_due' | 'trialing'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  amount INTEGER, -- Amount in cents
  currency TEXT DEFAULT 'USD',
  interval TEXT, -- 'month' | 'year'
  plan_change_date TIMESTAMP,
  pending_plan TEXT, -- For scheduled downgrades
  pending_plan_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT subscription_user_id_unique UNIQUE(user_id)
);
```

### `usage_log` Table
```sql
CREATE TABLE usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  feature TEXT NOT NULL, -- 'tournament' | 'auto_match' | 'recommendation' | 'travel_plan'
  action TEXT NOT NULL DEFAULT 'use', -- 'use' | 'refund'
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL
);
```

## Service Layer

### `src/lib/services/subscriptions.ts`

**Key Functions**:

#### `getUserSubscription(userId: string)`
Retrieves user's current subscription. Returns default free subscription if none exists.

#### `getPlanLimits(plan: string)`
Returns feature limits for a given plan (tournaments, auto-matches, recommendations, travel plans).

#### `checkUsageLimit(userId, feature)`
Checks if user can use a feature based on their plan limits and current usage.

#### `logFeatureUsage(userId, feature, action, metadata)`
Logs feature usage to track consumption against plan limits.

#### `syncPayPalSubscription(userId, paypalData)`
Syncs PayPal subscription data to local database. Maps PayPal plan IDs to internal plan names.

#### `cancelSubscription(userId)`
Marks subscription for cancellation at end of period.

#### `reactivateSubscription(userId)`
Reactivates a cancelled subscription before period ends.

**Plan Mapping**:
```typescript
const planMap: Record<string, string> = {
  'P-8DF61561CK131203HNDZLZVQ': 'pro',
  'P-3R001407AKS44845TNDZLY7': 'dual',
  'P-88023967WE506663ENDZN2QQ': 'premium',
  'P-1EVQ6856ST196634TNDZN46A': 'club',
};
```

## Frontend Integration

### Pricing Page
**File**: `src/app/[locale]/pricing/page.tsx`

**Features**:
- Displays all 4 pricing plans (Free, Pro, Dual, Premium)
- Shows "Most Popular" badge on Pro plan
- Highlights current plan if user is authenticated
- Handles subscription creation flow
- Tracks analytics events (pricing viewed, plan selected, checkout initiated)

**Plan Data Structure**:
```typescript
interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  popular?: boolean;
  features: PlanFeature[];
  paypalPlanId: string;
  color: string;
  icon: React.ReactNode;
}
```

## Testing

### E2E Tests
**File**: `tests/e2e/flows/paypal-subscription.spec.ts`

**Test Coverage**:
- ✅ Display all 4 pricing plans with correct pricing
- ✅ Show upgrade buttons for paid plans
- ✅ Dual plan shows family invitations (2 users)
- ✅ Premium plan shows API access and custom branding
- ✅ Free plan shows limitations
- ✅ PayPal subscription creation flow
- ✅ Pro plan marked as "Most Popular"
- ✅ FAQ section displayed
- ✅ Correct plan hierarchy (Free < Pro < Dual/Premium)

**Run E2E Tests**:
```bash
# Set environment variables
export PLAYWRIGHT_BASE_URL=https://padelgraph.com
export TEST_USER_EMAIL=test@padelgraph.com
export TEST_USER_PASSWORD=testpassword123

# Run tests
npm run test:e2e
```

### Manual Testing Checklist

#### Sandbox Testing
1. ✅ Navigate to `/pricing`
2. ✅ Verify all 4 plans displayed
3. ✅ Click "Upgrade" on Pro plan
4. ✅ Verify PayPal sandbox checkout opens
5. ✅ Complete payment in PayPal sandbox
6. ✅ Verify redirect back to `/account/billing?success=true`
7. ✅ Verify subscription status shows "Pro" plan
8. ✅ Test plan change (upgrade/downgrade)
9. ✅ Verify webhook events received in logs
10. ✅ Test subscription cancellation

#### Production Testing (Before Go-Live)
1. ⏳ Update environment variables to production
2. ⏳ Verify all plan IDs are production PayPal plan IDs
3. ⏳ Test complete subscription flow with real payment
4. ⏳ Verify webhook signature verification
5. ⏳ Test plan changes in production
6. ⏳ Monitor logs for any errors

## Deployment Checklist

### Pre-Deployment
- ✅ All API endpoints implemented
- ✅ Webhook handler configured
- ✅ Environment variables set
- ✅ Database schema deployed
- ✅ E2E tests passing
- ⏳ TypeScript compilation successful
- ⏳ Build test successful
- ⏳ Unit tests passing

### Production Setup
- ⏳ Update `PAYPAL_MODE=production` in Vercel environment
- ⏳ Update `PAYPAL_CLIENT_ID` to production value
- ⏳ Update `PAYPAL_SECRET` to production value
- ⏳ Update `PAYPAL_WEBHOOK_ID` to production webhook ID
- ⏳ Update all Plan IDs to production PayPal plan IDs
- ⏳ Configure PayPal webhook URL: `https://padelgraph.com/api/paypal/webhook`
- ⏳ Verify webhook events in PayPal dashboard

### Post-Deployment Monitoring
- Monitor PayPal webhook events for errors
- Track subscription creation success rate
- Monitor payment failures and retry logic
- Review usage log entries for accuracy
- Track plan change requests and completion rate

## Troubleshooting

### Common Issues

#### 1. Webhook Signature Verification Failed
**Symptom**: PayPal webhooks returning 401 Unauthorized
**Solution**:
- Verify `PAYPAL_WEBHOOK_ID` matches PayPal dashboard
- Check webhook URL is correct in PayPal
- Ensure webhook events are configured in PayPal

#### 2. Subscription Creation Returns 400
**Symptom**: `/api/paypal/create-subscription` returns "Invalid plan"
**Solution**:
- Verify `plan_id` is one of: 'pro', 'dual', 'premium', 'club'
- Check PayPal plan IDs are configured in environment variables
- Verify PayPal plans are active in PayPal dashboard

#### 3. Plan Change Fails with 422
**Symptom**: `/api/subscriptions/change-plan` returns requiresNewSubscription
**Solution**:
- Some plan changes require canceling and creating new subscription
- Guide user to cancel current plan and subscribe to new one
- Consider implementing automatic cancel + create flow

#### 4. Usage Limits Not Enforced
**Symptom**: Users exceed plan limits
**Solution**:
- Check `usage_log` table for entries
- Verify `checkUsageLimit()` is called before feature use
- Ensure `logFeatureUsage()` is called after feature use
- Check plan limits in `PLAN_LIMITS` constant

## Security Considerations

### Environment Variables
- ⚠️ **Never commit** `.env.local` to git
- ✅ Store secrets in Vercel environment variables
- ✅ Use different credentials for sandbox vs production

### Webhook Security
- ✅ PayPal webhook signature verification implemented
- ✅ Signature validation required in production
- ✅ Signature validation skipped in development (with warning)

### API Authentication
- ✅ All subscription endpoints require authenticated user
- ✅ User can only modify their own subscription
- ✅ Row Level Security (RLS) enabled on `subscription` table

### Payment Security
- ✅ No credit card data stored in database
- ✅ All payment processing handled by PayPal
- ✅ PCI compliance handled by PayPal

## Future Enhancements

### Planned Features
- [ ] Annual billing option (save 20%)
- [ ] Promo codes and discounts
- [ ] Team management for Dual/Club plans
- [ ] Usage analytics dashboard
- [ ] Automated dunning (payment retry logic)
- [ ] Subscription pause/resume
- [ ] Migration path from Dual to Club for growing families
- [ ] Referral program with subscription credits

### Nice-to-Have
- [ ] In-app subscription management (cancel, change plan)
- [ ] Email notifications for subscription events
- [ ] SMS notifications via Twilio for payment failures
- [ ] Subscription analytics (churn rate, MRR, ARPU)
- [ ] A/B testing for pricing tiers
- [ ] Localized pricing (EUR, GBP, etc.)

## References

- [PayPal Subscriptions API Docs](https://developer.paypal.com/docs/subscriptions/)
- [PayPal Webhooks Guide](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
- [PayPal Sandbox Testing](https://developer.paypal.com/tools/sandbox/)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

## Contact & Support

**Development Lead**: Nadal Piantini
**PayPal Dashboard**: https://developer.paypal.com/dashboard
**Webhook Configuration**: https://developer.paypal.com/dashboard/webhooks
**Supabase Dashboard**: https://kqftsiohgdzlyfqbhxbc.supabase.co

---

**Last Updated**: 2025-10-17 by Claude Code
**Status**: ✅ Implementation Complete (Sandbox)
