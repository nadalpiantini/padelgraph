# PayPal Subscriptions Integration Guide - Sprint 5

**Document Version:** 1.0
**Created:** 2025-10-17
**Status:** Implementation Guide

---

## 🎯 Overview

This document provides comprehensive guidance for integrating PayPal Subscriptions API into Padelgraph's monetization layer (Sprint 5).

**Why PayPal?**
- ✅ Already installed: `@paypal/paypal-server-sdk`
- ✅ Wide adoption in Europe/Spain
- ✅ Strong buyer protection (builds trust)
- ✅ No redirect required (in-context checkout)
- ⚠️ More complex API than Stripe
- ⚠️ Webhook signature verification critical

---

## 📦 PayPal SDK Setup

### 1. Install Dependencies

```bash
# Already installed in package.json
npm install @paypal/paypal-server-sdk
```

### 2. Environment Variables

Add to `.env.local` and Vercel:

```bash
# PayPal Sandbox (Development)
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_WEBHOOK_ID=your_sandbox_webhook_id

# PayPal Production (Production)
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=your_production_client_id
PAYPAL_CLIENT_SECRET=your_production_client_secret
PAYPAL_WEBHOOK_ID=your_production_webhook_id
```

### 3. Initialize PayPal Client

```typescript
// src/lib/paypal/client.ts
import { Client, Environment } from '@paypal/paypal-server-sdk';

const environment = process.env.PAYPAL_MODE === 'live'
  ? Environment.Production
  : Environment.Sandbox;

export const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID!,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  },
  environment,
  logging: {
    logLevel: 'info',
    logRequest: { logBody: true },
    logResponse: { logHeaders: true },
  },
});
```

---

## 🏗️ Subscription Plans Setup

### 1. Create Plans in PayPal Dashboard

**Manual Steps (one-time):**
1. Login to PayPal Developer Dashboard → Sandbox
2. Navigate to **Apps & Credentials** → **REST API Apps**
3. Go to **Products** → **Subscriptions** → **Plans**
4. Create 3 plans:
   - **Pro Plan**: €9.99/month
   - **Premium Plan**: €19.99/month
   - **Club Plan**: €99.99/month

**Plan IDs** (example):
```typescript
const PAYPAL_PLAN_IDS = {
  pro: 'P-1AB2CD3EF4GH5IJ6K',      // €9.99/month
  premium: 'P-2BC3DE4FG5HI6JK7L',  // €19.99/month
  club: 'P-3CD4EF5GH6IJ7KL8M',     // €99.99/month
};
```

### 2. Store Plan IDs in Config

```typescript
// src/lib/paypal/plans.ts
export const PAYPAL_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    paypal_plan_id: null, // No PayPal plan for free tier
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    currency: 'EUR',
    interval: 'MONTH',
    paypal_plan_id: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO!,
  },
  premium: {
    name: 'Premium',
    price: 19.99,
    currency: 'EUR',
    interval: 'MONTH',
    paypal_plan_id: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PREMIUM!,
  },
  club: {
    name: 'Club',
    price: 99.99,
    currency: 'EUR',
    interval: 'MONTH',
    paypal_plan_id: process.env.NEXT_PUBLIC_PAYPAL_PLAN_CLUB!,
  },
};
```

---

## 💳 Subscription Flow Implementation

### 1. Create Subscription (Backend)

```typescript
// src/app/api/paypal/create-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { paypalClient } from '@/lib/paypal/client';
import { PAYPAL_PLANS } from '@/lib/paypal/plans';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { plan_id, user_id } = await request.json();

    // Validate plan
    const plan = PAYPAL_PLANS[plan_id as keyof typeof PAYPAL_PLANS];
    if (!plan || !plan.paypal_plan_id) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Create PayPal subscription
    const subscriptionResponse = await paypalClient.subscriptions.create({
      body: {
        plan_id: plan.paypal_plan_id,
        application_context: {
          brand_name: 'PadelGraph',
          locale: 'es-ES',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account/billing?success=true`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
        },
      },
    });

    const subscription = subscriptionResponse.result;

    // Store subscription in database
    const supabase = await createClient();
    await supabase.from('subscription').insert({
      user_id,
      paypal_subscription_id: subscription.id,
      paypal_plan_id: plan.paypal_plan_id,
      plan: plan_id,
      status: 'pending', // Will be updated via webhook
      created_at: new Date(),
    });

    // Return approval URL for frontend redirect
    const approvalUrl = subscription.links?.find(link => link.rel === 'approve')?.href;

    return NextResponse.json({
      subscription_id: subscription.id,
      approval_url: approvalUrl,
      status: subscription.status,
    });
  } catch (error) {
    console.error('PayPal subscription creation error:', error);
    return NextResponse.json({ error: 'Subscription creation failed' }, { status: 500 });
  }
}
```

### 2. Frontend Integration

```typescript
// src/components/pricing/SubscribeButton.tsx
'use client';

