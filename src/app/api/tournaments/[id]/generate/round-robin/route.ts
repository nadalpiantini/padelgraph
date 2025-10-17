/**
 * Tournament Generation API - Round Robin Format
 *
 * POST /api/tournaments/[id]/generate/round-robin - Generate round robin matches
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import {
  generateRoundRobin,
  generateRoundRobinWithGroups,
} from '@/lib/tournament-engine/round-robin';
import type { Participant } from '@/lib/tournament-engine/types';

/**
 * POST /api/tournaments/[id]/generate/round-robin
 *
 * Generate round robin tournament (simple or with groups)
 *
 * Request Body:
 * - groups?: number (number of groups, default: 1 for simple round robin)
 * - top_per_group?: number (players advancing to playoffs)
 * - include_playoffs?: boolean (include playoff stage)
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
    if (tournament.type !== 'round_robin') {
      return ApiResponse.error('Tournament type must be round_robin', 400);
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
    const { groups = 1, top_per_group = 2, include_playoffs = false } = body;

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

    // Generate round robin matches
    let roundRobinResult;
    let groupsData = null;

    if (groups > 1) {
      // Multiple groups with potential playoffs
      const groupResult = generateRoundRobinWithGroups(
        participants as Participant[],
        groups,
        top_per_group,
        isDoubles
      );
      groupsData = groupResult.groups;
      // Flatten rounds from all groups
      roundRobinResult = groupResult.groups.flatMap((group) => group.rounds);
    } else {
      // Simple round robin (everyone plays everyone)
      roundRobinResult = generateRoundRobin(
        participants as Participant[],
        isDoubles
      );
    }

    // Insert rounds and matches
    const roundsToInsert: Array<{
      id: string;
      tournament_id: string;
      round_number: number;
      status: 'pending';
    }> = [];
    const matchesToInsert: Array<{
      round_id: string;
      team1_player1_id: string;
      team1_player2_id: string;
      team2_player1_id: string;
      team2_player2_id: string;
      status: string;
      is_draw: boolean;
    }> = [];

    roundRobinResult.forEach((round, index) => {
      const roundId = `${id}_r${index + 1}`;

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

    // If groups, create group entries
    if (groupsData) {
      const groupsToInsert = groupsData.map((group, index) => ({
        tournament_id: id,
        group_name: String.fromCharCode(65 + index), // A, B, C, etc
        group_number: index + 1,
        participant_ids: group.participants.map((p: Participant) => p.user_id),
        top_advance: top_per_group,
      }));

      const { error: groupsError } = await supabase
        .from('tournament_group')
        .insert(groupsToInsert);

      if (groupsError) {
        console.error('Error creating groups:', groupsError);
        return ApiResponse.error('Failed to create groups', 500);
      }
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
          groups,
          top_per_group,
          include_playoffs,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return ApiResponse.success(
      {
        rounds: roundsToInsert.length,
        matches: matchesToInsert.length,
        groups: groups > 1 ? groups : null,
        participants: participants.length,
      },
      'Round robin matches generated successfully'
    );
  } catch (error) {
    console.error('Round robin generation error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
