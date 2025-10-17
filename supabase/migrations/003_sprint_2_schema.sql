-- ============================================================================
-- Sprint 2: Tournaments Engine - Database Schema
-- ============================================================================
-- Created: 2025-10-17
-- Description: Tournament system with Americano/Mexicano formats
--              5 new tables: tournament, tournament_participant, tournament_round,
--              tournament_match, tournament_standing
-- ============================================================================

-- Enable PostGIS for geospatial queries (if not already enabled)
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;
CREATE EXTENSION IF NOT EXISTS cube;

-- ============================================================================
-- Table: tournament
-- ============================================================================

CREATE TABLE tournament (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('americano', 'mexicano')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'cancelled')),

  -- Timing
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  check_in_opens_at TIMESTAMPTZ,
  check_in_closes_at TIMESTAMPTZ,

  -- Configuration
  max_participants INTEGER NOT NULL CHECK (max_participants >= 4 AND max_participants % 4 = 0),
  match_duration_minutes INTEGER NOT NULL DEFAULT 90 CHECK (match_duration_minutes > 0),
  points_per_win INTEGER NOT NULL DEFAULT 3 CHECK (points_per_win >= 0),
  points_per_draw INTEGER NOT NULL DEFAULT 1 CHECK (points_per_draw >= 0),
  points_per_loss INTEGER NOT NULL DEFAULT 0 CHECK (points_per_loss >= 0),

  -- Geofencing
  location_lat DOUBLE PRECISION NOT NULL CHECK (location_lat >= -90 AND location_lat <= 90),
  location_lng DOUBLE PRECISION NOT NULL CHECK (location_lng >= -180 AND location_lng <= 180),
  geofence_radius_meters INTEGER NOT NULL DEFAULT 100 CHECK (geofence_radius_meters > 0),

  -- Settings (JSONB for flexible configuration)
  settings JSONB DEFAULT '{
    "auto_advance_rounds": false,
    "notify_participants": true,
    "allow_late_checkin": false
  }'::jsonb,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tournament_org ON tournament(org_id);
CREATE INDEX idx_tournament_status ON tournament(status);
CREATE INDEX idx_tournament_type ON tournament(type);
CREATE INDEX idx_tournament_starts_at ON tournament(starts_at);
CREATE INDEX idx_tournament_created_by ON tournament(created_by);

-- Geospatial index for nearby tournament queries
CREATE INDEX idx_tournament_location ON tournament USING gist(
  ll_to_earth(location_lat, location_lng)
);

-- Trigger for updated_at
CREATE TRIGGER update_tournament_updated_at
  BEFORE UPDATE ON tournament
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Table: tournament_participant
-- ============================================================================

CREATE TABLE tournament_participant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Registration
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'checked_in', 'no_show', 'withdrawn')),

  -- Check-in (GPS validation)
  checked_in_at TIMESTAMPTZ,
  checked_in_lat DOUBLE PRECISION CHECK (checked_in_lat >= -90 AND checked_in_lat <= 90),
  checked_in_lng DOUBLE PRECISION CHECK (checked_in_lng >= -180 AND checked_in_lng <= 180),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(tournament_id, user_id),
  CHECK (
    (status = 'checked_in' AND checked_in_at IS NOT NULL AND checked_in_lat IS NOT NULL AND checked_in_lng IS NOT NULL)
    OR
    (status != 'checked_in')
  )
);

-- Indexes
CREATE INDEX idx_participant_tournament ON tournament_participant(tournament_id);
CREATE INDEX idx_participant_user ON tournament_participant(user_id);
CREATE INDEX idx_participant_status ON tournament_participant(status);

-- Trigger for updated_at
CREATE TRIGGER update_tournament_participant_updated_at
  BEFORE UPDATE ON tournament_participant
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Table: tournament_round
-- ============================================================================

