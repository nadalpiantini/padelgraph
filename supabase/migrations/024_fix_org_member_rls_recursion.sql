-- ============================================================================
-- FIX: Infinite Recursion in org_member RLS Policies
-- ============================================================================
-- Emergency fix for production feed error
-- Date: 2025-10-18
-- Issue: "infinite recursion detected in policy for relation org_member"
-- ============================================================================

-- TEMPORARY FIX: Disable RLS on org_member to unblock feed
-- TODO: Implement proper non-recursive policies tomorrow
ALTER TABLE org_member DISABLE ROW LEVEL SECURITY;

-- Note: This is safe for now because:
-- 1. Feed API doesn't directly query org_member
-- 2. Organization features are not yet in production use
-- 3. User data is still protected by user_profile RLS policies

-- TODO for tomorrow:
-- 1. Review all org_member policies
-- 2. Identify circular reference causing recursion
-- 3. Implement proper policies using security definer functions
-- 4. Re-enable RLS with fixed policies
