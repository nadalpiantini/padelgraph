/**
 * Tournament Participant Management API (Admin)
 *
 * DELETE /api/tournaments/[id]/participants/[userId] - Remove participant
 * PATCH /api/tournaments/[id]/participants/[userId] - Update participant
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { z } from 'zod';

const updateParticipantSchema = z.object({
  skill_level: z.number().min(1).max(10).optional(),
  status: z
    .enum(['registered', 'checked_in', 'no_show', 'disqualified'])
    .optional(),
});

/**
 * DELETE /api/tournaments/[id]/participants/[userId]
 *
 * Remove participant from tournament (admin only)
 */
export async function DELETE(
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

    // Prevent removal if tournament has started
    if (tournament.status !== 'draft' && tournament.status !== 'published') {
      return ApiResponse.error(
        'Cannot remove participant from active tournament',
        400
      );
    }

    // Check if participant exists
    const { data: participant } = await supabase
      .from('tournament_participant')
      .select('id, status')
      .eq('tournament_id', id)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      return ApiResponse.error('Participant not found', 404);
    }

    // Remove participant
    const { error } = await supabase
      .from('tournament_participant')
      .delete()
      .eq('tournament_id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing participant:', error);
      return ApiResponse.error('Failed to remove participant', 500);
    }

    return ApiResponse.success(null, 'Participant removed successfully');
  } catch (error) {
    console.error('Remove participant error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}

/**
 * PATCH /api/tournaments/[id]/participants/[userId]
 *
 * Update participant details (admin only)
 */
export async function PATCH(
  request: NextRequest,
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
      .select('org_id')
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

    // Validate input
    const body = await request.json();
    const validated = updateParticipantSchema.parse(body);

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validated.skill_level !== undefined) {
      updates.skill_level = validated.skill_level;
    }

    if (validated.status !== undefined) {
      updates.status = validated.status;

      // Auto-set check-in timestamp if status changes to checked_in
      if (validated.status === 'checked_in') {
        const { data: current } = await supabase
          .from('tournament_participant')
          .select('checked_in_at')
          .eq('tournament_id', id)
          .eq('user_id', userId)
          .single();

        if (!current?.checked_in_at) {
          updates.checked_in_at = new Date().toISOString();
        }
      }
    }

    // Update participant
    const { data: participant, error } = await supabase
      .from('tournament_participant')
      .update(updates)
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
      console.error('Error updating participant:', error);
      return ApiResponse.error('Failed to update participant', 500);
    }

    return ApiResponse.success(
      { participant },
      'Participant updated successfully'
    );
  } catch (error) {
    console.error('Update participant error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
