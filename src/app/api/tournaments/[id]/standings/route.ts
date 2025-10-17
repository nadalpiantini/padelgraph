/**
 * Tournament Standings API
 *
 * GET /api/tournaments/[id]/standings - Get current standings
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';

/**
 * GET /api/tournaments/[id]/standings
 *
 * Get current standings sorted by rank
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.error('Unauthorized', 401);
    }

    // Fetch tournament
    const { data: tournament } = await supabase
      .from('tournament')
      .select('id')
      .eq('id', id)
      .single();

    if (!tournament) {
      return ApiResponse.error('Tournament not found', 404);
    }

    // Fetch standings with user profiles
    const { data: standings, error } = await supabase
      .from('tournament_standing')
      .select(
        `
        *,
        user_profile!inner(
          user_id,
          full_name,
          avatar_url
        )
      `
      )
      .eq('tournament_id', id)
      .order('rank', { ascending: true });

    if (error) {
      console.error('Error fetching standings:', error);
      return ApiResponse.error('Failed to fetch standings', 500);
    }

    return ApiResponse.success({ standings: standings || [] });
  } catch (error) {
    console.error('Standings error:', error);
    return ApiResponse.error('Internal server error', 500);
  }
}