import { useState } from 'react';

export function SubscribeButton({ planId }: { planId: string }) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/paypal/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, user_id: 'current_user_id' }),
      });

      const data = await response.json();

      if (data.approval_url) {
        // Redirect to PayPal for approval
        window.location.href = data.approval_url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to initiate subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg"
    >
      {loading ? 'Processing...' : 'Subscribe Now'}
    </button>
  );
}
```

---

## 🔔 Webhook Implementation

### 1. Webhook Events to Handle

```typescript
// Critical events for subscriptions
const PAYPAL_EVENTS = {
  // Subscription lifecycle
  BILLING_SUBSCRIPTION_CREATED: 'BILLING.SUBSCRIPTION.CREATED',
  BILLING_SUBSCRIPTION_ACTIVATED: 'BILLING.SUBSCRIPTION.ACTIVATED',
  BILLING_SUBSCRIPTION_UPDATED: 'BILLING.SUBSCRIPTION.UPDATED',
  BILLING_SUBSCRIPTION_CANCELLED: 'BILLING.SUBSCRIPTION.CANCELLED',
  BILLING_SUBSCRIPTION_SUSPENDED: 'BILLING.SUBSCRIPTION.SUSPENDED',
  BILLING_SUBSCRIPTION_EXPIRED: 'BILLING.SUBSCRIPTION.EXPIRED',

  // Payment events
  PAYMENT_SALE_COMPLETED: 'PAYMENT.SALE.COMPLETED',
  PAYMENT_SALE_DENIED: 'PAYMENT.SALE.DENIED',
  PAYMENT_SALE_REFUNDED: 'PAYMENT.SALE.REFUNDED',
};
```

### 2. Webhook Handler with Signature Verification

```typescript
// src/app/api/paypal/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { paypalClient } from '@/lib/paypal/client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = {
      'paypal-transmission-id': request.headers.get('paypal-transmission-id') || '',
      'paypal-transmission-time': request.headers.get('paypal-transmission-time') || '',
      'paypal-transmission-sig': request.headers.get('paypal-transmission-sig') || '',
      'paypal-cert-url': request.headers.get('paypal-cert-url') || '',
      'paypal-auth-algo': request.headers.get('paypal-auth-algo') || '',
    };

    // Verify webhook signature
    const verificationResponse = await paypalClient.webhooks.verifyWebhookSignature({
      body: {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID!,
        webhook_event: JSON.parse(body),
      },
    });

    if (verificationResponse.result.verification_status !== 'SUCCESS') {
      console.error('PayPal webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse event
    const event = JSON.parse(body);
    const supabase = await createClient();

    // Handle event types
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await supabase
          .from('subscription')
          .update({
            status: 'active',
            paypal_customer_id: event.resource.subscriber.payer_id,
            current_period_start: new Date(event.resource.start_time),
            current_period_end: new Date(event.resource.billing_info.next_billing_time),
            updated_at: new Date(),
          })
          .eq('paypal_subscription_id', event.resource.id);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await supabase
          .from('subscription')
          .update({
            status: 'cancelled',
            canceled_at: new Date(),
            updated_at: new Date(),
          })
          .eq('paypal_subscription_id', event.resource.id);
        break;

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await supabase
          .from('subscription')
          .update({
            status: 'suspended',
            updated_at: new Date(),
          })
          .eq('paypal_subscription_id', event.resource.id);
        break;

      case 'PAYMENT.SALE.COMPLETED':
        // Log payment
        await supabase.from('payments').insert({
          user_id: event.resource.custom_id, // Must pass user_id in subscription creation
          paypal_payment_id: event.resource.id,
          amount: parseFloat(event.resource.amount.total) * 100, // Convert to cents
          currency: event.resource.amount.currency,
          status: 'completed',
          created_at: new Date(),
        });
        break;

      default:
        console.log(`Unhandled event type: ${event.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

### 3. Configure Webhook in PayPal Dashboard

**Steps:**
1. Go to PayPal Developer Dashboard → Webhooks
2. Click **Create Webhook**
3. Webhook URL: `https://yourdomain.com/api/paypal/webhook`
4. Select Event Types:
   - `BILLING.SUBSCRIPTION.*` (all subscription events)
   - `PAYMENT.SALE.*` (all payment events)
5. Save and copy **Webhook ID** → Add to env vars

---

## 🧪 Testing with PayPal Sandbox

### 1. Create Sandbox Accounts

In PayPal Developer Dashboard:
- Create **Business Account** (merchant)
- Create **Personal Account** (buyer)
- Fund Personal Account with test money

### 2. Test Cards

PayPal Sandbox accepts these test cards:
```
Visa:       4111 1111 1111 1111
Mastercard: 5500 0000 0000 0004
Amex:       3782 822463 10005
```

### 3. Test Subscription Flow

```bash
# 1. Create subscription
curl -X POST http://localhost:3000/api/paypal/create-subscription \
  -H "Content-Type: application/json" \
  -d '{"plan_id": "pro", "user_id": "test-user-123"}'

# Response: { "approval_url": "https://www.sandbox.paypal.com/..." }

# 2. Visit approval_url → Login with Personal Account → Approve

# 3. Check webhook received
curl -X GET http://localhost:3000/api/subscriptions/current?user_id=test-user-123

# Response: { "status": "active", "plan": "pro", ... }
```

---

## 🔐 Security Best Practices

### 1. Always Verify Webhook Signatures

```typescript
// NEVER trust webhooks without signature verification
const verified = await paypalClient.webhooks.verifyWebhookSignature({
  // ... verification parameters
});

if (verified.result.verification_status !== 'SUCCESS') {
  throw new Error('Invalid webhook signature');
}
```

### 2. Idempotency for Webhooks

```typescript
// src/lib/paypal/webhook-handler.ts
async function handleWebhookIdempotent(event: PayPalWebhookEvent) {
  const supabase = await createClient();

  // Check if event already processed
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('event_id', event.id)
    .single();

  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`);
    return;
  }

  // Process event
  await processEvent(event);

  // Mark as processed
  await supabase.from('webhook_events').insert({
    event_id: event.id,
    event_type: event.event_type,
    processed_at: new Date(),
  });
}
```

### 3. Never Expose Secrets in Frontend

```typescript
// ✅ GOOD: Backend only
const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID!,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  },
});

