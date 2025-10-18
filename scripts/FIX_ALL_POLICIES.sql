-- ═══════════════════════════════════════════════════════════════
-- EJECUTA ESTO EN SUPABASE SQL EDITOR - ARREGLA TODO
-- ═══════════════════════════════════════════════════════════════
-- URL: https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/sql/new
-- ═══════════════════════════════════════════════════════════════

-- 🔧 PARTE 1: Arreglar políticas de PayPal (elimina duplicados)
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Service role full access" ON paypal_webhook_event;
DROP POLICY IF EXISTS "Admins can view webhook logs" ON paypal_webhook_event;

CREATE POLICY "Service role full access" ON paypal_webhook_event
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view webhook logs" ON paypal_webhook_event
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profile
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- 🖼️ PARTE 2: Crear políticas de Storage para Avatar Upload
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;

CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = 'avatars');

CREATE POLICY "Public read access to profile images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-images')
WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-images');

-- ✅ VERIFICACIÓN: Muestra las políticas creadas
-- ═══════════════════════════════════════════════════════════════

SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('paypal_webhook_event', 'objects')
ORDER BY tablename, policyname;
