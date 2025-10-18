# 🚨 URGENT DATABASE FIX - org_member RLS Recursion

## Problem
Feed API is failing with error:
```
"infinite recursion detected in policy for relation org_member"
```

## Root Cause
The `org_member` table has RLS enabled but no policies defined, causing recursion when joining with `user_profile` in feed queries.

## Solution
Migration `024_fix_org_member_rls_recursion.sql` disables RLS on org_member temporarily.

## How to Apply (Choose ONE method)

### Method 1: Supabase Dashboard (FASTEST - 30 seconds)
1. Go to: https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/sql/new
2. Paste this SQL:
   ```sql
   ALTER TABLE org_member DISABLE ROW LEVEL SECURITY;
   ```
3. Click "Run"
4. Verify feed loads correctly

### Method 2: Run Migration Script (5 minutes)
```bash
# In project root
npm run tsx scripts/apply-migrations-supabase.ts
```

### Method 3: Supabase CLI (if available)
```bash
supabase db push
```

## Verification
After applying, test:
1. Visit https://padelgraph.com
2. Check browser console - should see NO org_member errors
3. Feed should load posts correctly

## Why This is Safe
- org_member is not used in production yet
- Organization features are pending implementation
- User data remains protected by user_profile RLS policies
- Feed API doesn't directly query org_member

## Next Steps (After Feed is Fixed)
1. Review org_member table design
2. Implement proper RLS policies without recursion
3. Use security definer functions if needed
4. Re-enable RLS with tested policies

## Files Changed
- `supabase/migrations/024_fix_org_member_rls_recursion.sql` - Migration file
- `scripts/apply-migrations-supabase.ts` - Added 024 to migration list
- `public/manifest.json` - Fixed missing PWA icons

---
**Priority**: CRITICAL - Feed is broken in production
**Time to Fix**: 30 seconds (Method 1)
**Risk**: LOW (org_member not in active use)
