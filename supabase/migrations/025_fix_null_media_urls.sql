-- ============================================================================
-- FIX: NULL media_urls Causing Frontend Crashes
-- ============================================================================
-- Fix for production error: "Cannot read properties of undefined (reading 'length')"
-- Date: 2025-10-18
-- Issue: Some posts have media_urls = NULL instead of empty array []
-- ============================================================================

-- Step 1: Update all NULL media_urls to empty array
UPDATE post
SET media_urls = ARRAY[]::TEXT[]
WHERE media_urls IS NULL;

-- Step 2: Add NOT NULL constraint to prevent future NULL values
ALTER TABLE post
ALTER COLUMN media_urls SET NOT NULL;

-- Step 3: Ensure default is still applied
ALTER TABLE post
ALTER COLUMN media_urls SET DEFAULT ARRAY[]::TEXT[];

-- Verification query (should return 0 rows)
-- SELECT COUNT(*) FROM post WHERE media_urls IS NULL;
