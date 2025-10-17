/**
 * Bracket Advancement API
 *
 * PUT /api/brackets/[id]/advance - Advance winner to next round
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { BracketProgressionService } from '@/lib/tournament-engine/bracket-progression';

/**
 * PUT /api/brackets/[id]/advance
 *
 * Advance winner to next bracket position
 * Automatically called after match score submission
 *
 * Request Body:
 * - match_id: string
 * - winner_id: string (player 1 of winning team)
 * - winner_partner_id: string (player 2 of winning team)
 * - loser_id: string (player 1 of losing team)
 * - loser_partner_id: string (player 2 of losing team)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: _bracketId } = await context.params;
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
    const {
      match_id,
      winner_id,
      winner_partner_id,
      loser_id,
      loser_partner_id,
    } = body;

    if (!match_id || !winner_id || !winner_partner_id) {
      return ApiResponse.error('Missing required fields', 400);
    }

    // Fetch match to get tournament info
    const { data: match, error: matchError } = await supabase
      .from('tournament_match')
      .select(
        `
        *,
        tournament_round!inner(
          tournament_id,
          tournament!inner(type, org_id)
        )
      `
      )
      .eq('id', match_id)
      .single();

    if (matchError || !match) {
      return ApiResponse.error('Match not found', 404);
    }

    // Verify user is admin of tournament's organization
    const { data: orgMember } = await supabase
      .from('org_member')
      .select('role')
      .eq('org_id', match.tournament_round.tournament.org_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single();

    if (!orgMember) {
      return ApiResponse.error('Unauthorized - Admin access required', 403);
    }

    // Validate match is completed
    if (match.status !== 'completed') {
      return ApiResponse.error('Match must be completed first', 400);
    }

    // Initialize bracket progression service
    const progressionService = new BracketProgressionService();

    // Advance winner to next round
    const result = await progressionService.advanceWinner(
      match_id,
      winner_id,
      winner_partner_id,
      loser_id,
      loser_partner_id,
      match.tournament_round.tournament.type
    );

    if (!result.success) {
      return ApiResponse.error(result.message, 400);
    }

    // Check if tournament is complete
    if (result.isComplete) {
      // Update tournament status to completed
      await supabase
        .from('tournament')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.tournament_round.tournament_id);
    }

    return ApiResponse.success(
      {
        next_match_id: result.nextMatchId,
        next_bracket_position: result.nextBracketPosition,
        tournament_complete: result.isComplete,
      },
      result.message
    );
  } catch (error) {
    console.error('Bracket advancement error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
