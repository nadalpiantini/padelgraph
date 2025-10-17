// Sprint 5: Leaderboards API
// GET /api/leaderboards?type=global&metric=elo_rating&period=all_time

import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, LeaderboardType, LeaderboardMetric } from '@/lib/services/leaderboards';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = (searchParams.get('type') || 'global') as LeaderboardType;
    const metric = (searchParams.get('metric') || 'elo_rating') as LeaderboardMetric;
    const period = searchParams.get('period') || 'all_time';
    const limit = parseInt(searchParams.get('limit') || '100');
    const scopeId = searchParams.get('scope_id') || null;

    if (!['week', 'month', 'all_time'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period parameter' },
        { status: 400 }
      );
    }

    const leaderboard = await getLeaderboard(
      type,
      scopeId,
      metric,
      period as 'week' | 'month' | 'all_time',
      limit
    );

    return NextResponse.json({
      type,
      metric,
      period,
      entries: leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error('Error in leaderboards API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
