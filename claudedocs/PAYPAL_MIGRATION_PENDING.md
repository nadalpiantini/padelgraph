# PayPal Webhook Migration - Pending Application

**Status**: Migration Ready, Pending Application to Supabase
**Date**: 2025-10-17
**Migration File**: `supabase/migrations/20251017220000_06_paypal_webhook_events.sql`

## Issue

Supabase connection unstable (connection refused errors). Migration is ready but cannot be applied due to network/Supabase connectivity issues.

## Migration Purpose

Creates `paypal_webhook_event` table for:
- **Idempotency**: Prevents duplicate webhook processing using PayPal event.id as PRIMARY KEY
- **Audit Trail**: Logs all webhook events with full payload and headers
- **Troubleshooting**: Stores processing status, errors, and verification results
- **Monitoring**: Helper functions for failed event count and webhook stats

## Manual Application Instructions

When Supabase connection is restored, apply migration using one of these methods:

### Method 1: Supabase CLI (Recommended)
```bash
cd /Users/nadalpiantini/Dev/Padelgraph
supabase db push
```

### Method 2: Direct psql (if CLI fails)
```bash
psql "postgresql://postgres.kqftsiohgdzlyfqbhxbc:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20251017220000_06_paypal_webhook_events.sql
```

### Method 3: Supabase Dashboard SQL Editor
1. Go to https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/sql
2. Copy contents of `supabase/migrations/20251017220000_06_paypal_webhook_events.sql`
3. Paste and execute

## Verification After Application

```sql
-- Check table created
SELECT COUNT(*) FROM paypal_webhook_event;

-- Check indexes created
SELECT indexname FROM pg_indexes WHERE tablename = 'paypal_webhook_event';

-- Check RLS policies
SELECT policyname FROM pg_policies WHERE tablename = 'paypal_webhook_event';

-- Check helper functions
SELECT proname FROM pg_proc WHERE proname IN ('get_failed_webhook_count', 'get_webhook_stats');
```

Expected output:
- Table: 0 rows (empty)
- Indexes: 6 indexes
- Policies: 2 policies (Service role full access, Admins can view)
- Functions: 2 functions

## Dependencies

**Code Dependencies** (Already Implemented):
- ✅ Webhook handler uses `paypal_webhook_event` table (src/app/api/paypal/webhook/route.ts)
- ✅ Idempotency check on event.id
- ✅ Status tracking (received → processing → processed/failed)
- ✅ Email notifications integrated

**Code Works Without Migration** (Degraded Mode):
- Webhook will log errors about missing table
- No idempotency protection (duplicate events may process twice)
- No audit trail
- Core functionality still works (signature verification, event handling)

## Related Files

**Migration**:
- `supabase/migrations/20251017220000_06_paypal_webhook_events.sql`

**Code Using This Table**:
- `src/app/api/paypal/webhook/route.ts` (lines 52-110, 152-175)

**Helper Services**:
- `src/lib/services/paypal-client.ts`
- `src/lib/email-templates/paypal-notifications.ts`

## Retry Commands (When Connection Restored)

```bash
# 1. Check connection
supabase migration list

# 2. If list works, push
supabase db push

# 3. If push fails, try direct migration
supabase db push --include-all

# 4. If still fails, use psql method or dashboard
```

## Impact if Not Applied

**High Priority** (Should apply ASAP):
- ❌ No idempotency protection → duplicate events may be processed twice
- ❌ No audit trail → cannot troubleshoot webhook issues
- ❌ No monitoring → cannot track failed webhooks
- ⚠️ Webhook handler will log errors about missing table

**Low Risk**:
- ✅ Webhook signature verification still works
- ✅ Event handling still works
- ✅ Emails still send
- ✅ Database updates still work

**Recommendation**: Apply migration before production deployment to PayPal Production mode.

---

**Last Connection Attempt**: 2025-10-17 23:21 UTC
**Error**: `connection refused` from aws-1-us-east-2.pooler.supabase.com:6543

**Next Steps**:
1. Wait for Supabase connection to stabilize (may be temporary outage)
2. Retry migration push
3. If connection issues persist >24h, use Dashboard SQL Editor method
4. Once applied, verify table creation with SQL queries above
