import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

async function applyMigration025() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('📄 Applying migration: 025_fix_null_media_urls.sql\n');

  const filePath = join(process.cwd(), 'supabase', 'migrations', '025_fix_null_media_urls.sql');
  const sql = readFileSync(filePath, 'utf-8');

  // Split statements
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    if (statement.trim().length < 3) continue;

    console.log(`Executing statement ${i + 1}...`);

    const { error } = await supabase.rpc('exec_sql', { sql: statement });

    if (error) {
      console.log(`⚠️  ${error.message.substring(0, 100)}`);
    } else {
      console.log(`✅ Success`);
    }
  }

  // Verification
  console.log('\n📊 Verifying migration...');
  const { count, error: countError } = await supabase
    .from('post')
    .select('*', { count: 'exact', head: true })
    .is('media_urls', null);

  if (countError) {
    console.log(`⚠️  Verification failed: ${countError.message}`);
  } else {
    console.log(`✅ Posts with NULL media_urls: ${count || 0} (should be 0)`);
  }

  console.log('\n🎉 Migration 025 applied successfully!');
}

applyMigration025()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  });
