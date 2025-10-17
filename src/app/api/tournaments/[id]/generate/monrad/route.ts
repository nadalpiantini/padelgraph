/**
 * Tournament Generation API - Monrad System Format
 *
 * POST /api/tournaments/[id]/generate/monrad - Generate Monrad hybrid tournament
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { generateMonradTournament } from '@/lib/tournament-engine/monrad';

/**
 * POST /api/tournaments/[id]/generate/monrad
 *
 * Generate Monrad tournament (Swiss → Knockout hybrid)
 *
 * Request Body:
 * - initial_rounds?: number (Swiss rounds, default: auto-calculate)
 * - bracket_size?: number (Knockout size, default: auto-calculate)
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
    if (tournament.type !== 'monrad') {
      return ApiResponse.error('Tournament type must be monrad', 400);
    }

    // Check if tournament already has rounds
    const { data: existingRounds } = await supabase
      .from('tournament_round')
      .select('id')
      .eq('tournament_id', id)
      .limit(1);

    if (existingRounds && existingRounds.length > 0) {
      return ApiResponse.error('Tournament already has generated rounds', 400);
    }

    // Parse request body
    const body = await request.json();
    const { initial_rounds, bracket_size } = body;

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

    // Generate Monrad tournament structure
    const monradResult = generateMonradTournament(
      {
        swissRounds: initial_rounds,
        finalBracketSize: bracket_size,
        pairingMethod: 'slide' as const,
      },
      initialStandings,
      [],
      isDoubles
    );

    // Create Swiss phase rounds
    const roundsToInsert: Array<{
      id: string;
      tournament_id: string;
      round_number: number;
      status: 'pending';
    }> = [];
    const matchesToInsert: Array<{
      round_id: string;
      team1_player1_id: string | null;
      team1_player2_id: string | null;
      team2_player1_id: string | null;
      team2_player2_id: string | null;
      status: string;
      is_draw: boolean;
    }> = [];

    monradResult.phase1.rounds.forEach((round, index) => {
      const roundId = `${id}_swiss_r${index + 1}`;

      roundsToInsert.push({
        id: roundId,
        tournament_id: id,
        round_number: index + 1,
        status: 'pending' as const,
      });

      round.matches.forEach((match) => {
        matchesToInsert.push({
          round_id: roundId,
          team1_player1_id: match.team1_player1_id,
          team1_player2_id: match.team1_player2_id,
          team2_player1_id: match.team2_player1_id,
          team2_player2_id: match.team2_player2_id,
          status: 'pending',
          is_draw: false,
        });
      });
    });

    // Create Knockout phase rounds (TBD - will be filled after Swiss completes)
    monradResult.phase2.bracket.rounds.forEach((round) => {
      const roundId = `${id}_knockout_r${round.roundNumber}`;

      roundsToInsert.push({
        id: roundId,
        tournament_id: id,
        round_number: monradResult.phase1.rounds.length + round.roundNumber,
        status: 'pending' as const,
      });

      round.matches.forEach((_match) => {
        matchesToInsert.push({
          round_id: roundId,
          team1_player1_id: null, // TBD from Swiss qualifiers
          team1_player2_id: null,
          team2_player1_id: null,
          team2_player2_id: null,
          status: 'pending',
          is_draw: false,
        });
      });
    });

    // Insert rounds
    const { error: roundsError } = await supabase
      .from('tournament_round')
      .insert(roundsToInsert);

    if (roundsError) {
      console.error('Error creating rounds:', roundsError);
      return ApiResponse.error('Failed to create rounds', 500);
    }

    // Insert matches
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
          initial_rounds: monradResult.phase1.rounds.length,
          bracket_size: monradResult.phase2.bracket.bracketSize,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return ApiResponse.success(
      {
        swiss_rounds: monradResult.phase1.rounds.length,
        knockout_bracket_size: monradResult.phase2.bracket.bracketSize,
        total_rounds: roundsToInsert.length,
        matches: matchesToInsert.length,
        participants: participants.length,
      },
      'Monrad tournament generated successfully'
    );
  } catch (error) {
    console.error('Monrad generation error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
