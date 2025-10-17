-- ============================================================================
-- Sprint 3: Advanced Tournament Formats - Row Level Security Policies
-- ============================================================================
-- Created: 2025-10-17
-- Description: RLS policies for tournament_bracket, tournament_group, tournament_fair_play
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE tournament_bracket ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_fair_play ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policies: tournament_bracket
-- ============================================================================

-- Public read: Anyone can view bracket structure
CREATE POLICY "Public can view brackets"
  ON tournament_bracket FOR SELECT
  USING (true);

-- Admin write: Only org admins can manage brackets
CREATE POLICY "Org admins can manage brackets"
  ON tournament_bracket FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournament t
      JOIN org_member om ON om.org_id = t.org_id
      WHERE t.id = tournament_bracket.tournament_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- Policies: tournament_group
-- ============================================================================

-- Public read: Anyone can view groups
CREATE POLICY "Public can view tournament groups"
  ON tournament_group FOR SELECT
  USING (true);

-- Admin write: Only org admins can manage groups
CREATE POLICY "Org admins can manage groups"
  ON tournament_group FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournament t
      JOIN org_member om ON om.org_id = t.org_id
      WHERE t.id = tournament_group.tournament_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- Policies: tournament_fair_play
-- ============================================================================

-- Public read: Anyone can view fair-play incidents
CREATE POLICY "Public can view fair-play incidents"
  ON tournament_fair_play FOR SELECT
  USING (true);

-- Admin create: Only org admins can issue fair-play incidents
CREATE POLICY "Org admins can issue fair-play incidents"
  ON tournament_fair_play FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament t
      JOIN org_member om ON om.org_id = t.org_id
      WHERE t.id = tournament_fair_play.tournament_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Admin update: Only org admins can update fair-play incidents
CREATE POLICY "Org admins can update fair-play incidents"
  ON tournament_fair_play FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournament t
      JOIN org_member om ON om.org_id = t.org_id
      WHERE t.id = tournament_fair_play.tournament_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Admin delete: Only org admins can delete fair-play incidents (within 24h)
CREATE POLICY "Org admins can delete recent fair-play incidents"
  ON tournament_fair_play FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournament t
      JOIN org_member om ON om.org_id = t.org_id
      WHERE t.id = tournament_fair_play.tournament_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
    AND created_at > NOW() - INTERVAL '24 hours'
  );

-- ============================================================================
-- Grant permissions to authenticated users
-- ============================================================================

GRANT SELECT ON tournament_bracket TO authenticated;
GRANT SELECT ON tournament_group TO authenticated;
GRANT SELECT ON tournament_fair_play TO authenticated;

GRANT INSERT, UPDATE, DELETE ON tournament_bracket TO authenticated;
GRANT INSERT, UPDATE, DELETE ON tournament_group TO authenticated;
GRANT INSERT, UPDATE, DELETE ON tournament_fair_play TO authenticated;

-- ============================================================================
-- Documentation Comments
-- ============================================================================

COMMENT ON POLICY "Public can view brackets" ON tournament_bracket IS
  'Anyone can view bracket structure for transparency';

COMMENT ON POLICY "Org admins can manage brackets" ON tournament_bracket IS
  'Only organization admins can create/modify/delete bracket entries';

COMMENT ON POLICY "Public can view tournament groups" ON tournament_group IS
  'Anyone can view group compositions for transparency';

COMMENT ON POLICY "Org admins can manage groups" ON tournament_group IS
  'Only organization admins can create/modify/delete groups';

COMMENT ON POLICY "Public can view fair-play incidents" ON tournament_fair_play IS
  'Anyone can view fair-play incidents for transparency';

COMMENT ON POLICY "Org admins can issue fair-play incidents" ON tournament_fair_play IS
  'Only organization admins can issue cards and penalties';

COMMENT ON POLICY "Org admins can delete recent fair-play incidents" ON tournament_fair_play IS
  'Admins can delete fair-play incidents within 24h (for error correction)';
