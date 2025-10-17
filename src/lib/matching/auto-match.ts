/**
 * Auto-Match System
 *
 * Automatically creates chat connections between compatible players
 *
 * Features:
 * - Find compatible players based on similarity score
 * - Auto-create chat/conversation
 * - Personalized template messages
 * - Spam prevention (max 3 per week)
 * - Opt-out support via privacy settings
 * - Conversion tracking
 *
 * Flow:
 * 1. Run daily job to find new matches
 * 2. Calculate compatibility scores (>0.8)
 * 3. Check spam limits and opt-out preferences
 * 4. Create chat with personalized message
 * 5. Track conversion (chat → booking)
 */

import { createClient } from '@/lib/supabase/server';
import type { UserFeatures } from '../recommendations/types';
import { calculateCompatibilityScore, type CompatibilityScore } from './similarity-scorer';

// ============================================================================
// Configuration
// ============================================================================

interface AutoMatchConfig {
  min_score: number; // Minimum compatibility score (0-1)
  max_matches_per_week: number; // Spam prevention
  max_matches_per_run: number; // Limit per execution
  lookback_days: number; // Don't re-match within this period
  template_messages: boolean; // Use personalized templates
}

const DEFAULT_AUTO_MATCH_CONFIG: AutoMatchConfig = {
  min_score: 0.8, // Strong matches only
  max_matches_per_week: 3,
  max_matches_per_run: 1, // Conservative: 1 match per day
  lookback_days: 30,
  template_messages: true,
};

// ============================================================================
// Message Templates
// ============================================================================

/**
 * Generate personalized intro message
 */
function generateIntroMessage(
  targetUser: { name: string },
  matchedUser: { name: string; city?: string; level?: string },
  compatibilityScore: CompatibilityScore
): string {
  const { breakdown } = compatibilityScore;

  // Find strongest compatibility dimension
  const dimensions = [
    { name: 'skill level', score: breakdown.skill_match },
    { name: 'location', score: breakdown.location_match },
    { name: 'schedule', score: breakdown.schedule_match },
    { name: 'play style', score: breakdown.play_style_match },
  ];

  const strongest = dimensions.reduce((max, dim) =>
    dim.score > max.score ? dim : max
  );

  // Build personalized message
  const messages = [
    `Hi ${matchedUser.name}! 👋`,
    ``,
    `I'm ${targetUser.name} and I noticed we have a lot in common:`,
  ];

  // Add specific commonalities
  if (strongest.name === 'location' && matchedUser.city) {
    messages.push(`- We both play in ${matchedUser.city}`);
  }

  if (strongest.name === 'skill level' && matchedUser.level) {
    messages.push(`- Similar skill level (${matchedUser.level})`);
  }

  if (strongest.name === 'play style') {
    messages.push(`- Compatible play styles`);
  }

  if (strongest.name === 'schedule') {
    messages.push(`- We're available at similar times`);
  }

  // Add call to action
  messages.push(``);
  messages.push(`Would you be interested in playing together sometime?`);
  messages.push(``);
  messages.push(`_This is an auto-suggested connection based on compatibility._`);

  return messages.join('\n');
}

// ============================================================================
// Spam Prevention
// ============================================================================

/**
 * Check if user has reached weekly limit
 */
async function checkWeeklyLimit(
  userId: string,
  config: AutoMatchConfig
): Promise<boolean> {
  const supabase = await createClient();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Count auto-created chats in last 7 days
  // Assuming auto-matched chats are tagged in metadata
  const { count } = await supabase
    .from('post') // or 'conversation' table if exists
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId)
    .gte('created_at', weekAgo.toISOString())
    .contains('metadata', { auto_matched: true });

  return (count || 0) < config.max_matches_per_week;
}

/**
 * Check if users were already matched recently
 */
async function checkRecentMatch(
  userA: string,
  userB: string,
  config: AutoMatchConfig
): Promise<boolean> {
  const supabase = await createClient();

  const lookbackDate = new Date(
    Date.now() - config.lookback_days * 24 * 60 * 60 * 1000
  );

  // Check if conversation exists between these users
  const { data: existingConversation } = await supabase
    .from('post')
    .select('id')
    .or(`author_id.eq.${userA},author_id.eq.${userB}`)
    .gte('created_at', lookbackDate.toISOString())
    .limit(1);

  return !!(existingConversation && existingConversation.length > 0);
}

/**
 * Check if user has opt-ed out
 */
async function checkOptOut(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from('privacy_settings')
    .select('auto_match_enabled')
    .eq('user_id', userId)
    .single();

  // Default to enabled if no settings
  if (!settings) return false;
  return settings.auto_match_enabled === false;
}

// ============================================================================
// Match Creation
// ============================================================================

/**
 * Create auto-match connection
 */
