-- ============================================================================
-- BASE SCHEMA - Initial Database Setup
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations table (multi-tenant support)
CREATE TABLE IF NOT EXISTS organization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('club', 'group', 'federation')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base user profile (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization membership table
CREATE TABLE IF NOT EXISTS org_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'coach', 'member', 'guest')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_member_org_id ON org_member(org_id);
CREATE INDEX IF NOT EXISTS idx_org_member_user_id ON org_member(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_slug ON organization(slug);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_organization_updated_at
  BEFORE UPDATE ON organization
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_member_updated_at
  BEFORE UPDATE ON org_member
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profile (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- BASE POLICIES - Row Level Security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_member ENABLE ROW LEVEL SECURITY;

-- User Profile Policies
CREATE POLICY "Users can view all profiles"
  ON user_profile FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profile FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profile FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Organization Policies
CREATE POLICY "Anyone can view organizations"
  ON organization FOR SELECT
  USING (true);

CREATE POLICY "Org admins can update their organization"
  ON organization FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_member
      WHERE org_id = organization.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Authenticated users can create organizations"
  ON organization FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Org Member Policies
CREATE POLICY "Users can view memberships of their organizations"
  ON org_member FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_member AS om
      WHERE om.org_id = org_member.org_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage memberships"
  ON org_member FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_member AS om
      WHERE om.org_id = org_member.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can insert themselves as members"
  ON org_member FOR INSERT
  WITH CHECK (auth.uid() = user_id);
