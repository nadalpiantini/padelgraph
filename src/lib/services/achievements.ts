// Sprint 5: Achievements Service
// Handles achievement unlocking, progress tracking, and notifications

import { createClient } from '@/lib/supabase/server';

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  requirement_type: string;
  requirement_value: number;
  xp_points: number;
  badge_icon: string | null;
  badge_color: string | null;
  is_hidden: boolean;
  is_active: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
  created_at: string;
  achievement?: Achievement;
}

export interface AchievementWithProgress extends Achievement {
  progress: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
}

/**
 * Get all achievements with user progress
 */
export async function getUserAchievements(
  userId: string
): Promise<AchievementWithProgress[]> {
  const supabase = await createClient();

  // Get all active achievements
  const { data: achievements, error: achError } = await supabase
    .from('achievement')
    .select('*')
    .eq('is_active', true)
    .eq('is_hidden', false)
    .order('category', { ascending: true });

  if (achError) {
    console.error('Error fetching achievements:', achError);
    return [];
  }

  // Get user progress for these achievements
  const { data: userAchievements, error: userAchError } = await supabase
    .from('user_achievement')
    .select('*')
    .eq('user_id', userId);

  if (userAchError) {
    console.error('Error fetching user achievements:', userAchError);
    return [];
  }

  // Merge data
  const achievementsMap = new Map(
    userAchievements?.map((ua) => [ua.achievement_id, ua]) || []
  );

  return achievements.map((ach) => {
    const userAch = achievementsMap.get(ach.id);
    return {
      ...ach,
      progress: userAch?.progress || 0,
      is_unlocked: userAch?.is_unlocked || false,
      unlocked_at: userAch?.unlocked_at || null,
    };
  });
}

/**
 * Check and update achievement progress
 */
export async function checkAchievementProgress(
  userId: string,
  requirementType: string,
  currentValue: number
): Promise<{ unlockedAchievements: Achievement[] }> {
  const supabase = await createClient();

  // Find relevant achievements
  const { data: achievements, error } = await supabase
    .from('achievement')
    .select('*')
    .eq('requirement_type', requirementType)
    .eq('is_active', true)
    .lte('requirement_value', currentValue);

  if (error || !achievements) {
    console.error('Error checking achievement progress:', error);
    return { unlockedAchievements: [] };
  }

  const unlockedAchievements: Achievement[] = [];

  for (const achievement of achievements) {
    // Check if already unlocked
    const { data: existing } = await supabase
      .from('user_achievement')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_id', achievement.id)
      .single();

    if (existing?.is_unlocked) {
      continue; // Already unlocked
    }

    // Update or insert progress
    if (currentValue >= achievement.requirement_value) {
      // Unlock the achievement
      await supabase
        .from('user_achievement')
        .upsert({
          user_id: userId,
          achievement_id: achievement.id,
          progress: achievement.requirement_value,
          is_unlocked: true,
          unlocked_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,achievement_id'
        });

      // Award XP points
      await awardXP(userId, achievement.xp_points);

      unlockedAchievements.push(achievement);
    } else {
      // Update progress
      await supabase
        .from('user_achievement')
        .upsert({
          user_id: userId,
          achievement_id: achievement.id,
          progress: currentValue,
          is_unlocked: false,
        }, {
          onConflict: 'user_id,achievement_id'
        });
    }
  }

  return { unlockedAchievements };
}

/**
 * Award XP points and update user level
 */
async function awardXP(userId: string, xpPoints: number): Promise<void> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('user_profile')
    .select('xp_points, level')
    .eq('user_id', userId)
    .single();

  if (!profile) return;

  const newXP = (profile.xp_points || 0) + xpPoints;
  const newLevel = calculateLevel(newXP);

  await supabase
    .from('user_profile')
    .update({
      xp_points: newXP,
      level: newLevel,
    })
    .eq('user_id', userId);
}

/**
 * Calculate level from XP (100 XP per level)
 */
function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

/**
 * Trigger achievement checks after match completion
 */
export async function checkMatchAchievements(
  userId: string,
  matchWon: boolean,
  isPerfectWin: boolean
): Promise<{ unlockedAchievements: Achievement[] }> {
  const supabase = await createClient();

  // Get match count
  const { data: stats } = await supabase
    .from('player_stats')
    .select('total_matches, matches_won, current_win_streak')
    .eq('user_id', userId)
    .eq('period_type', 'all_time')
    .single();

  const matchCount = stats?.total_matches || 0;
  const winCount = stats?.matches_won || 0;
  const winStreak = stats?.current_win_streak || 0;

  const unlocked: Achievement[] = [];

  // Check match count achievements
  const { unlockedAchievements: matchAch } = await checkAchievementProgress(
    userId,
    'match_count',
    matchCount
  );
  unlocked.push(...matchAch);

  // Check win achievements
  if (matchWon) {
    const { unlockedAchievements: winAch } = await checkAchievementProgress(
      userId,
      'wins_count',
      winCount
    );
    unlocked.push(...winAch);

    // Check win streak
    const { unlockedAchievements: streakAch } = await checkAchievementProgress(
      userId,
      'win_streak',
      winStreak
    );
    unlocked.push(...streakAch);
  }

  // Check perfect match
  if (isPerfectWin) {
    const { unlockedAchievements: perfectAch } = await checkAchievementProgress(
      userId,
      'perfect_match',
      1
    );
    unlocked.push(...perfectAch);
  }

  return { unlockedAchievements: unlocked };
}

/**
 * Trigger achievement checks after tournament completion
 */
export async function checkTournamentAchievements(
  userId: string,
  placement: number
): Promise<{ unlockedAchievements: Achievement[] }> {
  const supabase = await createClient();

  // Get tournament stats
  const { data: stats } = await supabase
    .from('player_stats')
    .select('tournaments_played, tournaments_won')
    .eq('user_id', userId)
    .eq('period_type', 'all_time')
    .single();

  const tournamentCount = stats?.tournaments_played || 0;
  const tournamentWins = stats?.tournaments_won || 0;

  const unlocked: Achievement[] = [];

  // Check tournament participation
  const { unlockedAchievements: partAch } = await checkAchievementProgress(
    userId,
    'tournament_participations',
    tournamentCount
  );
  unlocked.push(...partAch);

  // Check tournament wins
  if (placement === 1) {
    const { unlockedAchievements: winAch } = await checkAchievementProgress(
      userId,
      'tournament_wins',
      tournamentWins
    );
    unlocked.push(...winAch);
  }

  // Check runner-up
  if (placement === 2) {
    const { unlockedAchievements: runnerUpAch } = await checkAchievementProgress(
      userId,
      'tournament_runner_up',
      1
    );
    unlocked.push(...runnerUpAch);
  }

  // Check bronze
  if (placement === 3) {
    const { unlockedAchievements: bronzeAch } = await checkAchievementProgress(
      userId,
      'tournament_bronze',
      1
    );
    unlocked.push(...bronzeAch);
  }

  return { unlockedAchievements: unlocked };
}

/**
 * Get recently unlocked achievements for a user
 */
export async function getRecentlyUnlocked(
  userId: string,
  limit: number = 10
): Promise<UserAchievement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_achievement')
    .select('*, achievement(*)')
    .eq('user_id', userId)
    .eq('is_unlocked', true)
    .order('unlocked_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recently unlocked:', error);
    return [];
  }

  return data;
}
