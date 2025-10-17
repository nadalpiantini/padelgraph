// Sprint 5: User Leaderboard Position API
// GET /api/leaderboards/[type]/position?metric=elo_rating

import { NextRequest, NextResponse } from 'next/server';
import { getUserPosition, LeaderboardType, LeaderboardMetric } from '@/lib/services/leaderboards';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const metric = (searchParams.get('metric') || 'elo_rating') as LeaderboardMetric;
    const period = searchParams.get('period') || 'all_time';
    const scopeId = searchParams.get('scope_id') || null;

    const position = await getUserPosition(
      user.id,
      type as LeaderboardType,
      scopeId,
      metric,
      period as 'week' | 'month' | 'all_time'
    );

    if (!position) {
      return NextResponse.json(
        { error: 'User not found in leaderboard' },
        { status: 404 }
      );
    }

    return NextResponse.json(position);
  } catch (error) {
    console.error('Error in leaderboard position API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
