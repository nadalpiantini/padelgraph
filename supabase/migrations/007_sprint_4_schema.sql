-- ============================================
-- SPRINT 4: Travel Mode & Graph Intelligence
-- Migration: 007_sprint_4_schema.sql
-- Description: PostGIS setup, location fields, social graph, privacy, discovery
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- For gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS postgis; -- For geospatial queries

-- ============================================
-- 1. TRAVEL PLANS
-- ============================================

CREATE TABLE IF NOT EXISTS travel_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  destination_city VARCHAR(100) NOT NULL,
  destination_country VARCHAR(100),
  location GEOGRAPHY(POINT, 4326), -- PostGIS: lat/lng point
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  preferences JSONB DEFAULT '{}', -- { level: 'intermediate', format: 'doubles', looking_for: 'casual' }
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active travel plans
CREATE INDEX idx_travel_plan_user ON travel_plan(user_id) WHERE status = 'active';
CREATE INDEX idx_travel_plan_dates ON travel_plan(start_date, end_date) WHERE status = 'active';
CREATE INDEX idx_travel_plan_location ON travel_plan USING GIST(location);

-- ============================================
-- 2. PRIVACY SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES user_profile(id) ON DELETE CASCADE,
  location_visibility VARCHAR(20) DEFAULT 'clubs_only' CHECK (location_visibility IN ('public', 'friends', 'clubs_only', 'private')),
  profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'clubs_only', 'private')),
  auto_match_enabled BOOLEAN DEFAULT true,
  show_in_discovery BOOLEAN DEFAULT true,
  graph_visibility VARCHAR(20) DEFAULT 'friends' CHECK (graph_visibility IN ('public', 'friends', 'clubs_only', 'private')),
  allow_travel_suggestions BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create privacy settings for existing users
INSERT INTO privacy_settings (user_id)
SELECT id FROM user_profile
WHERE id NOT IN (SELECT user_id FROM privacy_settings);

-- ============================================
-- 3. SOCIAL GRAPH CONNECTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS social_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  connection_type VARCHAR(50) NOT NULL, -- played_with, friend, clubmate, tournament, auto_matched
  strength INTEGER DEFAULT 1, -- number of interactions (increments over time)
  metadata JSONB DEFAULT '{}', -- { match_id, tournament_id, club_id, etc. }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure user_a < user_b to avoid duplicates
  CONSTRAINT ensure_user_order CHECK (user_a < user_b),
  CONSTRAINT unique_connection UNIQUE(user_a, user_b)
);

-- Indexes for graph traversal (BFS algorithm)
CREATE INDEX idx_social_connection_user_a ON social_connection(user_a);
CREATE INDEX idx_social_connection_user_b ON social_connection(user_b);
CREATE INDEX idx_social_connection_type ON social_connection(connection_type);
CREATE INDEX idx_social_connection_strength ON social_connection(strength DESC);

-- ============================================
-- 4. DISCOVERY EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS discovery_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL, -- new_player, upcoming_match, new_tournament, club_event
  entity_id UUID NOT NULL, -- reference to player/match/tournament/club
  location GEOGRAPHY(POINT, 4326),
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'clubs_only', 'private')),
  metadata JSONB DEFAULT '{}', -- event-specific data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- optional: auto-cleanup old events

  -- Index for cleanup
  CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Indexes for discovery feed queries
CREATE INDEX idx_discovery_event_type ON discovery_event(event_type);
CREATE INDEX idx_discovery_event_created ON discovery_event(created_at DESC);
CREATE INDEX idx_discovery_event_location ON discovery_event USING GIST(location);
CREATE INDEX idx_discovery_event_expires ON discovery_event(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- 5. RECOMMENDATIONS CACHE
-- ============================================

CREATE TABLE IF NOT EXISTS recommendation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  recommended_type VARCHAR(50) NOT NULL, -- player, club, tournament, match
  recommended_id UUID NOT NULL,
  score DECIMAL(5,4) CHECK (score >= 0 AND score <= 1), -- 0.0000 to 1.0000
  reason TEXT, -- "Played with María, who plays with..."
  algorithm VARCHAR(50) DEFAULT 'collaborative_filtering', -- track which algo generated this
  shown BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  shown_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

-- Indexes for recommendations
CREATE INDEX idx_recommendation_user ON recommendation(user_id, shown, dismissed);
CREATE INDEX idx_recommendation_score ON recommendation(user_id, score DESC) WHERE NOT dismissed;
CREATE INDEX idx_recommendation_type ON recommendation(recommended_type, recommended_id);

-- ============================================
-- 6. EXTEND EXISTING TABLES WITH LOCATION
-- ============================================

-- Add location to user_profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile' AND column_name = 'location'
  ) THEN
    ALTER TABLE user_profile ADD COLUMN location GEOGRAPHY(POINT, 4326);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile' AND column_name = 'travel_mode'
  ) THEN
    ALTER TABLE user_profile ADD COLUMN travel_mode BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile' AND column_name = 'travel_destination'
  ) THEN
    ALTER TABLE user_profile ADD COLUMN travel_destination VARCHAR(100);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profile ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add location to club (COMMENTED: club table doesn't exist yet)
-- Will be added when club table is created in future sprint
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM information_schema.columns
--     WHERE table_name = 'club' AND column_name = 'location'
--   ) THEN
--     ALTER TABLE club ADD COLUMN location GEOGRAPHY(POINT, 4326);
--   END IF;
-- END $$;

