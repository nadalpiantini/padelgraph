/**
 * Auto-Match Service
 * Automatically creates chat conversations between compatible players
 */

import { createClient as createServerClient } from '@/lib/supabase/server';

export interface AutoMatchResult {
  user_a_id: string;
  user_b_id: string;
  similarity_score: number;
  chat_created: boolean;
  message_sent: boolean;
  reason: string;
}

/**
 * Calculate compatibility score between two users
 */
async function calculateCompatibilityScore(
  userAId: string,
  userBId: string,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<{ score: number; reason: string }> {
  // Get both user profiles
  const { data: users } = await supabase
    .from('user_profile')
    .select('id, skill_level, city, location, preferences')
    .in('id', [userAId, userBId]);

  if (!users || users.length !== 2) {
    return { score: 0, reason: 'User profiles not found' };
  }

  const [userA, userB] = users;
  let score = 0;
  const reasons: string[] = [];

  // 1. Same skill level: +0.3
  if (userA.skill_level === userB.skill_level) {
    score += 0.3;
    reasons.push(`mismo nivel (${userA.skill_level})`);
  }

  // 2. Same city: +0.25
  if (userA.city === userB.city) {
    score += 0.25;
    reasons.push(`ambos en ${userA.city}`);
  }

  // 3. Nearby location: +0.2 (if within 10km)
  if (userA.location && userB.location) {
    const { data: distanceData } = await supabase.rpc('calculate_distance_km', {
      location1: userA.location,
      location2: userB.location,
    });

    if (distanceData && distanceData < 10) {
      score += 0.2;
      reasons.push(`cerca (${Math.round(distanceData * 10) / 10}km)`);
    }
  }

  // 4. Common connections: +0.15
  const { count: commonConnections } = await supabase
    .from('social_connection')
    .select('*', { count: 'exact', head: true })
    .or(
      `and(user_a.eq.${userAId},user_b.in.(SELECT CASE WHEN user_a='${userBId}' THEN user_b ELSE user_a END FROM social_connection WHERE user_a='${userBId}' OR user_b='${userBId}'))`
    );

  if (commonConnections && commonConnections > 0) {
    score += 0.15;
    reasons.push(`${commonConnections} conexión(es) común(es)`);
  }

  // 5. Similar preferences: +0.1
  if (
    userA.preferences &&
    userB.preferences &&
    JSON.stringify(userA.preferences) === JSON.stringify(userB.preferences)
  ) {
    score += 0.1;
    reasons.push('preferencias similares');
  }

  const reason = reasons.length > 0 ? reasons.join(', ') : 'compatibilidad general';

  return { score: Math.min(score, 1.0), reason };
}

/**
 * Check if user has auto-match enabled
 */
async function hasAutoMatchEnabled(
  userId: string,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<boolean> {
  const { data: settings } = await supabase
    .from('privacy_settings')
    .select('auto_match_enabled')
    .eq('user_id', userId)
    .single();

  return settings?.auto_match_enabled !== false; // Default to true if not set
}

/**
 * Check auto-match rate limit (max 3 per week per user)
 */
async function checkAutoMatchRateLimit(
  userId: string,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<boolean> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Count auto-matches in last 7 days
  const { count } = await supabase
    .from('auto_match_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneWeekAgo.toISOString());

  return (count || 0) < 3; // Max 3 per week
}

/**
 * Create chat conversation between two users
 */
async function createChatConversation(
  userAId: string,
  userBId: string,
  reason: string,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<string | null> {
  // Check if conversation already exists
  const { data: existingChat } = await supabase
    .from('chat_conversation')
    .select('id')
    .or(
      `and(user_a.eq.${userAId},user_b.eq.${userBId}),and(user_a.eq.${userBId},user_b.eq.${userAId})`
    )
    .maybeSingle();

  if (existingChat) {
    return existingChat.id; // Chat already exists
  }

  // Create new conversation
  const { data: newChat, error } = await supabase
    .from('chat_conversation')
    .insert({
      user_a: userAId,
      user_b: userBId,
      type: 'auto_match',
      metadata: { reason },
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Auto-Match] Error creating chat:', error);
    return null;
  }

  return newChat?.id || null;
}

/**
 * Send auto-match introduction message
 */
async function sendIntroductionMessage(
  chatId: string,
  fromUserId: string,
  toUserId: string,
  reason: string,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<boolean> {
  // Get recipient's name
  const { data: toUser } = await supabase
    .from('user_profile')
    .select('display_name')
    .eq('id', toUserId)
    .single();

  if (!toUser) return false;

  // Create personalized message
  const message = `¡Hola! 👋 Vi que ${reason}. ¿Te gustaría jugar algún partido?`;

  const { error } = await supabase.from('chat_message').insert({
    conversation_id: chatId,
    sender_id: fromUserId,
    message_text: message,
    message_type: 'auto_match_intro',
  });

  if (error) {
    console.error('[Auto-Match] Error sending intro message:', error);
    return false;
  }

  return true;
}

/**
 * Log auto-match event
 */
async function logAutoMatch(
  userId: string,
  matchedUserId: string,
  score: number,
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<void> {
  await supabase.from('auto_match_log').insert({
    user_id: userId,
    matched_user_id: matchedUserId,
    compatibility_score: score,
  });
}

/**
 * Main auto-match function - find and match compatible users
 */
export async function triggerAutoMatch(
  userId: string,
  options: {
    min_score?: number;
    max_matches?: number;
    send_message?: boolean;
  } = {}
): Promise<AutoMatchResult[]> {
  const supabase = await createServerClient();
  const { min_score = 0.8, max_matches = 3, send_message = true } = options;

  const results: AutoMatchResult[] = [];

  // Check if user has auto-match enabled
  const autoMatchEnabled = await hasAutoMatchEnabled(userId, supabase);
  if (!autoMatchEnabled) {
    return results; // Auto-match disabled for this user
  }

  // Check rate limit
  const withinRateLimit = await checkAutoMatchRateLimit(userId, supabase);
  if (!withinRateLimit) {
    console.log('[Auto-Match] Rate limit exceeded for user:', userId);
    return results;
  }

  // Get user's existing connections to exclude
  const { data: connections } = await supabase
    .from('social_connection')
    .select('user_a, user_b')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  const excludeUserIds = new Set(
    connections?.map((c) => (c.user_a === userId ? c.user_b : c.user_a)) || []
  );

  // Get candidate users (nearby, same skill level, auto-match enabled)
  const { data: userProfile } = await supabase
    .from('user_profile')
    .select('skill_level, location')
    .eq('id', userId)
    .single();

  if (!userProfile) return results;

  // Find candidates
  const { data: candidates } = await supabase
    .from('user_profile')
    .select('id, display_name, skill_level, city')
    .eq('skill_level', userProfile.skill_level)
    .neq('id', userId)
    .limit(20); // Get more candidates for filtering

  if (!candidates || candidates.length === 0) return results;

  // Calculate compatibility and create matches
  for (const candidate of candidates) {
    // Skip if already connected
    if (excludeUserIds.has(candidate.id)) continue;

    // Check if candidate has auto-match enabled
    const candidateAutoMatch = await hasAutoMatchEnabled(candidate.id, supabase);
    if (!candidateAutoMatch) continue;

    // Calculate compatibility score
    const { score, reason } = await calculateCompatibilityScore(userId, candidate.id, supabase);

    if (score >= min_score) {
      // Create chat conversation
      const chatId = await createChatConversation(userId, candidate.id, reason, supabase);
      const chatCreated = chatId !== null;

      // Send introduction message
      let messageSent = false;
      if (chatCreated && chatId && send_message) {
        messageSent = await sendIntroductionMessage(chatId, userId, candidate.id, reason, supabase);
      }

      // Log auto-match
      await logAutoMatch(userId, candidate.id, score, supabase);

      results.push({
        user_a_id: userId,
        user_b_id: candidate.id,
        similarity_score: score,
        chat_created: chatCreated,
        message_sent: messageSent,
        reason,
      });

      // Stop if max matches reached
      if (results.length >= max_matches) break;
    }
  }

  return results;
}

/**
 * Batch auto-match for multiple users (cron job)
 */
export async function batchAutoMatch(
  options: {
    min_score?: number;
    max_users?: number;
  } = {}
): Promise<{ total_users: number; total_matches: number }> {
  const supabase = await createServerClient();
  const { min_score = 0.8, max_users = 100 } = options;

  // Get users with auto-match enabled who haven't had a match recently
  const { data: users } = await supabase
    .from('user_profile')
    .select('id')
    .eq('auto_match_enabled', true)
    .limit(max_users);

  if (!users || users.length === 0) {
    return { total_users: 0, total_matches: 0 };
  }

  let totalMatches = 0;

  for (const user of users) {
    const matches = await triggerAutoMatch(user.id, {
      min_score,
      max_matches: 1, // One match per batch run
      send_message: true,
    });

    totalMatches += matches.length;
  }

  return { total_users: users.length, total_matches: totalMatches };
}
