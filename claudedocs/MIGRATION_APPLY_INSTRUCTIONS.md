# PayPal Webhook Migration - Application Instructions

**Migration**: `20251017220000_06_paypal_webhook_events.sql`
**Status**: Ready to apply (connection issues with Supabase CLI)
**Date**: 2025-10-17

---

## 🚨 Current Issue

Supabase CLI experiencing connection refused errors:
```
failed to connect: dial tcp 3.148.140.216:6543: connect: connection refused
```

**Possible Causes**:
- Supabase project paused (unlikely - padelgraph is active ●)
- Network connectivity issue
- Supabase pooler temporary outage
- Firewall blocking connection

---

## ✅ 3 Methods to Apply Migration

### Method 1: Supabase CLI (Recommended when connection works)

```bash
cd /Users/nadalpiantini/Dev/Padelgraph
supabase db push
```

**Pros**: Official method, updates migration history
**Cons**: Not working due to connection refused

---

### Method 2: Custom TypeScript Script (NEW - Best Alternative)

```bash
# 1. Get database password from Supabase Dashboard
# Go to: https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/settings/database
# Copy the password

# 2. Run script with password
SUPABASE_DB_PASSWORD="your_password_here" npx tsx scripts/apply-paypal-migration.ts
```

**File**: `scripts/apply-paypal-migration.ts` (created)

**Features**:
- ✅ Direct connection to Supabase (bypasses CLI)
- ✅ Verification after application (table, indexes, policies, functions)
- ✅ Helpful error messages
- ✅ Handles "already exists" errors gracefully

**Pros**: Works when CLI fails, provides verification
**Cons**: Requires manual password entry

---

### Method 3: Supabase Dashboard SQL Editor (Manual)

```bash
# 1. Open Dashboard SQL Editor
https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/sql

# 2. Copy migration content
cat supabase/migrations/20251017220000_06_paypal_webhook_events.sql | pbcopy

# 3. Paste into SQL Editor and click "Run"
```

**Pros**: Always works, visual feedback
**Cons**: Manual process, doesn't update local migration history

---

## 🔍 Verification Queries (After Application)

Run these in SQL Editor or via script to verify:

```sql
-- 1. Check table exists
SELECT COUNT(*) FROM paypal_webhook_event;
-- Expected: 0 (empty table)

-- 2. Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'paypal_webhook_event';
-- Expected: 6 indexes

-- 3. Check RLS policies
SELECT policyname FROM pg_policies WHERE tablename = 'paypal_webhook_event';
-- Expected: 2 policies

-- 4. Check helper functions
SELECT proname FROM pg_proc
WHERE proname IN ('get_failed_webhook_count', 'get_webhook_stats');
-- Expected: 2 functions

-- 5. Test insert (should work)
INSERT INTO paypal_webhook_event (id, event_type, payload)
VALUES ('test_event_123', 'TEST.EVENT', '{"test": true}');
-- Expected: 1 row inserted

-- 6. Test idempotency (should fail with duplicate key)
INSERT INTO paypal_webhook_event (id, event_type, payload)
VALUES ('test_event_123', 'TEST.EVENT', '{"test": true}');
-- Expected: ERROR duplicate key (23505)

-- 7. Clean up test
DELETE FROM paypal_webhook_event WHERE id = 'test_event_123';
```

---

## 📋 Recommended Approach

**Option A: If you have Supabase password**:
```bash
# Best option - use custom script
SUPABASE_DB_PASSWORD="get_from_dashboard" npx tsx scripts/apply-paypal-migration.ts
```

**Option B: If connection issues persist**:
```bash
# Use Dashboard SQL Editor
# 1. Copy: cat supabase/migrations/20251017220000_06_paypal_webhook_events.sql | pbcopy
# 2. Go to: https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/sql
# 3. Paste and Run
```

**Option C: Wait for CLI to recover**:
```bash
# Keep trying every 15 minutes
supabase db push
```

---

## ⚠️ Impact if Migration Not Applied

**Webhook Still Works BUT**:
- ❌ No idempotency → duplicate webhooks will process twice
- ❌ No audit trail → can't debug webhook issues
- ❌ No monitoring → can't track failed webhooks
- ❌ INSERT errors in logs (table doesn't exist)

**Recommendation**: Apply ASAP before production PayPal testing

---

## 🎯 After Migration Applied

Update migration history (if using Method 2 or 3):
```bash
supabase migration repair --status applied 20251017220000
```

Then continue with development:
```bash
# Task #6: Usage Limits Middleware
touch src/lib/middleware/usage-limiter.ts
```

---

**Created**: 2025-10-17 23:59 UTC
**Last Updated**: 2025-10-17 23:59 UTC
