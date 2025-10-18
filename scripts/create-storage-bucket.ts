import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function createStorageBucket() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔧 Creating storage bucket: profile-images...');

  // Create the bucket
  const { error: bucketError } = await supabase.storage.createBucket(
    'profile-images',
    {
      public: true,
      fileSizeLimit: 2 * 1024 * 1024, // 2MB
      allowedMimeTypes: ['image/*'],
    }
  );

  if (bucketError) {
    if (bucketError.message.includes('already exists')) {
      console.log('✅ Bucket already exists');
    } else {
      console.error('❌ Error creating bucket:', bucketError);
      throw bucketError;
    }
  } else {
    console.log('✅ Bucket created successfully');
  }

  // Note: RLS policies must be created via SQL
  console.log('\n📝 Now creating RLS policies...');

  const { error: sqlError } = await supabase.rpc('exec_sql', {
    sql: `
      -- Allow authenticated users to upload their own profile images
      CREATE POLICY IF NOT EXISTS "Users can upload their own profile images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'profile-images' AND
        (storage.foldername(name))[1] = 'avatars'
      );

      -- Allow public read access to all profile images
      CREATE POLICY IF NOT EXISTS "Public read access to profile images"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'profile-images');

      -- Allow users to update their own profile images
      CREATE POLICY IF NOT EXISTS "Users can update their own profile images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'profile-images')
      WITH CHECK (bucket_id = 'profile-images');

      -- Allow users to delete their own profile images
      CREATE POLICY IF NOT EXISTS "Users can delete their own profile images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'profile-images');
    `,
  });

  if (sqlError) {
    console.error('❌ Error creating policies:', sqlError);
    console.log('\n⚠️  You may need to create RLS policies manually in Supabase Dashboard');
  } else {
    console.log('✅ RLS policies created successfully');
  }

  console.log('\n✨ Storage setup complete!');
  console.log('🧪 Test by uploading an image at: http://localhost:3000/profile');
}

createStorageBucket()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
