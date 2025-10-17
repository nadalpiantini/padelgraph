-- ============================================================================
-- Sprint 3: Advanced Tournament Formats - Database Schema
-- ============================================================================
-- Created: 2025-10-17
-- Description: Advanced tournament formats (Round Robin, Knockout, Swiss, etc)
--              3 new tables: tournament_bracket, tournament_group, tournament_fair_play
--              Updates to: tournament, tournament_standing
-- ============================================================================

-- ============================================================================
-- 1. Update Table: tournament (add new formats)
-- ============================================================================

-- Drop old constraint
ALTER TABLE tournament
  DROP CONSTRAINT tournament_type_check;

-- Add new constraint with all formats
ALTER TABLE tournament
  ADD CONSTRAINT tournament_type_check
  CHECK (type IN (
    'americano',
    'mexicano',
    'round_robin',
    'knockout_single',
    'knockout_double',
    'swiss',
    'monrad',
    'compass'
  ));

-- Add format-specific settings column
ALTER TABLE tournament
  ADD COLUMN format_settings JSONB DEFAULT '{}'::jsonb;

-- Index for format_settings queries
CREATE INDEX idx_tournament_format_settings ON tournament USING gin(format_settings);

-- Comments
COMMENT ON COLUMN tournament.format_settings IS 'Format-specific config (groups, seeding, rounds, etc)';

-- ============================================================================
-- 2. Update Table: tournament_standing (add fair-play columns)
-- ============================================================================

ALTER TABLE tournament_standing
  ADD COLUMN fair_play_points INTEGER DEFAULT 0 CHECK (fair_play_points >= -100 AND fair_play_points <= 100),
  ADD COLUMN yellow_cards INTEGER DEFAULT 0 CHECK (yellow_cards >= 0),
  ADD COLUMN red_cards INTEGER DEFAULT 0 CHECK (red_cards >= 0),
  ADD COLUMN conduct_bonus INTEGER DEFAULT 0 CHECK (conduct_bonus >= 0);

-- Update ranking index to include fair-play
DROP INDEX IF EXISTS idx_standing_points;
CREATE INDEX idx_standing_points ON tournament_standing(
  tournament_id,
  points DESC,
  games_diff DESC,
  fair_play_points DESC,
  games_won DESC
);

-- Comments
COMMENT ON COLUMN tournament_standing.fair_play_points IS 'Fair-play points (penalties/bonuses from conduct)';
COMMENT ON COLUMN tournament_standing.yellow_cards IS 'Yellow cards accumulated';
COMMENT ON COLUMN tournament_standing.red_cards IS 'Red cards accumulated';
COMMENT ON COLUMN tournament_standing.conduct_bonus IS 'Bonus points for positive conduct';

-- ============================================================================
-- 3. New Table: tournament_bracket
-- ============================================================================

CREATE TABLE tournament_bracket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,

  -- Bracket Info
  bracket_type TEXT NOT NULL CHECK (bracket_type IN ('main', 'consolation', 'losers', 'third_place')),
  round_number INTEGER NOT NULL CHECK (round_number > 0),
  position INTEGER NOT NULL CHECK (position >= 0), -- Position in bracket (0=top, 1=second, etc)

  -- Match reference
  match_id UUID REFERENCES tournament_match(id) ON DELETE SET NULL,

  -- Parent matches (for progression)
  winner_from_match_id UUID REFERENCES tournament_match(id) ON DELETE SET NULL,
  loser_from_match_id UUID REFERENCES tournament_match(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, bracket_type, round_number, position)
);

-- Indexes
CREATE INDEX idx_bracket_tournament ON tournament_bracket(tournament_id);
CREATE INDEX idx_bracket_match ON tournament_bracket(match_id);
CREATE INDEX idx_bracket_type ON tournament_bracket(tournament_id, bracket_type);
CREATE INDEX idx_bracket_round ON tournament_bracket(tournament_id, round_number);

-- Comments
COMMENT ON TABLE tournament_bracket IS 'Bracket structure for knockout-style tournaments';
COMMENT ON COLUMN tournament_bracket.bracket_type IS 'Type: main (winners), losers, consolation, third_place';
COMMENT ON COLUMN tournament_bracket.position IS 'Position within the round (0-indexed)';
COMMENT ON COLUMN tournament_bracket.winner_from_match_id IS 'Parent match whose winner advances here';
COMMENT ON COLUMN tournament_bracket.loser_from_match_id IS 'Parent match whose loser advances here (double elimination)';

-- ============================================================================
-- 4. New Table: tournament_group
-- ============================================================================

CREATE TABLE tournament_group (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,

  -- Group Info
  group_name TEXT NOT NULL, -- 'A', 'B', 'C', etc
  group_number INTEGER NOT NULL CHECK (group_number > 0),

  -- Participants in this group
  participant_ids UUID[] NOT NULL,

  -- Settings
  top_advance INTEGER DEFAULT 2 CHECK (top_advance >= 0), -- How many advance to playoffs

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tournament_id, group_number),
  UNIQUE(tournament_id, group_name)
);

-- Indexes
CREATE INDEX idx_group_tournament ON tournament_group(tournament_id);
CREATE INDEX idx_group_participants ON tournament_group USING gin(participant_ids);

-- Comments
COMMENT ON TABLE tournament_group IS 'Groups for round robin tournaments';
COMMENT ON COLUMN tournament_group.group_name IS 'Display name (A, B, C, etc)';
COMMENT ON COLUMN tournament_group.participant_ids IS 'Array of user IDs in this group';
COMMENT ON COLUMN tournament_group.top_advance IS 'Number of top players advancing to playoffs';

-- ============================================================================
-- 5. New Table: tournament_fair_play
-- ============================================================================

