import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: 'ok' | 'error';
    environment: 'ok' | 'error';
  };
  errors?: string[];
}

export async function GET() {
  const errors: string[] = [];
  let dbStatus: 'ok' | 'error' = 'ok';
  let envStatus: 'ok' | 'error' = 'ok';

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      envStatus = 'error';
      errors.push(`Missing environment variable: ${envVar}`);
    }
  }

  // Check database connection
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('organization').select('count');

    if (error) {
      dbStatus = 'error';
      errors.push(`Database error: ${error.message}`);
    }
  } catch (error) {
    dbStatus = 'error';
    errors.push(
      `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  const health: HealthCheck = {
    status: dbStatus === 'ok' && envStatus === 'ok' ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks: {
      database: dbStatus,
      environment: envStatus,
    },
  };

  if (errors.length > 0) {
    health.errors = errors;
  }

  return NextResponse.json(health, {
    status: health.status === 'healthy' ? 200 : 503,
  });
}
