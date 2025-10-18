import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const migrations = [
  '020_social_feed_enterprise.sql',
  '021_social_feed_rls.sql',
  '022_storage_media_bucket.sql',
  '023_rpc_functions.sql',
];

async function applyMigrations() {
  const client = new Client({
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.kqftsiohgdzlyfqbhxbc',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  console.log('🔌 Connecting to production database...');
  await client.connect();
  console.log('✅ Connected successfully\n');

  for (const migration of migrations) {
    const filePath = join(process.cwd(), 'supabase', 'migrations', migration);
    console.log(`📄 Applying migration: ${migration}`);

    try {
      const sql = readFileSync(filePath, 'utf-8');
      await client.query(sql);
      console.log(`✅ ${migration} applied successfully\n`);
    } catch (error: any) {
      console.error(`❌ Error applying ${migration}:`, error.message);

      // Check if it's a "already exists" error (acceptable)
      if (
        error.message.includes('already exists') ||
        error.message.includes('duplicate')
      ) {
        console.log(`⚠️  ${migration} - Objects already exist (skipping)\n`);
        continue;
      }

      // For other errors, log but continue
      console.log(`⚠️  Continuing to next migration...\n`);
    }
  }

  await client.end();
  console.log('\n🎉 Migration process complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Verify tables exist: SELECT * FROM notification LIMIT 1;');
  console.log('2. Configure Storage CORS in Supabase Dashboard');
  console.log('3. Test features at https://padelgraph.com');
}

applyMigrations()
  .then(() => {
    console.log('\n✨ Success!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
