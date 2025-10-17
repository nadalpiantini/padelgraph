-- Enable Row Level Security (RLS) on all tables
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_member ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATION POLICIES
-- ============================================================================

-- Allow users to read organizations they're members of
CREATE POLICY "Users can read their organizations"
  ON organization
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_member
      WHERE org_member.org_id = organization.id
      AND org_member.user_id = auth.uid()
    )
  );

-- Allow owners/admins to update their organizations
CREATE POLICY "Owners and admins can update organizations"
  ON organization
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_member
      WHERE org_member.org_id = organization.id
      AND org_member.user_id = auth.uid()
      AND org_member.role IN ('owner', 'admin')
    )
  );

-- Allow authenticated users to create organizations
CREATE POLICY "Authenticated users can create organizations"
  ON organization
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- USER_PROFILE POLICIES
-- ============================================================================

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profile
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to read profiles of people in their organizations
CREATE POLICY "Users can read org member profiles"
  ON user_profile
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_member om1
      JOIN org_member om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = auth.uid()
      AND om2.user_id = user_profile.id
    )
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profile
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profile
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- ORG_MEMBER POLICIES
-- ============================================================================

-- Allow users to read memberships in their organizations
CREATE POLICY "Users can read org memberships"
  ON org_member
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_member om
      WHERE om.org_id = org_member.org_id
      AND om.user_id = auth.uid()
    )
  );

-- Allow owners/admins to insert members
CREATE POLICY "Owners and admins can add members"
  ON org_member
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_member
      WHERE org_member.org_id = org_member.org_id
      AND org_member.user_id = auth.uid()
      AND org_member.role IN ('owner', 'admin')
    )
  );

-- Allow owners/admins to update member roles
CREATE POLICY "Owners and admins can update members"
  ON org_member
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_member om
      WHERE om.org_id = org_member.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Allow owners/admins to remove members (except themselves)
CREATE POLICY "Owners and admins can remove members"
  ON org_member
  FOR DELETE
  USING (
    user_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM org_member om
      WHERE om.org_id = org_member.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Allow users to remove themselves from organizations
CREATE POLICY "Users can remove themselves"
  ON org_member
  FOR DELETE
  USING (user_id = auth.uid());
