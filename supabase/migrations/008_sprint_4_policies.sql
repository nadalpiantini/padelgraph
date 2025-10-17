-- ============================================
-- SPRINT 4: Travel Mode & Graph Intelligence
-- Migration: 008_sprint_4_policies.sql
-- Description: Row Level Security policies for privacy and discovery
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE travel_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 0. ADD MISSING COLUMNS (if not in 007)
-- ============================================

-- Add is_admin to user_profile (needed for admin policies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profile ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- 1. TRAVEL PLAN POLICIES
-- ============================================

-- Users can view their own travel plans
CREATE POLICY "Users can view own travel plans"
  ON travel_plan
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own travel plans
CREATE POLICY "Users can create own travel plans"
  ON travel_plan
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own travel plans
CREATE POLICY "Users can update own travel plans"
  ON travel_plan
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own travel plans
CREATE POLICY "Users can delete own travel plans"
  ON travel_plan
  FOR DELETE
  USING (auth.uid() = user_id);

-- Users can see active travel plans of users in same location (for matching)
CREATE POLICY "Users can see nearby active travel plans"
  ON travel_plan
  FOR SELECT
  USING (
    status = 'active'
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM privacy_settings
      WHERE privacy_settings.user_id = travel_plan.user_id
      AND privacy_settings.show_in_discovery = true
    )
  );

-- ============================================
-- 2. PRIVACY SETTINGS POLICIES
-- ============================================

-- Users can view their own privacy settings
CREATE POLICY "Users can view own privacy settings"
  ON privacy_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own privacy settings
CREATE POLICY "Users can update own privacy settings"
  ON privacy_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-create privacy settings for new users (INSERT policy)
CREATE POLICY "Users can create own privacy settings"
  ON privacy_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. SOCIAL CONNECTION POLICIES
-- ============================================

-- Users can view connections they are part of
CREATE POLICY "Users can view own connections"
  ON social_connection
  FOR SELECT
  USING (
    auth.uid() = user_a
    OR auth.uid() = user_b
  );

-- Users can view public connections based on privacy settings
CREATE POLICY "Users can view public connections"
  ON social_connection
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM privacy_settings
      WHERE (privacy_settings.user_id = social_connection.user_a OR privacy_settings.user_id = social_connection.user_b)
      AND privacy_settings.graph_visibility = 'public'
    )
  );

-- System can create connections (via function)
CREATE POLICY "System can create connections"
  ON social_connection
  FOR INSERT
  WITH CHECK (true); -- Controlled by increment_connection_strength function

-- Users can update connections they are part of
CREATE POLICY "Users can update own connections"
  ON social_connection
  FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- ============================================
-- 4. DISCOVERY EVENT POLICIES
-- ============================================

-- Users can view public discovery events
CREATE POLICY "Users can view public discovery events"
  ON discovery_event
  FOR SELECT
  USING (visibility = 'public');

-- Users can view friends-only events if they are friends
CREATE POLICY "Users can view friends discovery events"
  ON discovery_event
  FOR SELECT
  USING (
    visibility = 'friends'
    AND EXISTS (
      SELECT 1 FROM social_connection
      WHERE (user_a = auth.uid() AND user_b = discovery_event.entity_id)
      OR (user_b = auth.uid() AND user_a = discovery_event.entity_id)
    )
  );

-- Users can view clubs_only events if they are in same club
-- COMMENTED: club_member table doesn't exist yet
-- CREATE POLICY "Users can view club discovery events"
--   ON discovery_event
--   FOR SELECT
--   USING (
--     visibility = 'clubs_only'
--     AND EXISTS (
--       SELECT 1 FROM club_member cm1
--       JOIN club_member cm2 ON cm1.club_id = cm2.club_id
--       WHERE cm1.user_id = auth.uid()
--       AND cm2.id = discovery_event.entity_id
--     )
--   );

-- System can create discovery events
CREATE POLICY "System can create discovery events"
  ON discovery_event
  FOR INSERT
  WITH CHECK (true); -- Controlled by triggers

