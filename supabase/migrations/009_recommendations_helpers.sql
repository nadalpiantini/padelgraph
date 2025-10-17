-- ============================================
-- SPRINT 4: Recommendations Engine Helpers
-- Migration: 009_recommendations_helpers.sql
-- Description: SQL functions for recommendations engine
-- ============================================

-- Function to count common tournaments between two users
CREATE OR REPLACE FUNCTION count_common_tournaments(
  user1_id UUID,
  user2_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  common_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT tp1.tournament_id)
  INTO common_count
  FROM tournament_participant tp1
  JOIN tournament_participant tp2 ON tp1.tournament_id = tp2.tournament_id
  WHERE tp1.user_id = user1_id
    AND tp2.user_id = user2_id
    AND tp1.user_id != tp2.user_id;

  RETURN COALESCE(common_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user similarity score (alternative to app logic)
CREATE OR REPLACE FUNCTION calculate_user_similarity(
  user1_id UUID,
  user2_id UUID
)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  score DECIMAL(3,2) := 0.0;
  same_skill BOOLEAN;
  same_city BOOLEAN;
  are_connected BOOLEAN;
  common_tournaments INTEGER;
BEGIN
  -- Check same skill level
  SELECT u1.skill_level = u2.skill_level
  INTO same_skill
  FROM user_profile u1, user_profile u2
  WHERE u1.id = user1_id AND u2.id = user2_id;

  IF same_skill THEN
    score := score + 0.3;
  END IF;

  -- Check same city
  SELECT u1.city = u2.city
  INTO same_city
  FROM user_profile u1, user_profile u2
  WHERE u1.id = user1_id AND u2.id = user2_id;

  IF same_city THEN
    score := score + 0.2;
  END IF;

  -- Check if connected
  SELECT EXISTS (
    SELECT 1 FROM social_connection
    WHERE (user_a = user1_id AND user_b = user2_id)
       OR (user_b = user1_id AND user_a = user2_id)
  ) INTO are_connected;

  IF are_connected THEN
    score := score + 0.3;
  END IF;

  -- Check common tournaments
  SELECT count_common_tournaments(user1_id, user2_id)
  INTO common_tournaments;

  IF common_tournaments > 0 THEN
    score := score + 0.2;
  END IF;

  RETURN LEAST(score, 1.0); -- Cap at 1.0
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get player recommendations (SQL-based collaborative filtering)
CREATE OR REPLACE FUNCTION get_player_recommendations(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  display_name VARCHAR,
  skill_level VARCHAR,
  city VARCHAR,
  similarity_score DECIMAL(3,2),
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_friends AS (
    -- Get existing connections to exclude
    SELECT CASE
      WHEN user_a = p_user_id THEN user_b
      WHEN user_b = p_user_id THEN user_a
    END as friend_id
    FROM social_connection
    WHERE user_a = p_user_id OR user_b = p_user_id
  ),
  user_profile_data AS (
    SELECT skill_level, city
    FROM user_profile
    WHERE id = p_user_id
  )
  SELECT
    up.id as user_id,
    up.display_name,
    up.skill_level,
    up.city,
    calculate_user_similarity(p_user_id, up.id) as similarity_score,
    CASE
      WHEN up.skill_level = upd.skill_level THEN 'Mismo nivel de juego (' || up.skill_level || ')'
      WHEN up.city = upd.city THEN 'Jugador de ' || up.city
      ELSE 'Jugador compatible encontrado'
    END as reason
  FROM user_profile up
  CROSS JOIN user_profile_data upd
  WHERE up.id != p_user_id
    AND up.id NOT IN (SELECT friend_id FROM user_friends WHERE friend_id IS NOT NULL)
    AND calculate_user_similarity(p_user_id, up.id) > 0.4
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-cleanup old recommendations (runs daily via cron)
CREATE OR REPLACE FUNCTION cleanup_old_recommendations()
RETURNS void AS $$
BEGIN
  DELETE FROM recommendation
  WHERE created_at < NOW() - INTERVAL '30 days'
     OR (dismissed = true AND created_at < NOW() - INTERVAL '7 days');

  RAISE NOTICE 'Cleaned up old recommendations';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Index for recommendation queries
CREATE INDEX IF NOT EXISTS idx_recommendation_user_shown
  ON recommendation(user_id, shown, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendation_type
  ON recommendation(user_id, recommended_type, created_at DESC);

-- Index for tournament participant queries (for common tournaments)
CREATE INDEX IF NOT EXISTS idx_tournament_participant_user
  ON tournament_participant(user_id, tournament_id);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Sprint 4 Recommendations Helpers Migration Complete';
  RAISE NOTICE 'Functions: count_common_tournaments, calculate_user_similarity, get_player_recommendations';
  RAISE NOTICE 'Indexes: recommendation queries optimized';
END $$;
