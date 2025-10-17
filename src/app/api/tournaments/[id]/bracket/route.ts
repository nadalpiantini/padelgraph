/**
 * Tournament Bracket API
 *
 * GET /api/tournaments/[id]/bracket - Get tournament bracket structure
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';

/**
 * GET /api/tournaments/[id]/bracket
 *
 * Retrieve full bracket structure with progression mapping
 * For knockout, double elimination, monrad, compass tournaments
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.error('Unauthorized', 401);
    }

    // Fetch tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournament')
      .select('*')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
      return ApiResponse.error('Tournament not found', 404);
    }

    // Validate tournament type supports brackets
    const bracketTypes = [
      'knockout_single',
      'knockout_double',
      'monrad',
      'compass',
    ];
    if (!bracketTypes.includes(tournament.type)) {
      return ApiResponse.error(
        'Bracket structure only available for knockout-style tournaments',
        400
      );
    }

    // Fetch bracket structure
    const { data: brackets, error: bracketsError } = await supabase
      .from('tournament_bracket')
      .select('*')
      .eq('tournament_id', id)
      .order('bracket_type', { ascending: true })
      .order('round_number', { ascending: true })
      .order('position', { ascending: true });

    if (bracketsError) {
      console.error('Error fetching brackets:', bracketsError);
      return ApiResponse.error('Failed to fetch brackets', 500);
    }

    // Fetch all tournament matches
    const { data: matches, error: matchesError } = await supabase
      .from('tournament_match')
      .select(
        `
        *,
        tournament_round!inner(tournament_id, round_number)
      `
      )
      .eq('tournament_round.tournament_id', id);

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return ApiResponse.error('Failed to fetch matches', 500);
    }

    // Group brackets by type
    const bracketsByType: Record<string, typeof brackets> = {};
    brackets?.forEach((bracket) => {
      if (!bracketsByType[bracket.bracket_type]) {
        bracketsByType[bracket.bracket_type] = [];
      }
      bracketsByType[bracket.bracket_type].push(bracket);
    });

    // Build progression map
    const progressionMap = brackets?.map((bracket) => ({
      match_id: bracket.match_id,
      bracket_position: {
        type: bracket.bracket_type,
        round: bracket.round_number,
        position: bracket.position,
      },
      winner_from: bracket.winner_from_match_id,
      loser_from: bracket.loser_from_match_id,
    }));

    // Calculate bracket statistics
    const stats = {
      total_brackets: Object.keys(bracketsByType).length,
      total_positions: brackets?.length || 0,
      total_matches: matches?.length || 0,
      completed_matches:
        matches?.filter((m) => m.status === 'completed').length || 0,
    };

    return ApiResponse.success({
      tournament_id: id,
      tournament_type: tournament.type,
      brackets: bracketsByType,
      progression_map: progressionMap,
      matches,
      stats,
    });
  } catch (error) {
    console.error('Bracket retrieval error:', error);
    return ApiResponse.error('Internal server error', 500);
  }
}
