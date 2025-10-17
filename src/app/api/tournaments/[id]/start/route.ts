/**
 * Tournament Start API
 *
 * POST /api/tournaments/[id]/start - Start tournament and generate first round
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { startTournamentSchema } from '@/lib/validations/tournament';
import { TournamentEngine } from '@/lib/tournament-engine';
import {
  notifyTournamentStarts,
  notifyMatchAssigned,
} from '@/lib/notifications/tournament';
import type {
  Participant,
  Court,
} from '@/lib/tournament-engine';

/**
 * POST /api/tournaments/[id]/start
 *
 * Start tournament and generate Round 1
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

    // Parse request body
    const body = await request.json();
    const validated = startTournamentSchema.parse(body);

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

    // Validation: Tournament must be published
    if (tournament.status !== 'published') {
      return ApiResponse.error('Tournament must be published to start', 400);
    }

    // Check if tournament already started
    const { data: existingRounds } = await supabase
      .from('tournament_round')
      .select('id')
      .eq('tournament_id', id)
      .limit(1);

    if (existingRounds && existingRounds.length > 0) {
      return ApiResponse.error('Tournament already started', 400);
    }

    // Fetch participants
    const { data: participants, error: participantsError } = await supabase
      .from('tournament_participant')
      .select('*')
      .eq('tournament_id', id);

    if (participantsError || !participants) {
      return ApiResponse.error('Failed to fetch participants', 500);
    }

    // Fetch courts
    let courtsQuery = supabase
      .from('court')
      .select('*')
      .eq('org_id', tournament.org_id)
      .eq('status', 'active');

    if (validated.court_ids && validated.court_ids.length > 0) {
      courtsQuery = courtsQuery.in('id', validated.court_ids);
    }

    const { data: courts, error: courtsError } = await courtsQuery;

    if (courtsError || !courts || courts.length === 0) {
      return ApiResponse.error('No active courts available', 400);
    }

    // Validate tournament can start
    const validation = TournamentEngine.validateTournamentStart(
      participants as Participant[],
      courts as Court[]
    );

    if (!validation.valid) {
      return ApiResponse.error(
        `Cannot start tournament: ${validation.errors.join(', ')}`,
        400
      );
    }

    // Generate Round 1 using Tournament Engine (config will be used for standings later)
    const matchesWithCourts = await TournamentEngine.generateNextRound(
      tournament.type,
      participants as Participant[],
      1, // Round 1
      [], // No previous matches
      [], // No standings yet
      courts as Court[],
      validated.court_strategy
    );

    // Create Round 1 in database
    const { data: round, error: roundError } = await supabase
      .from('tournament_round')
      .insert({
        tournament_id: id,
        round_number: 1,
        status: 'pending',
        starts_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (roundError || !round) {
      console.error('Error creating round:', roundError);
      return ApiResponse.error('Failed to create round', 500);
    }

    // Insert matches
    const matchesToInsert = matchesWithCourts.map((m) => ({
      round_id: round.id,
      court_id: m.court_id,
      team1_player1_id: m.team1_player1_id,
      team1_player2_id: m.team1_player2_id,
      team2_player1_id: m.team2_player1_id,
      team2_player2_id: m.team2_player2_id,
      status: 'pending',
      is_draw: false,
    }));

    const { data: matches, error: matchesError } = await supabase
      .from('tournament_match')
      .insert(matchesToInsert)
      .select();

    if (matchesError || !matches) {
      console.error('Error creating matches:', matchesError);
      return ApiResponse.error('Failed to create matches', 500);
    }

    // Initialize standings for all participants
    const standingsToInsert = participants
      .filter((p) => p.status === 'checked_in')
      .map((p) => ({
        tournament_id: id,
        user_id: p.user_id,
        matches_played: 0,
        matches_won: 0,
        matches_drawn: 0,
        matches_lost: 0,
        games_won: 0,
        games_lost: 0,
        points: 0,
      }));

    await supabase.from('tournament_standing').insert(standingsToInsert);

    // Update tournament status to in_progress
    await supabase
      .from('tournament')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Send tournament start notifications to all checked-in participants
    try {
      await notifyTournamentStarts(id);
    } catch (notifError) {
      console.error('[Notification] Tournament start failed:', notifError);
    }

    // Send match assignment notifications for all Round 1 matches
    try {
      await Promise.all(
        matches.map((match) => notifyMatchAssigned(match.id).catch((err) => {
          console.error(`[Notification] Match assigned failed for ${match.id}:`, err);
        }))
      );
    } catch (notifError) {
      console.error('[Notification] Match assignments failed:', notifError);
    }

    return ApiResponse.success(
      {
        round,
        matches,
        warnings: validation.warnings,
      },
      'Tournament started successfully'
    );
  } catch (error) {
    console.error('Tournament start error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
