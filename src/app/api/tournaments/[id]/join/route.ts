/**
 * Tournament Join API
 *
 * POST /api/tournaments/[id]/join - Register participant for tournament
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';

/**
 * POST /api/tournaments/[id]/join
 *
 * Join tournament as participant
 */
export async function POST(
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

    // Validation: Tournament must be published
    if (tournament.status !== 'published') {
      return ApiResponse.error('Tournament is not open for registration', 400);
    }

    // Check if already registered
    const { data: existing } = await supabase
      .from('tournament_participant')
      .select('*')
      .eq('tournament_id', id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return ApiResponse.error('Already registered for this tournament', 400);
    }

    // Check capacity
    const { count: participantCount } = await supabase
      .from('tournament_participant')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', id)
      .neq('status', 'withdrawn');

    if (participantCount && participantCount >= tournament.max_participants) {
      return ApiResponse.error('Tournament is at full capacity', 400);
    }

    // Register participant
    const { data: participant, error: registerError } = await supabase
      .from('tournament_participant')
      .insert({
        tournament_id: id,
        user_id: user.id,
        status: 'registered',
      })
      .select()
      .single();

    if (registerError) {
      console.error('Error registering participant:', registerError);
      return ApiResponse.error('Failed to register for tournament', 500);
    }

    // TODO: Send registration confirmation notification

    return ApiResponse.success(
      { participant },
      'Successfully registered for tournament',
      201
    );
  } catch (error) {
    console.error('Tournament join error:', error);
    return ApiResponse.error('Internal server error', 500);
  }
}
