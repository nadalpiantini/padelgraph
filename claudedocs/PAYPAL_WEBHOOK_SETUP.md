# PayPal Webhook Setup Guide

## Overview
This guide explains how to configure PayPal webhooks for secure subscription lifecycle management in PadelGraph.

## Security Implementation
✅ **COMPLETED**: Full webhook signature verification implemented (Sprint 5)
- Uses PayPal's `/v1/notifications/verify-webhook-signature` API
- Validates all webhook events before processing
- Environment-aware (dev allows missing webhook ID, production enforces it)

## Setup Steps

### 1. Create Webhook in PayPal Dashboard

**Sandbox (Development)**:
1. Go to https://developer.paypal.com/dashboard/
2. Navigate to Apps & Credentials → Sandbox
3. Select your app
4. Scroll to "Webhooks" section
5. Click "Add Webhook"
6. Enter webhook URL: `https://your-domain.com/api/paypal/webhook`
7. Select event types:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.DENIED`
   - `PAYMENT.SALE.REFUNDED`
8. Save webhook and copy the Webhook ID

**Production**:
1. Go to https://developer.paypal.com/dashboard/
2. Navigate to Apps & Credentials → Live
3. Follow same steps as above with production domain

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
# PayPal Credentials
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_SECRET=your_client_secret_here
PAYPAL_WEBHOOK_ID=your_webhook_id_here  # ⚠️ REQUIRED for production

# PayPal Plan IDs
PAYPAL_PRO_PLAN_ID=P-XXX
PAYPAL_PREMIUM_PLAN_ID=P-YYY
PAYPAL_CLUB_PLAN_ID=P-ZZZ

# Environment (affects API base URL)
NODE_ENV=production  # or development
```

### 3. Webhook Events Handled

| Event Type | Handler | Action |
|------------|---------|--------|
| `BILLING.SUBSCRIPTION.ACTIVATED` | `handleSubscriptionActivated` | Sync subscription to database, upgrade user plan |
| `BILLING.SUBSCRIPTION.UPDATED` | `handleSubscriptionActivated` | Update subscription details |
| `BILLING.SUBSCRIPTION.CANCELLED` | `handleSubscriptionCancelled` | Mark cancelled, downgrade to free plan |
| `BILLING.SUBSCRIPTION.SUSPENDED` | `handleSubscriptionCancelled` | Suspend subscription access |
| `PAYMENT.SALE.COMPLETED` | `handlePaymentCompleted` | Log successful payment |
| `PAYMENT.SALE.DENIED` | `handlePaymentFailed` | Mark subscription as past_due |
| `PAYMENT.SALE.REFUNDED` | `handlePaymentFailed` | Handle refunded payment |

## Security Features

### Signature Verification Process
1. **Extract Headers**: Collects PayPal webhook signature headers
   - `paypal-transmission-id`
   - `paypal-transmission-time`
   - `paypal-cert-url`
   - `paypal-transmission-sig`
   - `paypal-auth-algo`

2. **Authenticate**: Gets PayPal OAuth access token
   - Uses `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET`
   - Connects to sandbox or production based on `NODE_ENV`

3. **Verify**: Calls PayPal verification API
   - Endpoint: `/v1/notifications/verify-webhook-signature`
   - Sends webhook event + headers for validation
   - Returns `SUCCESS` or `FAILURE`

4. **Reject Invalid**: Returns 401 if verification fails
   - Prevents processing of fake/tampered webhooks
   - Logs detailed error messages

### Development vs Production

**Development Mode** (`NODE_ENV !== 'production'`):
- Allows missing `PAYPAL_WEBHOOK_ID` (skips verification with warning)
- Uses PayPal Sandbox API (`https://api-m.sandbox.paypal.com`)
- Console warnings for missing configuration

**Production Mode** (`NODE_ENV === 'production'`):
- **REQUIRES** `PAYPAL_WEBHOOK_ID` (fails if missing)
- Uses PayPal Live API (`https://api-m.paypal.com`)
- Strict validation, no bypasses

## Testing Webhooks

### Using PayPal Webhook Simulator
1. Go to https://developer.paypal.com/dashboard/
2. Navigate to your app → Webhooks
3. Select your webhook
4. Click "Simulator" tab
5. Choose event type (e.g., `BILLING.SUBSCRIPTION.ACTIVATED`)
6. Customize payload if needed
7. Click "Send Test"
8. Check your server logs for verification results

