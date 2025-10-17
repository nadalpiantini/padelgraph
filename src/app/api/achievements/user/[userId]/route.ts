// Sprint 5: User Achievements API
// GET /api/achievements/user/[userId] - Get unlocked achievements for user

import { NextRequest, NextResponse } from 'next/server';
import { getRecentlyUnlocked } from '@/lib/services/achievements';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    const achievements = await getRecentlyUnlocked(userId, limit);

    return NextResponse.json({
      achievements,
      total: achievements.length,
    });
  } catch (error) {
    console.error('Error in user achievements API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
