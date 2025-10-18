# 🔍 DEBUG: Feed Not Working in Production

## Issue Summary
- Posts can be created (POST returns 201)
- Posts don't appear in feed (GET returns empty or filtered out)
- Migration applied but issue persists

---

## Diagnostic Checklist

### ✅ Step 1: Verify Migration Applied in Production

**Go to Supabase Dashboard** → SQL Editor → Run:

```sql
-- Check if username column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profile'
  AND column_name = 'username';

-- Expected result: username | text | NO
```

**If returns 0 rows**: Migration NOT applied in production
- Go back to `claudedocs/EMERGENCY_USERNAME_MIGRATION.md`
- Apply migration 026_add_username_column.sql
- Then proceed

**If returns 1 row**: ✅ Migration applied, continue to Step 2

---

### ✅ Step 2: Check if Posts Exist in Database

```sql
-- Count posts
SELECT COUNT(*) as total_posts FROM post;

-- Show recent posts
SELECT
  id,
  user_id,
  content,
  visibility,
  created_at,
  (SELECT username FROM user_profile WHERE id = post.user_id) as author_username
FROM post
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: Should show posts created recently

**If 0 posts**: Posts aren't being created despite 201 response
- Check if there's a trigger or RLS blocking INSERTs silently

**If posts exist**: Continue to Step 3

---

### ✅ Step 3: Check RLS Policies on Post Table

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'post';

-- List all policies on post table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'post';
```

**Check for these policies**:
- ✅ "Public posts are readable by all" - FOR SELECT - visibility = 'public'
- ✅ "Users can read own posts" - FOR SELECT - auth.uid() = user_id
- ✅ "Authenticated users can create posts" - FOR INSERT

**If missing or incorrect**: See "Fix RLS Policies" section below

---

### ✅ Step 4: Test Query Directly in Database

```sql
-- Simulate the API query (replace USER_ID with actual user ID)
SELECT
  p.*,
  up.id as author_id,
  up.name as author_name,
  up.username as author_username,
  up.avatar_url as author_avatar
FROM post p
LEFT JOIN user_profile up ON up.id = p.user_id
WHERE p.visibility = 'public'
   OR p.user_id = 'YOUR_USER_ID_HERE'
ORDER BY p.created_at DESC
LIMIT 10;
```

**Expected**: Should return posts with author info

**If returns 0 rows despite posts existing**:
- RLS policies are blocking the query
- User is not authenticated correctly
- Visibility filter too restrictive

---

### ✅ Step 5: Test API Endpoint with Auth

**Browser Console** (while logged in):

```javascript
// Test GET /api/feed
fetch('/api/feed?limit=10')
  .then(r => r.json())
  .then(data => {
    console.log('Feed API Response:', data);
    console.log('Posts count:', data.posts?.length || 0);
    if (data.posts?.length > 0) {
      console.log('First post:', data.posts[0]);
    }
  });
```

**Expected Response**:
```json
{
  "data": {
    "posts": [
      {
        "id": "...",
        "content": "...",
        "author": {
          "id": "...",
          "name": "...",
          "username": "...",
          "avatar_url": "..."
        }
      }
    ],
    "nextCursor": null,
    "hasMore": false
  }
}
```

**If `posts: []`**: Check Vercel logs for query errors

---

## Common Issues & Fixes

### Issue A: Migration Not Applied

**Symptom**: Column username doesn't exist in production DB

**Fix**:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy content from `supabase/migrations/026_add_username_column.sql`
4. Paste and execute
5. Verify with: `SELECT username FROM user_profile LIMIT 1;`

---

### Issue B: RLS Policies Too Restrictive

**Symptom**: Posts exist in DB but API returns empty array

**Fix - Temporarily disable RLS for testing**:
```sql
-- TEMPORARY: Disable RLS on post table (ONLY FOR DEBUGGING)
ALTER TABLE post DISABLE ROW LEVEL SECURITY;

-- Test if feed now works
-- If it works, RLS policies are the problem

-- Re-enable RLS
ALTER TABLE post ENABLE ROW LEVEL SECURITY;
```

**Then fix policies**:
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Public posts are readable by all" ON post;
DROP POLICY IF EXISTS "Users can read own posts" ON post;

-- Create corrected policies
CREATE POLICY "Public posts are readable by all"
  ON post
  FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can read own posts"
  ON post
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

### Issue C: Auth Context Not Passing

**Symptom**: `auth.uid()` returns NULL in RLS policies

**Test in SQL Editor**:
```sql
-- Check if auth context works
SELECT auth.uid() as current_user_id;
```

**If returns NULL**:
- You're running query in SQL Editor (no auth context)
- This is normal for SQL Editor
- Test must be done via API with browser logged in

---

### Issue D: Posts Created with Wrong Visibility

**Symptom**: Posts created but visibility != 'public'

**Check**:
```sql
SELECT visibility, COUNT(*)
FROM post
GROUP BY visibility;
```

**Fix if needed**:
```sql
-- Update existing posts to public
UPDATE post
SET visibility = 'public'
WHERE visibility IS NULL OR visibility = 'private';
```

---

## Quick Fix: Create Test Post Directly in DB

```sql
-- Get your user_id first
SELECT id, email, username FROM user_profile WHERE email = 'your-email@example.com';

-- Create test post with that user_id
INSERT INTO post (user_id, content, visibility)
VALUES (
  'YOUR_USER_ID_HERE',
  'Test post created directly in DB - should appear in feed',
  'public'
);

-- Verify it was created
SELECT * FROM post ORDER BY created_at DESC LIMIT 1;
```

Then refresh feed in browser - if this post appears, the issue is with POST endpoint, not GET.

---

## Debug Logs Location

**Vercel Logs**:
1. Go to: https://vercel.com/nadalpiantinis-projects/padelgraph
2. Click on latest deployment
3. Go to "Logs" tab
4. Filter by "feed"
5. Look for `[Feed API]` messages

**Expected logs after creating post**:
```
[Feed API] Post created successfully: { post_id: '...', user_id: '...', visibility: 'public' }
```

**Expected logs after loading feed**:
```
[Feed API] Query result: { user_id: '...', postsCount: 1, filters: {...} }
```

---

## Emergency Workaround: Bypass RLS Temporarily

**⚠️ ONLY FOR DEBUGGING - NOT FOR PRODUCTION**

```sql
-- Create a function that bypasses RLS
CREATE OR REPLACE FUNCTION get_all_posts_debug()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  visibility text,
  created_at timestamptz,
  author_name text,
  author_username text
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.content,
    p.visibility,
    p.created_at,
    up.name as author_name,
    up.username as author_username
  FROM post p
  LEFT JOIN user_profile up ON up.id = p.user_id
  ORDER BY p.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Test it
SELECT * FROM get_all_posts_debug();
```

This should return ALL posts regardless of RLS. If this works but feed doesn't, RLS is the issue.

---

## Next Steps After Diagnosis

Based on the diagnostic results, share with developer:
1. Migration status (applied/not applied)
2. Posts count in database
3. RLS policies status
4. API response from browser console
5. Any error messages from Vercel logs

Then appropriate fix can be deployed.
