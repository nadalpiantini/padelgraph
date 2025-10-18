/**
 * Apply PayPal Webhook Event Migration
 * Script to manually apply 20251017220000_06_paypal_webhook_events.sql
 *
 * Usage:
 * SUPABASE_DB_PASSWORD="your_password" npx tsx scripts/apply-paypal-migration.ts
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATION_FILE = '20251017220000_06_paypal_webhook_events.sql';

async function applyPayPalMigration() {
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!password) {
    console.error('❌ SUPABASE_DB_PASSWORD environment variable not set');
    console.log('\n💡 Usage:');
    console.log('SUPABASE_DB_PASSWORD="your_password" npx tsx scripts/apply-paypal-migration.ts');
    console.log('\n📝 Get password from:');
    console.log('https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/settings/database');
    process.exit(1);
  }

  const client = new Client({
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.kqftsiohgdzlyfqbhxbc',
    password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Connecting to Supabase production database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    const filePath = join(process.cwd(), 'supabase', 'migrations', MIGRATION_FILE);
    console.log(`📄 Reading migration: ${MIGRATION_FILE}`);

    const sql = readFileSync(filePath, 'utf-8');

    console.log('🚀 Applying migration...\n');
    await client.query(sql);

    console.log('✅ Migration applied successfully!\n');

    // Verify table created
    console.log('🔍 Verifying table creation...');
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_name = 'paypal_webhook_event'
    `);

    if (result.rows[0].count === '1') {
      console.log('✅ Table paypal_webhook_event exists\n');

      // Check indexes
      const indexes = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'paypal_webhook_event'
      `);
      console.log(`✅ ${indexes.rowCount} indexes created`);

      // Check policies
      const policies = await client.query(`
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'paypal_webhook_event'
      `);
      console.log(`✅ ${policies.rowCount} RLS policies created`);

      // Check functions
      const functions = await client.query(`
        SELECT proname
        FROM pg_proc
        WHERE proname IN ('get_failed_webhook_count', 'get_webhook_stats')
      `);
      console.log(`✅ ${functions.rowCount} helper functions created\n`);
    } else {
      console.error('❌ Table verification failed');
    }

    await client.end();
    console.log('\n🎉 PayPal webhook migration complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Test webhook handler: POST /api/paypal/webhook');
    console.log('2. Verify idempotency: Send same webhook twice');
    console.log('3. Check audit trail: SELECT * FROM paypal_webhook_event;');
    console.log('4. Continue with Task #6: Usage Limits Middleware');

  } catch (error: any) {
    console.error('\n❌ Error applying migration:', error.message);

    // Provide helpful error messages
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Objects already exist (this is OK)');
      console.log('The migration has likely been applied previously.');
      process.exit(0);
    }

    if (error.message.includes('connection')) {
      console.log('\n💡 Connection issue. Try:');
      console.log('1. Check if Supabase project is paused (Dashboard)');
      console.log('2. Verify password is correct');
      console.log('3. Check network connection');
    }

    process.exit(1);
  }
}

applyPayPalMigration();
