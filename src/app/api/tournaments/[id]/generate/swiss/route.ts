/**
 * Tournament Generation API - Swiss System Format
 *
 * POST /api/tournaments/[id]/generate/swiss - Generate Swiss system rounds
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { generateSwissRound } from '@/lib/tournament-engine/swiss';

/**
 * POST /api/tournaments/[id]/generate/swiss
 *
 * Generate first round of Swiss system
 * Subsequent rounds generated after each round completion
 *
 * Request Body:
 * - total_rounds: number (typical: 5-7)
 * - pairing_method: 'slide' | 'fold' | 'accelerated'
 */
export async function POST(
  request: NextRequest,
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
      .select('*, org_member!inner(user_id, role)')
      .eq('id', id)
      .eq('org_member.user_id', user.id)
      .in('org_member.role', ['owner', 'admin'])
      .single();

    if (tournamentError || !tournament) {
      return ApiResponse.error('Tournament not found or unauthorized', 404);
    }

    // Validate tournament type
    if (tournament.type !== 'swiss') {
      return ApiResponse.error('Tournament type must be swiss', 400);
    }

    // Parse request body
    const body = await request.json();
    const { total_rounds = 5, pairing_method = 'slide' } = body;

    // Fetch checked-in participants
    const { data: participants, error: participantsError } = await supabase
      .from('tournament_participant')
      .select('*')
      .eq('tournament_id', id)
      .eq('status', 'checked_in');

    if (participantsError || !participants || participants.length === 0) {
      return ApiResponse.error('No checked-in participants found', 400);
    }

    const isDoubles = true; // Padel is always doubles

    // Create initial standings (empty for new tournament)
    const initialStandings = participants.map((p) => ({
      tournament_id: id,
      user_id: p.user_id,
      matches_played: 0,
      matches_won: 0,
      matches_drawn: 0,
      matches_lost: 0,
      games_won: 0,
      games_lost: 0,
      games_diff: 0,
      points: 0,
      fair_play_points: 0,
      yellow_cards: 0,
      red_cards: 0,
      conduct_bonus: 0,
    }));

    // Generate first round (random or ranked pairing)
    const firstRoundMatches = generateSwissRound(
      {
        roundNumber: 1,
        pairingMethod: pairing_method,
        standings: initialStandings,
        previousMatches: [],
      },
      isDoubles
    );

    // Create round
    const roundId = `${id}_r1`;
    const { error: roundError } = await supabase
      .from('tournament_round')
      .insert({
        id: roundId,
        tournament_id: id,
        round_number: 1,
        status: 'pending',
      });

    if (roundError) {
      console.error('Error creating round:', roundError);
      return ApiResponse.error('Failed to create round', 500);
    }

    // Insert matches
    const matchesToInsert = firstRoundMatches.map((match) => ({
      round_id: roundId,
      team1_player1_id: match.team1_player1_id,
      team1_player2_id: match.team1_player2_id,
      team2_player1_id: match.team2_player1_id,
      team2_player2_id: match.team2_player2_id,
      status: 'pending',
      is_draw: false,
    }));

    const { error: matchesError } = await supabase
      .from('tournament_match')
      .insert(matchesToInsert);

    if (matchesError) {
      console.error('Error creating matches:', matchesError);
      return ApiResponse.error('Failed to create matches', 500);
    }

    // Initialize standings
    const standingsToInsert = participants.map((p) => ({
      tournament_id: id,
      user_id: p.user_id,
      matches_played: 0,
      matches_won: 0,
      matches_drawn: 0,
      matches_lost: 0,
      games_won: 0,
      games_lost: 0,
      points: 0,
      fair_play_points: 0,
      yellow_cards: 0,
      red_cards: 0,
      conduct_bonus: 0,
    }));

    await supabase.from('tournament_standing').insert(standingsToInsert);

    // Update tournament status
    await supabase
      .from('tournament')
      .update({
        status: 'in_progress',
        format_settings: {
          ...tournament.format_settings,
          total_rounds,
          pairing_method,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return ApiResponse.success(
      {
        round: 1,
        total_rounds,
        matches: matchesToInsert.length,
        participants: participants.length,
      },
      'Swiss Round 1 generated successfully'
    );
  } catch (error) {
    console.error('Swiss generation error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