CREATE TABLE tournament_round (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,

  -- Round Info
  round_number INTEGER NOT NULL CHECK (round_number > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),

  -- Timing
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(tournament_id, round_number),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

-- Indexes
CREATE INDEX idx_round_tournament ON tournament_round(tournament_id);
CREATE INDEX idx_round_status ON tournament_round(status);
CREATE INDEX idx_round_number ON tournament_round(tournament_id, round_number);

-- Trigger for updated_at
CREATE TRIGGER update_tournament_round_updated_at
  BEFORE UPDATE ON tournament_round
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Table: tournament_match
-- ============================================================================

CREATE TABLE tournament_match (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES tournament_round(id) ON DELETE CASCADE,
  court_id UUID REFERENCES court(id) ON DELETE SET NULL,

  -- Teams (4 players: 2 vs 2)
  team1_player1_id UUID NOT NULL REFERENCES auth.users(id),
  team1_player2_id UUID NOT NULL REFERENCES auth.users(id),
  team2_player1_id UUID NOT NULL REFERENCES auth.users(id),
  team2_player2_id UUID NOT NULL REFERENCES auth.users(id),

  -- Scores
  team1_score INTEGER CHECK (team1_score >= 0 AND team1_score <= 99),
  team2_score INTEGER CHECK (team2_score >= 0 AND team2_score <= 99),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'forfeited')),

  -- Winner calculation
  winner_team INTEGER CHECK (winner_team IN (1, 2)),
  is_draw BOOLEAN DEFAULT FALSE,

  -- Timing
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints: Ensure no player is in both teams or paired with themselves
  CHECK (team1_player1_id != team1_player2_id),
  CHECK (team2_player1_id != team2_player2_id),
  CHECK (team1_player1_id != team2_player1_id AND team1_player1_id != team2_player2_id),
  CHECK (team1_player2_id != team2_player1_id AND team1_player2_id != team2_player2_id),

  -- Scores validation
  CHECK (
    (status = 'completed' AND team1_score IS NOT NULL AND team2_score IS NOT NULL AND completed_at IS NOT NULL)
    OR
    (status != 'completed')
  ),

  -- Winner logic validation
  CHECK (
    (status = 'completed' AND is_draw = false AND winner_team IS NOT NULL)
    OR
    (status = 'completed' AND is_draw = true AND winner_team IS NULL)
    OR
    (status != 'completed' AND winner_team IS NULL AND is_draw = false)
  )
);

-- Indexes
CREATE INDEX idx_match_round ON tournament_match(round_id);
CREATE INDEX idx_match_court ON tournament_match(court_id);
CREATE INDEX idx_match_status ON tournament_match(status);

-- Multi-column indexes for player queries
CREATE INDEX idx_match_team1 ON tournament_match(team1_player1_id, team1_player2_id);
CREATE INDEX idx_match_team2 ON tournament_match(team2_player1_id, team2_player2_id);

-- Composite index for all players in match (useful for "has player played with/against" queries)
CREATE INDEX idx_match_all_players ON tournament_match(
  team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id
);

-- Trigger for updated_at
CREATE TRIGGER update_tournament_match_updated_at
  BEFORE UPDATE ON tournament_match
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Table: tournament_standing
-- ============================================================================

CREATE TABLE tournament_standing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Match Statistics
  matches_played INTEGER DEFAULT 0 CHECK (matches_played >= 0),
  matches_won INTEGER DEFAULT 0 CHECK (matches_won >= 0),
  matches_drawn INTEGER DEFAULT 0 CHECK (matches_drawn >= 0),
  matches_lost INTEGER DEFAULT 0 CHECK (matches_lost >= 0),

  -- Game Statistics (individual games within matches)
  games_won INTEGER DEFAULT 0 CHECK (games_won >= 0),
  games_lost INTEGER DEFAULT 0 CHECK (games_lost >= 0),
  games_diff INTEGER GENERATED ALWAYS AS (games_won - games_lost) STORED,

  -- Points (calculated based on tournament scoring rules)
  points INTEGER DEFAULT 0 CHECK (points >= 0),

  -- Ranking (calculated, 1 = best)
  rank INTEGER CHECK (rank > 0),

  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(tournament_id, user_id),
  CHECK (matches_played = matches_won + matches_drawn + matches_lost)
);

-- Indexes for performance and ranking queries
CREATE INDEX idx_standing_tournament ON tournament_standing(tournament_id);
CREATE INDEX idx_standing_user ON tournament_standing(user_id);

-- Composite index for ranking (most important for leaderboard queries)
CREATE INDEX idx_standing_rank ON tournament_standing(tournament_id, rank ASC)
  WHERE rank IS NOT NULL;

-- Composite index for points-based sorting (fallback when ranks not calculated)
CREATE INDEX idx_standing_points ON tournament_standing(
  tournament_id,
  points DESC,
  games_diff DESC,
  games_won DESC
);

-- Trigger for updated_at
CREATE TRIGGER update_tournament_standing_updated_at
  BEFORE UPDATE ON tournament_standing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Trigger Functions for Automatic Updates
-- ============================================================================

-- Function: Auto-update standings when match is completed
CREATE OR REPLACE FUNCTION update_standings_on_match_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_tournament_id UUID;
  v_points_win INTEGER;
  v_points_draw INTEGER;
  v_points_loss INTEGER;
