// Sprint 5: Achievements API
// GET /api/achievements - Get all achievements with user progress

import { NextRequest, NextResponse } from 'next/server';
import { getUserAchievements } from '@/lib/services/achievements';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const achievements = await getUserAchievements(user.id);

    return NextResponse.json({
      achievements,
      total: achievements.length,
      unlocked: achievements.filter((a) => a.is_unlocked).length,
    });
  } catch (error) {
    console.error('Error in achievements API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
