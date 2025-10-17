-- ============================================================================
-- SPRINT 1 RLS POLICIES - Core & Communication
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE post ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_like ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE court ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POST POLICIES
-- ============================================================================

-- Public posts are readable by everyone
CREATE POLICY "Public posts are readable by all"
  ON post
  FOR SELECT
  USING (visibility = 'public');

-- Users can read their own posts
CREATE POLICY "Users can read own posts"
  ON post
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can read posts from their organizations
CREATE POLICY "Users can read org posts"
  ON post
  FOR SELECT
  USING (
    visibility = 'org'
    AND EXISTS (
      SELECT 1 FROM org_member
      WHERE org_member.org_id = post.org_id
      AND org_member.user_id = auth.uid()
    )
  );

-- Users can create posts
CREATE POLICY "Authenticated users can create posts"
  ON post
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON post
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON post
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- POST_LIKE POLICIES
-- ============================================================================

-- Users can see likes on posts they can read
CREATE POLICY "Users can see likes on readable posts"
  ON post_like
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM post
      WHERE post.id = post_like.post_id
      AND (
        post.visibility = 'public'
        OR post.user_id = auth.uid()
        OR (
          post.visibility = 'org'
          AND EXISTS (
            SELECT 1 FROM org_member
            WHERE org_member.org_id = post.org_id
            AND org_member.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Users can like posts they can read
CREATE POLICY "Users can like readable posts"
  ON post_like
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM post
      WHERE post.id = post_like.post_id
      AND (
        post.visibility = 'public'
        OR post.user_id = auth.uid()
        OR (
          post.visibility = 'org'
          AND EXISTS (
            SELECT 1 FROM org_member
            WHERE org_member.org_id = post.org_id
            AND org_member.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Users can unlike their own likes
CREATE POLICY "Users can remove own likes"
  ON post_like
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- POST_COMMENT POLICIES
-- ============================================================================

-- Users can see comments on posts they can read
CREATE POLICY "Users can see comments on readable posts"
  ON post_comment
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM post
      WHERE post.id = post_comment.post_id
      AND (
        post.visibility = 'public'
        OR post.user_id = auth.uid()
        OR (
          post.visibility = 'org'
          AND EXISTS (
            SELECT 1 FROM org_member
            WHERE org_member.org_id = post.org_id
            AND org_member.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Users can comment on posts they can read
CREATE POLICY "Users can comment on readable posts"
  ON post_comment
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM post
      WHERE post.id = post_comment.post_id
      AND (
        post.visibility = 'public'
        OR post.user_id = auth.uid()
        OR (
          post.visibility = 'org'
          AND EXISTS (
            SELECT 1 FROM org_member
            WHERE org_member.org_id = post.org_id
            AND org_member.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON post_comment
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON post_comment
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- COURT POLICIES
-- ============================================================================

-- Anyone can read active courts
CREATE POLICY "Anyone can read active courts"
  ON court
  FOR SELECT
  USING (active = true);

-- Org members can read all courts in their org
CREATE POLICY "Org members can read org courts"
  ON court
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_member
      WHERE org_member.org_id = court.org_id
      AND org_member.user_id = auth.uid()
    )
  );

-- Only org admins/owners can create courts
CREATE POLICY "Org admins can create courts"
  ON court
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_member
      WHERE org_member.org_id = court.org_id
      AND org_member.user_id = auth.uid()
      AND org_member.role IN ('owner', 'admin')
    )
  );

-- Only org admins/owners can update courts
CREATE POLICY "Org admins can update courts"
  ON court
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_member
      WHERE org_member.org_id = court.org_id
      AND org_member.user_id = auth.uid()
      AND org_member.role IN ('owner', 'admin')
    )
  );

-- Only org owners can delete courts
CREATE POLICY "Org owners can delete courts"
  ON court
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM org_member
      WHERE org_member.org_id = court.org_id
      AND org_member.user_id = auth.uid()
      AND org_member.role = 'owner'
    )
  );

-- ============================================================================
-- AVAILABILITY POLICIES
-- ============================================================================

-- Anyone can read active availability slots
CREATE POLICY "Anyone can read active availability"
  ON availability
  FOR SELECT
  USING (
    active = true
    AND EXISTS (
      SELECT 1 FROM court
      WHERE court.id = availability.court_id
      AND court.active = true
    )
  );

-- Org admins can create availability
CREATE POLICY "Org admins can create availability"
  ON availability
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM court
      JOIN org_member ON org_member.org_id = court.org_id
      WHERE court.id = availability.court_id
      AND org_member.user_id = auth.uid()
      AND org_member.role IN ('owner', 'admin')
    )
  );

-- Org admins can update availability
CREATE POLICY "Org admins can update availability"
  ON availability
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM court
      JOIN org_member ON org_member.org_id = court.org_id
      WHERE court.id = availability.court_id
      AND org_member.user_id = auth.uid()
      AND org_member.role IN ('owner', 'admin')
    )
  );

-- Org admins can delete availability
CREATE POLICY "Org admins can delete availability"
  ON availability
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM court
      JOIN org_member ON org_member.org_id = court.org_id
      WHERE court.id = availability.court_id
      AND org_member.user_id = auth.uid()
      AND org_member.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- BOOKING POLICIES
-- ============================================================================

-- Users can read their own bookings
CREATE POLICY "Users can read own bookings"
  ON booking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Org members can read org bookings
CREATE POLICY "Org members can read org bookings"
  ON booking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_member
      WHERE org_member.org_id = booking.org_id
      AND org_member.user_id = auth.uid()
      AND org_member.role IN ('owner', 'admin', 'coach')
    )
  );

-- Authenticated users can create bookings
CREATE POLICY "Authenticated users can create bookings"
  ON booking
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending bookings
CREATE POLICY "Users can update own pending bookings"
  ON booking
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Users can cancel their own bookings
CREATE POLICY "Users can cancel own bookings"
  ON booking
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status IN ('pending', 'confirmed')
  )
  WITH CHECK (status = 'cancelled');

-- Org admins can update any org booking
CREATE POLICY "Org admins can update org bookings"
  ON booking
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_member
      WHERE org_member.org_id = booking.org_id
      AND org_member.user_id = auth.uid()
      AND org_member.role IN ('owner', 'admin')
    )
  );
