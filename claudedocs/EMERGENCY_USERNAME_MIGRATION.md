# 🚨 EMERGENCY: Username Column Migration

## 🔴 CRITICAL ISSUE

**Problem**: 22 API endpoints + 8 components reference `user_profile.username` column that **DOES NOT EXIST** in database

**Impact**:
- ❌ POST /api/feed → 500 error (post creation broken)
- ❌ /api/analytics/leaderboard → 500 error
- ❌ /api/discover/* endpoints → failing
- ❌ /api/comments/* → failing
- ❌ 20+ other endpoints affected

**Root Cause**: Schema mismatch - code expects `username`, DB only has `name`

---

## ✅ SOLUTION: Add username Column

**Migration File**: `supabase/migrations/026_add_username_column.sql`

**Strategy**:
1. Add `username` column (nullable)
2. Populate from existing data (`name` → username or generate from `email`)
3. Make NOT NULL + add constraints
4. Create index for performance

---

## 📋 APPLICATION STEPS

### Option A: Supabase Dashboard (RECOMMENDED - 2 minutes)

1. **Open Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard
   - Select project: **Padelgraph**

2. **Navigate to SQL Editor**:
   - Click "SQL Editor" in left sidebar
   - Click "+ New Query"

3. **Copy Migration**:
   ```bash
   # In your terminal
   cat supabase/migrations/026_add_username_column.sql
   ```

4. **Paste & Execute**:
   - Paste entire SQL content into editor
   - Click "Run" button (or Cmd+Enter)
   - Wait for success confirmation

5. **Verify**:
   ```sql
   -- Check column exists
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'user_profile'
     AND column_name = 'username';

   -- Check data populated
   SELECT COUNT(*) as total_users,
          COUNT(username) as users_with_username
   FROM user_profile;

   -- Sample usernames
   SELECT id, email, name, username
   FROM user_profile
   LIMIT 10;
   ```

---

### Option B: Local Supabase CLI (if running locally)

```bash
# Apply migration
supabase migration up

# Or reset database (CAUTION: only in local dev)
supabase db reset
```

---

### Option C: psql Command Line

```bash
# Connect to production database
psql "$DATABASE_URL"

# Copy-paste migration content
\i supabase/migrations/026_add_username_column.sql

# Verify
SELECT COUNT(*) FROM user_profile WHERE username IS NOT NULL;
```

---

## 🔍 VERIFICATION CHECKLIST

After applying migration:

### Database Checks
```sql
-- ✅ Column exists with correct type
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'user_profile' AND column_name = 'username';
-- Expected: username | text | 30

-- ✅ All users have username
SELECT COUNT(*) as missing_username
FROM user_profile
WHERE username IS NULL;
-- Expected: 0

-- ✅ All usernames are unique
SELECT username, COUNT(*)
FROM user_profile
GROUP BY username
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- ✅ Usernames follow format rules
SELECT COUNT(*) as invalid_usernames
FROM user_profile
WHERE username !~ '^[a-z0-9_]+$'
   OR LENGTH(username) < 3
   OR LENGTH(username) > 30;
-- Expected: 0

-- ✅ Index exists
SELECT indexname
FROM pg_indexes
WHERE tablename = 'user_profile'
  AND indexname = 'idx_user_profile_username';
-- Expected: idx_user_profile_username
```

### API Endpoint Tests

**Test 1: POST /api/feed** (previously failing)
```bash
curl -X POST https://padelgraph.vercel.app/api/feed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content": "Test post after migration"}'

# Expected: 201 Created with post object containing author.username
```

**Test 2: GET /api/analytics/leaderboard** (previously failing)
```bash
curl https://padelgraph.vercel.app/api/analytics/leaderboard?type=elo_rating

# Expected: 200 OK with rankings array containing username field
```

**Test 3: GET /api/discover/people**
```bash
curl https://padelgraph.vercel.app/api/discover/people

# Expected: 200 OK with users array containing username field
```

---

## 📊 MIGRATION DETAILS

**What it does**:

1. **Adds Column**:
   ```sql
   username TEXT NOT NULL UNIQUE
   ```

2. **Population Logic**:
   - If `name` exists, valid, and unique → use it (sanitized)
   - Otherwise → generate from `email` (e.g., `john.doe@example.com` → `johndoe`)
   - Handles collisions by appending numbers (`johndoe`, `johndoe1`, `johndoe2`)

3. **Constraints**:
   - NOT NULL
   - UNIQUE
   - Length: 3-30 characters
   - Format: lowercase alphanumeric + underscore only (`^[a-z0-9_]+$`)

4. **Index**: B-tree index for fast lookups

---

## 🎯 EXPECTED RESULTS

**Before Migration**:
```
user_profile columns:
✅ id, email, name, level, avatar_url, bio, ...
❌ username (missing)
```

**After Migration**:
```
user_profile columns:
✅ id, email, name, username, level, avatar_url, bio, ...

Sample data:
id    | email              | name        | username
------|-------------------|-------------|----------
uuid1 | john@example.com  | John Doe    | johndoe
uuid2 | jane@example.com  | Jane Smith  | janesmith
uuid3 | bob@test.com      | NULL        | bob
```

---

## ⏱️ EXECUTION TIME

- **Small DB** (<100 users): ~1-2 seconds
- **Medium DB** (100-1000 users): ~2-5 seconds
- **Large DB** (1000+ users): ~5-10 seconds

**Zero Downtime**: Migration is safe to run on live production database

---

## 🔄 ROLLBACK (if needed)

```sql
-- Remove column (CAUTION: irreversible)
ALTER TABLE user_profile DROP COLUMN IF EXISTS username;

-- Drop function
DROP FUNCTION IF EXISTS generate_username_from_email(TEXT);
```

---

## 🚀 POST-MIGRATION DEPLOYMENT

After applying migration to database:

```bash
# No code changes needed - just redeploy to clear cache
git add supabase/migrations/026_add_username_column.sql
git commit -m "feat(db): add username column to user_profile

Emergency migration to fix 22 API endpoints failing due to missing
username column in database schema.

- Add username column with constraints
- Populate from name or generate from email
- Add unique index for performance
- All existing users automatically assigned username

Fixes: POST /api/feed, leaderboard, discover, and 20+ endpoints"

git push origin main
```

Vercel will auto-deploy and endpoints will work immediately.

---

## 📝 AFFECTED ENDPOINTS (Fixed by this migration)

### API Routes (22):
- ✅ POST /api/feed
- ✅ GET /api/analytics/leaderboard
- ✅ /api/comments/*
- ✅ /api/discover/* (posts, people, search, trending)
- ✅ /api/follow
- ✅ /api/graph/nodes
- ✅ /api/stories/*
- ✅ /api/users/[id]/posts
- ✅ /api/notifications
- ✅ /api/share

### Components (8):
- ✅ CommentThread
- ✅ DashboardNavigation
- ✅ PostCard
- ✅ SocialFeed
- ✅ CreatePost
- ✅ AvatarUpload
- ✅ LeaderboardTable
- ✅ LeaderboardWidget

---

## 🎊 SUCCESS CRITERIA

Migration is successful when:

1. ✅ SQL executes without errors
2. ✅ All users have non-null username
3. ✅ All usernames are unique
4. ✅ POST /api/feed returns 201 (not 500)
5. ✅ Leaderboard endpoint returns data
6. ✅ No "column username does not exist" errors in logs

---

## 🆘 TROUBLESHOOTING

**Issue**: Migration fails with "duplicate key violation"
```sql
-- Find duplicates
SELECT username, COUNT(*)
FROM user_profile
WHERE username IS NOT NULL
GROUP BY username
HAVING COUNT(*) > 1;

-- Solution: Drop username column and retry
ALTER TABLE user_profile DROP COLUMN username;
-- Then re-run full migration
```

**Issue**: "column already exists"
```sql
-- Check if partially applied
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_profile' AND column_name = 'username';

-- If exists but incomplete, drop and retry
ALTER TABLE user_profile DROP COLUMN username CASCADE;
```

**Issue**: Invalid usernames after population
```sql
-- Check invalid
SELECT id, email, username
FROM user_profile
WHERE username !~ '^[a-z0-9_]+$';

-- Fix manually
UPDATE user_profile
SET username = generate_username_from_email(email)
WHERE username !~ '^[a-z0-9_]+$';
```

---

## 📞 SUPPORT

If issues persist after migration:
1. Check Supabase logs for SQL errors
2. Verify all constraints applied correctly
3. Test endpoints with valid auth token
4. Check Vercel deployment logs

---

**Status**: 🔴 URGENT - Apply ASAP to restore service
**Priority**: P0 - Critical production outage
**ETA**: 2-5 minutes to apply
**Risk**: Low - safe additive migration with data population
