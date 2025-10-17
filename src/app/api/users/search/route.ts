/**
 * User Search API
 *
 * GET /api/users/search?email=... - Find user by email
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';

/**
 * GET /api/users/search?email=...
 *
 * Find user by email (authenticated users only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.error('Unauthorized', 401);
    }

    // Get email from query
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return ApiResponse.error('Email parameter required', 400);
    }

    // Find user by email
    const { data: profile, error } = await supabase
      .from('profile')
      .select('id, name, email, avatar_url')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !profile) {
      return ApiResponse.error('User not found', 404);
    }

    return ApiResponse.success({ user: profile });
  } catch (error) {
    console.error('User search error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
