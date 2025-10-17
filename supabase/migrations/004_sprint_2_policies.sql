-- ============================================================================
-- Sprint 2: Tournaments Engine - Row Level Security Policies
-- ============================================================================
-- Created: 2025-10-17
-- Description: RLS policies for tournament tables ensuring secure access
--              Policies handle: org members, participants, admins, public read
-- ============================================================================

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================

ALTER TABLE tournament ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_round ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_match ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_standing ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Check if user is admin or owner of organization
CREATE OR REPLACE FUNCTION is_org_admin(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_member
    WHERE user_id = auth.uid()
      AND org_id = org_uuid
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is participant in tournament
CREATE OR REPLACE FUNCTION is_tournament_participant(tournament_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tournament_participant
    WHERE tournament_id = tournament_uuid
      AND user_id = auth.uid()
      AND status IN ('registered', 'checked_in')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is playing in specific match
CREATE OR REPLACE FUNCTION is_match_player(match_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tournament_match
    WHERE id = match_uuid
      AND (
        team1_player1_id = auth.uid()
        OR team1_player2_id = auth.uid()
        OR team2_player1_id = auth.uid()
        OR team2_player2_id = auth.uid()
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Policies: tournament
-- ============================================================================

-- SELECT: Anyone can view published/in-progress/completed tournaments
CREATE POLICY "tournament_select_public"
  ON tournament FOR SELECT
  USING (
    status IN ('published', 'in_progress', 'completed')
    OR
    is_org_admin(org_id)
    OR
    created_by = auth.uid()
  );

-- INSERT: Only org admins can create tournaments
CREATE POLICY "tournament_insert_org_admin"
  ON tournament FOR INSERT
  WITH CHECK (
    is_org_admin(org_id)
    AND created_by = auth.uid()
  );

-- UPDATE: Only org admins can update tournaments
-- Note: Field-level restrictions (e.g., immutable fields after publishing)
-- should be enforced at the application/API level
CREATE POLICY "tournament_update_org_admin"
  ON tournament FOR UPDATE
  USING (is_org_admin(org_id))
  WITH CHECK (is_org_admin(org_id));

-- DELETE: Only org admins can delete/cancel tournaments
CREATE POLICY "tournament_delete_org_admin"
  ON tournament FOR DELETE
  USING (
    is_org_admin(org_id)
    AND status = 'draft' -- Can only hard-delete drafts
  );

-- ============================================================================
-- Policies: tournament_participant
-- ============================================================================

-- SELECT: Anyone can view participants of public tournaments
-- Participants can view their own registration
-- Org admins can view all participants
CREATE POLICY "participant_select_public"
  ON tournament_participant FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_participant.tournament_id
        AND status IN ('published', 'in_progress', 'completed')
    )
    OR
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_participant.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  );

-- INSERT: Users can register themselves
CREATE POLICY "participant_insert_self"
  ON tournament_participant FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tournament
      WHERE id = tournament_id
        AND status = 'published'
        AND starts_at > NOW()
    )
    AND status = 'registered'
  );

-- UPDATE: Users can check-in themselves or withdraw
-- Admins can force check-in or mark as no-show
-- Note: Status transition rules should be enforced at the application/API level
CREATE POLICY "participant_update_self_or_admin"
  ON tournament_participant FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_participant.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_participant.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  );

-- DELETE: Users can delete their registration before tournament starts
-- Admins can always delete
CREATE POLICY "participant_delete_self_or_admin"
  ON tournament_participant FOR DELETE
  USING (
    (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM tournament
        WHERE id = tournament_id
          AND status IN ('draft', 'published')
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_participant.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  );

-- ============================================================================
-- Policies: tournament_round
-- ============================================================================

-- SELECT: Anyone can view rounds of public tournaments
CREATE POLICY "round_select_public"
  ON tournament_round FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_round.tournament_id
        AND status IN ('published', 'in_progress', 'completed')
    )
    OR
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_round.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  );

-- INSERT: Only system/backend can create rounds (through API)
-- Org admins can trigger round generation via API endpoints
CREATE POLICY "round_insert_admin"
  ON tournament_round FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_round.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  );

-- UPDATE: Only org admins can update rounds
CREATE POLICY "round_update_admin"
  ON tournament_round FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_round.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_round.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  );

-- DELETE: Only org admins can delete rounds (and only if not completed)
CREATE POLICY "round_delete_admin"
  ON tournament_round FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_round.tournament_id
        AND is_org_admin(tournament.org_id)
    )
    AND status != 'completed'
  );

