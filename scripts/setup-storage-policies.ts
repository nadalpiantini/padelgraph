import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env.local manually
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};

  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#][^=]+)=(.+)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });

  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function setupStoragePolicies() {
  console.log('🔧 Setting up storage RLS policies...\n');

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables');
    console.log('SUPABASE_URL:', SUPABASE_URL);
    process.exit(1);
  }

  const policies = [
    `CREATE POLICY IF NOT EXISTS "Users can upload their own profile images"
     ON storage.objects FOR INSERT TO authenticated
     WITH CHECK (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = 'avatars');`,

    `CREATE POLICY IF NOT EXISTS "Public read access to profile images"
     ON storage.objects FOR SELECT TO public
     USING (bucket_id = 'profile-images');`,

    `CREATE POLICY IF NOT EXISTS "Users can update their own profile images"
     ON storage.objects FOR UPDATE TO authenticated
     USING (bucket_id = 'profile-images') WITH CHECK (bucket_id = 'profile-images');`,

    `CREATE POLICY IF NOT EXISTS "Users can delete their own profile images"
     ON storage.objects FOR DELETE TO authenticated
     USING (bucket_id = 'profile-images');`,
  ];

  console.log('📝 Creating RLS policies via SQL API...\n');

  for (const sql of policies) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ query: sql }),
      });

      const policyName = sql.match(/"([^"]+)"/)?.[1] || 'Unknown';

      if (response.ok || response.status === 409) {
        console.log(`✅ ${policyName}`);
      } else {
        const errorText = await response.text();
        console.log(`⚠️  ${policyName}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error}`);
    }
  }

  console.log('\n✨ Storage policies setup complete!');
  console.log('\n📋 Manual Setup Alternative:');
  console.log('1. Go to Supabase Dashboard');
  console.log('2. Storage > profile-images > Policies');
  console.log('3. Run SQL in: scripts/create-storage-policies.sql');
  console.log('\n🧪 Test avatar upload: http://localhost:3000/profile');
}

setupStoragePolicies()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