BEGIN
  -- Only process if match is being marked as completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Get tournament config
    SELECT t.id, t.points_per_win, t.points_per_draw, t.points_per_loss
    INTO v_tournament_id, v_points_win, v_points_draw, v_points_loss
    FROM tournament t
    JOIN tournament_round r ON r.tournament_id = t.id
    WHERE r.id = NEW.round_id;

    -- Update standings for all 4 players
    -- Team 1 Player 1
    INSERT INTO tournament_standing (tournament_id, user_id, matches_played, matches_won, matches_drawn, matches_lost, games_won, games_lost, points)
    VALUES (
      v_tournament_id,
      NEW.team1_player1_id,
      1,
      CASE WHEN NEW.winner_team = 1 THEN 1 ELSE 0 END,
      CASE WHEN NEW.is_draw THEN 1 ELSE 0 END,
      CASE WHEN NEW.winner_team = 2 THEN 1 ELSE 0 END,
      COALESCE(NEW.team1_score, 0),
      COALESCE(NEW.team2_score, 0),
      CASE
        WHEN NEW.winner_team = 1 THEN v_points_win
        WHEN NEW.is_draw THEN v_points_draw
        ELSE v_points_loss
      END
    )
    ON CONFLICT (tournament_id, user_id) DO UPDATE SET
      matches_played = tournament_standing.matches_played + 1,
      matches_won = tournament_standing.matches_won + CASE WHEN NEW.winner_team = 1 THEN 1 ELSE 0 END,
      matches_drawn = tournament_standing.matches_drawn + CASE WHEN NEW.is_draw THEN 1 ELSE 0 END,
      matches_lost = tournament_standing.matches_lost + CASE WHEN NEW.winner_team = 2 THEN 1 ELSE 0 END,
      games_won = tournament_standing.games_won + COALESCE(NEW.team1_score, 0),
      games_lost = tournament_standing.games_lost + COALESCE(NEW.team2_score, 0),
      points = tournament_standing.points + CASE
        WHEN NEW.winner_team = 1 THEN v_points_win
        WHEN NEW.is_draw THEN v_points_draw
        ELSE v_points_loss
      END,
      updated_at = NOW();

    -- Team 1 Player 2 (same as Player 1)
    INSERT INTO tournament_standing (tournament_id, user_id, matches_played, matches_won, matches_drawn, matches_lost, games_won, games_lost, points)
    VALUES (
      v_tournament_id,
      NEW.team1_player2_id,
      1,
      CASE WHEN NEW.winner_team = 1 THEN 1 ELSE 0 END,
      CASE WHEN NEW.is_draw THEN 1 ELSE 0 END,
      CASE WHEN NEW.winner_team = 2 THEN 1 ELSE 0 END,
      COALESCE(NEW.team1_score, 0),
      COALESCE(NEW.team2_score, 0),
      CASE
        WHEN NEW.winner_team = 1 THEN v_points_win
        WHEN NEW.is_draw THEN v_points_draw
        ELSE v_points_loss
      END
    )
    ON CONFLICT (tournament_id, user_id) DO UPDATE SET
      matches_played = tournament_standing.matches_played + 1,
      matches_won = tournament_standing.matches_won + CASE WHEN NEW.winner_team = 1 THEN 1 ELSE 0 END,
      matches_drawn = tournament_standing.matches_drawn + CASE WHEN NEW.is_draw THEN 1 ELSE 0 END,
      matches_lost = tournament_standing.matches_lost + CASE WHEN NEW.winner_team = 2 THEN 1 ELSE 0 END,
      games_won = tournament_standing.games_won + COALESCE(NEW.team1_score, 0),
      games_lost = tournament_standing.games_lost + COALESCE(NEW.team2_score, 0),
      points = tournament_standing.points + CASE
        WHEN NEW.winner_team = 1 THEN v_points_win
        WHEN NEW.is_draw THEN v_points_draw
        ELSE v_points_loss
      END,
      updated_at = NOW();

    -- Team 2 Player 1
    INSERT INTO tournament_standing (tournament_id, user_id, matches_played, matches_won, matches_drawn, matches_lost, games_won, games_lost, points)
    VALUES (
      v_tournament_id,
      NEW.team2_player1_id,
      1,
      CASE WHEN NEW.winner_team = 2 THEN 1 ELSE 0 END,
      CASE WHEN NEW.is_draw THEN 1 ELSE 0 END,
      CASE WHEN NEW.winner_team = 1 THEN 1 ELSE 0 END,
      COALESCE(NEW.team2_score, 0),
      COALESCE(NEW.team1_score, 0),
      CASE
        WHEN NEW.winner_team = 2 THEN v_points_win
        WHEN NEW.is_draw THEN v_points_draw
        ELSE v_points_loss
      END
    )
    ON CONFLICT (tournament_id, user_id) DO UPDATE SET
      matches_played = tournament_standing.matches_played + 1,
      matches_won = tournament_standing.matches_won + CASE WHEN NEW.winner_team = 2 THEN 1 ELSE 0 END,
      matches_drawn = tournament_standing.matches_drawn + CASE WHEN NEW.is_draw THEN 1 ELSE 0 END,
      matches_lost = tournament_standing.matches_lost + CASE WHEN NEW.winner_team = 1 THEN 1 ELSE 0 END,
      games_won = tournament_standing.games_won + COALESCE(NEW.team2_score, 0),
      games_lost = tournament_standing.games_lost + COALESCE(NEW.team1_score, 0),
      points = tournament_standing.points + CASE
        WHEN NEW.winner_team = 2 THEN v_points_win
        WHEN NEW.is_draw THEN v_points_draw
        ELSE v_points_loss
      END,
      updated_at = NOW();

    -- Team 2 Player 2 (same as Player 1)
    INSERT INTO tournament_standing (tournament_id, user_id, matches_played, matches_won, matches_drawn, matches_lost, games_won, games_lost, points)
    VALUES (
      v_tournament_id,
      NEW.team2_player2_id,
      1,
      CASE WHEN NEW.winner_team = 2 THEN 1 ELSE 0 END,
      CASE WHEN NEW.is_draw THEN 1 ELSE 0 END,
      CASE WHEN NEW.winner_team = 1 THEN 1 ELSE 0 END,
      COALESCE(NEW.team2_score, 0),
      COALESCE(NEW.team1_score, 0),
      CASE
        WHEN NEW.winner_team = 2 THEN v_points_win
        WHEN NEW.is_draw THEN v_points_draw
        ELSE v_points_loss
      END
    )
    ON CONFLICT (tournament_id, user_id) DO UPDATE SET
      matches_played = tournament_standing.matches_played + 1,
      matches_won = tournament_standing.matches_won + CASE WHEN NEW.winner_team = 2 THEN 1 ELSE 0 END,
      matches_drawn = tournament_standing.matches_drawn + CASE WHEN NEW.is_draw THEN 1 ELSE 0 END,
      matches_lost = tournament_standing.matches_lost + CASE WHEN NEW.winner_team = 1 THEN 1 ELSE 0 END,
      games_won = tournament_standing.games_won + COALESCE(NEW.team2_score, 0),
      games_lost = tournament_standing.games_lost + COALESCE(NEW.team1_score, 0),
      points = tournament_standing.points + CASE
        WHEN NEW.winner_team = 2 THEN v_points_win
        WHEN NEW.is_draw THEN v_points_draw
        ELSE v_points_loss
      END,
      updated_at = NOW();

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tournament_match
CREATE TRIGGER trigger_update_standings_on_match_complete
  AFTER INSERT OR UPDATE ON tournament_match
  FOR EACH ROW
  EXECUTE FUNCTION update_standings_on_match_complete();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE tournament IS 'Tournament main table with Americano/Mexicano support';
