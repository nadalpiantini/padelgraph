// Sprint 5: Player Stats Evolution API
// GET /api/analytics/player/[userId]/evolution?period=week|month&limit=12

import { NextRequest, NextResponse } from 'next/server';
import { getStatsEvolution } from '@/lib/services/analytics';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'week';
    const limit = parseInt(searchParams.get('limit') || '12');

    if (!['week', 'month'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period parameter' },
        { status: 400 }
      );
    }

    const evolution = await getStatsEvolution(
      userId,
      period as 'week' | 'month',
      limit
    );

    return NextResponse.json(evolution);
  } catch (error) {
    console.error('Error in stats evolution API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
