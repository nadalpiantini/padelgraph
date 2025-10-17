import createMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

// Create i18n middleware
const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Step 1: Update Supabase session (critical for auth to work)
  const supabaseResponse = await updateSession(request);

  // Step 2: Handle i18n routing
  const i18nResponse = handleI18nRouting(request);

  // Step 3: Merge cookies from Supabase into i18n response
  if (i18nResponse) {
    i18nResponse.cookies.getAll().forEach((cookie) => {
      supabaseResponse.cookies.set(cookie);
    });

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      i18nResponse.cookies.set(cookie);
    });

    return i18nResponse;
  }

  return supabaseResponse;
}

export const config = {
  // Exclude /auth/callback and /api routes from middleware
  matcher: ['/', '/(en|es)/:path*', '/((?!_next|_vercel|api|auth/callback|.*\\..*).*)'],
};
