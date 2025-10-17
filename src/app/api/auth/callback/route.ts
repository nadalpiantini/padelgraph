import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Auth Callback Handler
 *
 * This route handles the OAuth callback from Supabase Auth.
 * It exchanges the code for a session and redirects the user.
 *
 * Flow:
 * 1. User clicks "Sign in with Email"
 * 2. Supabase sends email with magic link
 * 3. User clicks link → redirects here with code
 * 4. We exchange code for session
 * 5. Redirect to home page with session active
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      // Redirect to auth page with error
      return NextResponse.redirect(
        `${origin}/auth?error=auth_callback_failed&message=${encodeURIComponent(error.message)}`
      );
    }

    // Success - redirect to intended destination or home
    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code provided - redirect to auth page
  return NextResponse.redirect(`${origin}/auth?error=no_code&message=Missing authorization code`);
}
