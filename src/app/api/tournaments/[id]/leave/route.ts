/**
 * Tournament Leave API
 *
 * DELETE /api/tournaments/[id]/leave - Withdraw from tournament
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';

/**
 * DELETE /api/tournaments/[id]/leave
 *
 * Withdraw from tournament
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.error('Unauthorized', 401);
    }

    // Fetch tournament
    const { data: tournament } = await supabase
      .from('tournament')
      .select('status')
      .eq('id', id)
      .single();

    if (!tournament) {
      return ApiResponse.error('Tournament not found', 404);
    }

    // Validate tournament hasn't started
    if (tournament.status === 'in_progress' || tournament.status === 'completed') {
      return ApiResponse.error('Cannot withdraw from tournament that has started', 400);
    }

    // Update participant status to withdrawn
    const { error } = await supabase
      .from('tournament_participant')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('tournament_id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error withdrawing:', error);
      return ApiResponse.error('Failed to withdraw from tournament', 500);
    }

    return ApiResponse.success(null, 'Successfully withdrawn from tournament');
  } catch (error) {
    console.error('Tournament leave error:', error);
    return ApiResponse.error('Internal server error', 500);
  }
}
