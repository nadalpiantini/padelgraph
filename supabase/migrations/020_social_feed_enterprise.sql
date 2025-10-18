-- ============================================================================
-- SOCIAL FEED ENTERPRISE MIGRATION
-- ============================================================================
-- Features: Comments Threading, Comment Likes, Follow System, Hashtags,
--           Mentions, Notifications, Stories (24h), Trending
-- ============================================================================

-- ============================================================================
-- 1. EXTEND POST_COMMENT FOR THREADING
-- ============================================================================

-- Add parent_id for comment threading (replies)
ALTER TABLE post_comment
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES post_comment(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0 CHECK (likes_count >= 0);

-- Index for finding replies
CREATE INDEX IF NOT EXISTS idx_post_comment_parent_id ON post_comment(parent_id);

-- ============================================================================
-- 2. COMMENT LIKES
-- ============================================================================

CREATE TABLE IF NOT EXISTS comment_like (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comment(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_like_comment_id ON comment_like(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_like_user_id ON comment_like(user_id);

-- Trigger to update comment likes_count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post_comment SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_comment SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comment_like_count_trigger ON comment_like;

CREATE TRIGGER comment_like_count_trigger
  AFTER INSERT OR DELETE ON comment_like
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_likes_count();

-- ============================================================================
-- 3. FOLLOW SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS follow (
  follower_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id) -- Prevent self-follow
);

CREATE INDEX IF NOT EXISTS idx_follow_follower ON follow(follower_id);
CREATE INDEX IF NOT EXISTS idx_follow_following ON follow(following_id);

-- Add follower/following counts to user_profile
ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS followers_count INT DEFAULT 0 CHECK (followers_count >= 0),
ADD COLUMN IF NOT EXISTS following_count INT DEFAULT 0 CHECK (following_count >= 0);

-- Trigger to update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profile SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE user_profile SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_profile SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    UPDATE user_profile SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS follow_count_trigger ON follow;

CREATE TRIGGER follow_count_trigger
  AFTER INSERT OR DELETE ON follow
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_counts();

-- ============================================================================
-- 4. HASHTAGS & MENTIONS
-- ============================================================================

-- Hashtags table
CREATE TABLE IF NOT EXISTS hashtag (
  tag TEXT PRIMARY KEY,
  posts_count INT DEFAULT 0 CHECK (posts_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post-Hashtag junction table
CREATE TABLE IF NOT EXISTS post_hashtag (
  post_id UUID NOT NULL REFERENCES post(id) ON DELETE CASCADE,
  tag TEXT NOT NULL REFERENCES hashtag(tag) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_post_hashtag_tag ON post_hashtag(tag);
CREATE INDEX IF NOT EXISTS idx_post_hashtag_post_id ON post_hashtag(post_id);

-- Trigger to update hashtag posts_count
CREATE OR REPLACE FUNCTION update_hashtag_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtag SET posts_count = posts_count + 1 WHERE tag = NEW.tag;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hashtag SET posts_count = posts_count - 1 WHERE tag = OLD.tag;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_hashtag_count_trigger ON post_hashtag;

CREATE TRIGGER post_hashtag_count_trigger
  AFTER INSERT OR DELETE ON post_hashtag
  FOR EACH ROW
  EXECUTE FUNCTION update_hashtag_posts_count();

-- Mentions table
CREATE TABLE IF NOT EXISTS mention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES post(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES post_comment(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  ) -- Ensure only one is set
);

CREATE INDEX IF NOT EXISTS idx_mention_post_id ON mention(post_id);
CREATE INDEX IF NOT EXISTS idx_mention_comment_id ON mention(comment_id);
CREATE INDEX IF NOT EXISTS idx_mention_user_id ON mention(mentioned_user_id);

-- ============================================================================
-- 5. NOTIFICATIONS
-- ============================================================================

-- Notification type enum
DO $$ BEGIN
  CREATE TYPE notif_type AS ENUM (
    'post_like',
    'comment',
    'comment_like',
    'mention',
    'follow',
    'share'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE, -- Recipient
  actor_id UUID REFERENCES user_profile(id) ON DELETE SET NULL, -- Who triggered the notification
  type notif_type NOT NULL,
  post_id UUID REFERENCES post(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES post_comment(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_actor_id ON notification(actor_id);
CREATE INDEX IF NOT EXISTS idx_notification_read ON notification(user_id, read);

-- ============================================================================
-- 6. STORIES (24h)
-- ============================================================================

-- Stories table
CREATE TABLE IF NOT EXISTS story (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  views_count INT DEFAULT 0 CHECK (views_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_story_user_id ON story(user_id);
CREATE INDEX IF NOT EXISTS idx_story_expires_at ON story(expires_at);

-- Story media table (multiple media per story)
CREATE TABLE IF NOT EXISTS story_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES story(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_media_story_id ON story_media(story_id, order_index);

-- Story views table
CREATE TABLE IF NOT EXISTS story_view (
  story_id UUID NOT NULL REFERENCES story(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_view_story_id ON story_view(story_id);
CREATE INDEX IF NOT EXISTS idx_story_view_viewer_id ON story_view(viewer_id);

-- Trigger to update story views_count
CREATE OR REPLACE FUNCTION update_story_views_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE story SET views_count = views_count + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE story SET views_count = views_count - 1 WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS story_view_count_trigger ON story_view;

CREATE TRIGGER story_view_count_trigger
  AFTER INSERT OR DELETE ON story_view
  FOR EACH ROW
  EXECUTE FUNCTION update_story_views_count();

-- ============================================================================
-- 7. TRENDING / DISCOVER
-- ============================================================================

-- Materialized view for trending hashtags (last 7 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_trending_hashtags AS
  SELECT
    ph.tag,
    COUNT(*) as uses_last7d,
    MAX(p.created_at) as last_used_at
  FROM post_hashtag ph
  JOIN post p ON p.id = ph.post_id
  WHERE p.created_at > NOW() - INTERVAL '7 days'
  GROUP BY ph.tag
  ORDER BY uses_last7d DESC, last_used_at DESC
  LIMIT 100;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trending_hashtags_tag ON mv_trending_hashtags(tag);

-- Function to refresh trending hashtags (call from cron)
CREATE OR REPLACE FUNCTION refresh_trending_hashtags()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_hashtags;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to get trending posts (last 7 days, scored by engagement)
CREATE OR REPLACE FUNCTION get_trending_posts(
  limit_count INT DEFAULT 50,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as post_id,
    (
      p.likes_count * 2 +
      p.comments_count * 3 +
      EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600.0 * -0.1 -- Recency boost
    )::NUMERIC as score
  FROM post p
  WHERE
    p.created_at > NOW() - INTERVAL '7 days'
    AND p.visibility = 'public'
  ORDER BY score DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get comment thread (recursive)
CREATE OR REPLACE FUNCTION get_comment_thread(root_comment_id UUID)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  user_id UUID,
  parent_id UUID,
  content TEXT,
  likes_count INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  depth INT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE comment_tree AS (
    -- Base case: root comment
    SELECT
      c.id,
      c.post_id,
      c.user_id,
      c.parent_id,
      c.content,
      c.likes_count,
      c.created_at,
      c.updated_at,
      0 as depth
    FROM post_comment c
    WHERE c.id = root_comment_id

    UNION ALL

    -- Recursive case: child comments
    SELECT
      c.id,
      c.post_id,
      c.user_id,
      c.parent_id,
      c.content,
      c.likes_count,
      c.created_at,
      c.updated_at,
      ct.depth + 1
    FROM post_comment c
    INNER JOIN comment_tree ct ON c.parent_id = ct.id
  )
  SELECT * FROM comment_tree ORDER BY depth, created_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this migration: supabase db push
-- 2. Apply RLS policies: 021_social_feed_rls.sql
-- 3. Configure Storage bucket for media uploads
-- 4. Set up cron job to refresh trending hashtags every hour
-- 5. Set up cron job to delete expired stories (expires_at < NOW())
-- ============================================================================
