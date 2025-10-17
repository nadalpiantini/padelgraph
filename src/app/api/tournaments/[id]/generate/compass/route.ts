/**
 * Tournament Generation API - Compass Draw Format
 *
 * POST /api/tournaments/[id]/generate/compass - Generate Compass Draw brackets
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { generateCompassDraw } from '@/lib/tournament-engine/compass';
import type { Participant } from '@/lib/tournament-engine/types';

/**
 * POST /api/tournaments/[id]/generate/compass
 *
 * Generate Compass Draw (main + 6 consolation brackets)
 *
 * Request Body:
 * - seeding?: 'random' | 'ranked' (default: 'ranked')
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
    if (tournament.type !== 'compass') {
      return ApiResponse.error('Tournament type must be compass', 400);
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
    const { seeding = 'ranked' } = body;

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

    // Generate Compass Draw structure
    const compassResult = generateCompassDraw(
      participants as Participant[],
      seeding,
      undefined, // seed_order (optional)
      isDoubles
    );

    // Create rounds and bracket entries
    const roundsToInsert: Array<{
      id: string;
      tournament_id: string;
      round_number: number;
      status: 'pending';
    }> = [];
    const matchesToInsert: Array<{
      id?: string;
      round_id: string;
      team1_player1_id: string | null;
      team1_player2_id: string | null;
      team2_player1_id: string | null;
      team2_player2_id: string | null;
      status: string;
      winner_team?: number | null;
      is_draw: boolean;
    }> = [];
    const bracketsToInsert: Array<{
      tournament_id: string;
      bracket_type: 'main' | 'consolation';
      round_number: number;
      position: number;
      match_id?: string | null;
    }> = [];

    // Process main draw
    compassResult.mainDraw.rounds.forEach((round) => {
      const roundId = `${id}_main_r${round.roundNumber}`;

      roundsToInsert.push({
        id: roundId,
        tournament_id: id,
        round_number: round.roundNumber,
        status: 'pending' as const,
      });

      round.matches.forEach((match, position) => {
        const matchId = `${roundId}_m${position}`;

        matchesToInsert.push({
          id: matchId,
          round_id: roundId,
          team1_player1_id: match.team1_player1_id,
          team1_player2_id: match.team1_player2_id,
          team2_player1_id: match.team2_player1_id,
          team2_player2_id: match.team2_player2_id,
          status: match.status || 'pending',
          winner_team: match.winner_team || null,
          is_draw: match.is_draw,
        });

        bracketsToInsert.push({
          tournament_id: id,
          bracket_type: 'main' as const,
          round_number: round.roundNumber,
          position,
          match_id: matchId,
        });
      });
    });

    // Process consolation brackets (East, West, NE, SE, NW, SW)
    Object.entries(compassResult.consolationBrackets).forEach(
      ([bracketName, bracket]) => {
        if (!bracket) return; // Skip null brackets
        bracket.rounds.forEach((round) => {
          const roundId = `${id}_${bracketName}_r${round.roundNumber}`;

          roundsToInsert.push({
            id: roundId,
            tournament_id: id,
            round_number: 100 + round.roundNumber, // Offset for consolation
            status: 'pending' as const,
          });

          round.matches.forEach((_match, position) => {
            matchesToInsert.push({
              round_id: roundId,
              team1_player1_id: null, // TBD from main draw losers
              team1_player2_id: null,
              team2_player1_id: null,
              team2_player2_id: null,
              status: 'pending',
              is_draw: false,
            });

            bracketsToInsert.push({
              tournament_id: id,
              bracket_type: 'consolation' as const,
              round_number: 100 + round.roundNumber,
              position,
              match_id: null, // Will be created when losers are routed
            });
          });
        });
      }
    );

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
          seeding,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return ApiResponse.success(
      {
        main_draw_rounds: compassResult.mainDraw.rounds.length,
        consolation_brackets: 6,
        total_rounds: roundsToInsert.length,
        matches: matchesToInsert.length,
        participants: participants.length,
      },
      'Compass Draw generated successfully'
    );
  } catch (error) {
    console.error('Compass generation error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
