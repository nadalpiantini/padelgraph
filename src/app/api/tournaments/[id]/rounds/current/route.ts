/**
 * Current Round API
 *
 * GET /api/tournaments/[id]/rounds/current - Get current active round
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';

/**
 * GET /api/tournaments/[id]/rounds/current
 *
 * Get current round with matches and court assignments
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

    // Fetch current round
    const { data: round, error: roundError } = await supabase
      .from('tournament_round')
      .select('*')
      .eq('tournament_id', id)
      .in('status', ['pending', 'in_progress'])
      .order('round_number', { ascending: true })
      .limit(1)
      .single();

    if (roundError || !round) {
      return ApiResponse.error('No active round found', 404);
    }

    // Fetch matches for this round with full details
    const { data: matches, error: matchesError } = await supabase
      .from('tournament_match')
      .select(
        `
        *,
        court:court(id, name),
        team1_player1:user_profile!team1_player1_id(user_id, full_name, avatar_url),
        team1_player2:user_profile!team1_player2_id(user_id, full_name, avatar_url),
        team2_player1:user_profile!team2_player1_id(user_id, full_name, avatar_url),
        team2_player2:user_profile!team2_player2_id(user_id, full_name, avatar_url)
      `
      )
      .eq('round_id', round.id);

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return ApiResponse.error('Failed to fetch matches', 500);
    }

    // Build rotation board structure
    const rotationBoard = matches?.map((m) => ({
      court_id: m.court?.id,
      court_name: m.court?.name,
      match: {
        id: m.id,
        team1: [m.team1_player1, m.team1_player2],
        team2: [m.team2_player1, m.team2_player2],
        team1_score: m.team1_score,
        team2_score: m.team2_score,
        status: m.status,
      },
    }));

    return ApiResponse.success({
      round,
      matches: matches || [],
      rotation_board: rotationBoard || [],
    });
  } catch (error) {
    console.error('Current round error:', error);
    return ApiResponse.error('Internal server error', 500);
  }
}
