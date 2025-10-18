-- ============================================================================
-- SOCIAL FEED ENTERPRISE RLS POLICIES
-- ============================================================================
-- Row Level Security for: Comments, Comment Likes, Follow, Hashtags,
--                         Mentions, Notifications, Stories
-- ============================================================================

-- ============================================================================
-- 1. COMMENT_LIKE POLICIES
-- ============================================================================

ALTER TABLE comment_like ENABLE ROW LEVEL SECURITY;

-- Users can view all comment likes
CREATE POLICY "comment_likes_select" ON comment_like
  FOR SELECT
  USING (true);

-- Users can only insert their own likes
CREATE POLICY "comment_likes_insert" ON comment_like
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "comment_likes_delete" ON comment_like
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. FOLLOW POLICIES
-- ============================================================================

ALTER TABLE follow ENABLE ROW LEVEL SECURITY;

-- Users can view all follows (for follower/following lists)
CREATE POLICY "follow_select" ON follow
  FOR SELECT
  USING (true);

-- Users can only follow as themselves
CREATE POLICY "follow_insert" ON follow
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can only unfollow their own follows
CREATE POLICY "follow_delete" ON follow
  FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================================================
-- 3. HASHTAG POLICIES
-- ============================================================================

ALTER TABLE hashtag ENABLE ROW LEVEL SECURITY;

-- Anyone can view hashtags
CREATE POLICY "hashtag_select" ON hashtag
  FOR SELECT
  USING (true);

-- Only authenticated users can create hashtags (via post creation)
CREATE POLICY "hashtag_insert" ON hashtag
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 4. POST_HASHTAG POLICIES
-- ============================================================================

ALTER TABLE post_hashtag ENABLE ROW LEVEL SECURITY;

-- Anyone can view post-hashtag relationships
CREATE POLICY "post_hashtag_select" ON post_hashtag
  FOR SELECT
  USING (true);

-- Users can only create hashtag relationships for their own posts
CREATE POLICY "post_hashtag_insert" ON post_hashtag
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM post
      WHERE post.id = post_hashtag.post_id
      AND post.user_id = auth.uid()
    )
  );

-- Users can only delete hashtag relationships from their own posts
CREATE POLICY "post_hashtag_delete" ON post_hashtag
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM post
      WHERE post.id = post_hashtag.post_id
      AND post.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. MENTION POLICIES
-- ============================================================================

ALTER TABLE mention ENABLE ROW LEVEL SECURITY;

-- Users can view mentions where they are mentioned
CREATE POLICY "mention_select" ON mention
  FOR SELECT
  USING (
    auth.uid() = mentioned_user_id
    OR EXISTS (
      SELECT 1 FROM post
      WHERE post.id = mention.post_id
      AND post.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM post_comment
      WHERE post_comment.id = mention.comment_id
      AND post_comment.user_id = auth.uid()
    )
  );

-- Users can create mentions in their own posts/comments
CREATE POLICY "mention_insert" ON mention
  FOR INSERT
  WITH CHECK (
    (mention.post_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM post
      WHERE post.id = mention.post_id
      AND post.user_id = auth.uid()
    ))
    OR
    (mention.comment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM post_comment
      WHERE post_comment.id = mention.comment_id
      AND post_comment.user_id = auth.uid()
    ))
  );

-- ============================================================================
-- 6. NOTIFICATION POLICIES
-- ============================================================================

ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "notification_select" ON notification
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can create notifications for any user (via triggers/functions)
-- Users can also create notifications (for testing/admin purposes)
CREATE POLICY "notification_insert" ON notification
  FOR INSERT
  WITH CHECK (true);

-- Users can update (mark as read) their own notifications
CREATE POLICY "notification_update" ON notification
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "notification_delete" ON notification
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. STORY POLICIES
-- ============================================================================

ALTER TABLE story ENABLE ROW LEVEL SECURITY;

-- Users can view active stories (not expired) from public profiles
CREATE POLICY "story_select" ON story
  FOR SELECT
  USING (
    expires_at > NOW()
    AND (
      -- Own stories
      user_id = auth.uid()
      OR
      -- Stories from users you follow
      EXISTS (
        SELECT 1 FROM follow
        WHERE follow.following_id = story.user_id
        AND follow.follower_id = auth.uid()
      )
      OR
      -- Public stories (optional: can be restricted later)
      true
    )
  );

-- Users can only create their own stories
CREATE POLICY "story_insert" ON story
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own stories
CREATE POLICY "story_update" ON story
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own stories
CREATE POLICY "story_delete" ON story
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 8. STORY_MEDIA POLICIES
-- ============================================================================

ALTER TABLE story_media ENABLE ROW LEVEL SECURITY;

-- Users can view media for stories they can access
CREATE POLICY "story_media_select" ON story_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM story
      WHERE story.id = story_media.story_id
      AND story.expires_at > NOW()
      AND (
        story.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM follow
          WHERE follow.following_id = story.user_id
          AND follow.follower_id = auth.uid()
        )
        OR true -- Public stories
      )
    )
  );

-- Users can only add media to their own stories
CREATE POLICY "story_media_insert" ON story_media
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story
      WHERE story.id = story_media.story_id
      AND story.user_id = auth.uid()
    )
  );

-- Users can only delete media from their own stories
CREATE POLICY "story_media_delete" ON story_media
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM story
      WHERE story.id = story_media.story_id
      AND story.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. STORY_VIEW POLICIES
-- ============================================================================

ALTER TABLE story_view ENABLE ROW LEVEL SECURITY;

-- Story owners can view who viewed their stories
-- Viewers can see their own views
CREATE POLICY "story_view_select" ON story_view
  FOR SELECT
  USING (
    auth.uid() = viewer_id
    OR EXISTS (
      SELECT 1 FROM story
      WHERE story.id = story_view.story_id
      AND story.user_id = auth.uid()
    )
  );

-- Users can only insert their own views
CREATE POLICY "story_view_insert" ON story_view
  FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- ============================================================================
-- 10. UPDATED POST_COMMENT POLICIES (Add RLS if not already enabled)
-- ============================================================================

-- Ensure RLS is enabled on post_comment
ALTER TABLE post_comment ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "post_comment_select" ON post_comment;
DROP POLICY IF EXISTS "post_comment_insert" ON post_comment;
DROP POLICY IF EXISTS "post_comment_update" ON post_comment;
DROP POLICY IF EXISTS "post_comment_delete" ON post_comment;

-- Users can view comments on posts they have access to
CREATE POLICY "post_comment_select" ON post_comment
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM post
      WHERE post.id = post_comment.post_id
      AND (
        post.visibility = 'public'
        OR post.user_id = auth.uid()
        OR (post.visibility = 'friends' AND EXISTS (
          SELECT 1 FROM follow
          WHERE (
            (follow.follower_id = auth.uid() AND follow.following_id = post.user_id)
            OR
            (follow.follower_id = post.user_id AND follow.following_id = auth.uid())
          )
        ))
        OR (post.visibility = 'org' AND post.org_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM org_member
          WHERE org_member.org_id = post.org_id
          AND org_member.user_id = auth.uid()
        ))
      )
    )
  );

-- Users can only insert their own comments
CREATE POLICY "post_comment_insert" ON post_comment
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own comments
CREATE POLICY "post_comment_update" ON post_comment
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own comments
CREATE POLICY "post_comment_delete" ON post_comment
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All RLS policies have been applied for Enterprise Social Feed features.
-- Next steps:
-- 1. Test RLS policies with different user scenarios
-- 2. Configure Supabase Storage bucket with RLS
-- 3. Implement API endpoints with proper auth checks
-- ============================================================================
