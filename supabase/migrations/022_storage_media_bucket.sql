-- ============================================================================
-- SUPABASE STORAGE CONFIGURATION FOR MEDIA UPLOADS
-- ============================================================================
-- Creates 'media' bucket for posts, stories, and profile media
-- Configures RLS policies for secure uploads
-- ============================================================================

-- ============================================================================
-- 1. CREATE MEDIA BUCKET
-- ============================================================================

-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false, -- Private bucket (files accessible via signed URLs)
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm'
  ]::text[];

-- ============================================================================
-- 2. STORAGE RLS POLICIES
-- ============================================================================

-- Note: Storage RLS is managed by Supabase automatically
-- Policies are created directly without ALTER TABLE statement

-- Drop existing policies to avoid conflicts (if they exist)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "media_upload_own" ON storage.objects;
  DROP POLICY IF EXISTS "media_read_own" ON storage.objects;
  DROP POLICY IF EXISTS "media_delete_own" ON storage.objects;
  DROP POLICY IF EXISTS "media_update_own" ON storage.objects;
EXCEPTION
  WHEN insufficient_privilege THEN
    -- Ignore if we don't have permissions, storage is already configured
    NULL;
END $$;

-- Users can upload to their own folder in media bucket
CREATE POLICY "media_upload_own" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read from media bucket (for viewing posts/stories)
-- Note: For private bucket, this allows authenticated users to read
-- For public access, use signed URLs from API
CREATE POLICY "media_read_own" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'media'
    AND (
      -- Own media
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      -- Media from posts/stories they can access (checked via API)
      auth.role() = 'authenticated'
    )
  );

-- Users can update (rename) their own media
CREATE POLICY "media_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own media
CREATE POLICY "media_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 3. HELPER FUNCTIONS FOR MEDIA
-- ============================================================================

-- Function to generate unique media path
CREATE OR REPLACE FUNCTION generate_media_path(
  user_id UUID,
  file_extension TEXT
)
RETURNS TEXT AS $$
DECLARE
  timestamp_str TEXT;
  random_uuid TEXT;
BEGIN
  timestamp_str := EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
  random_uuid := REPLACE(gen_random_uuid()::TEXT, '-', '');
  RETURN user_id::TEXT || '/' || timestamp_str || '_' || random_uuid || '.' || file_extension;
END;
$$ LANGUAGE plpgsql;

-- Function to validate media type
CREATE OR REPLACE FUNCTION is_valid_media_type(
  mime_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN mime_type = ANY(ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm'
  ]);
END;
$$ LANGUAGE plpgsql;

-- Function to check if file is image
CREATE OR REPLACE FUNCTION is_image(mime_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN mime_type LIKE 'image/%';
END;
$$ LANGUAGE plpgsql;

-- Function to check if file is video
CREATE OR REPLACE FUNCTION is_video(mime_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN mime_type LIKE 'video/%';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. CORS CONFIGURATION (Manual step required)
-- ============================================================================

-- CORS cannot be configured via SQL migration.
-- After running this migration, configure CORS in Supabase Dashboard:
--
-- Go to Storage > Configuration > CORS
-- Add allowed origins:
-- - http://localhost:3000 (development)
-- - https://padelgraph.com (production)
-- - https://*.vercel.app (Vercel previews)
--
-- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
-- Allowed headers: authorization, x-client-info, apikey, content-type, cache-control, x-requested-with
-- Exposed headers: content-length, content-type
-- Max age: 3600

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Media bucket 'media' has been created with RLS policies.
--
-- Next steps:
-- 1. Configure CORS in Supabase Dashboard (see section 4 above)
-- 2. Test upload with signed URLs via /api/media/sign endpoint
-- 3. Verify RLS policies work correctly
--
-- File structure in bucket:
-- media/
--   ├── {user_id_1}/
--   │   ├── {timestamp}_{uuid}.jpg
--   │   ├── {timestamp}_{uuid}.mp4
--   │   └── ...
--   ├── {user_id_2}/
--   │   └── ...
--   └── ...
-- ============================================================================