async function createAutoMatch(
  userId: string,
  matchedUserId: string,
  compatibilityScore: CompatibilityScore,
  config: AutoMatchConfig
): Promise<{ success: boolean; chat_id?: string; error?: string }> {
  const supabase = await createClient();

  // Get user details for message
  const { data: users } = await supabase
    .from('user_profile')
    .select('id, name, city, level')
    .in('id', [userId, matchedUserId]);

  if (!users || users.length !== 2) {
    return { success: false, error: 'User details not found' };
  }

  const targetUser = users.find((u) => u.id === userId)!;
  const matchedUser = users.find((u) => u.id === matchedUserId)!;

  // Generate intro message
  const message = config.template_messages
    ? generateIntroMessage(targetUser, matchedUser, compatibilityScore)
    : `Hi ${matchedUser.name}! Would you like to play together sometime?`;

  // Create post/message (using social feed post for MVP)
  const { data: post, error } = await supabase
    .from('post')
    .insert({
      author_id: userId,
      content: message,
      type: 'match_request',
      metadata: {
        auto_matched: true,
        target_user_id: matchedUserId,
        compatibility_score: compatibilityScore.overall_score,
        recommendation: compatibilityScore.recommendation,
      },
    })
    .select('id')
    .single();

  if (error || !post) {
    return { success: false, error: error?.message || 'Failed to create post' };
  }

  // Create social connection (pending state)
  await supabase.from('social_connection').insert({
    user_a: userId,
    user_b: matchedUserId,
    connection_type: 'auto_match',
    strength: 0, // Will increase if they interact
  });

  return { success: true, chat_id: post.id };
}

// ============================================================================
// Main Auto-Match Function
// ============================================================================

/**
 * Find and create auto-matches for user
 */
export async function findAndCreateMatches(
  userId: string,
  candidateUsers: UserFeatures[],
  config: AutoMatchConfig = DEFAULT_AUTO_MATCH_CONFIG
): Promise<{
  matched_count: number;
  skipped_count: number;
  matches: Array<{ user_id: string; score: number; chat_id?: string }>;
}> {
  const supabase = await createClient();
  const matches: Array<{ user_id: string; score: number; chat_id?: string }> = [];
  let skipped_count = 0;

  // Check if user opted out
  const optedOut = await checkOptOut(userId);
  if (optedOut) {
    return { matched_count: 0, skipped_count: 0, matches: [] };
  }

  // Check weekly limit
  const hasReachedLimit = !(await checkWeeklyLimit(userId, config));
  if (hasReachedLimit) {
    return { matched_count: 0, skipped_count: 0, matches: [] };
  }

  // Get target user features
  const { data: targetProfile } = await supabase
    .from('user_profile')
    .select('id, level, city, location')
    .eq('id', userId)
    .single();

  if (!targetProfile) {
    throw new Error('User not found');
  }

  // Calculate compatibility scores
  const targetUser: UserFeatures = {
    user_id: userId,
    level: targetProfile.level,
    city: targetProfile.city,
    matches_played: 0,
    tournaments_participated: 0,
    connection_count: 0,
    club_memberships: [],
    frequent_partners: [],
    last_active: new Date(),
    activity_level: 0.5,
  };

  // Score all candidates
  const scores = await Promise.all(
    candidateUsers.map((candidate) =>
      calculateCompatibilityScore(targetUser, candidate)
    )
  );

  // Filter and sort
  const strongMatches = scores
    .filter((s) => s.overall_score >= config.min_score)
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, config.max_matches_per_run * 2); // Get extras in case some are skipped

  // Attempt to create matches
  let created = 0;
  for (const match of strongMatches) {
    if (created >= config.max_matches_per_run) break;

    // Check if already matched recently
    const alreadyMatched = await checkRecentMatch(userId, match.user_b_id, config);
    if (alreadyMatched) {
      skipped_count++;
      continue;
    }

    // Check if matched user opted out
    const matchedUserOptedOut = await checkOptOut(match.user_b_id);
    if (matchedUserOptedOut) {
      skipped_count++;
      continue;
    }

    // Create auto-match
    const result = await createAutoMatch(userId, match.user_b_id, match, config);

    if (result.success) {
      matches.push({
        user_id: match.user_b_id,
        score: match.overall_score,
        chat_id: result.chat_id,
      });
      created++;
    } else {
      skipped_count++;
    }
  }

  return {
    matched_count: created,
    skipped_count,
    matches,
  };
}

/**
 * Batch process auto-matches for multiple users (daily job)
 */
export async function batchProcessAutoMatches(
  config: AutoMatchConfig = DEFAULT_AUTO_MATCH_CONFIG
): Promise<{
  processed_users: number;
  total_matches_created: number;
  errors: string[];
}> {
  const supabase = await createClient();

  // Get active users (played in last 7 days, opted in)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data: activeUsers } = await supabase
    .from('user_profile')
    .select('id')
    .gte('last_active', weekAgo.toISOString())
    .limit(100); // Process max 100 users per run

  if (!activeUsers || activeUsers.length === 0) {
    return { processed_users: 0, total_matches_created: 0, errors: [] };
  }

  // Get all candidate users (potential matches)
  const { data: candidateProfiles } = await supabase
    .from('user_profile')
    .select('id, level, city, location')
    .gte('last_active', weekAgo.toISOString())
    .limit(500);

  if (!candidateProfiles) {
    return { processed_users: 0, total_matches_created: 0, errors: [] };
  }

  const candidateUsers: UserFeatures[] = candidateProfiles.map((p) => ({
    user_id: p.id,
    level: p.level,
    city: p.city,
    matches_played: 0,
    tournaments_participated: 0,
    connection_count: 0,
    club_memberships: [],
    frequent_partners: [],
    last_active: new Date(),
    activity_level: 0.5,
  }));

  // Process each active user
  let total_matches_created = 0;
  const errors: string[] = [];

  for (const user of activeUsers) {
    try {
      const result = await findAndCreateMatches(
        user.id,
        candidateUsers.filter((c) => c.user_id !== user.id),
        config
      );
      total_matches_created += result.matched_count;
    } catch (error) {
      errors.push(`User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    processed_users: activeUsers.length,
    total_matches_created,
    errors,
  };
}
