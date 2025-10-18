import { Client } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
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

async function applyStoragePolicies() {
  const env = loadEnv();
  const password = env.SUPABASE_DB_PASSWORD;

  if (!password) {
    console.error('❌ SUPABASE_DB_PASSWORD not found in .env.local');
    process.exit(1);
  }

  const client = new Client({
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.kqftsiohgdzlyfqbhxbc',
    password: password,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🔌 Conectando a Supabase...');
    await client.connect();
    console.log('✅ Conectado\n');

    // Read SQL file
    const sqlContent = readFileSync(
      resolve(process.cwd(), 'scripts/create-storage-policies.sql'),
      'utf-8'
    );

    console.log('📝 Ejecutando políticas de storage...\n');

    // Execute SQL
    const result = await client.query(sqlContent);

    console.log('✅ Políticas creadas exitosamente!\n');

    // Show the verification query results if available
    if (result.rows && result.rows.length > 0) {
      console.log('📊 Políticas activas:');
      result.rows.forEach((row) => {
        console.log(`   - ${row.policyname}`);
      });
    }

    console.log('\n✨ Setup completo!');
    console.log('🧪 Prueba subir tu foto en: http://localhost:3000/profile');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️  Intenta ejecutar el SQL manualmente:');
    console.log('   https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/sql/new');
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyStoragePolicies();
