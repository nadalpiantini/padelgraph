/**
 * Manual Check-In API (Admin)
 *
 * POST /api/tournaments/[id]/participants/[userId]/check-in - Force check-in without GPS
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';

/**
 * POST /api/tournaments/[id]/participants/[userId]/check-in
 *
 * Manually check in participant (admin only, bypasses GPS validation)
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await context.params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.error('Unauthorized', 401);
    }

    // Verify admin permission
    const { data: tournament } = await supabase
      .from('tournament')
      .select('org_id, status')
      .eq('id', id)
      .single();

    if (!tournament) {
      return ApiResponse.error('Tournament not found', 404);
    }

    const { data: member } = await supabase
      .from('organization_member')
      .select('role')
      .eq('org_id', tournament.org_id)
      .eq('user_id', user.id)
      .single();

    if (!member || !['admin', 'owner'].includes(member.role)) {
      return ApiResponse.error('Admin access required', 403);
    }

    // Check participant exists
    const { data: participant } = await supabase
      .from('tournament_participant')
      .select('status')
      .eq('tournament_id', id)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      return ApiResponse.error('Participant not found', 404);
    }

    if (participant.status === 'checked_in') {
      return ApiResponse.error('Participant already checked in', 400);
    }

    // Manual check-in (no GPS validation)
    const { data: updated, error } = await supabase
      .from('tournament_participant')
      .update({
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tournament_id', id)
      .eq('user_id', userId)
      .select(
        `
        *,
        profile:user_id (
          id,
          name,
          email,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.error('Error manual check-in:', error);
      return ApiResponse.error('Failed to check in participant', 500);
    }

    return ApiResponse.success(
      { participant: updated },
      'Participant manually checked in'
    );
  } catch (error) {
    console.error('Manual check-in error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