### Local Testing with ngrok
```bash
# Start your dev server
npm run dev

# In another terminal, expose local server
ngrok http 3000

# Use ngrok URL in PayPal webhook configuration
# Example: https://abc123.ngrok.io/api/paypal/webhook
```

### Manual Testing with curl
```bash
# This will FAIL signature verification (as expected)
curl -X POST http://localhost:3000/api/paypal/webhook \
  -H "Content-Type: application/json" \
  -H "paypal-transmission-id: test-id" \
  -H "paypal-transmission-time: 2025-10-17T12:00:00Z" \
  -H "paypal-cert-url: https://api.paypal.com/cert" \
  -H "paypal-transmission-sig: test-sig" \
  -H "paypal-auth-algo: SHA256withRSA" \
  -d '{
    "event_type": "BILLING.SUBSCRIPTION.ACTIVATED",
    "resource": {
      "id": "I-TEST123",
      "plan_id": "P-TEST",
      "status": "ACTIVE",
      "subscriber": {
        "email_address": "test@example.com"
      }
    }
  }'
```

## Monitoring & Debugging

### Success Indicators
```
✅ PayPal webhook signature verified successfully
Subscription activated for user: abc-123-def
```

### Error Indicators
```
❌ PAYPAL_WEBHOOK_ID required in production
❌ Missing required PayPal webhook headers
❌ Failed to get PayPal access token
❌ PayPal webhook verification API call failed: 401
❌ PayPal webhook signature verification failed
```

### Health Check Queries
```sql
-- Check recent subscription syncs
SELECT
  user_id,
  paypal_subscription_id,
  status,
  updated_at
FROM subscription
WHERE updated_at > NOW() - INTERVAL '1 day'
ORDER BY updated_at DESC;

-- Check users upgraded via webhooks
SELECT
  user_id,
  current_plan,
  updated_at
FROM user_profile
WHERE current_plan != 'free'
  AND updated_at > NOW() - INTERVAL '1 day'
ORDER BY updated_at DESC;
```

## Production Deployment Checklist

- [ ] `PAYPAL_WEBHOOK_ID` configured in production environment
- [ ] `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET` are LIVE credentials (not sandbox)
- [ ] Webhook URL uses HTTPS (required by PayPal)
- [ ] Webhook configured with all required event types in Live dashboard
- [ ] Test webhook with PayPal simulator before going live
- [ ] Monitor logs for first production webhook events
- [ ] Set up alerts for webhook verification failures

## Troubleshooting

### Issue: "Invalid webhook signature" errors
**Causes**:
- Incorrect `PAYPAL_WEBHOOK_ID`
- Webhook headers missing or incorrect
- Network issues with PayPal API
- Sandbox credentials used in production (or vice versa)

**Solutions**:
1. Verify `PAYPAL_WEBHOOK_ID` matches PayPal dashboard
2. Check all 5 required headers are present
3. Ensure `NODE_ENV` matches PayPal mode (sandbox vs live)
4. Test with PayPal webhook simulator

### Issue: "Missing required PayPal webhook headers"
**Causes**:
- Request not from PayPal
- Webhook misconfigured in PayPal dashboard
- Proxy/CDN stripping headers

**Solutions**:
1. Verify request comes from PayPal IP ranges
2. Check webhook configuration in PayPal dashboard
3. Ensure no middleware strips PayPal headers

### Issue: Subscription not syncing to database
**Causes**:
- Webhook signature failing silently
- Subscriber email doesn't match user in database
- Database RLS policies blocking updates

**Solutions**:
1. Check logs for verification failures
2. Verify user exists with matching email
3. Test database policies with service role key

## References

- [PayPal Webhooks Documentation](https://developer.paypal.com/api/rest/webhooks/)
- [PayPal Webhook Signature Verification](https://developer.paypal.com/api/rest/webhooks/rest/#verify-webhook-signature)
- [PayPal Subscription Events](https://developer.paypal.com/docs/api-basics/notifications/webhooks/event-names/#subscriptions)
- [Sprint 5 Implementation](/claudedocs/SPRINT_5_CONTEXT.md)
