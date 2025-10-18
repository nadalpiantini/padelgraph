// Analytics Leaderboard API
// GET /api/analytics/leaderboard?type=elo_rating&period=week&limit=10

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const type = searchParams.get('type') || 'elo_rating';
    const period = searchParams.get('period') || 'all_time';
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate parameters
    const validTypes = ['win_rate', 'elo_rating', 'total_matches'];
    const validPeriods = ['week', 'month', 'all_time'];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    if (!validPeriods.includes(period)) {
      return NextResponse.json({ error: 'Invalid period parameter' }, { status: 400 });
    }

    // Query leaderboard from database
    const { data: leaderboardData, error } = await supabase
      .from('leaderboard')
      .select('rankings')
      .eq('type', 'player')
      .eq('metric', type)
      .eq('period_type', period)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !leaderboardData) {
      // If no pre-calculated leaderboard, calculate on the fly
      const rankings = await calculateLeaderboardOnFly(supabase, type, period, limit);
      return NextResponse.json({ rankings });
    }

    // Return pre-calculated leaderboard
    const rankings = Array.isArray(leaderboardData.rankings)
      ? leaderboardData.rankings.slice(0, limit)
      : [];

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Error in leaderboard API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Fallback: Calculate leaderboard on-the-fly if not pre-calculated
async function calculateLeaderboardOnFly(
  supabase: any,
  type: string,
  period: string,
  limit: number
) {
  try {
    let query = supabase
      .from('player_stats')
      .select(
        `
        user_id,
        ${type},
        user_profile!inner(username, avatar_url)
      `
      )
      .eq('period_type', period)
      .order(type, { ascending: false })
      .limit(limit);

    const { data: statsData, error } = await query;

    if (error || !statsData) {
      return [];
    }

    // Format rankings
    return statsData.map((stat: any, index: number) => ({
      user_id: stat.user_id,
      rank: index + 1,
      value: stat[type],
      username: stat.user_profile?.username || 'Unknown Player',
      avatar: stat.user_profile?.avatar_url || null,
    }));
  } catch (error) {
    console.error('Error calculating leaderboard on-fly:', error);
    return [];
  }
}
