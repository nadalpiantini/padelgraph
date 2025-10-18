# PayPal Production Setup Guide - PadelGraph

**Status**: 🔄 In Progress
**Date**: 2025-10-17
**Goal**: Configure PayPal Business Account & Production Plans

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
