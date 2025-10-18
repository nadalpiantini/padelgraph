-- ============================================================================
-- SEED SOCIAL FEED WITH DEMO DATA
-- ============================================================================
-- Run this in Supabase SQL Editor (Production Database)
-- ============================================================================

-- STEP 1: Get test user ID
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get test user UUID
  SELECT id INTO test_user_id
  FROM auth.users
  WHERE email = 'test@padelgraph.com';

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Test user not found! Create user first with create-test-user.sql';
  END IF;

  RAISE NOTICE 'Using test user ID: %', test_user_id;

  -- STEP 2: Insert Demo Posts
  -- ============================================================================

  INSERT INTO post (user_id, content, visibility, media_urls, created_at) VALUES
    -- Post 1: Welcome (2 days ago)
    (test_user_id,
     '¡Bienvenido a PadelGraph! 🎾 La red social definitiva para jugadores de pádel. #padel #padelgraph',
     'public',
     ARRAY[]::TEXT[],
     NOW() - INTERVAL '2 days'),

    -- Post 2: Tournament win (1 day ago)
    (test_user_id,
     'Just won my first tournament! 🏆 So excited to be part of this amazing community. Thanks to all my opponents for the great matches! #tournament #victory',
     'public',
     ARRAY[]::TEXT[],
     NOW() - INTERVAL '1 day'),

    -- Post 3: Looking for players (12 hours ago)
    (test_user_id,
     'Looking for intermediate players in Miami this weekend 🌴 Who wants to play? Drop a comment! #miami #findpartner',
     'public',
     ARRAY[]::TEXT[],
     NOW() - INTERVAL '12 hours'),

    -- Post 4: Personal record (8 hours ago)
    (test_user_id,
     'New personal record: 15 match win streak! 💪 Feeling unstoppable. Time to move up to advanced level? 🤔 #winstreak #levelup',
     'public',
     ARRAY[]::TEXT[],
     NOW() - INTERVAL '8 hours'),

    -- Post 5: Sunset courts (5 hours ago)
    (test_user_id,
     'Beautiful sunset at the courts today 🌅 Love this sport! #padellife #sunset',
     'public',
     ARRAY[]::TEXT[],
     NOW() - INTERVAL '5 hours'),

    -- Post 6: Training tip (3 hours ago)
    (test_user_id,
     'Pro tip: Practice your bandeja for 30 minutes every day. Game changer! 🎯 What''s your favorite shot? #training #tips',
     'public',
     ARRAY[]::TEXT[],
     NOW() - INTERVAL '3 hours'),

    -- Post 7: Friend post (Friends only, 2 hours ago)
    (test_user_id,
     'Private match tonight with the crew 🤝 Can''t wait!',
     'friends',
     ARRAY[]::TEXT[],
     NOW() - INTERVAL '2 hours'),

    -- Post 8: Recent match (1 hour ago)
    (test_user_id,
     'Just finished an intense match! 6-4, 4-6, 7-5 in the tiebreak 😅 My heart can''t take this anymore lol #closematch #adrenaline',
     'public',
     ARRAY[]::TEXT[],
     NOW() - INTERVAL '1 hour'),

    -- Post 9: Equipment question (30 min ago)
    (test_user_id,
     'Thinking about upgrading my racket. Any recommendations for intermediate players? 🎾 #equipment #advice',
     'public',
     ARRAY[]::TEXT[],
     NOW() - INTERVAL '30 minutes'),

    -- Post 10: Most recent (10 min ago)
    (test_user_id,
     'Can''t believe how much I''ve improved since joining PadelGraph! 📈 The analytics really help you understand your game better. Highly recommend! #progress #analytics',
     'public',
     ARRAY[]::TEXT[],
     NOW() - INTERVAL '10 minutes');

  RAISE NOTICE 'Inserted 10 demo posts';

  -- STEP 3: Add Some Likes to Posts
  -- ============================================================================

  -- Like posts 1, 2, 4, 5, 8, 10 (simulate engagement)
  INSERT INTO post_like (post_id, user_id)
  SELECT p.id, test_user_id
  FROM post p
  WHERE p.user_id = test_user_id
  AND p.content LIKE ANY (ARRAY[
    '%Bienvenido%',
    '%won my first tournament%',
    '%win streak%',
    '%sunset%',
    '%intense match%',
    '%much I''ve improved%'
  ])
  ON CONFLICT (post_id, user_id) DO NOTHING;

  RAISE NOTICE 'Added likes to popular posts';

  -- STEP 4: Add Some Comments
  -- ============================================================================

  -- Comment on "Looking for players" post
  INSERT INTO post_comment (post_id, user_id, content)
  SELECT
    p.id,
    test_user_id,
    'I might be available Saturday morning! What time?'
  FROM post p
  WHERE p.user_id = test_user_id
  AND p.content LIKE '%Looking for intermediate players%'
  LIMIT 1;

  -- Comment on "Equipment" post
  INSERT INTO post_comment (post_id, user_id, content)
  SELECT
    p.id,
    test_user_id,
    'I use the Bullpadel Vertex 03. Great control for intermediate level!'
  FROM post p
  WHERE p.user_id = test_user_id
  AND p.content LIKE '%upgrading my racket%'
  LIMIT 1;

  RAISE NOTICE 'Added demo comments';

  -- STEP 5: Update post counts (triggers should handle this, but just in case)
  -- ============================================================================

  UPDATE post p
  SET
    likes_count = (SELECT COUNT(*) FROM post_like WHERE post_id = p.id),
    comments_count = (SELECT COUNT(*) FROM post_comment WHERE post_id = p.id)
  WHERE p.user_id = test_user_id;

  RAISE NOTICE 'Updated post counts';

  RAISE NOTICE '✅ Social Feed seeded successfully!';
  RAISE NOTICE 'Created 10 posts with engagement data';

END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check created posts
SELECT
  p.id,
  LEFT(p.content, 50) as content_preview,
  p.visibility,
  p.likes_count,
  p.comments_count,
  p.created_at,
  u.username as author
FROM post p
JOIN user_profile u ON u.user_id = p.user_id
WHERE u.email = 'test@padelgraph.com'
ORDER BY p.created_at DESC;

-- Expected: 10 posts with varying timestamps and engagement

-- ============================================================================
-- CLEANUP (if needed)
-- ============================================================================

-- To remove all test posts:
-- DELETE FROM post WHERE user_id = (
--   SELECT id FROM auth.users WHERE email = 'test@padelgraph.com'
-- );
