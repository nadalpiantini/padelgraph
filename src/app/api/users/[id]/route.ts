/**
 * User Profile API endpoint
 * GET /api/users/[id] - Get user profile
 */
import { createClient } from '@/lib/supabase/server';
import {
  notFoundResponse,
  serverErrorResponse,
  successResponse,
} from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('*')
      .eq('id', id)
      .single();

    if (profileError || !profile) {
      return notFoundResponse('User');
    }

    return successResponse(profile);
  } catch (error) {
    console.error('[User Profile API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
