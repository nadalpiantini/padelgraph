/**
 * Round Completion API
 *
 * POST /api/tournaments/[id]/rounds/[roundId]/complete - Complete round and generate next
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { TournamentEngine } from '@/lib/tournament-engine';
import type { Participant, Court, Standing, Match } from '@/lib/tournament-engine';

/**
 * POST - Complete current round and generate next
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string; roundId: string }> }
) {
  try {
    const { id, roundId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.error('Unauthorized', 401);
    }

    // Check user is admin
    const { data: membership } = await supabase
      .from('org_member')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single();

    if (!membership) {
      return ApiResponse.error('Unauthorized - admin only', 403);
    }

    // Fetch round with tournament
    const { data: round, error: roundError } = await supabase
      .from('tournament_round')
      .select(
        `
        *,
        tournament!inner(*)
      `
      )
      .eq('id', roundId)
      .eq('tournament_id', id)
      .single();

    if (roundError || !round) {
      return ApiResponse.error('Round not found', 404);
    }

    // Validate all matches are completed
    const { data: matches } = await supabase
      .from('tournament_match')
      .select('*')
      .eq('round_id', roundId);

    const allCompleted = matches?.every((m) => m.status === 'completed');
    if (!allCompleted) {
      return ApiResponse.error('Not all matches in this round are completed', 400);
    }

    // Mark round as completed
    await supabase
      .from('tournament_round')
      .update({
        status: 'completed',
        ends_at: new Date().toISOString(),
      })
      .eq('id', roundId);

    // Fetch all tournament participants and standings
    const { data: participants } = await supabase
      .from('tournament_participant')
      .select('*')
      .eq('tournament_id', id);

    const { data: standings } = await supabase
      .from('tournament_standing')
      .select('*')
      .eq('tournament_id', id);

    const { data: allMatches } = await supabase
      .from('tournament_match')
      .select('*, tournament_round!inner(tournament_id)')
      .eq('tournament_round.tournament_id', id);

    // Check if tournament should continue or end
    const isTournamentComplete = TournamentEngine.isTournamentComplete(
      allMatches as Match[]
    );

    if (isTournamentComplete) {
      // Tournament is complete
      await supabase
        .from('tournament')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', id);

      return ApiResponse.success({
        round,
        tournament_complete: true,
        final_standings: standings,
      });
    }

    // Generate next round
    const { data: courts } = await supabase
      .from('court')
      .select('*')
      .eq('org_id', round.tournament.org_id)
      .eq('status', 'active');

    const nextRoundNumber = round.round_number + 1;

    const matchesWithCourts = await TournamentEngine.generateNextRound(
      round.tournament.type,
      (participants || []) as Participant[],
      nextRoundNumber,
      (allMatches || []) as Match[],
      (standings || []) as Standing[],
      (courts || []) as Court[],
      'balanced'
    );

    // Create next round
    const { data: nextRound, error: nextRoundError } = await supabase
      .from('tournament_round')
      .insert({
        tournament_id: id,
        round_number: nextRoundNumber,
        status: 'pending',
      })
      .select()
      .single();

    if (nextRoundError || !nextRound) {
      console.error('Error creating next round:', nextRoundError);
      return ApiResponse.error('Failed to create next round', 500);
    }

    // Insert matches for next round
    const matchesToInsert = matchesWithCourts.map((m) => ({
      round_id: nextRound.id,
      court_id: m.court_id,
      team1_player1_id: m.team1_player1_id,
      team1_player2_id: m.team1_player2_id,
      team2_player1_id: m.team2_player1_id,
      team2_player2_id: m.team2_player2_id,
      status: 'pending',
      is_draw: false,
    }));

    const { data: nextMatches, error: matchesError } = await supabase
      .from('tournament_match')
      .insert(matchesToInsert)
      .select();

    if (matchesError) {
      console.error('Error creating next matches:', matchesError);
      return ApiResponse.error('Failed to create matches for next round', 500);
    }

    // TODO: Send notifications for next round

    return ApiResponse.success({
      completed_round: round,
      next_round: nextRound,
      next_matches: nextMatches,
    });
  } catch (error) {
    console.error('Round completion error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
