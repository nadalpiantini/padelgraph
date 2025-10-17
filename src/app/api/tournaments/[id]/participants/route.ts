/**
 * Tournament Participants Management API (Admin)
 *
 * POST /api/tournaments/[id]/participants - Add participant (admin)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { z } from 'zod';

const addParticipantSchema = z.object({
  user_id: z.string().uuid(),
  skill_level: z.number().min(1).max(10).optional(),
  status: z.enum(['registered', 'checked_in']).default('registered'),
});

/**
 * POST /api/tournaments/[id]/participants
 *
 * Add a participant to tournament (admin only)
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

    // Verify admin permission for tournament
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

    // Validate input
    const body = await request.json();
    const validated = addParticipantSchema.parse(body);

    // Check if user exists
    const { data: targetUser } = await supabase
      .from('profile')
      .select('id')
      .eq('id', validated.user_id)
      .single();

    if (!targetUser) {
      return ApiResponse.error('User not found', 404);
    }

    // Check if already participant
    const { data: existing } = await supabase
      .from('tournament_participant')
      .select('id')
      .eq('tournament_id', id)
      .eq('user_id', validated.user_id)
      .maybeSingle();

    if (existing) {
      return ApiResponse.error('User already registered', 400);
    }

    // Add participant
    const { data: participant, error } = await supabase
      .from('tournament_participant')
      .insert({
        tournament_id: id,
        user_id: validated.user_id,
        skill_level: validated.skill_level,
        status: validated.status,
        registered_at: new Date().toISOString(),
        ...(validated.status === 'checked_in' && {
          checked_in_at: new Date().toISOString(),
        }),
      })
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
      console.error('Error adding participant:', error);
      return ApiResponse.error('Failed to add participant', 500);
    }

    return ApiResponse.success(
      { participant },
      'Participant added successfully'
    );
  } catch (error) {
    console.error('Add participant error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 400);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
