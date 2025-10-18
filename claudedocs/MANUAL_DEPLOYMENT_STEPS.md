# Manual Deployment Steps - Social Feed Enterprise

**Status**: Code deployed to Vercel ✅
**Remaining**: Database migrations (manual via Supabase Dashboard)

---

## ⚠️ CRITICAL: Apply Database Migrations

These migrations MUST be applied before the new features will work.

### Step 1: Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/sql/new

### Step 2: Execute Migrations in Order

**Migration 1: `020_social_feed_enterprise.sql`**
```bash
# Location: supabase/migrations/020_social_feed_enterprise.sql
# What it does:
# - Adds parent_id to post_comment (threading)
# - Adds likes_count to post_comment
# - Creates comment_like table
# - Creates follow table with follower/following counts
# - Creates hashtag + post_hashtag tables
# - Creates mention table
# - Creates notification table (7 types)
# - Creates story, story_media, story_view tables
# - Creates graph_edge table for Six Degrees
# - Creates mv_trending_hashtags materialized view
# - Adds triggers for count updates
```

**Steps**:
1. Copy entire content of `020_social_feed_enterprise.sql`
2. Paste into Supabase SQL Editor
3. Click "Run" (green play button)
4. Verify: Should see "Success. No rows returned"

---

**Migration 2: `021_social_feed_rls.sql`**
```bash
# Location: supabase/migrations/021_social_feed_rls.sql
# What it does:
# - Enables RLS on all new tables
# - Creates security policies for:
#   - comment_like (read all, write own)
#   - follow (read all, write own)
#   - hashtag (read all, write authenticated)
#   - post_hashtag (read all, write for own posts)
#   - mention (read relevant, write for own content)
#   - notification (read own, write any, update/delete own)
#   - story (read active, write own)
#   - story_media (read accessible, write for own stories)
#   - story_view (read own/story owner, write own)
#   - Updates post_comment policies for visibility
```

**Steps**:
1. Copy entire content of `021_social_feed_rls.sql`
2. Paste into Supabase SQL Editor
3. Click "Run"
4. Verify: Should see policies created

---

**Migration 3: `022_storage_media_bucket.sql`**
```bash
# Location: supabase/migrations/022_storage_media_bucket.sql
# What it does:
# - Creates 'media' storage bucket (private, 50MB limit)
# - Sets allowed MIME types (images + videos)
# - Creates RLS policies for storage.objects
# - Adds helper functions for media paths
```

**Steps**:
1. Copy entire content of `022_storage_media_bucket.sql`
2. Paste into Supabase SQL Editor
3. Click "Run"
4. Note: May show permission errors for storage policies (ignore if bucket already exists)

**Manual Bucket Creation (if needed)**:
1. Go to Storage → Buckets
2. Click "New bucket"
3. Name: `media`
4. Public: ❌ No (private)
5. File size limit: 52428800 (50MB)
6. Allowed MIME types: `image/*`, `video/mp4`, `video/mpeg`, `video/quicktime`, `video/webm`
7. Click "Create bucket"

---

**Migration 4: `023_rpc_functions.sql`**
```bash
# Location: supabase/migrations/023_rpc_functions.sql
# What it does:
# - Creates padelgraph_trending_posts() RPC
# - Creates padelgraph_people_you_may_play() RPC
# - Creates padelgraph_shortest_path() RPC (BFS algorithm)
# - Creates padelgraph_profile_counts() RPC
# - Enables earthdistance extension for geo proximity
```

**Steps**:
1. Copy entire content of `023_rpc_functions.sql`
2. Paste into Supabase SQL Editor
3. Click "Run"
4. Verify: Should see functions created

---

## Step 3: Configure Storage CORS

**In Supabase Dashboard** → Storage → Configuration → CORS

Add these allowed origins:
```
http://localhost:3000
https://padelgraph.com
https://*.vercel.app
```

Allowed methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

Allowed headers:
```
authorization, x-client-info, apikey, content-type, cache-control, x-requested-with
```

Max age: `3600`

---

## Step 4: Verify Deployment

### Check Vercel Dashboard
1. Go to: https://vercel.com/nadalpiantini-fcbc2d66/padelgraph
2. Verify latest deployment is "Ready"
3. Check build logs for any errors

### Test Production Features

**Critical Flows to Test**:

1. **Comments Threading**:
   - Go to https://padelgraph.com/dashboard
   - Click "Comment" on any post
   - Add a comment
   - Verify it appears instantly
   - Click "Reply" on a comment
   - Verify nested reply works

2. **Media Upload**:
   - Click "Media" in composer
   - Upload an image (< 5MB)
   - Verify upload progress
   - Publish post
   - Verify image displays

3. **Follow System**:
   - Navigate to another user's profile
   - Click "Follow"
   - Verify button changes to "Following"
   - Check notifications (bell icon)
   - Verify follow notification appears

4. **Notifications Real-time**:
   - Open 2 browser tabs (Tab A: your account, Tab B: test account)
   - Tab B: Like a post from Tab A user
   - Tab A: Verify notification badge updates instantly (without refresh)

5. **Six Degrees Graph**:
   - Go to dashboard
   - Scroll to Six Degrees section
   - Select 2 different players
   - Verify shortest path displays
   - Click "Invite to Play"

6. **Discover/Trending**:
   - Go to /explore
   - Verify trending posts appear
   - Check trending hashtags sidebar
   - Verify "Who to play with?" suggestions

---

## Step 5: Seed Graph Data (Optional)

