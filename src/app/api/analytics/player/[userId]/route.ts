// Sprint 5: Player Analytics API
// GET /api/analytics/player/[userId]?period=week|month|all

import { NextRequest, NextResponse } from 'next/server';
import { getPlayerStats } from '@/lib/services/analytics';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'all_time';

    if (!['day', 'week', 'month', 'all_time'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period parameter' },
        { status: 400 }
      );
    }

    const stats = await getPlayerStats(
      userId,
      period as 'day' | 'week' | 'month' | 'all_time'
    );

    if (!stats) {
      return NextResponse.json(
        { error: 'Stats not found for user' },
        { status: 404 }
      );
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in player analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
