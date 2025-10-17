/**
 * Tournament Admin Dashboard API
 *
 * GET /api/tournaments/[id]/admin - Get detailed admin view
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';

/**
 * GET /api/tournaments/[id]/admin
 *
 * Get detailed admin view of tournament with all data and issues
 */
export async function GET(
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

    // Check user is admin
    const { data: membership } = await supabase
      .from('org_member')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single();

    if (!membership) {
      return ApiResponse.error('Unauthorized - admin only', 403);
    }

    // Fetch tournament
    const { data: tournament } = await supabase
      .from('tournament')
      .select('*')
      .eq('id', id)
      .single();

    if (!tournament) {
      return ApiResponse.error('Tournament not found', 404);
    }

    // Fetch participants with profiles
    const { data: participants } = await supabase
      .from('tournament_participant')
      .select(
        `
        *,
        user_profile!inner(user_id, full_name, avatar_url)
      `
      )
      .eq('tournament_id', id);

    // Fetch all rounds
    const { data: rounds } = await supabase
      .from('tournament_round')
      .select('*')
      .eq('tournament_id', id)
      .order('round_number', { ascending: true });

    // Fetch all matches
    const { data: allMatches } = await supabase
      .from('tournament_match')
      .select(
        `
        *,
        tournament_round!inner(round_number)
      `
      )
      .eq('tournament_round.tournament_id', id);

    // Fetch standings
    const { data: standings } = await supabase
      .from('tournament_standing')
      .select(
        `
        *,
        user_profile!inner(user_id, full_name)
      `
      )
      .eq('tournament_id', id)
      .order('rank', { ascending: true });

    // Identify issues
    const issues = {
      missing_scores: allMatches?.filter((m) => m.status !== 'completed' && m.status !== 'pending') || [],
      overdue_matches: allMatches?.filter((m) => {
        if (m.status === 'completed' || !m.scheduled_at) return false;
        return new Date(m.scheduled_at) < new Date();
      }) || [],
      no_shows: participants?.filter((p) => p.status === 'no_show') || [],
    };

    return ApiResponse.success({
      tournament,
      participants: participants || [],
      all_rounds: rounds || [],
      all_matches: allMatches || [],
      standings: standings || [],
      issues,
      stats: {
        total_participants: participants?.length || 0,
        checked_in: participants?.filter((p) => p.status === 'checked_in').length || 0,
        total_rounds: rounds?.length || 0,
        completed_rounds: rounds?.filter((r) => r.status === 'completed').length || 0,
        total_matches: allMatches?.length || 0,
        completed_matches: allMatches?.filter((m) => m.status === 'completed').length || 0,
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return ApiResponse.error('Internal server error', 500);
  }
}
