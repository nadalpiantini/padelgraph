/**
 * Tournament API - Individual Tournament Operations
 *
 * GET /api/tournaments/[id] - Get tournament details
 * PUT /api/tournaments/[id] - Update tournament
 * DELETE /api/tournaments/[id] - Cancel tournament
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { updateTournamentSchema } from '@/lib/validations/tournament';

/**
 * GET /api/tournaments/[id]
 *
 * Get tournament details with participants and current round
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

    // Fetch participants
    const { data: participants } = await supabase
      .from('tournament_participant')
      .select(
        `
        *,
        user_profile!inner(
          user_id,
          full_name,
          avatar_url
        )
      `
      )
      .eq('tournament_id', id);

    // Fetch standings
    const { data: standings } = await supabase
      .from('tournament_standing')
      .select('*')
      .eq('tournament_id', id)
      .order('rank', { ascending: true });

    // Fetch current round
    const { data: currentRound } = await supabase
      .from('tournament_round')
      .select('*')
      .eq('tournament_id', id)
      .in('status', ['pending', 'in_progress'])
      .order('round_number', { ascending: true })
      .limit(1)
      .single();

    // Calculate stats
    const { data: allMatches } = await supabase
      .from('tournament_match')
      .select('*, tournament_round!inner(tournament_id)')
      .eq('tournament_round.tournament_id', id);

    const completedMatches = allMatches?.filter((m) => m.status === 'completed').length || 0;
    const totalMatches = allMatches?.length || 0;

    return ApiResponse.success({
      tournament,
      participants: participants || [],
      standings: standings || [],
      current_round: currentRound || null,
      stats: {
        total_matches: totalMatches,
        completed_matches: completedMatches,
        progress_percentage:
          totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Tournament detail error:', error);
    return ApiResponse.error('Internal server error', 500);
  }
}

/**
 * PUT /api/tournaments/[id]
 *
 * Update tournament (only if status='draft')
 */
export async function PUT(
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

    // Check tournament exists and is editable
    const { data: tournament, error: fetchError } = await supabase
      .from('tournament')
      .select('*, org_member!inner(user_id, role)')
      .eq('id', id)
      .eq('org_member.user_id', user.id)
      .in('org_member.role', ['owner', 'admin'])
      .single();

    if (fetchError || !tournament) {
      return ApiResponse.error('Tournament not found or unauthorized', 404);
    }

    if (tournament.status !== 'draft') {
      return ApiResponse.error('Can only edit draft tournaments', 400);
    }

    // Parse and validate updates
    const body = await request.json();
    const validated = updateTournamentSchema.parse(body);

    // Update tournament
    const { data: updated, error: updateError } = await supabase
      .from('tournament')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating tournament:', updateError);
      return ApiResponse.error('Failed to update tournament', 500);
    }

    return ApiResponse.success({ tournament: updated }, 'Tournament updated successfully');
  } catch (error) {
    console.error('Tournament update error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}

/**
 * DELETE /api/tournaments/[id]
 *
 * Cancel tournament (soft delete, sets status='cancelled')
 */
export async function DELETE(
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

    // Check user is admin
    const { data: tournament, error: fetchError } = await supabase
      .from('tournament')
      .select('*, org_member!inner(user_id, role)')
      .eq('id', id)
      .eq('org_member.user_id', user.id)
      .in('org_member.role', ['owner', 'admin'])
      .single();

    if (fetchError || !tournament) {
      return ApiResponse.error('Tournament not found or unauthorized', 404);
    }

    // Soft delete (set status to cancelled)
    const { error: cancelError } = await supabase
      .from('tournament')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (cancelError) {
      console.error('Error cancelling tournament:', cancelError);
      return ApiResponse.error('Failed to cancel tournament', 500);
    }

    return ApiResponse.success(null, 'Tournament cancelled successfully');
  } catch (error) {
    console.error('Tournament delete error:', error);
    return ApiResponse.error('Internal server error', 500);
  }
}
