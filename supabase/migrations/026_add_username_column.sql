-- ============================================================================
-- EMERGENCY FIX: Add username column to user_profile
-- Issue: Code references username but column doesn't exist in schema
-- Impact: POST /api/feed, leaderboard, and 20+ other endpoints failing
-- ============================================================================

-- Step 1: Add username column (nullable initially)
ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS username TEXT;

-- Step 2: Create function to generate unique username from email
CREATE OR REPLACE FUNCTION generate_username_from_email(email_input TEXT)
RETURNS TEXT AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Extract username part from email (before @)
  base_username := LOWER(SPLIT_PART(email_input, '@', 1));

  -- Remove special characters, keep only alphanumeric and underscore
  base_username := REGEXP_REPLACE(base_username, '[^a-z0-9_]', '', 'g');

  -- Ensure it's not empty
  IF base_username = '' OR base_username IS NULL THEN
    base_username := 'user';
  END IF;

  -- Ensure minimum length of 3 characters
  IF LENGTH(base_username) < 3 THEN
    base_username := base_username || '_' || SUBSTRING(MD5(email_input), 1, 3);
  END IF;

  final_username := base_username;

  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM user_profile WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter;
  END LOOP;

  RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Populate username for existing users
-- Priority: Use name if exists and valid, otherwise generate from email
UPDATE user_profile
SET username = CASE
  -- If name exists, is alphanumeric, and unique, use it (lowercase)
  WHEN name IS NOT NULL
    AND LENGTH(REGEXP_REPLACE(LOWER(name), '[^a-z0-9_]', '', 'g')) >= 3
    AND NOT EXISTS (
      SELECT 1 FROM user_profile up2
      WHERE up2.id != user_profile.id
        AND up2.username = REGEXP_REPLACE(LOWER(user_profile.name), '[^a-z0-9_]', '', 'g')
    )
  THEN REGEXP_REPLACE(LOWER(name), '[^a-z0-9_]', '', 'g')

  -- Otherwise generate from email
  ELSE generate_username_from_email(email)
END
WHERE username IS NULL;

-- Step 4: Add constraints after population
ALTER TABLE user_profile
ALTER COLUMN username SET NOT NULL;

ALTER TABLE user_profile
ADD CONSTRAINT username_unique UNIQUE (username);

ALTER TABLE user_profile
ADD CONSTRAINT username_length CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 30);

ALTER TABLE user_profile
ADD CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]+$');

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profile_username ON user_profile(username);

-- Step 6: Add helpful comment
COMMENT ON COLUMN user_profile.username IS 'Unique username for user identification. Auto-generated from email on account creation.';

-- Step 7: Update RLS policies to include username in select queries (if needed)
-- Note: Most policies already use id or email, username is mainly for display

-- Verification query (will be logged)
DO $$
DECLARE
  total_users INTEGER;
  users_with_username INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM user_profile;
  SELECT COUNT(*) INTO users_with_username FROM user_profile WHERE username IS NOT NULL;

  RAISE NOTICE 'Migration complete: % of % users have username assigned', users_with_username, total_users;
END $$;
