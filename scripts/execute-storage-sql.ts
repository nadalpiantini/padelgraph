import { Client } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function executeSQL() {
  // Read DB password from .env.local
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');

  let password = '';
  envContent.split('\n').forEach((line) => {
    if (line.startsWith('SUPABASE_DB_PASSWORD=')) {
      password = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
    }
  });

  // Also check for DB_PASSWORD
  if (!password) {
    envContent.split('\n').forEach((line) => {
      if (line.startsWith('DB_PASSWORD=')) {
        password = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
      }
    });
  }

  // Check environment variable
  if (!password && process.env.SUPABASE_DB_PASSWORD) {
    password = process.env.SUPABASE_DB_PASSWORD;
  }

  if (!password) {
    console.error('❌ No se encontró SUPABASE_DB_PASSWORD');
    console.log('📋 Variables buscadas: SUPABASE_DB_PASSWORD, DB_PASSWORD');
    console.log('\n💡 Agrega a .env.local:');
    console.log('SUPABASE_DB_PASSWORD=tu_password_aqui');
    process.exit(1);
  }

  const client = new Client({
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.kqftsiohgdzlyfqbhxbc',
    password: password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Conectando a Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado!\n');

    // Read and execute SQL
    const sqlPath = resolve(process.cwd(), 'scripts/create-storage-policies.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📝 Ejecutando políticas de storage...\n');

    await client.query(sql);

    console.log('✅ ¡Políticas creadas exitosamente!\n');
    console.log('🎉 Storage bucket configurado completamente');
    console.log('🧪 Prueba subir tu foto en: http://localhost:3000/profile');
    console.log('\n📸 Instrucciones:');
    console.log('   Desktop: Hover sobre avatar → "Cambiar foto"');
    console.log('   Mobile: Tap en botón de cámara');
  } catch (error: any) {
    console.error('❌ Error ejecutando SQL:', error.message);

    if (error.message?.includes('already exists')) {
      console.log('\n✅ Las políticas ya existen - ¡Todo listo!');
      console.log('🧪 Prueba subir tu foto en: http://localhost:3000/profile');
    } else {
      console.log('\n📋 Ejecuta manualmente en:');
      console.log('   https://supabase.com/dashboard/project/kqftsiohgdzlyfqbhxbc/sql/new');
    }
  } finally {
    await client.end();
  }
}

executeSQL();