COMMENT ON TABLE tournament_participant IS 'Registered participants with check-in GPS validation';
COMMENT ON TABLE tournament_round IS 'Generated rounds for tournament progression';
COMMENT ON TABLE tournament_match IS 'Individual matches (4 players, 2v2) within rounds';
COMMENT ON TABLE tournament_standing IS 'Player rankings and statistics, auto-updated';

COMMENT ON COLUMN tournament.type IS 'Tournament format: americano (round-robin) or mexicano (winners/losers)';
COMMENT ON COLUMN tournament.status IS 'Tournament lifecycle: draft → published → in_progress → completed/cancelled';
COMMENT ON COLUMN tournament.settings IS 'JSONB config: auto_advance_rounds, notify_participants, allow_late_checkin';
COMMENT ON COLUMN tournament.geofence_radius_meters IS 'Radius for GPS check-in validation';

COMMENT ON COLUMN tournament_participant.status IS 'Participant state: registered → checked_in (GPS validated) / no_show / withdrawn';
COMMENT ON COLUMN tournament_participant.checked_in_lat IS 'GPS latitude at check-in (for validation)';

COMMENT ON COLUMN tournament_match.winner_team IS 'Winning team (1 or 2), NULL if draw or not completed';
COMMENT ON COLUMN tournament_match.is_draw IS 'True if match ended in a draw';

COMMENT ON COLUMN tournament_standing.games_diff IS 'Games won minus games lost (auto-calculated)';
COMMENT ON COLUMN tournament_standing.rank IS 'Current rank (1 = best), updated after each round';

COMMENT ON FUNCTION update_standings_on_match_complete() IS 'Automatically updates player standings when match is completed';