For Six Degrees to work with real data, seed the `graph_edge` table:

```sql
-- Create edges from match participants (teammates)
INSERT INTO graph_edge (src, dst, kind)
SELECT DISTINCT
  mp1.user_id, mp2.user_id, 'teammate'
FROM match_participant mp1
JOIN match_participant mp2
  ON mp1.match_id = mp2.match_id
  AND mp1.team = mp2.team
  AND mp1.user_id < mp2.user_id  -- Avoid duplicates
ON CONFLICT DO NOTHING;

-- Create edges from match participants (opponents)
INSERT INTO graph_edge (src, dst, kind)
SELECT DISTINCT
  mp1.user_id, mp2.user_id, 'opponent'
FROM match_participant mp1
JOIN match_participant mp2
  ON mp1.match_id = mp2.match_id
  AND mp1.team != mp2.team
  AND mp1.user_id < mp2.user_id
ON CONFLICT DO NOTHING;

-- Note: Bidirectional edges are created automatically by trigger
```

---

## Step 6: Set Up Cron Jobs (Optional)

**Recommended Cron Jobs**:

### A) Refresh Trending Hashtags (Every 30 minutes)
Create Supabase Edge Function or external cron:
```sql
SELECT refresh_trending_hashtags();
```

### B) Delete Expired Stories (Every hour)
```sql
DELETE FROM story WHERE expires_at < NOW();
```

**Implementation Options**:
1. **Supabase Edge Functions** (cron trigger)
2. **Vercel Cron Jobs** (create `/api/cron/refresh-trending`, `/api/cron/cleanup-stories`)
3. **External service** (cron-job.org, EasyCron)

---

## 🐛 Troubleshooting

### Issue: Media upload fails

**Symptoms**: "Failed to upload media" error

**Fix**:
1. Verify 'media' bucket exists in Storage
2. Check CORS configuration
3. Verify RLS policies on storage.objects
4. Check browser console for CORS errors

**Test signed URL**:
```bash
curl -X POST https://padelgraph.com/api/media/sign \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","content_type":"image/jpeg","file_size":1000000}'
```

### Issue: Comments don't appear

**Symptoms**: Comment submitted but doesn't show

**Fix**:
1. Verify migration 020 was applied (check if `parent_id` column exists in `post_comment`)
2. Check RLS policies (migration 021)
3. Verify Realtime is working (check browser console for websocket connection)

**Test comment API**:
```bash
curl -X POST https://padelgraph.com/api/comments \
  -H "Content-Type: application/json" \
  -d '{"post_id":"POST-UUID","content":"test comment"}'
```

### Issue: Six Degrees graph is empty

**Symptoms**: Graph shows "Loading..." or empty

**Fix**:
1. Seed graph data (see Step 5 above)
2. Verify migration 023 was applied (check if `graph_edge` table exists)
3. Check `/api/graph/nodes` returns data

### Issue: Notifications don't update in real-time

**Symptoms**: Notifications only appear after page refresh

**Fix**:
1. Verify migration 020 created `notification` table
2. Check Supabase Realtime is enabled in dashboard
3. Verify no browser console errors for websocket
4. Check notification insertion happens (via SQL or API)

---

## 📊 Deployment Summary

**Deployment Method**: Git push → Vercel auto-deploy
**Commit**: `7276cfe` - "feat: social feed enterprise - complete Instagram-level implementation"
**Files Changed**: 60 files (+9,046 lines)
**Build Time**: ~10s (Next.js 15 Turbopack)
**TypeScript**: ✅ 0 critical errors

**What's Deployed**:
- ✅ 20+ new API endpoints
- ✅ 15+ React components
- ✅ 4 database migrations (need manual application)
- ✅ E2E test suite
- ✅ Full i18n (EN/ES)

**What's Pending**:
- ⏳ Apply database migrations via Supabase Dashboard
- ⏳ Configure Storage CORS
- ⏳ Seed graph data (optional)
- ⏳ Set up cron jobs (optional)

---

## 🎉 Success Criteria

Once migrations are applied, you should have:

✅ **Comments Threading**:
- Nested replies (unlimited depth)
- Like comments
- Real-time updates
- Delete own comments

✅ **Media Upload**:
- Drag & drop images/videos
- Multiple files per post (max 10)
- Size validation (5MB images, 50MB videos)
- Progress indicators
- Supabase Storage integration

✅ **Social Features**:
- Follow/Unfollow users
- Share posts to feed
- Real-time notifications (7 types)
- Notification badge (unread count)

✅ **Stories**:
- 24-hour expiration
- Multiple media per story
- View tracking
- Auto-cleanup (via cron)

✅ **Discover**:
- Trending posts (engagement score)
- Trending hashtags (last 7 days)
- Suggested people (friend-of-friends + proximity)
- Search (posts/users/hashtags)

✅ **Six Degrees**:
- Interactive force graph
- Shortest path visualization
- Click to select players
- Invite to play integration

---

## 📞 Support

**Documentation**: `claudedocs/SOCIAL_FEED_ENTERPRISE_IMPLEMENTATION.md`
**Test Suite**: `tests/e2e/flows/social-feed-enterprise.spec.ts`
**Migration Files**: `supabase/migrations/020-023_*.sql`

**Quick Start After Migrations**:
1. Visit https://padelgraph.com
2. Login with test account
3. Test each feature systematically
4. Monitor Vercel logs for errors
5. Check Supabase logs for RLS issues

🚀 **Your social feed is now Instagram-level!**