-- Auto-delete expired events (system only)
CREATE POLICY "System can delete expired events"
  ON discovery_event
  FOR DELETE
  USING (expires_at IS NOT NULL AND expires_at < NOW());

-- ============================================
-- 5. RECOMMENDATION POLICIES
-- ============================================

-- Users can view their own recommendations
CREATE POLICY "Users can view own recommendations"
  ON recommendation
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can create recommendations
CREATE POLICY "System can create recommendations"
  ON recommendation
  FOR INSERT
  WITH CHECK (true); -- Controlled by recommendation engine

-- Users can update their own recommendations (mark as shown/clicked)
CREATE POLICY "Users can update own recommendations"
  ON recommendation
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-cleanup old recommendations (system only)
CREATE POLICY "System can delete old recommendations"
  ON recommendation
  FOR DELETE
  USING (
    created_at < NOW() - INTERVAL '30 days'
    OR dismissed = true
  );

-- ============================================
-- 6. USER_PROFILE LOCATION POLICIES
-- ============================================

-- Helper function to check if user can see another user's location
CREATE OR REPLACE FUNCTION can_see_user_location(viewer_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  visibility VARCHAR(20);
  are_friends BOOLEAN;
  same_club BOOLEAN;
BEGIN
  -- Get privacy settings
  SELECT location_visibility INTO visibility
  FROM privacy_settings
  WHERE user_id = target_id;

  -- Default to clubs_only if no settings
  visibility := COALESCE(visibility, 'clubs_only');

  -- Public: everyone can see
  IF visibility = 'public' THEN
    RETURN true;
  END IF;

  -- Private: only self
  IF visibility = 'private' THEN
    RETURN viewer_id = target_id;
  END IF;

  -- Friends: check if connected
  IF visibility = 'friends' THEN
    SELECT EXISTS (
      SELECT 1 FROM social_connection
      WHERE (user_a = viewer_id AND user_b = target_id)
         OR (user_b = viewer_id AND user_a = target_id)
    ) INTO are_friends;
    RETURN are_friends OR viewer_id = target_id;
  END IF;

  -- Clubs only: check if in same club (COMMENTED: club_member doesn't exist)
  IF visibility = 'clubs_only' THEN
    -- SELECT EXISTS (
    --   SELECT 1 FROM club_member cm1
    --   JOIN club_member cm2 ON cm1.club_id = cm2.club_id
    --   WHERE cm1.user_id = viewer_id AND cm2.user_id = target_id
    -- ) INTO same_club;
    -- RETURN same_club OR viewer_id = target_id;
    RETURN viewer_id = target_id; -- Temporary: only self can see until clubs are implemented
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. DISCOVERY API PRIVACY ENFORCEMENT
-- ============================================

-- Function to get nearby users respecting privacy
CREATE OR REPLACE FUNCTION get_nearby_users(
  p_location GEOGRAPHY,
  p_radius_km DECIMAL,
  p_filters JSONB DEFAULT '{}'
)
RETURNS TABLE (
  user_id UUID,
  display_name VARCHAR,
  skill_level VARCHAR,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id,
    up.display_name,
    up.skill_level,
    calculate_distance_km(p_location, up.location) as distance_km
  FROM user_profile up
  JOIN privacy_settings ps ON ps.user_id = up.user_id
  WHERE
    up.location IS NOT NULL
    AND ST_DWithin(up.location, p_location, p_radius_km * 1000)
    AND ps.show_in_discovery = true
    AND can_see_user_location(auth.uid(), up.user_id)
    AND (
      p_filters->>'skill_level' IS NULL
      OR up.skill_level = p_filters->>'skill_level'
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get nearby clubs (no privacy needed, clubs are public)
CREATE OR REPLACE FUNCTION get_nearby_clubs(
  p_location GEOGRAPHY,
  p_radius_km DECIMAL
)
RETURNS TABLE (
  club_id UUID,
  club_name VARCHAR,
  address TEXT,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as club_id,
    c.name as club_name,
    c.address,
    calculate_distance_km(p_location, c.location) as distance_km
  FROM club c
  WHERE
    c.location IS NOT NULL
    AND ST_DWithin(c.location, p_location, p_radius_km * 1000)
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. TRAVEL MODE PRIVACY
-- ============================================

-- Users can only see travel_mode of users with proper privacy
CREATE OR REPLACE FUNCTION can_see_travel_status(viewer_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM privacy_settings
    WHERE user_id = target_id
    AND (
      profile_visibility = 'public'
      OR (profile_visibility = 'friends' AND EXISTS (
        SELECT 1 FROM social_connection
        WHERE (user_a = viewer_id AND user_b = target_id)
           OR (user_b = viewer_id AND user_a = target_id)
      ))
      -- OR (profile_visibility = 'clubs_only' AND EXISTS (
      --   SELECT 1 FROM club_member cm1
      --   JOIN club_member cm2 ON cm1.club_id = cm2.club_id
      --   WHERE cm1.user_id = viewer_id AND cm2.user_id = target_id
      -- ))
      OR (profile_visibility = 'clubs_only' AND viewer_id = target_id) -- Temporary until clubs exist
    )
  ) OR viewer_id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. GRAPH QUERY PRIVACY
-- ============================================

-- Function to find connection path (BFS) respecting privacy
CREATE OR REPLACE FUNCTION find_connection_path(
  p_from_user UUID,
  p_to_user UUID,
  p_max_depth INTEGER DEFAULT 4
)
RETURNS TABLE (
  path UUID[],
  degree INTEGER
) AS $$
DECLARE
  v_path UUID[];
  v_degree INTEGER;
  v_can_query BOOLEAN;
BEGIN
  -- Check if requester can query this path
  SELECT can_see_user_location(auth.uid(), p_from_user)
    AND can_see_user_location(auth.uid(), p_to_user)
  INTO v_can_query;

  IF NOT v_can_query THEN
    RETURN; -- Empty result if no permission
  END IF;

  -- BFS algorithm (simplified - production would use recursive CTE)
  WITH RECURSIVE connection_search AS (
    -- Base case: direct connection
    SELECT
      ARRAY[p_from_user, user_b] as path,
      1 as degree
    FROM social_connection
    WHERE user_a = p_from_user AND user_b = p_to_user

    UNION ALL

    SELECT
      ARRAY[p_from_user, user_a] as path,
      1 as degree
    FROM social_connection
    WHERE user_b = p_from_user AND user_a = p_to_user

    UNION ALL

    -- Recursive case: indirect connections
    SELECT
      cs.path || sc.user_b,
      cs.degree + 1
    FROM connection_search cs
    JOIN social_connection sc ON sc.user_a = cs.path[array_length(cs.path, 1)]
    WHERE cs.degree < p_max_depth
      AND NOT (sc.user_b = ANY(cs.path))
      AND sc.user_b = p_to_user
  )
  SELECT cs.path, cs.degree
  INTO v_path, v_degree
  FROM connection_search cs
  ORDER BY cs.degree ASC
  LIMIT 1;

  RETURN QUERY SELECT v_path, v_degree;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. ADMIN POLICIES (for debugging)
-- ============================================

-- Admin role can view all (requires is_admin flag)
CREATE POLICY "Admins can view all travel plans"
  ON travel_plan
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can view all privacy settings"
  ON privacy_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can view all connections"
  ON social_connection
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE 'Sprint 4 Policies Migration Complete';
  RAISE NOTICE 'RLS enabled on: travel_plan, privacy_settings, social_connection, discovery_event, recommendation';
  RAISE NOTICE 'Privacy functions: can_see_user_location, can_see_travel_status, find_connection_path';
  RAISE NOTICE 'Discovery functions: get_nearby_users, get_nearby_clubs';
END $$;
