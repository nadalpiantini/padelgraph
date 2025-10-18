import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

const migrations = [
  '020_social_feed_enterprise.sql',
  '021_social_feed_rls.sql',
  '022_storage_media_bucket.sql',
  '023_rpc_functions.sql',
  '024_fix_org_member_rls_recursion.sql',
];

async function applyMigrations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔌 Connecting to Supabase...');
  console.log(`URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`);

  for (const migration of migrations) {
    const filePath = join(process.cwd(), 'supabase', 'migrations', migration);
    console.log(`📄 Applying migration: ${migration}`);

    try {
      const sql = readFileSync(filePath, 'utf-8');

      // Split by statement delimiter (;) and execute one by one
      // This is a simple approach - for production, use proper SQL parser
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let skipCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';

        // Skip comments and empty statements
        if (statement.trim().length < 3) continue;

        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });

          if (error) {
            // Check if it's an "already exists" error
            if (
              error.message.includes('already exists') ||
              error.message.includes('duplicate')
            ) {
              skipCount++;
            } else {
              console.log(`   ⚠️  Statement ${i + 1}: ${error.message.substring(0, 100)}`);
            }
          } else {
            successCount++;
          }
        } catch (err: any) {
          console.log(`   ⚠️  Statement ${i + 1}: ${err.message?.substring(0, 100)}`);
        }
      }

      console.log(
        `✅ ${migration} complete (${successCount} new, ${skipCount} existing)\n`
      );
    } catch (error: any) {
      console.error(`❌ Error reading ${migration}:`, error.message);
    }
  }

  console.log('\n🎉 Migration process complete!');
  console.log('\n📝 Verification:');
  console.log('Run these queries in Supabase SQL Editor to verify:');
  console.log('  SELECT COUNT(*) FROM notification;');
  console.log('  SELECT COUNT(*) FROM follow;');
  console.log('  SELECT COUNT(*) FROM story;');
  console.log('  SELECT * FROM pg_matviews WHERE matviewname = \'mv_trending_hashtags\';');
}

applyMigrations()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