// ❌ BAD: Never in frontend
const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID; // PUBLIC vars exposed!
```

---

## 📊 Monitoring & Debugging

### 1. PayPal Dashboard Logs

- **Sandbox Dashboard** → **Activity** → **All Transactions**
- View subscription status, payments, failures
- Download transaction reports

### 2. Webhook Delivery Status

- **Developer Dashboard** → **Webhooks** → **Events**
- Check delivery status (sent, pending, failed)
- Retry failed webhooks manually

### 3. Application Logging

```typescript
// src/lib/paypal/logger.ts
export function logPayPalEvent(event: string, data: any) {
  console.log('[PayPal]', event, {
    timestamp: new Date().toISOString(),
    event_type: data.event_type,
    resource_id: data.resource?.id,
    status: data.resource?.status,
  });
}
```

---

## 🚀 Production Deployment Checklist

### Pre-Launch

- [ ] Create PayPal Business Account (Production)
- [ ] Create 3 Subscription Plans in Production Dashboard
- [ ] Configure Production Webhook URL
- [ ] Add Production env vars to Vercel:
  - `PAYPAL_MODE=live`
  - `PAYPAL_CLIENT_ID=<production_id>`
  - `PAYPAL_CLIENT_SECRET=<production_secret>`
  - `PAYPAL_WEBHOOK_ID=<production_webhook_id>`
- [ ] Test with small real transaction (€0.01 test)
- [ ] Verify webhook signature verification works
- [ ] Setup monitoring alerts (failed payments, suspensions)

### Post-Launch

- [ ] Monitor first 100 subscriptions closely
- [ ] Setup retry logic for failed payments
- [ ] Implement email notifications (payment failed, subscription expiring)
- [ ] Create admin dashboard for subscription management
- [ ] Document common issues and resolutions

---

## 🔗 Resources

### Official Documentation
- [PayPal Subscriptions API](https://developer.paypal.com/docs/subscriptions/)
- [PayPal Webhooks](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
- [PayPal Node SDK](https://github.com/paypal/PayPal-node-SDK)

### Common Issues
- [Webhook Signature Verification](https://developer.paypal.com/api/rest/webhooks/#verify-signature)
- [Subscription States](https://developer.paypal.com/docs/subscriptions/manage-subscriptions/)
- [Sandbox Testing Guide](https://developer.paypal.com/docs/api-basics/sandbox/)

---

**Last Updated:** 2025-10-17
**Maintained By:** Sprint 5 Development Team
**Next Review:** Before Production Launch
