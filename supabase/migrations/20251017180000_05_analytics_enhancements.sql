-- Sprint 5 Phase 1: Analytics & Gamification Enhancements
-- Add missing columns, indexes, functions, and policies to existing tables

-- Add missing columns to player_stats
ALTER TABLE player_stats
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to achievement
ALTER TABLE achievement
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add missing columns to user_achievement
ALTER TABLE user_achievement
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT false;

-- Add missing columns to leaderboard
ALTER TABLE leaderboard
  ADD COLUMN IF NOT EXISTS total_entries INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to user_profile
ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS player_level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS conduct_score INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS cities_visited INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS countries_visited INTEGER DEFAULT 0;

-- Handle is_public rename carefully (has dependencies)
DO $$
BEGIN
  -- Check if is_public exists and is_profile_public doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile' AND column_name = 'is_public'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile' AND column_name = 'is_profile_public'
  ) THEN
    -- Simply rename is_public to is_profile_public
    ALTER TABLE user_profile RENAME COLUMN is_public TO is_profile_public;
  END IF;
END $$;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_player_stats_calculated ON player_stats(calculated_at);
CREATE INDEX IF NOT EXISTS idx_achievement_active ON achievement(is_active);
CREATE INDEX IF NOT EXISTS idx_user_achievement_progress ON user_achievement(user_id, achievement_id, progress);
CREATE INDEX IF NOT EXISTS idx_leaderboard_scope ON leaderboard(type, scope_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_metric ON leaderboard(metric);
CREATE INDEX IF NOT EXISTS idx_leaderboard_calculated ON leaderboard(calculated_at);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rankings ON leaderboard USING GIN(rankings);
CREATE INDEX IF NOT EXISTS idx_user_profile_conduct ON user_profile(conduct_score);
CREATE INDEX IF NOT EXISTS idx_user_profile_cities ON user_profile(cities_visited);

-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_player_stats_updated_at ON player_stats;
CREATE TRIGGER update_player_stats_updated_at
  BEFORE UPDATE ON player_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_achievement_updated_at ON achievement;
CREATE TRIGGER update_achievement_updated_at
  BEFORE UPDATE ON achievement
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_achievement_updated_at ON user_achievement;
CREATE TRIGGER update_user_achievement_updated_at
  BEFORE UPDATE ON user_achievement
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leaderboard_updated_at ON leaderboard;
CREATE TRIGGER update_leaderboard_updated_at
  BEFORE UPDATE ON leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update XP when achievement unlocked
CREATE OR REPLACE FUNCTION update_user_xp_on_achievement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_unlocked = true AND (OLD.is_unlocked = false OR OLD.is_unlocked IS NULL) THEN
    -- Add XP to user profile
    UPDATE user_profile
    SET xp_points = xp_points + (
      SELECT COALESCE(xp_points, 0) FROM achievement WHERE id = NEW.achievement_id
    )
    WHERE id = NEW.user_id;

    -- Update user level based on XP (every 1000 XP = 1 level)
    UPDATE user_profile
    SET player_level = 1 + (xp_points / 1000)
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update XP when achievement unlocked
DROP TRIGGER IF EXISTS update_xp_on_achievement_unlock ON user_achievement;
CREATE TRIGGER update_xp_on_achievement_unlock
  AFTER UPDATE ON user_achievement
  FOR EACH ROW
  WHEN (NEW.is_unlocked = true AND (OLD.is_unlocked = false OR OLD.is_unlocked IS NULL))
  EXECUTE FUNCTION update_user_xp_on_achievement();

-- Function to get user's position in a leaderboard
CREATE OR REPLACE FUNCTION get_user_leaderboard_position(
  p_user_id UUID,
  p_leaderboard_id UUID
)
RETURNS TABLE(rank INTEGER, value NUMERIC, total_entries INTEGER) AS $$
DECLARE
  v_rankings JSONB;
  v_entry JSONB;
  v_total INTEGER;
BEGIN
  -- Get rankings and total entries
  SELECT l.rankings, l.total_entries
  INTO v_rankings, v_total
  FROM leaderboard l
  WHERE l.id = p_leaderboard_id;

  -- Find user in rankings array
  FOR v_entry IN SELECT jsonb_array_elements(v_rankings)
  LOOP
    IF (v_entry->>'user_id')::UUID = p_user_id THEN
      RETURN QUERY SELECT
        (v_entry->>'rank')::INTEGER,
        (v_entry->>'value')::NUMERIC,
        v_total;
      RETURN;
    END IF;
  END LOOP;

  -- User not found in leaderboard
  RETURN QUERY SELECT NULL::INTEGER, NULL::NUMERIC, v_total;
END;
$$ LANGUAGE plpgsql;

-- Add service_role policies
DROP POLICY IF EXISTS "Service role can manage player stats" ON player_stats;
CREATE POLICY "Service role can manage player stats"
  ON player_stats FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage achievements" ON achievement;
CREATE POLICY "Service role can manage achievements"
  ON achievement FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage user achievements" ON user_achievement;
CREATE POLICY "Service role can manage user achievements"
  ON user_achievement FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage leaderboards" ON leaderboard;
CREATE POLICY "Service role can manage leaderboards"
  ON leaderboard FOR ALL
  USING (auth.role() = 'service_role');

-- Update existing policies to use is_profile_public
DROP POLICY IF EXISTS "Users can view public stats" ON player_stats;
CREATE POLICY "Users can view public stats"
  ON player_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.id = player_stats.user_id
      AND user_profile.is_profile_public = true
    )
  );

DROP POLICY IF EXISTS "Users can view public achievements" ON user_achievement;
CREATE POLICY "Users can view others unlocked achievements"
  ON user_achievement FOR SELECT
  USING (
    is_unlocked = true AND
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE user_profile.id = user_achievement.user_id
      AND user_profile.is_profile_public = true
    )
  );