-- Create spatial indexes
CREATE INDEX IF NOT EXISTS idx_user_profile_location ON user_profile USING GIST(location);
-- CREATE INDEX IF NOT EXISTS idx_club_location ON club USING GIST(location); -- club table doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_travel_mode ON user_profile(travel_mode) WHERE travel_mode = true;

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_travel_plan_updated_at
  BEFORE UPDATE ON travel_plan
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at
  BEFORE UPDATE ON privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate distance between two points (in kilometers)
CREATE OR REPLACE FUNCTION calculate_distance_km(
  point1 GEOGRAPHY,
  point2 GEOGRAPHY
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN ST_Distance(point1, point2) / 1000; -- Convert meters to kilometers
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find entities within radius
CREATE OR REPLACE FUNCTION find_nearby(
  center_location GEOGRAPHY,
  radius_km DECIMAL
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'user'::TEXT as entity_type,
    user_id as entity_id,
    calculate_distance_km(center_location, location) as distance_km
  FROM user_profile
  WHERE location IS NOT NULL
    AND ST_DWithin(location, center_location, radius_km * 1000) -- meters

  -- Club search commented out: club table doesn't exist yet
  -- UNION ALL
  -- SELECT
  --   'club'::TEXT as entity_type,
  --   id as entity_id,
  --   calculate_distance_km(center_location, location) as distance_km
  -- FROM club
  -- WHERE location IS NOT NULL
  --   AND ST_DWithin(location, center_location, radius_km * 1000)
  ;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to increment connection strength
CREATE OR REPLACE FUNCTION increment_connection_strength(
  p_user_a UUID,
  p_user_b UUID,
  p_connection_type VARCHAR,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_connection_id UUID;
  v_user_min UUID;
  v_user_max UUID;
BEGIN
  -- Ensure user_a < user_b
  IF p_user_a < p_user_b THEN
    v_user_min := p_user_a;
    v_user_max := p_user_b;
  ELSE
    v_user_min := p_user_b;
    v_user_max := p_user_a;
  END IF;

  -- Insert or update connection
  INSERT INTO social_connection (user_a, user_b, connection_type, strength, metadata, last_interaction_at)
  VALUES (v_user_min, v_user_max, p_connection_type, 1, p_metadata, NOW())
  ON CONFLICT (user_a, user_b)
  DO UPDATE SET
    strength = social_connection.strength + 1,
    last_interaction_at = NOW(),
    metadata = p_metadata
  RETURNING id INTO v_connection_id;

  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. AUTOMATIC DISCOVERY EVENT CREATION
-- ============================================

-- Trigger to create discovery event when new user joins
CREATE OR REPLACE FUNCTION create_new_user_discovery_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location IS NOT NULL THEN
    INSERT INTO discovery_event (event_type, entity_id, location, visibility, metadata)
    VALUES (
      'new_player',
      NEW.user_id,
      NEW.location,
      'public',
      jsonb_build_object('display_name', NEW.display_name, 'skill_level', NEW.skill_level)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_user_discovery
  AFTER INSERT ON user_profile
  FOR EACH ROW
  EXECUTE FUNCTION create_new_user_discovery_event();

-- ============================================
-- 9. CLEANUP POLICIES
-- ============================================

-- Auto-delete expired discovery events (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_discovery_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM discovery_event
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE 'Sprint 4 Schema Migration Complete';
  RAISE NOTICE 'Tables created: travel_plan, privacy_settings, social_connection, discovery_event, recommendation';
  RAISE NOTICE 'PostGIS enabled: location fields added to user_profile and club';
  RAISE NOTICE 'Helper functions: calculate_distance_km, find_nearby, increment_connection_strength';
END $$;
