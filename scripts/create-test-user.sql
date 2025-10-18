-- ============================================================================
-- CREATE TEST USER IN PRODUCTION
-- ============================================================================
-- Run this in Supabase SQL Editor (Production Database)
-- ============================================================================

-- OPTION 1: Create via Supabase Dashboard (RECOMMENDED)
-- ============================================================================
-- 1. Go to: https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc
-- 2. Navigate: Authentication → Users
-- 3. Click: "Add user" → "Create new user"
-- 4. Fill:
--    Email: test@padelgraph.com
--    Password: <strong_password> (save it!)
--    Auto Confirm User: YES
-- 5. Click: Create user
-- 6. Copy user ID for seeding social feed

-- OPTION 2: Create via SQL (Alternative)
-- ============================================================================
-- Note: This is more complex, use Dashboard method above if possible
-- This requires direct access to auth schema which may not be available

-- First, you need the user UUID that Supabase will generate
-- You can get it after creation from: SELECT id FROM auth.users WHERE email = 'test@padelgraph.com';

-- Then create profile entry (run AFTER user is created in auth.users):
-- Replace <USER_UUID> with actual UUID from auth.users

INSERT INTO user_profile (
  id,
  user_id,
  name,
  username,
  email,
  bio,
  level,
  preferred_position,
  elo_rating,
  rank_points,
  ranking_points,
  location_lat,
  location_lng,
  created_at
) VALUES (
  '<USER_UUID>',  -- Same as auth.users.id
  '<USER_UUID>',  -- Reference to auth.users.id
  'Test User',
  'testuser',
  'test@padelgraph.com',
  'E2E Test Account for PadelGraph testing',
  'intermediate',
  'right',
  1200,
  1000,
  1000,
  25.7617,  -- Miami, FL coordinates (or your location)
  -80.1918,
  NOW()
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if user was created successfully
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  p.username,
  p.name,
  p.level
FROM auth.users u
LEFT JOIN user_profile p ON p.user_id = u.id
WHERE u.email = 'test@padelgraph.com';

-- Expected result:
-- id: UUID
-- email: test@padelgraph.com
-- email_confirmed_at: <timestamp> (should be confirmed)
-- username: testuser
-- name: Test User
-- level: intermediate

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If profile doesn't exist, create it:
-- (Get user_id from auth.users first)

-- If user exists but email not confirmed:
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'test@padelgraph.com';

-- ============================================================================
-- SAVE CREDENTIALS
-- ============================================================================

-- Once user is created, save these for E2E tests:
-- Email: test@padelgraph.com
-- Password: <the_password_you_set>
-- User ID: <UUID from query above>