-- ============================================================================
-- Policies: tournament_match
-- ============================================================================

-- SELECT: Anyone can view matches of public tournaments
-- Players can always view their matches
CREATE POLICY "match_select_public"
  ON tournament_match FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament_round r
      JOIN tournament t ON t.id = r.tournament_id
      WHERE r.id = tournament_match.round_id
        AND t.status IN ('published', 'in_progress', 'completed')
    )
    OR
    is_match_player(id)
    OR
    EXISTS (
      SELECT 1 FROM tournament_round r
      JOIN tournament t ON t.id = r.tournament_id
      WHERE r.id = tournament_match.round_id
        AND is_org_admin(t.org_id)
    )
  );

-- INSERT: Only system/backend can create matches (through round generation)
CREATE POLICY "match_insert_admin"
  ON tournament_match FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament_round r
      JOIN tournament t ON t.id = r.tournament_id
      WHERE r.id = tournament_match.round_id
        AND is_org_admin(t.org_id)
    )
  );

-- UPDATE: Players can submit scores OR admins can edit anything
-- Note: Score validation and player immutability should be enforced at the application/API level
CREATE POLICY "match_update_player_or_admin"
  ON tournament_match FOR UPDATE
  USING (
    is_match_player(id)
    OR
    EXISTS (
      SELECT 1 FROM tournament_round r
      JOIN tournament t ON t.id = r.tournament_id
      WHERE r.id = tournament_match.round_id
        AND is_org_admin(t.org_id)
    )
  )
  WITH CHECK (
    is_match_player(id)
    OR
    EXISTS (
      SELECT 1 FROM tournament_round r
      JOIN tournament t ON t.id = r.tournament_id
      WHERE r.id = tournament_match.round_id
        AND is_org_admin(t.org_id)
    )
  );

-- DELETE: Only org admins can delete matches (if round not completed)
CREATE POLICY "match_delete_admin"
  ON tournament_match FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournament_round r
      JOIN tournament t ON t.id = r.tournament_id
      WHERE r.id = tournament_match.round_id
        AND is_org_admin(t.org_id)
        AND r.status != 'completed'
    )
  );

-- ============================================================================
-- Policies: tournament_standing
-- ============================================================================

-- SELECT: Anyone can view standings of public tournaments
CREATE POLICY "standing_select_public"
  ON tournament_standing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_standing.tournament_id
        AND status IN ('published', 'in_progress', 'completed')
    )
    OR
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_standing.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  );

-- INSERT: Only system/backend creates standings (via trigger on match completion)
-- Org admins can manually insert if needed
CREATE POLICY "standing_insert_admin"
  ON tournament_standing FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_standing.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  );

-- UPDATE: Only system/backend updates standings (via trigger on match completion)
-- Org admins can manually adjust if needed (e.g., penalty points)
CREATE POLICY "standing_update_admin"
  ON tournament_standing FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_standing.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_standing.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  );

-- DELETE: Only org admins can delete standings
CREATE POLICY "standing_delete_admin"
  ON tournament_standing FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournament
      WHERE tournament.id = tournament_standing.tournament_id
        AND is_org_admin(tournament.org_id)
    )
  );

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant authenticated users access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON tournament TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tournament_participant TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tournament_round TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tournament_match TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tournament_standing TO authenticated;

-- Grant anon users read-only access to public tournaments
GRANT SELECT ON tournament TO anon;
GRANT SELECT ON tournament_participant TO anon;
GRANT SELECT ON tournament_round TO anon;
GRANT SELECT ON tournament_match TO anon;
GRANT SELECT ON tournament_standing TO anon;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION is_org_admin(UUID) IS 'Check if current user is owner/admin of organization';
COMMENT ON FUNCTION is_tournament_participant(UUID) IS 'Check if current user is registered participant';
COMMENT ON FUNCTION is_match_player(UUID) IS 'Check if current user is playing in match';

COMMENT ON POLICY "tournament_select_public" ON tournament IS 'Anyone can view published tournaments';
COMMENT ON POLICY "tournament_insert_org_admin" ON tournament IS 'Only org admins can create tournaments';
COMMENT ON POLICY "participant_insert_self" ON tournament_participant IS 'Users can self-register';
COMMENT ON POLICY "match_update_player_or_admin" ON tournament_match IS 'Players can submit scores, admins can edit all';
