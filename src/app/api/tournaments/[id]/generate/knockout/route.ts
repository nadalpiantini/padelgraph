/**
 * Tournament Generation API - Knockout Format
 *
 * POST /api/tournaments/[id]/generate/knockout - Generate knockout bracket
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import {
  generateKnockoutBracket,
  generateDoubleEliminationBracket,
} from '@/lib/tournament-engine/knockout';
import type { Participant } from '@/lib/tournament-engine/types';

/**
 * POST /api/tournaments/[id]/generate/knockout
 *
 * Generate knockout elimination bracket (single or double)
 *
 * Request Body:
 * - elimination_type: 'single' | 'double'
 * - seeding: 'random' | 'ranked' | 'manual'
 * - seed_order?: string[] (for manual seeding)
 * - bronze_match?: boolean (third place match)
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
    if (
      !tournament.type.startsWith('knockout_')
    ) {
      return ApiResponse.error(
        'Tournament type must be knockout_single or knockout_double',
        400
      );
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
    const {
      seeding = 'ranked',
      seed_order,
      bronze_match = false,
    } = body;

    // Fetch checked-in participants
    const { data: participants, error: participantsError } = await supabase
      .from('tournament_participant')
      .select('*')
      .eq('tournament_id', id)
      .eq('status', 'checked_in');

    if (participantsError || !participants || participants.length === 0) {
      return ApiResponse.error('No checked-in participants found', 400);
    }

    // Generate bracket based on elimination type
    let bracketResult;
    const isDoubles = true; // Padel is always doubles

    if (tournament.type === 'knockout_single') {
      bracketResult = generateKnockoutBracket(
        participants as Participant[],
        seeding,
        seed_order,
        isDoubles
      );
    } else if (tournament.type === 'knockout_double') {
      bracketResult = generateDoubleEliminationBracket(
        participants as Participant[],
        seeding,
        seed_order,
        isDoubles
      );
    } else {
      return ApiResponse.error('Invalid knockout type', 400);
    }

    // Create rounds and bracket structure
    const roundsToInsert: Array<{
      id: string;
      tournament_id: string;
      round_number: number;
      status: 'pending';
    }> = [];
    const bracketsToInsert: Array<{
      tournament_id: string;
      bracket_type: 'main' | 'losers';
      round_number: number;
      position: number;
      match_id: string;
    }> = [];
    const matchesToInsert: Array<{
      id: string;
      round_id: string;
      team1_player1_id: string | null;
      team1_player2_id: string | null;
      team2_player1_id: string | null;
      team2_player2_id: string | null;
      status: string;
      winner_team: number | null;
      is_draw: boolean;
    }> = [];

    // Process bracket rounds
    const processBracket = (
      bracket: typeof bracketResult,
      bracketType: 'main' | 'losers'
    ) => {
      if ('winners' in bracket && 'losers' in bracket) {
        // Double elimination
        processBracket(bracket.winners, 'main');
        processBracket(bracket.losers, 'losers');
        return;
      }

      bracket.rounds.forEach((round) => {
        // Create round entry
        const roundId = `${id}_${bracketType}_r${round.roundNumber}`;
        roundsToInsert.push({
          id: roundId,
          tournament_id: id,
          round_number: round.roundNumber,
          status: 'pending' as const,
        });

        // Create matches for this round
        round.matches.forEach((match, position) => {
          const matchId = `${roundId}_m${position}`;

          matchesToInsert.push({
            id: matchId,
            round_id: roundId,
            team1_player1_id: match.team1_player1_id || null,
            team1_player2_id: match.team1_player2_id || null,
            team2_player1_id: match.team2_player1_id || null,
            team2_player2_id: match.team2_player2_id || null,
            status: match.status || 'pending',
            winner_team: match.winner_team || null,
            is_draw: match.is_draw,
          });

          // Create bracket entry for progression
          bracketsToInsert.push({
            tournament_id: id,
            bracket_type: bracketType,
            round_number: round.roundNumber,
            position,
            match_id: matchId,
          });
        });
      });
    };

    processBracket(bracketResult, 'main');

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

    // Insert bracket structure
    const { error: bracketsError } = await supabase
      .from('tournament_bracket')
      .insert(bracketsToInsert);

    if (bracketsError) {
      console.error('Error creating bracket structure:', bracketsError);
      return ApiResponse.error('Failed to create bracket structure', 500);
    }

    // Initialize standings for all participants
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
          seeding,
          bronze_match,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return ApiResponse.success(
      {
        bracket: bracketResult,
        rounds: roundsToInsert.length,
        matches: matchesToInsert.length,
        participants: participants.length,
      },
      'Knockout bracket generated successfully'
    );
  } catch (error) {
    console.error('Knockout generation error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