CREATE TABLE tournament_fair_play (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES tournament_match(id) ON DELETE SET NULL,

  -- Incident
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'yellow_card',
    'red_card',
    'code_violation',
    'time_violation',
    'unsportsmanlike_conduct',
    'equipment_abuse',
    'positive_conduct'
  )),
  description TEXT,
  severity INTEGER CHECK (severity BETWEEN 1 AND 5),

  -- Points impact
  penalty_points INTEGER DEFAULT 0 CHECK (penalty_points >= 0),
  bonus_points INTEGER DEFAULT 0 CHECK (bonus_points >= 0),

  -- Issued by
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (
    (incident_type = 'positive_conduct' AND bonus_points > 0 AND penalty_points = 0)
    OR
    (incident_type != 'positive_conduct' AND penalty_points >= 0 AND bonus_points = 0)
    OR
    (penalty_points = 0 AND bonus_points = 0)
  )
);

-- Indexes
CREATE INDEX idx_fairplay_tournament ON tournament_fair_play(tournament_id);
CREATE INDEX idx_fairplay_user ON tournament_fair_play(user_id);
CREATE INDEX idx_fairplay_match ON tournament_fair_play(match_id);
CREATE INDEX idx_fairplay_type ON tournament_fair_play(incident_type);
CREATE INDEX idx_fairplay_issued_at ON tournament_fair_play(issued_at DESC);

-- Comments
COMMENT ON TABLE tournament_fair_play IS 'Fair-play incidents and conduct tracking';
COMMENT ON COLUMN tournament_fair_play.incident_type IS 'Type of incident (yellow/red card, violation, positive conduct)';
COMMENT ON COLUMN tournament_fair_play.severity IS 'Severity level 1-5 (1=minor, 5=severe)';
COMMENT ON COLUMN tournament_fair_play.penalty_points IS 'Points deducted from standings';
COMMENT ON COLUMN tournament_fair_play.bonus_points IS 'Points added for positive conduct';
COMMENT ON COLUMN tournament_fair_play.issued_by IS 'Admin/referee who issued the incident';

-- ============================================================================
-- 6. Trigger Functions for Fair-Play
-- ============================================================================

-- Function: Auto-update standings when fair-play incident is issued
CREATE OR REPLACE FUNCTION update_standings_on_fairplay()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the player's standing with fair-play points
  UPDATE tournament_standing
  SET
    fair_play_points = fair_play_points - NEW.penalty_points + NEW.bonus_points,
    yellow_cards = yellow_cards + CASE WHEN NEW.incident_type = 'yellow_card' THEN 1 ELSE 0 END,
    red_cards = red_cards + CASE WHEN NEW.incident_type = 'red_card' THEN 1 ELSE 0 END,
    conduct_bonus = conduct_bonus + NEW.bonus_points,
    updated_at = NOW()
  WHERE tournament_id = NEW.tournament_id
    AND user_id = NEW.user_id;

  -- If standing doesn't exist yet, create it
  INSERT INTO tournament_standing (tournament_id, user_id, fair_play_points, yellow_cards, red_cards, conduct_bonus)
  VALUES (
    NEW.tournament_id,
    NEW.user_id,
    -NEW.penalty_points + NEW.bonus_points,
    CASE WHEN NEW.incident_type = 'yellow_card' THEN 1 ELSE 0 END,
    CASE WHEN NEW.incident_type = 'red_card' THEN 1 ELSE 0 END,
    NEW.bonus_points
  )
  ON CONFLICT (tournament_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tournament_fair_play
CREATE TRIGGER trigger_update_standings_on_fairplay
  AFTER INSERT ON tournament_fair_play
  FOR EACH ROW
  EXECUTE FUNCTION update_standings_on_fairplay();

-- ============================================================================
-- 7. Helper Functions for Bracket Generation
-- ============================================================================

-- Function: Calculate next power of 2 for bracket size
CREATE OR REPLACE FUNCTION next_power_of_2(n INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN POWER(2, CEIL(LOG(2, n)))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get round name based on remaining participants
CREATE OR REPLACE FUNCTION get_round_name(remaining INTEGER)
RETURNS TEXT AS $$
BEGIN
  CASE remaining
    WHEN 2 THEN RETURN 'Final';
    WHEN 4 THEN RETURN 'Semifinales';
    WHEN 8 THEN RETURN 'Cuartos de Final';
    WHEN 16 THEN RETURN 'Octavos de Final';
    WHEN 32 THEN RETURN 'Dieciseisavos de Final';
    ELSE RETURN 'Ronda de ' || remaining::TEXT;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 8. Update existing trigger to handle fair-play in rankings
-- ============================================================================

-- Drop old trigger function
DROP TRIGGER IF EXISTS trigger_update_standings_on_match_complete ON tournament_match;
DROP FUNCTION IF EXISTS update_standings_on_match_complete();

-- Recreate with fair-play awareness
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

    -- Update standings for all 4 players (same as before, but preserving fair-play columns)
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

    -- Team 1 Player 2
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

    -- Team 2 Player 2
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

-- Re-attach trigger
CREATE TRIGGER trigger_update_standings_on_match_complete
  AFTER INSERT OR UPDATE ON tournament_match
  FOR EACH ROW
  EXECUTE FUNCTION update_standings_on_match_complete();

-- ============================================================================
-- 9. Documentation Comments
-- ============================================================================

COMMENT ON FUNCTION next_power_of_2(INTEGER) IS 'Calculate next power of 2 for bracket sizing';
COMMENT ON FUNCTION get_round_name(INTEGER) IS 'Get Spanish name for tournament round (Final, Semifinales, etc)';
COMMENT ON FUNCTION update_standings_on_fairplay() IS 'Auto-update standings when fair-play incident is issued';
